from importlib.util import spec_from_file_location, module_from_spec
from asyncio import get_event_loop, new_event_loop, set_event_loop, start_unix_server, open_unix_connection, sleep, Lock
from os import path, setuid
from json import loads, dumps, load
from time import time
from multiprocessing import Process
from signal import signal, SIGINT
from sys import exit

class PluginWrapper:
    def __init__(self, file, plugin_directory, plugin_path) -> None:
        self.file = file
        self.plugin_directory = plugin_directory
        self.reader = None
        self.writer = None
        self.socket_addr = f"/tmp/plugin_socket_{time()}"
        self.method_call_lock = Lock()

        json = load(open(path.join(plugin_path, plugin_directory, "plugin.json"), "r"))

        self.name = json["name"]
        self.author = json["author"]
        self.main_view_html = json["main_view_html"]
        self.tile_view_html = json["tile_view_html"] if "tile_view_html" in json else ""
        self.flags = json["flags"]

        self.passive = not path.isfile(self.file)

    def _init(self):
        signal(SIGINT, lambda s, f: exit(0))

        set_event_loop(new_event_loop())
        if self.passive:
            return
        setuid(0 if "root" in self.flags else 1000)
        spec = spec_from_file_location("_", self.file)
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
        self.Plugin = module.Plugin

        if hasattr(self.Plugin, "_main"):
            get_event_loop().create_task(self.Plugin._main(self.Plugin))
        get_event_loop().create_task(self._setup_socket())
        get_event_loop().run_forever()

    async def _setup_socket(self):
        self.socket = await start_unix_server(self._listen_for_method_call, path=self.socket_addr)

    async def _listen_for_method_call(self, reader, writer):
        while True:
            data = loads((await reader.readline()).decode("utf-8"))
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
            while True:
                try:
                    self.reader, self.writer = await open_unix_connection(self.socket_addr)
                    break
                except:
                    await sleep(0)

    def start(self):
        if self.passive:
            return self
        Process(target=self._init).start()
        return self

    def stop(self):
        if self.passive:
            return
        async def _(self):
            await self._open_socket_if_not_exists()
            self.writer.write((dumps({"stop": True})+"\n").encode("utf-8"))
            await self.writer.drain()
            self.writer.close()
        get_event_loop().create_task(_(self))

    async def execute_method(self, method_name, kwargs):
        if self.passive:
            raise RuntimeError("This plugin is passive (aka does not implement main.py)")
        async with self.method_call_lock:
            await self._open_socket_if_not_exists()
            self.writer.write(
                (dumps({"method": method_name, "args": kwargs})+"\n").encode("utf-8"))
            await self.writer.drain()
            res = loads((await self.reader.readline()).decode("utf-8"))
            if not res["success"]:
                raise Exception(res["res"])
            return res["res"]
