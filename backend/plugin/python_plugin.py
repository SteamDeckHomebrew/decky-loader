import json
import multiprocessing
import os
import uuid
from asyncio import (Protocol, get_event_loop, new_event_loop, set_event_loop,
                     sleep)
from importlib.util import module_from_spec, spec_from_file_location
from posixpath import join
from signal import SIGINT, signal
from tempfile import mkdtemp

from plugin_protocol import PluginProtocolServer

multiprocessing.set_start_method("fork")

# only useable by the python backend
class PluginProtocolClient(Protocol):
    def __init__(self, backend, logger) -> None:
        super().__init__()
        self.backend = backend
        self.logger = logger

    def connection_made(self, transport):
        self.transport = transport

    def data_received(self, data: bytes) -> None:
        message = json.loads(data.decode("utf-8"))
        message_id = str(uuid.UUID(message["id"]))
        message_type = message["type"]
        payload = message["payload"]

        self.logger.debug(f"received {message_id} {message_type} {payload}")
        if message_type == "method_call":
          get_event_loop().create_task(self.handle_method_call(message_id, payload["name"], payload["args"]))

    async def handle_method_call(self, message_id, method_name, method_args):
        try:
            result = await self.backend.execute_method(method_name, method_args)
            self.respond_message(message_id, "method_response", dict(success = True, result = result))
        except AttributeError as e:
            self.respond_message(message_id, "method_response", dict(success = False, result = f"plugin does not expose a method called {method_name}"))
        except Exception as e:
            self.respond_message(message_id, "method_response", dict(success = False, result = str(e)))

    def respond_message(self, message_id, message_type, payload):
        self.logger.debug(f"sending {message_id} {message_type} {payload}")
        message = json.dumps(dict(id = str(message_id), type = message_type, payload = payload))
        self.transport.write(message.encode('utf-8'))


class PythonPlugin:
    def __init__(self, plugin_directory, file_name, flags, logger) -> None:
        self.client = PluginProtocolClient(self, logger)
        self.server = PluginProtocolServer(self)
        self.connection = None
        self.process = None
        self.stopped = False

        self.plugin_directory = plugin_directory
        self.file_name = file_name
        self.flags = flags
        self.logger = logger

    def _init(self):
        self.logger.debug(f"child process Initializing")
        signal(SIGINT, lambda s, f: exit(0))

        set_event_loop(new_event_loop())
        # TODO: both processes can access the socket
        # setuid(0 if "root" in self.flags else 1000)
        spec = spec_from_file_location("_", join(self.plugin_directory, self.file_name))
        module = module_from_spec(spec)
        spec.loader.exec_module(module)
        self.Plugin = module.Plugin

        if hasattr(self.Plugin, "_main"):
            self.logger.debug("Found _main, calling it")
            get_event_loop().create_task(self.Plugin._main(self.Plugin))

        get_event_loop().create_task(self._connect())
        get_event_loop().run_forever()

    async def _connect(self):
        self.logger.debug(f"connecting to unix server on {self.unix_socket_path}")
        await get_event_loop().create_unix_connection(lambda: self.client, path=self.unix_socket_path)

    async def start(self):
        if self.connection:
            self.connection.close()

        self.unix_socket_path = PythonPlugin.generate_socket_path()
        self.logger.debug(f"starting unix server on {self.unix_socket_path}")
        self.connection = await get_event_loop().create_unix_server(lambda: self.server, path=self.unix_socket_path)

        self.process = multiprocessing.Process(target=self._init)
        self.process.start()
        get_event_loop().create_task(self.process_loop())
        self.stopped = False

    async def stop(self):
        self.stopped = True
        if self.connection:
            self.connection.close()

        if self.process and self.process.is_alive:
            self.process.terminate()

    async def process_loop(self):
        await get_event_loop().run_in_executor(None, self.process.join)
        if not self.stopped:
            self.logger.info("backend process was killed - restarting in 10 seconds")
            await sleep(10)
            await self.start()

    # called on the server/loader process
    async def call_method(self, method_name, method_args):
        if not self.process.is_alive():
            return dict(success = False, result = "Process not alive")

        return await self.server.call_method(method_name, method_args)

    # called on the client
    def execute_method(self, method_name, method_args):
        return getattr(self.Plugin, method_name)(self.Plugin, **method_args)

    def generate_socket_path():
        tmp_dir = mkdtemp("decky-plugin")
        os.chown(tmp_dir, 1000, 1000)
        return join(tmp_dir, "socket")
