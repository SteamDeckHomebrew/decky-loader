from aiohttp import web
from aiohttp_jinja2 import template
from watchdog.observers.polling import PollingObserver as Observer
from watchdog.events import FileSystemEventHandler

from os import path, listdir
from logging import getLogger

from injector import get_tabs, get_tab
from plugin import PluginWrapper

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self, loader, plugin_path) -> None:
        super().__init__()
        self.logger = getLogger("file-watcher")
        self.loader : Loader = loader
        self.plugin_path = plugin_path

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
        rel_path = path.relpath(src_path, path.commonprefix([self.plugin_path, src_path]))
        plugin_dir = path.split(rel_path)[0]
        main_file_path = path.join(self.plugin_path, plugin_dir, "main.py")
        if not path.isfile(main_file_path):
            return
        self.loader.import_plugin(main_file_path, plugin_dir, refresh=True)
    
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
        plugin_dir = path.split(path.relpath(src_path, path.commonprefix([self.plugin_path, src_path])))[0]
        self.loader.import_plugin(path.join(self.plugin_path, plugin_dir, "main.py"), plugin_dir, refresh=True)

class Loader:
    def __init__(self, server_instance, plugin_path, loop, live_reload=False) -> None:
        self.loop = loop
        self.logger = getLogger("Loader")
        self.plugin_path = plugin_path
        self.logger.info(f"plugin_path: {self.plugin_path}")
        self.plugins = {}
        self.import_plugins()

        if live_reload:
            self.observer = Observer()
            self.observer.schedule(FileChangeHandler(self, plugin_path), self.plugin_path, recursive=True)
            self.observer.start()

        server_instance.add_routes([
            web.get("/plugins/iframe", self.plugin_iframe_route),
            web.get("/plugins/reload", self.reload_plugins),
            web.get("/plugins/load_main/{name}", self.load_plugin_main_view),
            web.get("/plugins/plugin_resource/{name}/{path:.+}", self.handle_sub_route),
            web.get("/plugins/load_tile/{name}", self.load_plugin_tile_view),
            web.get("/steam_resource/{path:.+}", self.get_steam_resource)
        ])

    def import_plugin(self, file, plugin_directory, refresh=False):
        try:
            plugin = PluginWrapper(file, plugin_directory, self.plugin_path)
            if plugin.name in self.plugins:
                    if not "hot_reload" in plugin.flags and refresh:
                        self.logger.info(f"Plugin {plugin.name} is already loaded and has requested to not be re-loaded")
                        return
                    else:
                        self.plugins[plugin.name].stop(self.loop)
                        self.plugins.pop(plugin.name, None)
            self.plugins[plugin.name] = plugin.start(self.loop)
            self.logger.info(f"Loaded {plugin.name}")
        except Exception as e:
            self.logger.error(f"Could not load {file}. {e}")
        finally:
            if refresh:
                self.loop.create_task(self.refresh_iframe())

    def import_plugins(self):
        self.logger.info(f"import plugins from {self.plugin_path}")

        directories = [i for i in listdir(self.plugin_path) if path.isdir(path.join(self.plugin_path, i)) and path.isfile(path.join(self.plugin_path, i, "main.py"))]
        for directory in directories:
            self.logger.info(f"found plugin: {directory}")
            self.import_plugin(path.join(self.plugin_path, directory, "main.py"), directory)

    async def reload_plugins(self, request=None):
        self.logger.info("Re-importing plugins.")
        self.import_plugins()

    async def handle_plugin_method_call(self, plugin_name, method_name, **kwargs):
        if method_name.startswith("_"):
            raise RuntimeError("Tried to call private method")
        return await self.plugins[plugin_name].execute_method(method_name, kwargs)

    async def get_steam_resource(self, request):
        tab = (await get_tabs())[0]
        try:
            return web.Response(text=await tab.get_steam_resource(f"https://steamloopback.host/{request.match_info['path']}"), content_type="text/html")
        except Exception as e:
            return web.Response(text=str(e), status=400)

    async def load_plugin_main_view(self, request):
        plugin = self.plugins[request.match_info["name"]]

        # open up the main template
        with open(path.join(self.plugin_path, plugin.plugin_directory, plugin.main_view_html), 'r') as template:
            template_data = template.read()
            # setup the main script, plugin, and pull in the template
            ret = f"""
            <script src="/static/library.js"></script>
            <script>const plugin_name = '{plugin.name}' </script>
            <base href="http://127.0.0.1:1337/plugins/plugin_resource/{plugin.name}/">
            {template_data}
            """
            return web.Response(text=ret, content_type="text/html")

    async def handle_sub_route(self, request):
        plugin = self.plugins[request.match_info["name"]]
        route_path = request.match_info["path"]
        self.logger.info(path)

        ret = ""

        file_path = path.join(self.plugin_path, plugin.plugin_directory, route_path)
        with open(file_path, 'r') as resource_data:
            ret = resource_data.read()

        return web.Response(text=ret)

    async def load_plugin_tile_view(self, request):
        plugin = self.plugins[request.match_info["name"]]

        inner_content = ""

        # open up the tile template (if we have one defined)
        if hasattr(plugin, "tile_view_html"):
            with open(path.join(self.plugin_path, plugin.plugin_directory, plugin.tile_view_html), 'r') as template:
                template_data = template.read()
                inner_content = template_data
        
        # setup the default template
        ret = f"""
        <html style="height: fit-content;">
            <head>
                <link rel="stylesheet" href="/static/styles.css">
                <script src="/static/library.js"></script>
                <script>const plugin_name = '{plugin.name}';</script>
            </head>
            <body style="height: fit-content; display: block;">
                {inner_content}
            </body>
        <html>
        """
        return web.Response(text=ret, content_type="text/html")

    @template('plugin_view.html')
    async def plugin_iframe_route(self, request):
        return {"plugins": self.plugins.values()}

    async def refresh_iframe(self):
        tab = await get_tab("QuickAccess")
        await tab.open_websocket()
        return await tab.evaluate_js("reloadIframe()", False)