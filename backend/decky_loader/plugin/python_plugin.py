from asyncio import get_event_loop, new_event_loop, set_event_loop, sleep
from importlib.util import module_from_spec, spec_from_file_location
from json import dumps, loads
from multiprocessing import Process
from sys import path as syspath, modules as sysmodules
from os import path, environ, setgid, setuid
from traceback import format_exc
from signal import signal, SIGINT

from .sandboxed_plugin import SandboxedPlugin
from .method_call_request import SocketResponseDict
from ..localplatform.localsocket import LocalSocket
from ..customtypes import UserType

from typing import Any, Dict, List

class PythonPlugin(SandboxedPlugin):
    def __init__(self,
                 socket: LocalSocket,
                 name: str,
                 flags: List[str],
                 file: str,
                 plugin_directory: str,
                 plugin_path: str,
                 version: str | None,
                 author: str,
                 env: Dict[str, str]) -> None:
        super().__init__(socket, name, flags, file, plugin_directory, plugin_path, version, author, env)
        self.socket.set_new_message_callback(self._on_new_message)

    def start(self):
        Process(target=self._initialize).start()

    async def stop(self):
        await self._unload()
        get_event_loop().stop()
        while get_event_loop().is_running():
            await sleep(0)
        get_event_loop().close()
        raise Exception("Closing message listener")
    
    def _initialize(self):
        signal(SIGINT, lambda s, f: exit(0))
        setgid(UserType.ROOT.value if "root" in self.flags else UserType.HOST_USER.value)
        setuid(UserType.ROOT.value if "root" in self.flags else UserType.HOST_USER.value)
        environ.update(self.env)

        set_event_loop(new_event_loop())

        # append the plugin's `py_modules` to the recognized python paths
        syspath.append(path.join(environ["DECKY_PLUGIN_DIR"], "py_modules"))
        
        #TODO: FIX IN A LESS CURSED WAY
        keys = [key for key in sysmodules if key.startswith("decky_loader.")]
        for key in keys:
            sysmodules[key.replace("decky_loader.", "")] = sysmodules[key]

        spec = spec_from_file_location("_", self.file)
        assert spec is not None
        module = module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        self.Plugin = module.Plugin

        setattr(self.Plugin, "emit_message", self._emit_message)

        if hasattr(self.Plugin, "_migration"):
            get_event_loop().run_until_complete(self.Plugin._migration(self.Plugin))
        if hasattr(self.Plugin, "_main"):
            get_event_loop().create_task(self.Plugin._main(self.Plugin))
        get_event_loop().run_forever()
    
    async def _unload(self):
        try:
            self.log.info("Attempting to unload with plugin " + self.name + "'s \"_unload\" function.\n")
            if hasattr(self.Plugin, "_unload"):
                await self.Plugin._unload(self.Plugin)
                self.log.info("Unloaded " + self.name + "\n")
            else:
                self.log.info("Could not find \"_unload\" in " + self.name + "'s main.py" + "\n")
        except:
            self.log.error("Failed to unload " + self.name + "!\n" + format_exc())
            exit(0)

    async def _on_new_message(self, message : str) -> str|None:
        data = loads(message)

        d: SocketResponseDict = {"res": None, "success": True, "id": data["id"]}
        try:
            d["res"] = await getattr(self.Plugin, data["method"])(self.Plugin, **data["args"])
        except Exception as e:
            d["res"] = str(e)
            d["success"] = False
        finally:
            return dumps(d, ensure_ascii=False)
        
    async def _emit_message(self, message: Dict[Any, Any]):
        await self.socket.write_single_line_server(dumps({
            "id": "0",
            "payload": message
        }))