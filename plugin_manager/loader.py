from aiohttp import web
from aiohttp_jinja2 import template

from os import path, listdir
from importlib.util import spec_from_file_location, module_from_spec
from logging import error

class Loader:
    def __init__(self, server_instance, plugin_path) -> None:
        self.plugin_path = plugin_path
        self.plugins = self.import_plugins()

        server_instance.add_routes([
            web.get("/plugins/iframe", self.plugin_iframe_route),
            web.get("/plugins/reload", self.reload_plugins),
            web.post("/plugins/method_call", self.handle_plugin_method_call),
            web.get("/plugins/load/{name}", self.load_plugin)
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
            except Exception as e:
                error("Could not load {}. {}".format(file, e))
        return dc
    
    async def load_plugin(self, request):
        plugin = self.plugins[request.match_info["name"]]
        return web.Response(plugin.main_view_html)

    async def reload_plugins(self, request=None):
        self.plugins = self.import_plugins()

    async def handle_plugin_method_call(self, request):
        data = await request.post()
        try:
            result = getattr(self.plugins[data["plugin"]], data["method"])(*data["args"])
            return web.json_response({"result": result})
        except Exception as e:
            return web.json_response({"result": e}, status=400)

    @template('plugin_view.html')
    async def plugin_iframe_route(self):
        return {"plugins": self.plugins}