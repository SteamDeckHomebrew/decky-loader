from asyncio import Task, create_task
from json import dumps, load, loads
from logging import getLogger
from os import path
from multiprocessing import Process

from .sandboxed_plugin import SandboxedPlugin
from .method_call_request import MethodCallRequest
from ..localplatform.localsocket import LocalSocket

from typing import Any, Callable, Coroutine, Dict

class PluginWrapper:
    def __init__(self, file: str, plugin_directory: str, plugin_path: str) -> None:
        self.file = file
        self.plugin_path = plugin_path
        self.plugin_directory = plugin_directory

        self.version = None

        json = load(open(path.join(plugin_path, plugin_directory, "plugin.json"), "r", encoding="utf-8"))
        if path.isfile(path.join(plugin_path, plugin_directory, "package.json")):
            package_json = load(open(path.join(plugin_path, plugin_directory, "package.json"), "r", encoding="utf-8"))
            self.version = package_json["version"]

        self.name = json["name"]
        self.author = json["author"]
        self.flags = json["flags"]
        self.passive = not path.isfile(self.file)

        self.log = getLogger("plugin")

        self.sandboxed_plugin = SandboxedPlugin(self.name, self.passive, self.flags, self.file, self.plugin_directory, self.plugin_path, self.version, self.author)
        #TODO: Maybe make LocalSocket not require on_new_message to make this cleaner
        self._socket = LocalSocket(self.sandboxed_plugin.on_new_message)
        self._listener_task: Task[Any]
        self._method_call_requests: Dict[str, MethodCallRequest] = {}

        self.emitted_message_callback: Callable[[Dict[Any, Any]], Coroutine[Any, Any, Any]]

    def __str__(self) -> str:
        return self.name
    
    async def _response_listener(self):
        while True:
            line = await self._socket.read_single_line()
            if line != None:
                res = loads(line)
                if res["id"] == 0:
                    create_task(self.emitted_message_callback(res["payload"]))
                    return
                self._method_call_requests.pop(res["id"]).set_result(res)

    async def set_emitted_message_callback(self, callback: Callable[[Dict[Any, Any]], Coroutine[Any, Any, Any]]):
        self.emitted_message_callback = callback

    async def execute_method(self, method_name: str, kwargs: Dict[Any, Any]):
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        
        request = MethodCallRequest()
        await self._socket.get_socket_connection()
        await self._socket.write_single_line(dumps({ "method": method_name, "args": kwargs, "id": request.id }, ensure_ascii=False))
        self._method_call_requests[request.id] = request

        return await request.wait_for_result()
    
    def start(self):
        if self.passive:
            return self
        Process(target=self.sandboxed_plugin.initialize, args=[self._socket]).start()
        self.listener_task = create_task(self._response_listener())
        return self

    def stop(self):
        self._listener_task.cancel()
        async def _(self: PluginWrapper):
            await self._socket.write_single_line(dumps({ "stop": True }, ensure_ascii=False))
            await self._socket.close_socket_connection()
        create_task(_(self))