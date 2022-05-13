from asyncio import Queue
from logging import getLogger
from os import listdir, path
from pathlib import Path
from time import time
from traceback import print_exc

from aiohttp import web
from aiohttp_jinja2 import template
from genericpath import exists
from watchdog.events import FileSystemEventHandler
from watchdog.observers.polling import PollingObserver as Observer

from injector import inject_to_tab
from plugin import PluginWrapper


class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, queue, plugin_path) -> None:
        super().__init__()
        self.logger = getLogger("file-watcher")
        self.plugin_path = plugin_path
        self.queue = queue

    def maybe_reload(self, src_path):
        plugin_dir = Path(path.relpath(src_path, self.plugin_path)).parts[0]
        self.logger.info(path.join(self.plugin_path, plugin_dir, "plugin.json"))
        if exists(path.join(self.plugin_path, plugin_dir, "plugin.json")):
            self.queue.put_nowait((path.join(self.plugin_path, plugin_dir, "main.py"), plugin_dir, True))

    def on_created(self, event):
        src_path = event.src_path
        if "__pycache__" in src_path:
            return

        # check to make sure this isn't a directory
        if path.isdir(src_path):
            return

        # get the directory name of the plugin so that we can find its "main.py" and reload it; the
        # file that changed is not necessarily the one that needs to be reloaded
        self.logger.debug(f"file created: {src_path}")
        self.maybe_reload(src_path)

    def on_modified(self, event):
        src_path = event.src_path
        if "__pycache__" in src_path:
            return

        # check to make sure this isn't a directory
        if path.isdir(src_path):
            return

        # get the directory name of the plugin so that we can find its "main.py" and reload it; the
        # file that changed is not necessarily the one that needs to be reloaded
        self.logger.debug(f"file modified: {src_path}")
        self.maybe_reload(src_path)

class Loader:
    def __init__(self, server_instance, plugin_path, loop, live_reload=False) -> None:
        self.loop = loop
        self.logger = getLogger("Loader")
        self.plugin_path = plugin_path
        self.logger.info(f"plugin_path: {self.plugin_path}")
        self.plugins = {}
        self.import_plugins()

        if live_reload:
            self.reload_queue = Queue()
            self.observer = Observer()
            self.observer.schedule(FileChangeHandler(self.reload_queue, plugin_path), self.plugin_path, recursive=True)
            self.observer.start()
            self.loop.create_task(self.handle_reloads())

        server_instance.add_routes([
            web.get("/plugins", self.handle_plugins),
            web.get("/plugins/{plugin_name}/frontend_bundle", self.handle_frontend_bundle),
            web.post("/plugins/{plugin_name}/methods/{method_name}", self.handle_plugin_method_call),
            web.post("/methods/{method_name}", self.handle_server_method_call)
        ])

    def handle_plugins(self, request):
      plugins = list(map(lambda kv: dict([("name", kv[0])]), self.plugins.items()))
      return web.json_response(plugins)

    def handle_frontend_bundle(self, request):
        plugin = self.plugins[request.match_info["plugin_name"]]

        with open(path.join(self.plugin_path, plugin.plugin_directory, plugin.frontend_bundle), 'r') as bundle:
            return web.Response(text=bundle.read(), content_type="application/javascript")

    def import_plugin(self, file, plugin_directory, refresh=False):
        try:
            plugin = PluginWrapper(file, plugin_directory, self.plugin_path)
            if plugin.name in self.plugins:
                    if not "debug" in plugin.flags and refresh:
                        self.logger.info(f"Plugin {plugin.name} is already loaded and has requested to not be re-loaded")
                        return
                    else:
                        self.plugins[plugin.name].stop()
                        self.plugins.pop(plugin.name, None)
            if plugin.passive:
                self.logger.info(f"Plugin {plugin.name} is passive")
            self.plugins[plugin.name] = plugin.start()
            self.logger.info(f"Loaded {plugin.name}")
            if refresh:
                self.loop.create_task(self.reload_frontend_plugin(plugin.name))
        except Exception as e:
            self.logger.error(f"Could not load {file}. {e}")
            print_exc()

    async def reload_frontend_plugin(self, name):
        await inject_to_tab("SP", f"window.DeckyPluginLoader?.loadPlugin('{name}')")

    def import_plugins(self):
        self.logger.info(f"import plugins from {self.plugin_path}")

        directories = [i for i in listdir(self.plugin_path) if path.isdir(path.join(self.plugin_path, i)) and path.isfile(path.join(self.plugin_path, i, "plugin.json"))]
        for directory in directories:
            self.logger.info(f"found plugin: {directory}")
            self.import_plugin(path.join(self.plugin_path, directory, "main.py"), directory)

    async def handle_reloads(self):
        while True:
            args = await self.reload_queue.get()
            self.import_plugin(*args)

    async def handle_server_method_call(self, request):
        method_name = request.match_info["method_name"]
        method_info = await request.json()
        args = method_info["args"]

        res = {}
        try:
            r = await self.utilities.util_methods[method_name](**args)
            res["result"] = r
            res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False

        return web.json_response(res)

    async def handle_plugin_method_call(self, request):
        res = {}
        plugin = self.plugins[request.match_info["plugin_name"]]
        method_name = request.match_info["method_name"]

        method_info = await request.json()
        args = method_info["args"]

        try:
          if method_name.startswith("_"):
              raise RuntimeError("Tried to call private method")

          res["result"] = await plugin.execute_method(method_name, args)
          res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False

        return web.json_response(res)
