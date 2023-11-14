from asyncio import Task, create_task
from json import dumps, load, loads
from logging import getLogger
from os import path

from .python_plugin import PythonPlugin
from .binary_plugin import BinaryPlugin
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
        self.env: Dict[str, str] = json["env"] if "env" in json else {}

        passive = not path.isfile(self.file)

        if "backend" in json:
            self.file = path.join(plugin_path, plugin_directory, json["backend"])
            self._socket = LocalSocket()
            self.sandboxed_plugin = BinaryPlugin(self._socket, self.name, self.flags, self.file, self.plugin_directory, self.plugin_path, self.version, self.author, self.env)
        elif not passive:
            self._socket = LocalSocket()
            self.sandboxed_plugin = PythonPlugin(self._socket, self.name, self.flags, self.file, self.plugin_directory, self.plugin_path, self.version, self.author, self.env)
        else:
            self.sandboxed_plugin = None

        self.log = getLogger("plugin")
        self._listener_task: Task[Any]
        self._method_call_requests: Dict[str, MethodCallRequest] = {}
        self.emitted_message_callback: Callable[[Dict[Any, Any]], Coroutine[Any, Any, Any]]

    def __str__(self) -> str:
        return self.name
    
    @property
    def passive(self):
        return not self.sandboxed_plugin
    
    async def _response_listener(self):
        while True:
            try:
                line = await self._socket.read_single_line()
                if line != None:
                    res = loads(line)
                    if res["id"] == "0":
                        create_task(self.emitted_message_callback(res["payload"]))
                    else:
                        self._method_call_requests.pop(res["id"]).set_result(res)
            except:
                pass

    def set_emitted_message_callback(self, callback: Callable[[Dict[Any, Any]], Coroutine[Any, Any, Any]]):
        self.emitted_message_callback = callback

    async def execute_method(self, method_name: str, kwargs: Dict[Any, Any]):
        if not self.sandboxed_plugin:
            raise RuntimeError("This plugin is passive and does not implement a backend.")
        
        request = MethodCallRequest()
        await self._socket.get_socket_connection()
        await self._socket.write_single_line(dumps({ "method": method_name, "args": kwargs, "id": request.id }, ensure_ascii=False))
        self._method_call_requests[request.id] = request

        return await request.wait_for_result()
    
    async def _start(self):
        if not self.sandboxed_plugin:
            return
        await self._socket.setup_server()
        self._listener_task = create_task(self._response_listener())
        self.sandboxed_plugin.start()
    
    def start(self):
        if not self.sandboxed_plugin:
            return
        create_task(self._start())

    def stop(self):
        try:
            assert self.sandboxed_plugin
        except AssertionError:
            return
        
        self._listener_task.cancel()
        async def _(self: PluginWrapper):
            assert self.sandboxed_plugin #Need to assert again or pyright complains. No need to care about this, it will fail above first. 
            await self.sandboxed_plugin.stop()
            await self._socket.close_socket_connection()
        create_task(_(self))