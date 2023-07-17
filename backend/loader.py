from asyncio import Queue, sleep
from json.decoder import JSONDecodeError
from logging import getLogger
from os import listdir, path
from pathlib import Path
from traceback import print_exc
from json import load

from aiohttp import web
from os.path import exists
from watchdog.events import RegexMatchingEventHandler
from watchdog.observers import Observer

from injector import get_tab, get_gamepadui_tab
from plugin import PluginWrapper

import frontmatter

class FileChangeHandler(RegexMatchingEventHandler):
    def __init__(self, queue, plugin_path) -> None:
        super().__init__(regexes=[r'^.*?dist\/index\.js$', r'^.*?main\.py$'])
        self.logger = getLogger("file-watcher")
        self.plugin_path = plugin_path
        self.queue = queue
        self.disabled = True

    def maybe_reload(self, src_path):
        if self.disabled:
            return
        plugin_dir = Path(path.relpath(src_path, self.plugin_path)).parts[0]
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
        self.plugins : dict[str, PluginWrapper] = {}
        self.watcher = None
        self.live_reload = live_reload
        self.reload_queue = Queue()
        self.loop.create_task(self.handle_reloads())

        if live_reload:
            self.observer = Observer()
            self.watcher = FileChangeHandler(self.reload_queue, plugin_path)
            self.observer.schedule(self.watcher, self.plugin_path, recursive=True)
            self.observer.start()
            self.loop.create_task(self.enable_reload_wait())
            
        server_instance.add_routes([
            web.get("/frontend/{path:.*}", self.handle_frontend_assets),
            web.get("/locales/{path:.*}", self.handle_frontend_locales),
            web.get("/docs/{plugin_name}/{language}", self.get_plugin_documentation),
            web.get("/plugins", self.get_plugins),
            web.get("/plugins/{plugin_name}/frontend_bundle", self.handle_frontend_bundle),
            web.post("/plugins/{plugin_name}/methods/{method_name}", self.handle_plugin_method_call),
            web.get("/plugins/{plugin_name}/assets/{path:.*}", self.handle_plugin_frontend_assets),
            web.post("/plugins/{plugin_name}/reload", self.handle_backend_reload_request),

            # The following is legacy plugin code.
            web.get("/plugins/load_main/{name}", self.load_plugin_main_view),
            web.get("/plugins/plugin_resource/{name}/{path:.+}", self.handle_sub_route),
            web.get("/steam_resource/{path:.+}", self.get_steam_resource)
        ])

    async def enable_reload_wait(self):
        if self.live_reload:
            await sleep(10)
            self.logger.info("Hot reload enabled")
            self.watcher.disabled = False

    async def handle_frontend_assets(self, request):
        file = path.join(path.dirname(__file__), "static", request.match_info["path"])

        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_frontend_locales(self, request):
        req_lang = request.match_info["path"]
        file = path.join(path.dirname(__file__), "locales", req_lang)
        if exists(file):
            return web.FileResponse(file, headers={"Cache-Control": "no-cache", "Content-Type": "application/json"})
        else:
            self.logger.info(f"Language {req_lang} not available, returning an empty dictionary")
            return web.json_response(data={}, headers={"Cache-Control": "no-cache"})

    async def get_plugins(self, request):
        plugins = list(self.plugins.values())
        return web.json_response([{"name": str(i) if not i.legacy else "$LEGACY_"+str(i), "version": i.version} for i in plugins])

    def handle_plugin_frontend_assets(self, request):
        plugin = self.plugins[request.match_info["plugin_name"]]
        file = path.join(self.plugin_path, plugin.plugin_directory, "dist/assets", request.match_info["path"])

        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})
    
    def get_plugin_documentation(self, request):
        plugin_name, language = request.match_info["plugin_name"], request.match_info["language"]
        plugin_path = path.join(self.plugin_path, self.plugins[plugin_name].plugin_directory)
        docs_path = path.join(plugin_path, "docs")
        self.logger.info(f"Loading docs for {plugin_name} in {language}")

        if not exists(docs_path):
            try:
                with open(path.join(plugin_path, "README.md")) as f:
                    return web.json_response([{"title":"readme","text":f.read()}])
            except:
                logger.error(f"Failed to load readme file for {plugin_name} at {plugin_path}")

        docs = [] # [{"title":"readable name", "text":"marked up file"},'separator',...]

        config = {"default_language": "en-US", "include_readme": "False", "file_list":None, "use_translation":None}
        try:
            with open(path.join(docs_path, "docs.json")) as f:
                config_file = load(f)
                for key in config:
                    if key in config_file:
                        config[key] = config_file[key]
        except:
            self.logger.warning(f"unable to load docs.json for {plugin_name} at {plugin_path}")

        if config["use_translation"] == None:
            if exists(path.join(docs_path, config["default_language"])):
                config["use_translation"] = "True"
            else:
                config["use_translation"] = "False"
        if config["use_translation"] == "True": docs_file_path = path.join(docs_path, language)
        elif config["use_translation"] == "False": docs_file_path = docs_path

        if config["file_list"] == None:
            files = listdir(docs_file_path)
            config["file_list"] = filter(lambda x: (x[-3:] == ".md"),files)


        for filename in config["file_list"]:
            if filename == "seperator":
                docs.append('separator')
            else:
                try:
                    if config["use_translation"] == "True" and not exists(path.join(docs_file_path,filename)):
                        data = frontmatter.load(path.join(docs_path, config["default_language"]))
                    else:
                        data = frontmatter.load(path.join(docs_file_path,filename))
                    docs.append({
                        "title": data.get("title", filename),
                        "text": data.content
                        })
                except:
                    self.logger.warning(f"unable to load file {filename} for {plugin_name} at {docs_file_path}")

        if config["include_readme"] == "True":
            try:
                with open(path.join(plugin_path, "README.md")) as f:
                    docs.append({"title":"readme","text": f.read()})
            except:
                self.logger.warning(f"unable to load the readme for {plugin_name} at {plugin_path}")

        return web.json_response(docs)


    def handle_frontend_bundle(self, request):
        plugin = self.plugins[request.match_info["plugin_name"]]

        with open(path.join(self.plugin_path, plugin.plugin_directory, "dist/index.js"), "r", encoding="utf-8") as bundle:
            return web.Response(text=bundle.read(), content_type="application/javascript")

    def import_plugin(self, file, plugin_directory, refresh=False, batch=False):
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
            if not batch:
                self.loop.create_task(self.dispatch_plugin(plugin.name if not plugin.legacy else "$LEGACY_" + plugin.name, plugin.version))
        except Exception as e:
            self.logger.error(f"Could not load {file}. {e}")
            print_exc()

    async def dispatch_plugin(self, name, version):
        gpui_tab = await get_gamepadui_tab()
        await gpui_tab.evaluate_js(f"window.importDeckyPlugin('{name}', '{version}')")

    def import_plugins(self):
        self.logger.info(f"import plugins from {self.plugin_path}")

        directories = [i for i in listdir(self.plugin_path) if path.isdir(path.join(self.plugin_path, i)) and path.isfile(path.join(self.plugin_path, i, "plugin.json"))]
        for directory in directories:
            self.logger.info(f"found plugin: {directory}")
            self.import_plugin(path.join(self.plugin_path, directory, "main.py"), directory, False, True)

    async def handle_reloads(self):
        while True:
            args = await self.reload_queue.get()
            self.import_plugin(*args)

    async def handle_plugin_method_call(self, request):
        res = {}
        plugin = self.plugins[request.match_info["plugin_name"]]
        method_name = request.match_info["method_name"]
        try:
            method_info = await request.json()
            args = method_info["args"]
        except JSONDecodeError:
            args = {}
        try:
          if method_name.startswith("_"):
              raise RuntimeError("Tried to call private method")
          res["result"] = await plugin.execute_method(method_name, args)
          res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        return web.json_response(res)

    """
    The following methods are used to load legacy plugins, which are considered deprecated.
    I made the choice to re-add them so that the first iteration/version of the react loader
    can work as a drop-in replacement for the stable branch of the PluginLoader, so that we
    can introduce it more smoothly and give people the chance to sample the new features even
    without plugin support. They will be removed once legacy plugins are no longer relevant.
    """
    async def load_plugin_main_view(self, request):
        plugin = self.plugins[request.match_info["name"]]
        with open(path.join(self.plugin_path, plugin.plugin_directory, plugin.main_view_html), "r", encoding="utf-8") as template:
            template_data = template.read()
            ret = f"""
            <script src="/legacy/library.js"></script>
            <script>window.plugin_name = '{plugin.name}' </script>
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
        with open(file_path, "r", encoding="utf-8") as resource_data:
            ret = resource_data.read()

        return web.Response(text=ret)

    async def get_steam_resource(self, request):
        tab = await get_tab("SP")
        try:
            return web.Response(text=await tab.get_steam_resource(f"https://steamloopback.host/{request.match_info['path']}"), content_type="text/html")
        except Exception as e:
            return web.Response(text=str(e), status=400)

    async def handle_backend_reload_request(self, request):
        plugin_name : str = request.match_info["plugin_name"]
        plugin = self.plugins[plugin_name]

        await self.reload_queue.put((plugin.file, plugin.plugin_directory))

        return web.Response(status=200)
