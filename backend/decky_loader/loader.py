from __future__ import annotations
from asyncio import AbstractEventLoop, Queue, sleep
from json.decoder import JSONDecodeError
from logging import getLogger
from os import listdir, path
from pathlib import Path
from traceback import print_exc
from typing import Any, Tuple

from aiohttp import web
from os.path import exists
from watchdog.events import RegexMatchingEventHandler, DirCreatedEvent, DirModifiedEvent, FileCreatedEvent, FileModifiedEvent # type: ignore
from watchdog.observers import Observer # type: ignore

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .main import PluginManager

from .injector import get_gamepadui_tab
from .plugin.plugin_wrapper import PluginWrapper

Plugins = dict[str, PluginWrapper]
ReloadQueue = Queue[Tuple[str, str, bool | None] | Tuple[str, str]]

#TODO: Remove placeholder method
async def log_plugin_emitted_message(message: Any):
    getLogger().debug(f"EMITTED MESSAGE: " + str(message))

class FileChangeHandler(RegexMatchingEventHandler):
    def __init__(self, queue: ReloadQueue, plugin_path: str) -> None:
        super().__init__(regexes=[r'^.*?dist\/index\.js$', r'^.*?main\.py$']) # type: ignore
        self.logger = getLogger("file-watcher")
        self.plugin_path = plugin_path
        self.queue = queue
        self.disabled = True

    def maybe_reload(self, src_path: str):
        if self.disabled:
            return
        plugin_dir = Path(path.relpath(src_path, self.plugin_path)).parts[0]
        if exists(path.join(self.plugin_path, plugin_dir, "plugin.json")):
            self.queue.put_nowait((path.join(self.plugin_path, plugin_dir, "main.py"), plugin_dir, True))

    def on_created(self, event: DirCreatedEvent | FileCreatedEvent):
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

    def on_modified(self, event: DirModifiedEvent | FileModifiedEvent):
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
    def __init__(self, server_instance: PluginManager, plugin_path: str, loop: AbstractEventLoop, live_reload: bool = False) -> None:
        self.loop = loop
        self.logger = getLogger("Loader")
        self.plugin_path = plugin_path
        self.logger.info(f"plugin_path: {self.plugin_path}")
        self.plugins: Plugins = {}
        self.watcher = None
        self.live_reload = live_reload
        self.reload_queue: ReloadQueue = Queue()
        self.loop.create_task(self.handle_reloads())

        if live_reload:
            self.observer = Observer()
            self.watcher = FileChangeHandler(self.reload_queue, plugin_path)
            self.observer.schedule(self.watcher, self.plugin_path, recursive=True) # type: ignore
            self.observer.start()
            self.loop.create_task(self.enable_reload_wait())
            
        server_instance.web_app.add_routes([
            web.get("/frontend/{path:.*}", self.handle_frontend_assets),
            web.get("/locales/{path:.*}", self.handle_frontend_locales),
            web.get("/plugins", self.get_plugins),
            web.get("/plugins/{plugin_name}/frontend_bundle", self.handle_frontend_bundle),
            web.post("/plugins/{plugin_name}/methods/{method_name}", self.handle_plugin_method_call),
            web.get("/plugins/{plugin_name}/assets/{path:.*}", self.handle_plugin_frontend_assets),
            web.post("/plugins/{plugin_name}/reload", self.handle_backend_reload_request)
        ])

    async def enable_reload_wait(self):
        if self.live_reload:
            await sleep(10)
            if self.watcher:
                self.logger.info("Hot reload enabled")
                self.watcher.disabled = False

    async def handle_frontend_assets(self, request: web.Request):
        file = Path(__file__).parents[1].joinpath("static").joinpath(request.match_info["path"])
        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_frontend_locales(self, request: web.Request):
        req_lang = request.match_info["path"]
        file = Path(__file__).parents[1].joinpath("locales").joinpath(req_lang)
        if exists(file):
            return web.FileResponse(file, headers={"Cache-Control": "no-cache", "Content-Type": "application/json"})
        else:
            self.logger.info(f"Language {req_lang} not available, returning an empty dictionary")
            return web.json_response(data={}, headers={"Cache-Control": "no-cache"})

    async def get_plugins(self, request: web.Request):
        plugins = list(self.plugins.values())
        return web.json_response([{"name": str(i), "version": i.version} for i in plugins])

    async def handle_plugin_frontend_assets(self, request: web.Request):
        plugin = self.plugins[request.match_info["plugin_name"]]
        file = path.join(self.plugin_path, plugin.plugin_directory, "dist/assets", request.match_info["path"])

        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_frontend_bundle(self, request: web.Request):
        plugin = self.plugins[request.match_info["plugin_name"]]

        with open(path.join(self.plugin_path, plugin.plugin_directory, "dist/index.js"), "r", encoding="utf-8") as bundle:
            return web.Response(text=bundle.read(), content_type="application/javascript")

    def import_plugin(self, file: str, plugin_directory: str, refresh: bool | None = False, batch: bool | None = False):
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
            self.plugins[plugin.name] = plugin
            self.plugins[plugin.name].set_emitted_message_callback(log_plugin_emitted_message)
            plugin.start()
            self.logger.info(f"Loaded {plugin.name}")
            if not batch:
                self.loop.create_task(self.dispatch_plugin(plugin.name, plugin.version))
        except Exception as e:
            self.logger.error(f"Could not load {file}. {e}")
            print_exc()

    async def dispatch_plugin(self, name: str, version: str | None):
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
            self.import_plugin(*args) # type: ignore

    async def handle_plugin_method_call(self, request: web.Request):
        res = {}
        plugin = self.plugins[request.match_info["plugin_name"]]
        method_name = request.match_info["method_name"]
        try:
            method_info = await request.json()
            args: Any = method_info["args"]
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

    async def handle_backend_reload_request(self, request: web.Request):
        plugin_name : str = request.match_info["plugin_name"]
        plugin = self.plugins[plugin_name]

        await self.reload_queue.put((plugin.file, plugin.plugin_directory))

        return web.Response(status=200)