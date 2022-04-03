from aiohttp import web
from aiohttp_jinja2 import template

from os import path, listdir
from importlib.util import spec_from_file_location, module_from_spec
from logging import getLogger

import injector

class Loader:
    def __init__(self, server_instance, plugin_path) -> None:
        self.logger = getLogger("Loader")
        self.plugin_path = plugin_path
        self.plugins = self.import_plugins()

        server_instance.add_routes([
            web.get("/plugins/iframe", self.plugin_iframe_route),
            web.get("/plugins/reload", self.reload_plugins),
            web.post("/plugins/method_call", self.handle_plugin_method_call),
            web.get("/plugins/load/{name}", self.load_plugin),
            web.get("/steam_resource/{path:.+}", self.get_steam_resource)
        ])

    def import_plugins(self):
        files = [i for i in listdir(self.plugin_path) if i.endswith(".py")]
        dc = {}
        for file in files:
            try:
                spec = spec_from_file_location("_", path.join(self.plugin_path, file))
                module = module_from_spec(spec)
                spec.loader.exec_module(module)
                dc[module.Plugin.name] = module.Plugin
                self.logger.info("Loaded {}".format(module.Plugin.name))
            except Exception as e:
                self.logger.error("Could not load {}. {}".format(file, e))
        return dc
    
    async def load_plugin(self, request):
        plugin = self.plugins[request.match_info["name"]]
        return web.Response(text=plugin.main_view_html, content_type="text/html")

    async def reload_plugins(self, request=None):
        self.logger.info("Re-importing all plugins.")
        self.plugins = self.import_plugins()

    async def handle_plugin_method_call(self, request):
        data = await request.post()
        try:
            result = getattr(self.plugins[data["plugin"]], data["method"])(*data["args"])
            return web.json_response({"result": result})
        except Exception as e:
            return web.json_response({"result": e}, status=400)

    async def get_steam_resource(self, request):
        tab = (await injector.get_tabs())[0]
        return web.Response(text=await tab.get_steam_resource(f"https://steamloopback.host/{request.match_info['path']}"), content_type="text/html")

    @template('plugin_view.html')
    async def plugin_iframe_route(self, request):
        return {"plugins": self.plugins.values()}