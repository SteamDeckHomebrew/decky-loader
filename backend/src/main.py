# Change PyInstaller files permissions
import sys
from typing import Dict
from .localplatform import (chmod, chown, service_stop, service_start,
                            ON_WINDOWS, get_log_level, get_live_reload, 
                            get_server_port, get_server_host, get_chown_plugin_path,
                            get_privileged_path)
if hasattr(sys, '_MEIPASS'):
    chmod(sys._MEIPASS, 755) # type: ignore
# Full imports
from asyncio import AbstractEventLoop, new_event_loop, set_event_loop, sleep
from logging import basicConfig, getLogger
from os import path
from traceback import format_exc
import multiprocessing

import aiohttp_cors # type: ignore
# Partial imports
from aiohttp import client_exceptions
from aiohttp.web import Application, Response, Request, get, run_app, static # type: ignore
from aiohttp_jinja2 import setup as jinja_setup

# local modules
from .browser import PluginBrowser
from .helpers import (REMOTE_DEBUGGER_UNIT, csrf_middleware, get_csrf_token,
                     mkdir_as_user, get_system_pythonpaths, get_effective_user_id)
                     
from .injector import get_gamepadui_tab, Tab, close_old_tabs
from .loader import Loader
from .settings import SettingsManager
from .updater import Updater
from .utilities import Utilities
from .customtypes import UserType


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
        self.web_app = Application()
        self.web_app.middlewares.append(csrf_middleware)
        self.cors = aiohttp_cors.setup(self.web_app, defaults={
            "https://steamloopback.host": aiohttp_cors.ResourceOptions(
                expose_headers="*",
                allow_headers="*",
                allow_credentials=True
            )
        })
        self.plugin_loader = Loader(self, plugin_path, self.loop, get_live_reload())
        self.settings = SettingsManager("loader", path.join(get_privileged_path(), "settings"))
        self.plugin_browser = PluginBrowser(plugin_path, self.plugin_loader.plugins, self.plugin_loader, self.settings) 
        self.utilities = Utilities(self)
        self.updater = Updater(self)

        jinja_setup(self.web_app)

        async def startup(_: Application):
            if self.settings.getSetting("cef_forward", False):
                self.loop.create_task(service_start(REMOTE_DEBUGGER_UNIT))
            else:
                self.loop.create_task(service_stop(REMOTE_DEBUGGER_UNIT))
            self.loop.create_task(self.loader_reinjector())
            self.loop.create_task(self.load_plugins())

        self.web_app.on_startup.append(startup)

        self.loop.set_exception_handler(self.exception_handler)
        self.web_app.add_routes([get("/auth/token", self.get_auth_token)])

        for route in list(self.web_app.router.routes()):
            self.cors.add(route) # type: ignore
        self.web_app.add_routes([static("/static", path.join(path.dirname(__file__), '..', 'static'))])
        self.web_app.add_routes([static("/legacy", path.join(path.dirname(__file__), 'legacy'))])

    def exception_handler(self, loop: AbstractEventLoop, context: Dict[str, str]):
        if context["message"] == "Unclosed connection":
            return
        loop.default_exception_handler(context)

    async def get_auth_token(self, request: Request):
        return Response(text=get_csrf_token())

    async def load_plugins(self):
        # await self.wait_for_server()
        logger.debug("Loading plugins")
        self.plugin_loader.import_plugins()
        # await inject_to_tab("SP", "window.syncDeckyPlugins();")
        if self.settings.getSetting("pluginOrder", None) == None:
          self.settings.setSetting("pluginOrder", list(self.plugin_loader.plugins.keys()))
          logger.debug("Did not find pluginOrder setting, set it to default")

    async def loader_reinjector(self):
        while True:
            tab = None
            nf = False
            dc = False
            while not tab:
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
            await tab.enable()
            await self.inject_javascript(tab, True)
            try:
                async for msg in tab.listen_for_message():
                    # this gets spammed a lot
                    if msg.get("method", None) != "Page.navigatedWithinDocument":
                        logger.debug("Page event: " + str(msg.get("method", None)))
                        if msg.get("method", None) == "Page.domContentEventFired":
                            if not await tab.has_global_var("deckyHasLoaded", False):
                                await self.inject_javascript(tab)
                        if msg.get("method", None) == "Inspector.detached":
                            logger.info("CEF has requested that we detach.")
                            await tab.close_websocket()
                            break
                # If this is a forceful disconnect the loop will just stop without any failure message. In this case, injector.py will handle this for us so we don't need to close the socket.
                # This is because of https://github.com/aio-libs/aiohttp/blob/3ee7091b40a1bc58a8d7846e7878a77640e96996/aiohttp/client_ws.py#L321
                logger.info("CEF has disconnected...")
                # At this point the loop starts again and we connect to the freshly started Steam client once it is ready.
            except Exception:
                logger.error("Exception while reading page events " + format_exc())
                await tab.close_websocket()
                pass
        # while True:
        #     await sleep(5)
        #     if not await tab.has_global_var("deckyHasLoaded", False):
        #         logger.info("Plugin loader isn't present in Steam anymore, reinjecting...")
        #         await self.inject_javascript(tab)

    async def inject_javascript(self, tab: Tab, first: bool=False, request: Request|None=None):
        logger.info("Loading Decky frontend!")
        try:
            if first:
                if await tab.has_global_var("deckyHasLoaded", False):
                    await close_old_tabs()
            await tab.evaluate_js("try{if (window.deckyHasLoaded){setTimeout(() => location.reload(), 100)}else{window.deckyHasLoaded = true;(async()=>{try{while(!window.SP_REACT){await new Promise(r => setTimeout(r, 10))};await import('http://localhost:1337/frontend/index.js')}catch(e){console.error(e)};})();}}catch(e){console.error(e)}", False, False, False)
        except:
            logger.info("Failed to inject JavaScript into tab\n" + format_exc())
            pass

    def run(self):
        return run_app(self.web_app, host=get_server_host(), port=get_server_port(), loop=self.loop, access_log=None)

def main():
    if ON_WINDOWS:
        # Fix windows/flask not recognising that .js means 'application/javascript'
        import mimetypes
        mimetypes.add_type('application/javascript', '.js')

        # Required for multiprocessing support in frozen files
        multiprocessing.freeze_support()
    else:
      if get_effective_user_id() != 0:
        logger.warning(f"decky is running as an unprivileged user, this is not officially supported and may cause issues")

    # Append the loader's plugin path to the recognized python paths
    sys.path.append(path.join(path.dirname(__file__), "..", "plugin"))

    # Append the system and user python paths
    sys.path.extend(get_system_pythonpaths())

    loop = new_event_loop()
    set_event_loop(loop)
    PluginManager(loop).run()
