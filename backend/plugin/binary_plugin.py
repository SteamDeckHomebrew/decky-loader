import os
from asyncio import get_event_loop, sleep, subprocess
from posixpath import join
from tempfile import mkdtemp

from plugin_protocol import PluginProtocolServer


class BinaryPlugin:
    def __init__(self, plugin_directory, file_name, flags, logger) -> None:
        self.server = PluginProtocolServer(self)
        self.connection = None
        self.process = None

        self.flags = flags
        self.logger = logger

        self.plugin_directory = plugin_directory
        self.file_name = file_name


    async def start(self):
        if self.connection and self.connection.is_serving:
            self.connection.close()

        self.unix_socket_path = BinaryPlugin.generate_socket_path()
        self.logger.debug(f"starting unix server on {self.unix_socket_path}")
        self.connection = await get_event_loop().create_unix_server(lambda: self.server, path=self.unix_socket_path)

        env = dict(DECKY_PLUGIN_SOCKET = self.unix_socket_path)
        self.process = await subprocess.create_subprocess_exec(join(self.plugin_directory, self.file_name), env=env)
        get_event_loop().create_task(self.process_loop())

    async def stop(self):
        self.stopped = True
        if self.connection and self.connection.is_serving:
            self.connection.close()

        if self.process and self.process.is_alive:
            self.process.terminate()

    async def process_loop(self):
        await self.process.wait()
        if not self.stopped:
            self.logger.info("backend process was killed - restarting in 10 seconds")
            await sleep(10)
            await self.start()

    def generate_socket_path():
        tmp_dir = mkdtemp("decky-plugin")
        os.chown(tmp_dir, 1000, 1000)
        return join(tmp_dir, "socket")

    # called on the server/loader process
    async def call_method(self, method_name, method_args):
        if self.process.returncode == None:
            return dict(success = False, result = "Process not alive")

        return await self.server.call_method(method_name, method_args)
