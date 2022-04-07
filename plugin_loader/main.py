from logging import getLogger, basicConfig, INFO, DEBUG
from os import getenv

CONFIG = {
    "plugin_path": getenv("PLUGIN_PATH", "/home/deck/homebrew/plugins"),
    "server_host": getenv("SERVER_HOST", "127.0.0.1"),
    "server_port": int(getenv("SERVER_PORT", "1337")),
    "live_reload": getenv("LIVE_RELOAD", "1") == "1",
    "log_level": {"CRITICAL": 50, "ERROR": 40, "WARNING":30, "INFO": 20, "DEBUG": 10}[getenv("LOG_LEVEL", "INFO")],
    "store_url": getenv("STORE_URL", "https://sdh.tzatzi.me/browse")
}

basicConfig(level=CONFIG["log_level"], format="[%(module)s][%(levelname)s]: %(message)s")

from aiohttp.web import Application, run_app, static
from aiohttp_jinja2 import setup as jinja_setup
from jinja2 import FileSystemLoader
from os import path
from asyncio import get_event_loop, sleep
from json import loads, dumps

from loader import Loader
from injector import inject_to_tab, get_tab, tab_has_element
from utilities import Utilities
from browser import PluginBrowser


logger = getLogger("Main")

class PluginManager:
    def __init__(self) -> None:
        self.loop = get_event_loop()
        self.web_app = Application()
        self.plugin_loader = Loader(self.web_app, CONFIG["plugin_path"], self.loop, CONFIG["live_reload"])
        self.plugin_browser = PluginBrowser(CONFIG["plugin_path"], self.web_app, CONFIG["store_url"])
        self.utilities = Utilities(self)

        jinja_setup(self.web_app, loader=FileSystemLoader(path.join(path.dirname(__file__), 'templates')))
        self.web_app.on_startup.append(self.inject_javascript)
        self.web_app.add_routes([static("/static", path.join(path.dirname(__file__), 'static'))])
        self.loop.create_task(self.method_call_listener())
        self.loop.create_task(self.loader_reinjector())

        self.loop.set_exception_handler(self.exception_handler)

    def exception_handler(self, loop, context):
        if context["message"] == "Unclosed connection":
            return
        loop.default_exception_handler(context)

    async def resolve_method_call(self, tab, call_id, response):
        await tab._send_devtools_cmd({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": "resolveMethodCall({}, {})".format(call_id, dumps(response)),
                "userGesture": True
            }
        }, receive=False)

    async def handle_method_call(self, method, tab):
        res = {}
        try:
            if method["method"] == "plugin_method":
                res["result"] = await self.plugin_loader.handle_plugin_method_call(
                    method["args"]["plugin_name"],
                    method["args"]["method_name"],
                    **method["args"]["args"]
                )
                res["success"] = True
            else:
                r = await self.utilities.util_methods[method["method"]](**method["args"])
                res["result"] = r
                res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        finally:
            await self.resolve_method_call(tab, method["id"], res)

    async def method_call_listener(self):
        tab = await get_tab("QuickAccess")
        await tab.open_websocket()
        await tab._send_devtools_cmd({"id": 1, "method": "Runtime.discardConsoleEntries"})
        await tab._send_devtools_cmd({"id": 1, "method": "Runtime.enable"})
        async for message in tab.listen_for_message():
            data = message.json()
            if not "id" in data and data["method"] == "Runtime.consoleAPICalled" and data["params"]["type"] == "debug":
                method = loads(data["params"]["args"][0]["value"])
                self.loop.create_task(self.handle_method_call(method, tab))
                
    async def loader_reinjector(self):
        while True:
            await sleep(1)
            if not await tab_has_element("QuickAccess", "plugin_iframe"):
                logger.info("Plugin loader isn't present in Steam anymore, reinjecting...")
                await self.inject_javascript()

    async def inject_javascript(self, request=None):
        try:
            await inject_to_tab("QuickAccess", open(path.join(path.dirname(__file__), "static/plugin_page.js"), "r").read())
        except:
            logger.info("Failed to inject JavaScript into tab")
            pass

    def run(self):
        return run_app(self.web_app, host=CONFIG["server_host"], port=CONFIG["server_port"], loop=self.loop, access_log=None)

if __name__ == "__main__":
    PluginManager().run()