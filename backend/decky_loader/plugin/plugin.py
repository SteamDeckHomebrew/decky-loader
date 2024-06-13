from asyncio import Task, create_task
from json import dumps, load, loads
from logging import getLogger
from os import path
from multiprocessing import Process

from .sandboxed_plugin import SandboxedPlugin
from .messages import MethodCallRequest, SocketMessageType
from ..enums import PluginLoadType
from ..localplatform.localsocket import LocalSocket
from ..helpers import get_homebrew_path, mkdir_as_user

from typing import Any, Callable, Coroutine, Dict, List

EmittedEventCallbackType = Callable[[str, Any], Coroutine[Any, Any, Any]]

class PluginWrapper:
    def __init__(self, file: str, plugin_directory: str, plugin_path: str, emit_callback: EmittedEventCallbackType) -> None:
        self.file = file
        self.plugin_path = plugin_path
        self.plugin_directory = plugin_directory

        self.version = None

        self.load_type = PluginLoadType.LEGACY_EVAL_IIFE.value

        json = load(open(path.join(plugin_path, plugin_directory, "plugin.json"), "r", encoding="utf-8"))
        if path.isfile(path.join(plugin_path, plugin_directory, "package.json")):
            package_json = load(open(path.join(plugin_path, plugin_directory, "package.json"), "r", encoding="utf-8"))
            self.version = package_json["version"]
            if ("type" in package_json and package_json["type"] == "module"):
                self.load_type = PluginLoadType.ESMODULE_V1.value

        self.name = json["name"]
        self.author = json["author"]
        self.flags = json["flags"]
        self.api_version = json["api_version"] if "api_version" in json else 0
        
        self.passive = not path.isfile(self.file)

        self.log = getLogger("plugin")

        self.sandboxed_plugin = SandboxedPlugin(self.name, self.passive, self.flags, self.file, self.plugin_directory, self.plugin_path, self.version, self.author, self.api_version)
        # TODO: Maybe make LocalSocket not require on_new_message to make this cleaner
        self._socket = LocalSocket(self.sandboxed_plugin.on_new_message)
        self._listener_task: Task[Any]
        self._method_call_requests: Dict[str, MethodCallRequest] = {}

        self.emitted_event_callback: EmittedEventCallbackType = emit_callback

        # TODO enable this after websocket release
        self.legacy_method_warning = False

        home = get_homebrew_path()
        mkdir_as_user(path.join(home, "settings", self.plugin_directory))
        # TODO maybe dont chown this?
        mkdir_as_user(path.join(home, "data"))
        mkdir_as_user(path.join(home, "data", self.plugin_directory))
        # TODO maybe dont chown this?
        mkdir_as_user(path.join(home, "logs"))
        mkdir_as_user(path.join(home, "logs", self.plugin_directory))

    def __str__(self) -> str:
        return self.name
    
    async def _response_listener(self):
        while True:
            try:
                line = await self._socket.read_single_line()
                if line != None:
                    res = loads(line)
                    if res["type"] == SocketMessageType.EVENT.value:
                        create_task(self.emitted_event_callback(res["event"], res["args"]))
                    elif res["type"] == SocketMessageType.RESPONSE.value:
                        self._method_call_requests.pop(res["id"]).set_result(res)
            except:
                pass

    async def execute_legacy_method(self, method_name: str, kwargs: Dict[Any, Any]):
        if not self.legacy_method_warning:
            self.legacy_method_warning = True
            self.log.warn(f"Plugin {self.name} is using legacy method calls. This will be removed in a future release.")
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        
        request = MethodCallRequest()
        await self._socket.get_socket_connection()
        await self._socket.write_single_line(dumps({ "type": SocketMessageType.CALL, "method": method_name, "args": kwargs, "id": request.id, "legacy": True }, ensure_ascii=False))
        self._method_call_requests[request.id] = request

        return await request.wait_for_result()

    async def execute_method(self, method_name: str, *args: List[Any]):
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        
        request = MethodCallRequest()
        await self._socket.get_socket_connection()
        await self._socket.write_single_line(dumps({ "type": SocketMessageType.CALL, "method": method_name, "args": args, "id": request.id }, ensure_ascii=False))
        self._method_call_requests[request.id] = request

        return await request.wait_for_result()
    
    def start(self):
        if self.passive:
            return self
        Process(target=self.sandboxed_plugin.initialize, args=[self._socket]).start()
        self._listener_task = create_task(self._response_listener())
        return self

    def stop(self, uninstall: bool = False):
        if hasattr(self, "_listener_task"):
            self._listener_task.cancel()
        async def _(self: PluginWrapper):
            if hasattr(self, "_socket"):
                await self._socket.write_single_line(dumps({ "stop": True, "uninstall": uninstall }, ensure_ascii=False))
                await self._socket.close_socket_connection()
        create_task(_(self))