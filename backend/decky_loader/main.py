# Change PyInstaller files permissions
import sys
from typing import Any, Dict
from .localplatform.localplatform import (chmod, chown, service_stop, service_start,
                            ON_WINDOWS, ON_LINUX, get_log_level, get_live_reload, 
                            get_server_port, get_server_host, get_chown_plugin_path,
                            get_privileged_path, restart_webhelper)
if hasattr(sys, '_MEIPASS'):
    chmod(sys._MEIPASS, 755) # type: ignore
    
# Full imports
import multiprocessing
multiprocessing.freeze_support()
from asyncio import AbstractEventLoop, CancelledError, Task, all_tasks, current_task, gather, new_event_loop, set_event_loop, sleep
from logging import basicConfig, getLogger
from os import path
from traceback import format_exc
from time import time
import aiohttp_cors # pyright: ignore [reportMissingTypeStubs]

# Partial imports
from aiohttp import client_exceptions
from aiohttp.web import Application, Response, Request, get, run_app, static # pyright: ignore [reportUnknownVariableType]
from aiohttp_jinja2 import setup as jinja_setup
from setproctitle import getproctitle, setproctitle, setthreadtitle

# local modules
from .browser import PluginBrowser
from .helpers import (REMOTE_DEBUGGER_UNIT, create_inject_script, csrf_middleware, get_csrf_token, get_loader_version,
                     mkdir_as_user, get_system_pythonpaths, get_effective_user_id)
                     
from .injector import get_gamepadui_tab, Tab
from .loader import Loader
from .settings import SettingsManager
from .updater import Updater
from .utilities import Utilities
from .enums import UserType
from .wsrouter import WSRouter


basicConfig(
    level=get_log_level(),
    format="[%(module)s][%(levelname)s]: %(message)s"
)

logger = getLogger("Main")
plugin_path = path.join(get_privileged_path(), "plugins")

def chown_plugin_dir():
    if not path.exists(plugin_path): # For safety, create the folder before attempting to do anything with it
        mkdir_as_user(plugin_path)

    if not chown(plugin_path, UserType.HOST_USER) or not chmod(plugin_path, 555):
        logger.error(f"chown/chmod exited with a non-zero exit code")

if get_chown_plugin_path() == True:
    chown_plugin_dir()

