from json import dumps, load, loads
from logging import getLogger
from os import path

from .sandboxed_plugin import SandboxedPlugin
from .method_call_request import MethodCallRequest
from ..localplatform.localsocket import LocalSocket

from typing import Any, Dict

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
        self.method_call_requests: Dict[str, MethodCallRequest] = {}
        self.sandboxed_plugin = SandboxedPlugin(self.name, self.passive, self.flags, self.file, self.plugin_directory, self.plugin_path, self.version, self.author)
        #TODO: Maybe somehow make LocalSocket not require on_new_message to make this more clear
        self.socket = LocalSocket(self.sandboxed_plugin.on_new_message)
        self.sandboxed_plugin.start(self.socket)

    def __str__(self) -> str:
        return self.name
    
    async def response_listener(self):
        while True:
            line = await self.socket.read_single_line()
            if line != None:
                res = loads(line)
                self.method_call_requests.pop(res["id"]).set_result(res)

    async def execute_method(self, method_name: str, kwargs: Dict[Any, Any]):
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        
        request = MethodCallRequest()
        await self.socket.get_socket_connection()
        await self.socket.write_single_line(dumps({ "method": method_name, "args": kwargs, "id": request.id }, ensure_ascii=False))
        self.method_call_requests[request.id] = request

        return await request.wait_for_result()