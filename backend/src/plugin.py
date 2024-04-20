import multiprocessing
from asyncio import (Lock, get_event_loop, new_event_loop,
                     set_event_loop, sleep)
from importlib.util import module_from_spec, spec_from_file_location
from json import dumps, load, loads
from logging import getLogger
from traceback import format_exc
from os import path, environ
from signal import SIGINT, signal
from sys import exit, path as syspath, modules as sysmodules
from typing import Any, Dict
from .localsocket import LocalSocket
from .localplatform import setgid, setuid, get_username, get_home_path
from .customtypes import UserType
from . import helpers

class PluginWrapper:
    def __init__(self, file: str, plugin_directory: str, plugin_path: str) -> None:
        self.file = file
        self.plugin_path = plugin_path
        self.plugin_directory = plugin_directory
        self.method_call_lock = Lock()
        self.socket: LocalSocket = LocalSocket(self._on_new_message)

        self.version = None

        json = load(open(path.join(plugin_path, plugin_directory, "plugin.json"), "r", encoding="utf-8"))
        if path.isfile(path.join(plugin_path, plugin_directory, "package.json")):
            package_json = load(open(path.join(plugin_path, plugin_directory, "package.json"), "r", encoding="utf-8"))
            self.version = package_json["version"]

        self.legacy = False
        self.main_view_html = json["main_view_html"] if "main_view_html" in json else ""
        self.tile_view_html = json["tile_view_html"] if "tile_view_html" in json else ""
        self.legacy = self.main_view_html or self.tile_view_html

        self.name = json["name"]
        self.author = json["author"]
        self.flags = json["flags"]

        self.log = getLogger("plugin")

        self.passive = not path.isfile(self.file)

    def __str__(self) -> str:
        return self.name

    def _init(self):
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

            #TODO: FIX IN A LESS CURSED WAY
            keys = [key.replace("src.", "") for key in sysmodules if key.startswith("src.")]
            for key in keys:
                sysmodules[key] = sysmodules["src"].__dict__[key]

            spec = spec_from_file_location("_", self.file)
            assert spec is not None
            module = module_from_spec(spec)
            assert spec.loader is not None
            spec.loader.exec_module(module)
            self.Plugin = module.Plugin

            if hasattr(self.Plugin, "_migration"):
                get_event_loop().run_until_complete(self.Plugin._migration(self.Plugin))
            if hasattr(self.Plugin, "_main"):
                get_event_loop().create_task(self.Plugin._main(self.Plugin))
            get_event_loop().create_task(self.socket.setup_server())
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

    async def _uninstall(self):
        try:
            self.log.info("Attempting to uninstall with plugin " + self.name + "'s \"_uninstall\" function.\n")
            if hasattr(self.Plugin, "_uninstall"):
                await self.Plugin._uninstall(self.Plugin)
                self.log.info("Uninstalled " + self.name + "\n")
            else:
                self.log.info("Could not find \"_uninstall\" in " + self.name + "'s main.py" + "\n")
        except:
            self.log.error("Failed to uninstall " + self.name + "!\n" + format_exc())
            exit(0)

    async def _on_new_message(self, message : str) -> str|None:
        data = loads(message)

        if "stop" in data:
            self.log.info("Calling Loader unload function.")
            await self._unload()

            if data.get('uninstall'):
                self.log.info("Calling Loader uninstall function.")
                await self._uninstall()

            get_event_loop().stop()
            while get_event_loop().is_running():
                await sleep(0)
            get_event_loop().close()
            raise Exception("Closing message listener")

        # TODO there is definitely a better way to type this
        d: Dict[str, Any] = {"res": None, "success": True}
        try:
            d["res"] = await getattr(self.Plugin, data["method"])(self.Plugin, **data["args"])
        except Exception as e:
            d["res"] = str(e)
            d["success"] = False
        finally:
            return dumps(d, ensure_ascii=False)

    def start(self):
        if self.passive:
            return self
        multiprocessing.Process(target=self._init).start()
        return self

    def stop(self, uninstall: bool = False):
        if self.passive:
            return

        async def _(self: PluginWrapper):
            await self.socket.write_single_line(dumps({ "stop": True, "uninstall": uninstall }, ensure_ascii=False))
            await self.socket.close_socket_connection()
            
        get_event_loop().create_task(_(self))

    async def execute_method(self, method_name: str, kwargs: Dict[Any, Any]):
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        async with self.method_call_lock:
            # reader, writer =
            await self.socket.get_socket_connection()

            await self.socket.write_single_line(dumps({ "method": method_name, "args": kwargs }, ensure_ascii=False))

            line = await self.socket.read_single_line()
            if line != None:
                res = loads(line)
                if not res["success"]:
                    raise Exception(res["res"])
                return res["res"]