class PluginManager:
    def __init__(self, loop: AbstractEventLoop) -> None:
        self.loop = loop
        self.reinject: bool = True
        self.js_ctx_tab: Tab | None = None
        self.web_app = Application()
        self.web_app.middlewares.append(csrf_middleware)
        self.cors = aiohttp_cors.setup(self.web_app, defaults={
            "https://steamloopback.host": aiohttp_cors.ResourceOptions(
                expose_headers="*",
                allow_headers="*",
                allow_credentials=True
            )
        })
        self.ws = WSRouter(self.loop, self.web_app)
        self.plugin_loader = Loader(self, self.ws, plugin_path, self.loop, get_live_reload())
        self.settings = SettingsManager("loader", path.join(get_privileged_path(), "settings"))
        self.plugin_browser = PluginBrowser(plugin_path, self.plugin_loader.plugins, self.plugin_loader, self.settings) 
        self.utilities = Utilities(self)
        self.updater = Updater(self)
        self.last_webhelper_exit: float = 0
        self.webhelper_crash_count: int = 0
        self.inject_fallback: bool = False

        jinja_setup(self.web_app)

        async def startup(_: Application):
            if self.settings.getSetting("cef_forward", False):
                self.loop.create_task(service_start(REMOTE_DEBUGGER_UNIT))
            else:
                self.loop.create_task(service_stop(REMOTE_DEBUGGER_UNIT))
            self.loop.create_task(self.loader_reinjector())
            self.loop.create_task(self.load_plugins())

        self.web_app.on_startup.append(startup)
        self.web_app.on_shutdown.append(self.shutdown)

        self.loop.set_exception_handler(self.exception_handler)
        self.web_app.add_routes([get("/auth/token", self.get_auth_token)])

        for route in list(self.web_app.router.routes()):
            self.cors.add(route) # pyright: ignore [reportUnknownMemberType]
        self.web_app.add_routes([static("/static", path.join(path.dirname(__file__), 'static'))])

    async def handle_crash(self):
        if not self.reinject:
            return
        new_time = time()
        if (new_time - self.last_webhelper_exit < 60):
            self.webhelper_crash_count += 1
            logger.warning(f"webhelper crashed within a minute from last crash! crash count: {self.webhelper_crash_count}")
        else:
            self.webhelper_crash_count = 0
        self.last_webhelper_exit = new_time

        # should never happen
        if (self.webhelper_crash_count > 4):
            await self.updater.do_shutdown()
            # Give up
            exit(0)

    async def shutdown(self, _: Application):
        try:
            logger.info(f"Shutting down...")
            logger.info("Disabling reload...")
            await self.plugin_loader.disable_reload()
            logger.info("Killing plugins...")
            await self.plugin_loader.shutdown_plugins()
            logger.info("Disconnecting from WS...")
            self.reinject = False
            await self.ws.disconnect()
            if self.js_ctx_tab:
                await self.js_ctx_tab.close_websocket()
                self.js_ctx_tab = None
        except:
            logger.info("Error during shutdown:\n" + format_exc())
            pass
        finally:
            logger.info("Cancelling tasks...")
            tasks = all_tasks()
            current = current_task()
            async def cancel_task(task: Task[Any]):
                logger.debug(f"Cancelling task {task}")
                try:
                    task.cancel()
                    try:
                        await task
                    except CancelledError:
                        pass
                    logger.debug(f"Task {task} finished")
                except:
                    logger.warning(f"Failed to cancel task {task}:\n" + format_exc())
                    pass
            if current:
                tasks.remove(current)
            await gather(*[cancel_task(task) for task in tasks])

            logger.info("Shutdown finished.")

    def exception_handler(self, loop: AbstractEventLoop, context: Dict[str, str]):
        if context["message"] == "Unclosed connection":
            return
        loop.default_exception_handler(context)

    async def get_auth_token(self, request: Request):
        return Response(text=get_csrf_token())

    async def load_plugins(self):
        # await self.wait_for_server()
        logger.debug("Loading plugins")
        await self.plugin_loader.import_plugins()
        if self.settings.getSetting("pluginOrder", None) == None:
          self.settings.setSetting("pluginOrder", list(self.plugin_loader.plugins.keys()))
          logger.debug("Did not find pluginOrder setting, set it to default")

    async def loader_reinjector(self):
        while self.reinject:
            tab = None
            nf = False
            dc = False
            while not tab:
                if not self.reinject:
                    return
                try:
                    tab = await get_gamepadui_tab()
                except (client_exceptions.ClientConnectorError, client_exceptions.ServerDisconnectedError):
                    if not dc:
                        logger.debug("Couldn't connect to debugger, waiting...")
                        dc = True
                    pass
                except ValueError:
                    if not nf:
                        logger.debug("Couldn't find GamepadUI tab, waiting...")
                        nf = True
                    pass
                if not tab:
                    await sleep(5)
            await tab.open_websocket()
            self.js_ctx_tab = tab
            await tab.enable()
            await self.inject_javascript(tab, True)
            try:
                async for msg in tab.listen_for_message():
                    if msg.get("method", None) == "Page.domContentEventFired":
                        if not await tab.has_global_var("deckyHasLoaded", False):
                            await self.inject_javascript(tab)
                    elif msg.get("method", None) == "Inspector.detached":
                        if not self.reinject:
                            return
                        logger.info("CEF has requested that we detach.")
                        await tab.close_websocket()
                        self.js_ctx_tab = None
                        break
                # If this is a forceful disconnect the loop will just stop without any failure message. In this case, injector.py will handle this for us so we don't need to close the socket.
                # This is because of https://github.com/aio-libs/aiohttp/blob/3ee7091b40a1bc58a8d7846e7878a77640e96996/aiohttp/client_ws.py#L321
                logger.info("CEF has disconnected...")
                await self.handle_crash()
                # At this point the loop starts again and we connect to the freshly started Steam client once it is ready.
            except Exception:
                if not self.reinject:
                    return
                logger.error("Exception while reading page events " + format_exc())
                await tab.close_websocket()
                self.js_ctx_tab = None
                await self.handle_crash()
                pass
        # while True:
        #     await sleep(5)
        #     if not await tab.has_global_var("deckyHasLoaded", False):
        #         logger.info("Plugin loader isn't present in Steam anymore, reinjecting...")
        #         await self.inject_javascript(tab)

    async def inject_javascript(self, tab: Tab, first: bool=False, request: Request|None=None):
        logger.info("Loading Decky frontend!")
        try:
            # if first:
            if ON_LINUX and await tab.has_global_var("deckyHasLoaded", False):
                await tab.close_websocket()
                self.js_ctx_tab = None
                await restart_webhelper()
                await sleep(1) # To give CEF enough time to close down the websocket
                return # We'll catch the next tab in the main loop
            await tab.evaluate_js(create_inject_script("index.js" if self.webhelper_crash_count < 3 else "fallback.js"), False, False, False)
            if self.webhelper_crash_count > 2:
                self.reinject = False
                await sleep(1)
                await self.updater.do_shutdown()
        except:
            logger.info("Failed to inject JavaScript into tab\n" + format_exc())
            pass

    def run(self):
        run_app(self.web_app, host=get_server_host(), port=get_server_port(), loop=self.loop, access_log=None, handle_signals=True, shutdown_timeout=40)

def main():
    setproctitle(f"Decky Loader {get_loader_version()} ({getproctitle()})")
    setthreadtitle("Decky Loader")
    if ON_WINDOWS:
        # Fix windows/flask not recognising that .js means 'application/javascript'
        import mimetypes
        mimetypes.add_type('application/javascript', '.js')
    else:
        if get_effective_user_id() != 0:
            logger.warning(f"decky is running as an unprivileged user, this is not officially supported and may cause issues")

    # Append the system and user python paths
    sys.path.extend(get_system_pythonpaths())

    logger.info(f"Starting Decky version {get_loader_version()}")

    loop = new_event_loop()
    set_event_loop(loop)
    PluginManager(loop).run()
