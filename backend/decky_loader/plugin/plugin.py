from asyncio import CancelledError, Task, create_task, sleep, get_event_loop, wait
from json import dumps, load, loads
from logging import getLogger
from os import path
from multiprocessing import Process
from time import time
from traceback import format_exc

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
        self.proc: Process | None = None
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
        while self._socket.active:
            try:
                line = await self._socket.read_single_line()
                if line != None:
                    res = loads(line)
                    if res["type"] == SocketMessageType.EVENT.value:
                        create_task(self.emitted_event_callback(res["event"], res["args"]))
                    elif res["type"] == SocketMessageType.RESPONSE.value:
                        self._method_call_requests.pop(res["id"]).set_result(res)
            except CancelledError:
                self.log.info(f"Stopping response listener for {self.name}")
                await self._socket.close_socket_connection()
                raise
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
        self.proc = Process(target=self.sandboxed_plugin.initialize, args=[self._socket])
        self.proc.start()
        self._listener_task = create_task(self._response_listener())
        return self

    async def stop(self, uninstall: bool = False):
        try:
            start_time = time()
            if self.passive:
                return

            done, pending = await wait([
                create_task(self._socket.write_single_line(dumps({ "stop": True, "uninstall": uninstall }, ensure_ascii=False)))
            ], timeout=1)

            if hasattr(self, "_listener_task"):
                self._listener_task.cancel()

            if self.proc:
                join_call = get_event_loop().run_in_executor(None, self.proc.join, 6)
            else:
                join_call = None
            
            await self.kill_if_still_running()

            for pending_task in pending:
                pending_task.cancel()

            self.log.info(f"Process for {self.name} has been stopped in {time() - start_time:.2}s")
        except Exception as e:
            self.log.error(f"Error during shutdown for plugin {self.name}: {str(e)}\n{format_exc()}")

    async def kill_if_still_running(self):
        start_time = time()
        sigtermed = False
        while self.proc and self.proc.is_alive():
            await sleep(0.1)
            elapsed_time = time() - start_time
            if elapsed_time >= 2 and not sigtermed:
                sigtermed = True
                self.log.warn(f"Plugin {self.name} still alive 2 seconds after stop request! Sending SIGTERM!")
                self.terminate()
            elif elapsed_time >= 5:
                self.log.warn(f"Plugin {self.name} still alive 5 seconds after stop request! Sending SIGKILL!")
                self.terminate(True)

    def terminate(self, kill: bool = False):
        if self.proc and self.proc.is_alive():
            if kill:
                self.proc.kill()
            else:
                self.proc.terminate()