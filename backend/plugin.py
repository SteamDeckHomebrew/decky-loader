import multiprocessing
from asyncio import (Lock, get_event_loop, new_event_loop,
                     open_unix_connection, set_event_loop, sleep,
                     start_unix_server, IncompleteReadError, LimitOverrunError)
from concurrent.futures import ProcessPoolExecutor
from importlib.util import module_from_spec, spec_from_file_location
from json import dumps, load, loads
from logging import getLogger
from traceback import format_exc
from os import path, setgid, setuid
from signal import SIGINT, signal
from sys import exit
from time import time

multiprocessing.set_start_method("fork")

BUFFER_LIMIT = 2 ** 20  # 1 MiB

class PluginWrapper:
    def __init__(self, file, plugin_directory, plugin_path) -> None:
        self.file = file
        self.plugin_directory = plugin_directory
        self.reader = None
        self.writer = None
        self.socket_addr = f"/tmp/plugin_socket_{time()}"
        self.method_call_lock = Lock()

        self.version = None

        json = load(open(path.join(plugin_path, plugin_directory, "plugin.json"), "r"))
        if path.isfile(path.join(plugin_path, plugin_directory, "package.json")):
            package_json = load(open(path.join(plugin_path, plugin_directory, "package.json"), "r"))
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
            setgid(0 if "root" in self.flags else 1000)
            setuid(0 if "root" in self.flags else 1000)
            spec = spec_from_file_location("_", self.file)
            module = module_from_spec(spec)
            spec.loader.exec_module(module)
            self.Plugin = module.Plugin

            if hasattr(self.Plugin, "_main"):
                get_event_loop().create_task(self.Plugin._main(self.Plugin))
            get_event_loop().create_task(self._setup_socket())
            get_event_loop().run_forever()
        except:
            self.log.error("Failed to start " + self.name + "!\n" + format_exc())
            exit(0)

    async def _setup_socket(self):
        self.socket = await start_unix_server(self._listen_for_method_call, path=self.socket_addr, limit=BUFFER_LIMIT)

    async def _listen_for_method_call(self, reader, writer):
        while True:
            line = bytearray()
            while True:
                try:
                    line.extend(await reader.readuntil())
                except LimitOverrunError:
                    line.extend(await reader.read(reader._limit))
                    continue
                except IncompleteReadError as err:
                    line.extend(err.partial)
                    break
                else:
                    break
            data = loads(line.decode("utf-8"))
            if "stop" in data:
                get_event_loop().stop()
                while get_event_loop().is_running():
                    await sleep(0)
                get_event_loop().close()
                return
            d = {"res": None, "success": True}
            try:
                d["res"] = await getattr(self.Plugin, data["method"])(self.Plugin, **data["args"])
            except Exception as e:
                d["res"] = str(e)
                d["success"] = False
            finally:
                writer.write((dumps(d)+"\n").encode("utf-8"))
                await writer.drain()

    async def _open_socket_if_not_exists(self):
        if not self.reader:
            retries = 0
            while retries < 10:
                try:
                    self.reader, self.writer = await open_unix_connection(self.socket_addr, limit=BUFFER_LIMIT)
                    return True
                except:
                    await sleep(2)
                    retries += 1
            return False
        else:
            return True

    def start(self):
        if self.passive:
            return self
        multiprocessing.Process(target=self._init).start()
        return self

    def stop(self):
        if self.passive:
            return
        async def _(self):
            if await self._open_socket_if_not_exists():
                self.writer.write((dumps({"stop": True})+"\n").encode("utf-8"))
                await self.writer.drain()
                self.writer.close()
        get_event_loop().create_task(_(self))

    async def execute_method(self, method_name, kwargs):
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        async with self.method_call_lock:
            if await self._open_socket_if_not_exists():
                self.writer.write(
                    (dumps({"method": method_name, "args": kwargs})+"\n").encode("utf-8"))
                await self.writer.drain()
                line = bytearray()
                while True:
                    try:
                        line.extend(await self.reader.readuntil())
                    except LimitOverrunError:
                        line.extend(await self.reader.read(self.reader._limit))
                        continue
                    except IncompleteReadError as err:
                        line.extend(err.partial)
                        break
                    else:
                        break
                res = loads(line.decode("utf-8"))
                if not res["success"]:
                    raise Exception(res["res"])
                return res["res"]
