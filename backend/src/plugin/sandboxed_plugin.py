from os import path, environ
from signal import SIGINT, signal
from importlib.util import module_from_spec, spec_from_file_location
from json import dumps, loads
from logging import getLogger
from sys import exit, path as syspath
from traceback import format_exc
from asyncio import (get_event_loop, new_event_loop,
                     set_event_loop, sleep)

from .method_call_request import SocketResponseDict
from ..localplatform.localsocket import LocalSocket
from ..localplatform.localplatform import setgid, setuid, get_username, get_home_path
from ..customtypes import UserType
from .. import helpers

from typing import Any, Dict, List

class SandboxedPlugin:
    def __init__(self,
                 name: str,
                 passive: bool,
                 flags: List[str],
                 file: str,
                 plugin_directory: str,
                 plugin_path: str,
                 version: str|None,
                 author: str) -> None:
        self.name = name
        self.passive = passive
        self.flags = flags
        self.file = file
        self.plugin_path = plugin_path
        self.plugin_directory = plugin_directory
        self.version = version
        self.author = author

        self.log = getLogger("plugin")

    def initialize(self, socket: LocalSocket):
        self._socket = socket

        try:
            signal(SIGINT, lambda s, f: exit(0))

            set_event_loop(new_event_loop())
            if self.passive:
                return
            setgid(UserType.ROOT if "root" in self.flags else UserType.HOST_USER)
            setuid(UserType.ROOT if "root" in self.flags else UserType.HOST_USER)
            # export a bunch of environment variables to help plugin developers
            environ["HOME"] = get_home_path(UserType.ROOT if "root" in self.flags else UserType.HOST_USER)
            environ["USER"] = "root" if "root" in self.flags else get_username()
            environ["DECKY_VERSION"] = helpers.get_loader_version()
            environ["DECKY_USER"] = get_username()
            environ["DECKY_USER_HOME"] = helpers.get_home_path()
            environ["DECKY_HOME"] = helpers.get_homebrew_path()
            environ["DECKY_PLUGIN_SETTINGS_DIR"] = path.join(environ["DECKY_HOME"], "settings", self.plugin_directory)
            helpers.mkdir_as_user(path.join(environ["DECKY_HOME"], "settings"))
            helpers.mkdir_as_user(environ["DECKY_PLUGIN_SETTINGS_DIR"])
            environ["DECKY_PLUGIN_RUNTIME_DIR"] = path.join(environ["DECKY_HOME"], "data", self.plugin_directory)
            helpers.mkdir_as_user(path.join(environ["DECKY_HOME"], "data"))
            helpers.mkdir_as_user(environ["DECKY_PLUGIN_RUNTIME_DIR"])
            environ["DECKY_PLUGIN_LOG_DIR"] = path.join(environ["DECKY_HOME"], "logs", self.plugin_directory)
            helpers.mkdir_as_user(path.join(environ["DECKY_HOME"], "logs"))
            helpers.mkdir_as_user(environ["DECKY_PLUGIN_LOG_DIR"])
            environ["DECKY_PLUGIN_DIR"] = path.join(self.plugin_path, self.plugin_directory)
            environ["DECKY_PLUGIN_NAME"] = self.name
            if self.version:
                environ["DECKY_PLUGIN_VERSION"] = self.version
            environ["DECKY_PLUGIN_AUTHOR"] = self.author

            # append the plugin's `py_modules` to the recognized python paths
            syspath.append(path.join(environ["DECKY_PLUGIN_DIR"], "py_modules"))

            spec = spec_from_file_location("_", self.file)
            assert spec is not None
            module = module_from_spec(spec)
            assert spec.loader is not None
            spec.loader.exec_module(module)
            self.Plugin = module.Plugin

            setattr(self.Plugin, "emit_message", self.emit_message)
            #TODO: Find how to put emit_message on global namespace so it doesn't pollute Plugin

            if hasattr(self.Plugin, "_migration"):
                get_event_loop().run_until_complete(self.Plugin._migration(self.Plugin))
            if hasattr(self.Plugin, "_main"):
                get_event_loop().create_task(self.Plugin._main(self.Plugin))
            get_event_loop().create_task(socket.setup_server())
            get_event_loop().run_forever()
        except:
            self.log.error("Failed to start " + self.name + "!\n" + format_exc())
            exit(0)

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

    async def on_new_message(self, message : str) -> str|None:
        data = loads(message)

        if "stop" in data:
            self.log.info("Calling Loader unload function.")
            await self._unload()
            get_event_loop().stop()
            while get_event_loop().is_running():
                await sleep(0)
            get_event_loop().close()
            raise Exception("Closing message listener")

        d: SocketResponseDict = {"res": None, "success": True, "id": data["id"]}
        try:
            d["res"] = await getattr(self.Plugin, data["method"])(self.Plugin, **data["args"])
        except Exception as e:
            d["res"] = str(e)
            d["success"] = False
        finally:
            return dumps(d, ensure_ascii=False)
        
    async def emit_message(self, message: Dict[Any, Any]):
        await self._socket.write_single_line(dumps({
            "id": 0,
            "payload": message
        }))