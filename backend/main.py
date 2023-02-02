# Change PyInstaller files permissions
import sys
from subprocess import call
if hasattr(sys, '_MEIPASS'):
    call(['chmod', '-R', '755', sys._MEIPASS])
# Full imports
from asyncio import new_event_loop, set_event_loop, sleep
from json import dumps, loads
from logging import DEBUG, INFO, basicConfig, getLogger
from os import getenv, chmod, path
from traceback import format_exc

import aiohttp_cors
# Partial imports
from aiohttp import client_exceptions, WSMsgType
from aiohttp.web import Application, Response, get, run_app, static
from aiohttp_jinja2 import setup as jinja_setup

# local modules
from browser import PluginBrowser
from helpers import (REMOTE_DEBUGGER_UNIT, csrf_middleware, get_csrf_token,
                     get_home_path, get_homebrew_path, get_user, get_user_group,
                     stop_systemd_unit, start_systemd_unit)
from injector import get_gamepadui_tab, Tab, get_tabs, close_old_tabs
from loader import Loader
from settings import SettingsManager
from updater import Updater
from utilities import Utilities

USER = get_user()
GROUP = get_user_group()
HOMEBREW_PATH = get_homebrew_path()
CONFIG = {
    "plugin_path": getenv("PLUGIN_PATH", path.join(HOMEBREW_PATH, "plugins")),
    "chown_plugin_path": getenv("CHOWN_PLUGIN_PATH", "1") == "1",
    "server_host": getenv("SERVER_HOST", "127.0.0.1"),
    "server_port": int(getenv("SERVER_PORT", "1337")),
    "live_reload": getenv("LIVE_RELOAD", "1") == "1",
    "log_level": {"CRITICAL": 50, "ERROR": 40, "WARNING": 30, "INFO": 20, "DEBUG": 10}[
        getenv("LOG_LEVEL", "INFO")
    ],
}

basicConfig(
    level=CONFIG["log_level"],
    format="[%(module)s][%(levelname)s]: %(message)s"
)

logger = getLogger("Main")

def chown_plugin_dir():
    code_chown = call(["chown", "-R", USER+":"+GROUP, CONFIG["plugin_path"]])
    code_chmod = call(["chmod", "-R", "555", CONFIG["plugin_path"]])
    if code_chown != 0 or code_chmod != 0:
        logger.error(f"chown/chmod exited with a non-zero exit code (chown: {code_chown}, chmod: {code_chmod})")

if CONFIG["chown_plugin_path"] == True:
    chown_plugin_dir()

class PluginManager:
    def __init__(self, loop) -> None:
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
        self.plugin_loader = Loader(self.web_app, CONFIG["plugin_path"], self.loop, CONFIG["live_reload"])
        self.plugin_browser = PluginBrowser(CONFIG["plugin_path"], self.plugin_loader.plugins, self.plugin_loader)
        self.settings = SettingsManager("loader", path.join(HOMEBREW_PATH, "settings"))
        self.utilities = Utilities(self)
        self.updater = Updater(self)

        jinja_setup(self.web_app)

        async def startup(_):
            if self.settings.getSetting("cef_forward", False):
                self.loop.create_task(start_systemd_unit(REMOTE_DEBUGGER_UNIT))
            else:
                self.loop.create_task(stop_systemd_unit(REMOTE_DEBUGGER_UNIT))
            self.loop.create_task(self.loader_reinjector())
            self.loop.create_task(self.load_plugins())

        self.web_app.on_startup.append(startup)

        self.loop.set_exception_handler(self.exception_handler)
        self.web_app.add_routes([get("/auth/token", self.get_auth_token)])

        for route in list(self.web_app.router.routes()):
            self.cors.add(route)
        self.web_app.add_routes([static("/static", path.join(path.dirname(__file__), 'static'))])
        self.web_app.add_routes([static("/locales", path.join(path.dirname(__file__), 'locales'))])
        self.web_app.add_routes([static("/legacy", path.join(path.dirname(__file__), 'legacy'))])

    def exception_handler(self, loop, context):
        if context["message"] == "Unclosed connection":
            return
        loop.default_exception_handler(context)

    async def get_auth_token(self, request):
        return Response(text=get_csrf_token())

    async def load_plugins(self):
        # await self.wait_for_server()
        logger.debug("Loading plugins")
        self.plugin_loader.import_plugins()
        # await inject_to_tab("SP", "window.syncDeckyPlugins();")

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
            except Exception as e:
                logger.error("Exception while reading page events " + format_exc())
                await tab.close_websocket()
                pass
        # while True:
        #     await sleep(5)
        #     if not await tab.has_global_var("deckyHasLoaded", False):
        #         logger.info("Plugin loader isn't present in Steam anymore, reinjecting...")
        #         await self.inject_javascript(tab)

    async def inject_javascript(self, tab: Tab, first=False, request=None):
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
        return run_app(self.web_app, host=CONFIG["server_host"], port=CONFIG["server_port"], loop=self.loop, access_log=None)

if __name__ == "__main__":
    loop = new_event_loop()
    set_event_loop(loop)
    PluginManager(loop).run()
