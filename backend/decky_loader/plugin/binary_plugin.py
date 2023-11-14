from asyncio import StreamReader, create_task, sleep, create_subprocess_exec
from asyncio.subprocess import Process
from subprocess import PIPE

from .sandboxed_plugin import SandboxedPlugin
from ..localplatform.localsocket import LocalSocket
from ..customtypes import UserType

from typing import Dict, List

class BinaryPlugin(SandboxedPlugin):
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
        self.process: Process

    def start(self):
        create_task(self._start())

    async def stop(self):
        self.process.terminate()
        while not self.process.returncode:
            await sleep(0)

    async def _start(self):
        self.env["DECKY_SOCKET"] = self.socket.socket_addr
        user_type = UserType.ROOT.value if "root" in self.flags else UserType.HOST_USER.value
        self.process = await create_subprocess_exec(self.file,
                             env=self.env,
                             user=user_type,
                             group=user_type,
                             stdout=PIPE,
                             stderr=PIPE)
        assert self.process.stderr and self.process.stdout
        create_task(self._stream_watcher(self.process.stdout, False))
        create_task(self._stream_watcher(self.process.stderr, True))
        
    async def _stream_watcher(self, stream: StreamReader, is_err: bool):
        async for line in stream:
            line = line.decode("utf-8")
            if not line.strip():
                continue
            if is_err:
                self.log.error(line)
            else:
                self.log.info(line)