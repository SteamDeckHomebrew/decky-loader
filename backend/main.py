# Full imports
from asyncio import get_event_loop, sleep
from json import dumps, loads
from logging import DEBUG, INFO, basicConfig, getLogger
from os import getenv, path
from subprocess import call
from traceback import format_exc

import aiohttp_cors
# Partial imports
from aiohttp import ClientSession
from aiohttp.web import Application, Response, get, run_app, static
from aiohttp_jinja2 import setup as jinja_setup

# local modules
from browser import PluginBrowser
from helpers import (REMOTE_DEBUGGER_UNIT, csrf_middleware, get_csrf_token,
                     get_home_path, get_homebrew_path, get_user,
                     get_user_group, set_user, set_user_group,
                     stop_systemd_unit)
from injector import inject_to_tab, tab_has_global_var
from loader import Loader
from settings import SettingsManager
from updater import Updater
from utilities import Utilities

# Ensure USER and GROUP vars are set first.
# TODO: This isn't the best way to do this but supports the current
# implementation. All the config load and environment setting eventually be
# moved into init or a config/loader method.
set_user()
set_user_group()
USER = get_user()
GROUP = get_user_group()
HOME_PATH = "/home/"+USER
HOMEBREW_PATH = HOME_PATH+"/homebrew"
CONFIG = {
    "plugin_path": getenv("PLUGIN_PATH", HOMEBREW_PATH+"/plugins"),
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

async def chown_plugin_dir(_):
    code_chown = call(["chown", "-R", USER+":"+GROUP, CONFIG["plugin_path"]])
    code_chmod = call(["chmod", "-R", "555", CONFIG["plugin_path"]])
    if code_chown != 0 or code_chmod != 0:
        logger.error(f"chown/chmod exited with a non-zero exit code (chown: {code_chown}, chmod: {code_chmod})")

class PluginManager:
    def __init__(self) -> None:
        self.loop = get_event_loop()
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
        if CONFIG["chown_plugin_path"] == True:
            self.web_app.on_startup.append(chown_plugin_dir)
        self.loop.create_task(self.loader_reinjector())
        self.loop.create_task(self.load_plugins())
        if not self.settings.getSetting("cef_forward", False):
            self.loop.create_task(stop_systemd_unit(REMOTE_DEBUGGER_UNIT))
        self.loop.set_exception_handler(self.exception_handler)
        self.web_app.add_routes([get("/auth/token", self.get_auth_token)])

        for route in list(self.web_app.router.routes()):
            self.cors.add(route)
        self.web_app.add_routes([static("/static", path.join(path.dirname(__file__), 'static'))])
        self.web_app.add_routes([static("/legacy", path.join(path.dirname(__file__), 'legacy'))])

    def exception_handler(self, loop, context):
        if context["message"] == "Unclosed connection":
            return
        loop.default_exception_handler(context)

    async def get_auth_token(self, request):
        return Response(text=get_csrf_token())

    async def wait_for_server(self):
        async with ClientSession() as web:
            while True:
                try:
                    await web.get(f"http://{CONFIG['server_host']}:{CONFIG['server_port']}")
                    return
                except Exception as e:
                    await sleep(0.1)

    async def load_plugins(self):
        await self.wait_for_server()
        self.plugin_loader.import_plugins()
        # await inject_to_tab("SP", "window.syncDeckyPlugins();")

    async def loader_reinjector(self):
        await sleep(2)
        await self.inject_javascript()
        while True:
            await sleep(5)
            if not await tab_has_global_var("SP", "deckyHasLoaded"):
                logger.info("Plugin loader isn't present in Steam anymore, reinjecting...")
                await self.inject_javascript()

    async def inject_javascript(self, request=None):
        try:
            await inject_to_tab("SP", "try{if (window.deckyHasLoaded) location.reload();window.deckyHasLoaded = true;(async()=>{while(!window.SP_REACT){await new Promise(r => setTimeout(r, 10))};await import('http://localhost:1337/frontend/index.js')})();}catch(e){console.error(e)}", True)
        except:
            logger.info("Failed to inject JavaScript into tab\n" + format_exc())
            pass

    def run(self):
        return run_app(self.web_app, host=CONFIG["server_host"], port=CONFIG["server_port"], loop=self.loop, access_log=None)

if __name__ == "__main__":
    PluginManager().run()
