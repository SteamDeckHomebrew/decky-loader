from logging import DEBUG, INFO, basicConfig, getLogger
from os import getenv

from aiohttp import ClientSession

CONFIG = {
    "plugin_path": getenv("PLUGIN_PATH", "/home/deck/homebrew/plugins"),
    "chown_plugin_path": getenv("CHOWN_PLUGIN_PATH", "1") == "1",
    "server_host": getenv("SERVER_HOST", "127.0.0.1"),
    "server_port": int(getenv("SERVER_PORT", "1337")),
    "live_reload": getenv("LIVE_RELOAD", "1") == "1",
    "log_level": {"CRITICAL": 50, "ERROR": 40, "WARNING":30, "INFO": 20, "DEBUG": 10}[getenv("LOG_LEVEL", "INFO")]
}

basicConfig(level=CONFIG["log_level"], format="[%(module)s][%(levelname)s]: %(message)s")

from asyncio import get_event_loop, sleep
from json import dumps, loads
from os import path
from subprocess import call

import aiohttp_cors
from aiohttp.web import Application, run_app, static
from aiohttp_jinja2 import setup as jinja_setup

from browser import PluginBrowser
from injector import inject_to_tab, tab_has_global_var
from loader import Loader
from utilities import Utilities
from updater import Updater

logger = getLogger("Main")

async def chown_plugin_dir(_):
    code_chown = call(["chown", "-R", "deck:deck", CONFIG["plugin_path"]])
    code_chmod = call(["chmod", "-R", "555", CONFIG["plugin_path"]])
    if code_chown != 0 or code_chmod != 0:
        logger.error(f"chown/chmod exited with a non-zero exit code (chown: {code_chown}, chmod: {code_chmod})")

class PluginManager:
    def __init__(self) -> None:
        self.loop = get_event_loop()
        self.web_app = Application()
        self.cors = aiohttp_cors.setup(self.web_app, defaults={
          "https://steamloopback.host": aiohttp_cors.ResourceOptions(expose_headers="*",
                allow_headers="*")
        })
        self.plugin_loader = Loader(self.web_app, CONFIG["plugin_path"], self.loop, CONFIG["live_reload"])
        self.plugin_browser = PluginBrowser(CONFIG["plugin_path"], self.web_app, self.plugin_loader.plugins)
        self.utilities = Utilities(self)
        self.updater = Updater(self)

        jinja_setup(self.web_app)
        self.web_app.on_startup.append(self.inject_javascript)
        if CONFIG["chown_plugin_path"] == True:
            self.web_app.on_startup.append(chown_plugin_dir)
        self.loop.create_task(self.loader_reinjector())
        self.loop.create_task(self.load_plugins())
        self.loop.set_exception_handler(self.exception_handler)
        for route in list(self.web_app.router.routes()):
          self.cors.add(route)
        self.web_app.add_routes([static("/static", path.join(path.dirname(__file__), 'static'))])
        self.web_app.add_routes([static("/legacy", path.join(path.dirname(__file__), 'legacy'))])

    def exception_handler(self, loop, context):
        if context["message"] == "Unclosed connection":
            return
        loop.default_exception_handler(context)

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
        #await inject_to_tab("SP", "window.syncDeckyPlugins();")

    async def loader_reinjector(self):
        while True:
            await sleep(5)
            if not await tab_has_global_var("SP", "deckyHasLoaded"):
                logger.info("Plugin loader isn't present in Steam anymore, reinjecting...")
                await self.inject_javascript()

    async def inject_javascript(self, request=None):
        try:
            await inject_to_tab("SP", "try{" + open(path.join(path.dirname(__file__), "./static/plugin-loader.iife.js"), "r").read() + "}catch(e){console.error(e)}", True)
        except:
            logger.info("Failed to inject JavaScript into tab")
            pass

    def run(self):
        return run_app(self.web_app, host=CONFIG["server_host"], port=CONFIG["server_port"], loop=self.loop, access_log=None)

if __name__ == "__main__":
    PluginManager().run()
