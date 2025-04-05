from __future__ import annotations
from asyncio import AbstractEventLoop, Queue, gather, sleep
from logging import getLogger
from os import listdir, path
from pathlib import Path
from traceback import print_exc, format_exc
from typing import Any, Tuple, Dict, cast

from aiohttp import web
from os.path import exists
from decky_loader.helpers import get_homebrew_path
from watchdog.events import RegexMatchingEventHandler, FileSystemEvent
from watchdog.observers import Observer

from typing import TYPE_CHECKING, List
if TYPE_CHECKING:
    from .main import PluginManager

from .plugin.plugin import PluginWrapper
from .wsrouter import WSRouter
from .enums import PluginLoadType

Plugins = dict[str, PluginWrapper]
ReloadQueue = Queue[Tuple[str, str, bool | None] | Tuple[str, str]]

class FileChangeHandler(RegexMatchingEventHandler):
    def __init__(self, queue: ReloadQueue, plugin_path: str) -> None:
        super().__init__(regexes=[r'^.*?dist\/index\.js$', r'^.*?main\.py$']) # pyright: ignore [reportUnknownMemberType]
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

    def on_created(self, event: FileSystemEvent):
        src_path = cast(str, event.src_path) #type: ignore # this is the correct type for this is in later versions of watchdog
        if "__pycache__" in src_path:
            return

        # check to make sure this isn't a directory
        if path.isdir(src_path):
            return

        # get the directory name of the plugin so that we can find its "main.py" and reload it; the
        # file that changed is not necessarily the one that needs to be reloaded
        self.logger.debug(f"file created: {src_path}")
        self.maybe_reload(src_path)

    def on_modified(self, event: FileSystemEvent):
        src_path = cast(str, event.src_path) # type: ignore
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
    def __init__(self, server_instance: PluginManager, ws: WSRouter, plugin_path: str, loop: AbstractEventLoop, live_reload: bool = False) -> None:
        self.loop = loop
        self.logger = getLogger("Loader")
        self.ws = ws
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
            self.observer.schedule(self.watcher, self.plugin_path, recursive=True) # pyright: ignore [reportUnknownMemberType]
            self.observer.start()
            self.loop.create_task(self.enable_reload_wait())

        server_instance.web_app.add_routes([
            web.get("/frontend/{path:.*}", self.handle_frontend_assets),
            web.get("/locales/{path:.*}", self.handle_frontend_locales),
            web.get("/plugins/{plugin_name}/frontend_bundle", self.handle_frontend_bundle),
            web.get("/plugins/{plugin_name}/dist/{path:.*}", self.handle_plugin_dist),
            web.get("/plugins/{plugin_name}/assets/{path:.*}", self.handle_plugin_frontend_assets),
            web.get("/plugins/{plugin_name}/data/{path:.*}", self.handle_plugin_frontend_assets_from_data),
        ])

        server_instance.ws.add_route("loader/get_plugins", self.get_plugins)
        server_instance.ws.add_route("loader/reload_plugin", self.handle_plugin_backend_reload)
        server_instance.ws.add_route("loader/call_plugin_method", self.handle_plugin_method_call)
        server_instance.ws.add_route("loader/call_legacy_plugin_method", self.handle_plugin_method_call_legacy)

    async def shutdown_plugins(self):
        await gather(*[self.plugins[plugin_name].stop() for plugin_name in self.plugins])

    async def enable_reload_wait(self):
        if self.live_reload:
            await sleep(10)
            if self.watcher and self.live_reload:
                self.logger.info("Hot reload enabled")
                self.watcher.disabled = False

    async def disable_reload(self):
        if self.watcher:
            self.watcher.disabled = True
            self.live_reload = False

    async def handle_frontend_assets(self, request: web.Request):
        file = Path(__file__).parent.joinpath("static").joinpath(request.match_info["path"])
        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_frontend_locales(self, request: web.Request):
        req_lang = request.match_info["path"]
        file = Path(__file__).parent.joinpath("locales").joinpath(req_lang)
        if exists(file):
            return web.FileResponse(file, headers={"Cache-Control": "no-cache", "Content-Type": "application/json"})
        else:
            self.logger.info(f"Language {req_lang} not available, returning an empty dictionary")
            return web.json_response(data={}, headers={"Cache-Control": "no-cache"})

    async def get_plugins(self):
        plugins = list(self.plugins.values())
        return [{"name": str(i), "version": i.version, "load_type": i.load_type} for i in plugins]

    async def handle_plugin_dist(self, request: web.Request):
        plugin = self.plugins[request.match_info["plugin_name"]]
        file = path.join(self.plugin_path, plugin.plugin_directory, "dist", request.match_info["path"])

        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_plugin_frontend_assets(self, request: web.Request):
        plugin = self.plugins[request.match_info["plugin_name"]]
        file = path.join(self.plugin_path, plugin.plugin_directory, "dist/assets", request.match_info["path"])

        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_plugin_frontend_assets_from_data(self, request: web.Request):
        plugin = self.plugins[request.match_info["plugin_name"]]
        home = get_homebrew_path()
        file = path.join(home, "data", plugin.plugin_directory, request.match_info["path"])

        return web.FileResponse(file, headers={"Cache-Control": "no-cache"})

    async def handle_frontend_bundle(self, request: web.Request):
        plugin = self.plugins[request.match_info["plugin_name"]]

        with open(path.join(self.plugin_path, plugin.plugin_directory, "dist/index.js"), "r", encoding="utf-8") as bundle:
            return web.Response(text=bundle.read(), content_type="application/javascript")

    async def import_plugin(self, file: str, plugin_directory: str, refresh: bool | None = False, batch: bool | None = False):
        try:
            async def plugin_emitted_event(event: str, args: Any):
                self.logger.debug(f"PLUGIN EMITTED EVENT: {event} with args {args}")
                await self.ws.emit(f"loader/plugin_event", {"plugin": plugin.name, "event": event, "args": args})

            plugin = PluginWrapper(file, plugin_directory, self.plugin_path, plugin_emitted_event)
            if plugin.name in self.plugins:
                    if not "debug" in plugin.flags and refresh:
                        self.logger.info(f"Plugin {plugin.name} is already loaded and has requested to not be re-loaded")
                        return
                    else:
                        await self.plugins[plugin.name].stop()
                        self.plugins.pop(plugin.name, None)
            if plugin.passive:
                self.logger.info(f"Plugin {plugin.name} is passive")

            self.plugins[plugin.name] = plugin.start()
            self.logger.info(f"Loaded {plugin.name}")
            if not batch:
                self.loop.create_task(self.dispatch_plugin(plugin.name, plugin.version, plugin.load_type))
        except Exception as e:
            self.logger.error(f"Could not load {file}. {e}")
            print_exc()

    async def dispatch_plugin(self, name: str, version: str | None, load_type: int = PluginLoadType.ESMODULE_V1.value):
        await self.ws.emit("loader/import_plugin", name, version, load_type)        

    async def import_plugins(self):
        self.logger.info(f"import plugins from {self.plugin_path}")

        directories = [i for i in listdir(self.plugin_path) if path.isdir(path.join(self.plugin_path, i)) and path.isfile(path.join(self.plugin_path, i, "plugin.json"))]
        for directory in directories:
            self.logger.info(f"found plugin: {directory}")
            await self.import_plugin(path.join(self.plugin_path, directory, "main.py"), directory, False, True)

    async def handle_reloads(self):
        while True:
            args = await self.reload_queue.get()
            await self.import_plugin(*args) # pyright: ignore [reportArgumentType]

    async def handle_plugin_method_call_legacy(self, plugin_name: str, method_name: str, kwargs: Dict[Any, Any]):
        res: Dict[Any, Any] = {}
        plugin = self.plugins[plugin_name]
        try:
          if method_name.startswith("_"):
              raise RuntimeError(f"Plugin {plugin.name} tried to call private method {method_name}")
          res["result"] = await plugin.execute_legacy_method(method_name, kwargs)
          res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        return res

    async def handle_plugin_method_call(self, plugin_name: str, method_name: str, *args: List[Any]):
        plugin = self.plugins[plugin_name]
        try:
          if method_name.startswith("_"):
              raise RuntimeError(f"Plugin {plugin.name} tried to call private method {method_name}")
          result = await plugin.execute_method(method_name, *args)
        except Exception as e:
            self.logger.error(f"Method {method_name} of plugin {plugin.name} failed with the following exception:\n{format_exc()}")
            raise e # throw again to pass the error to the frontend
        return result

    async def handle_plugin_backend_reload(self, plugin_name: str):
        plugin = self.plugins[plugin_name]

        await self.reload_queue.put((plugin.file, plugin.plugin_directory))
