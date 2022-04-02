from aiohttp.web import Application, run_app
from aiohttp_jinja2 import setup as jinja_setup
from jinja2 import FileSystemLoader
from os import getenv, path

from loader import Loader
from injector import inject_to_tab

CONFIG = {
    "plugin_path": getenv("PLUGIN_PATH", "C:\\Users\\mario\\Desktop\\plugins"),
    "server_host": getenv("SERVER_HOST", "127.0.0.1"),
    "server_port": int(getenv("SERVER_PORT", "1337"))
}

class PluginManager:
    def __init__(self) -> None:
        self.web_app = Application()
        jinja_setup(self.web_app, loader=FileSystemLoader('templates'))
        self.web_app.on_startup.append(self.inject_plugin_iframe)

        self.plugin_loader = Loader(self.web_app, CONFIG["plugin_path"])

    async def inject_plugin_iframe(self, request=None):
        return await inject_to_tab("QuickAccess", open(path.join(path.dirname(__file__), "static/plugin_page.js"), "r").read())

    def run(self):
        return run_app(self.web_app, host=CONFIG["server_host"], port=CONFIG["server_port"])

if __name__ == "__main__":
    PluginManager().run()