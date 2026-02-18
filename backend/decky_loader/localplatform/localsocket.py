import asyncio, time
from typing import Any, Callable, Coroutine
import random

from .localplatform import ON_WINDOWS

BUFFER_LIMIT = 2 ** 20  # 1 MiB

class UnixSocket:
    def __init__(self):
        '''
        on_new_message takes 1 string argument.
        It's return value gets used, if not None, to write data to the socket.
        Method should be async
        '''
        self.socket_addr = f"/tmp/plugin_socket_{time.time()}"
        self.on_new_message = None
        self.socket = None
        self.reader = None
        self.writer = None
        self.server_writer = None
        self.open_lock = asyncio.Lock()
        self.active = True

    async def setup_server(self, on_new_message: Callable[[str], Coroutine[Any, Any, Any]]):
        try:
            self.on_new_message = on_new_message
            self.socket = await asyncio.start_unix_server(self._listen_for_method_call, path=self.socket_addr, limit=BUFFER_LIMIT)
        except asyncio.CancelledError:
            await self.close_socket_connection()
            raise

    async def _open_socket_if_not_exists(self):
        if not self.reader:
            retries = 0
            while retries < 10:
                try:
                    self.reader, self.writer = await asyncio.open_unix_connection(self.socket_addr, limit=BUFFER_LIMIT)
                    return True
                except Exception:
                    await asyncio.sleep(2)
                    retries += 1
            return False
        else:
            return True

    async def get_socket_connection(self):
        async with self.open_lock:
            if not await self._open_socket_if_not_exists():
                return None, None
            
            return self.reader, self.writer
    
    async def close_socket_connection(self):
        if self.writer != None:
            self.writer.close()

        self.reader = None

        if self.socket:
            self.socket.close()
            await self.socket.wait_closed()
        
        self.active = False

    async def read_single_line(self) -> str|None:
        reader, _ = await self.get_socket_connection()

        try:
            assert reader
        except AssertionError:
            return

        return await self._read_single_line(reader)

    async def write_single_line(self, message : str):
        _, writer = await self.get_socket_connection()

        try:
            assert writer
        except AssertionError:
            return

        await self._write_single_line(writer, message)

    async def _read_single_line(self, reader: asyncio.StreamReader) -> str:
        line = bytearray()
        while self.active:
            try:
                line.extend(await reader.readuntil())
            except asyncio.LimitOverrunError:
                line.extend(await reader.read(reader._limit)) # pyright: ignore [reportUnknownMemberType, reportUnknownArgumentType, reportAttributeAccessIssue]
                continue
            except asyncio.IncompleteReadError as err:
                line.extend(err.partial)
                break
            except asyncio.CancelledError:
                raise
            else:
                break

        return line.decode("utf-8")
    
    async def _write_single_line(self, writer: asyncio.StreamWriter, message : str):
        if not message.endswith("\n"):
            message += "\n"

        writer.write(message.encode("utf-8"))
        await writer.drain()
    
    async def write_single_line_server(self, message: str):
        if self.server_writer is None:
            return
        await self._write_single_line(self.server_writer, message)

    async def _listen_for_method_call(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.server_writer = writer
        while self.active and self.on_new_message:

            def _(task: asyncio.Task[str|None]):
                res = task.result()
                if res is not None:
                    asyncio.create_task(self._write_single_line(writer, res))

            line = await self._read_single_line(reader)
            asyncio.create_task(self.on_new_message(line)).add_done_callback(_)
            
class PortSocket (UnixSocket):
    def __init__(self):
        '''
        on_new_message takes 1 string argument.
        It's return value gets used, if not None, to write data to the socket.
        Method should be async
        '''
        super().__init__()
        self.host = "127.0.0.1"
        self.port = random.sample(range(40000, 60000), 1)[0]
    
    async def setup_server(self, on_new_message: Callable[[str], Coroutine[Any, Any, Any]]):
        try:
            self.on_new_message = on_new_message
            self.socket = await asyncio.start_server(self._listen_for_method_call, host=self.host, port=self.port, limit=BUFFER_LIMIT)
        except asyncio.CancelledError:
            await self.close_socket_connection()
            raise

    async def _open_socket_if_not_exists(self):
        if not self.reader:
            retries = 0
            while retries < 10:
                try:
                    self.reader, self.writer = await asyncio.open_connection(host=self.host, port=self.port, limit=BUFFER_LIMIT)
                    return True
                except Exception:
                    await asyncio.sleep(2)
                    retries += 1
            return False
        else:
            return True

if ON_WINDOWS:
    class LocalSocket (PortSocket):  # type: ignore
        pass
else:
    class LocalSocket (UnixSocket):
        pass
