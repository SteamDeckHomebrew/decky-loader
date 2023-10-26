import asyncio, time
from typing import Awaitable, Callable
import random

from .localplatform import ON_WINDOWS

BUFFER_LIMIT = 2 ** 20  # 1 MiB

class UnixSocket:
    def __init__(self, on_new_message: Callable[[str], Awaitable[str|None]]):
        '''
        on_new_message takes 1 string argument.
        It's return value gets used, if not None, to write data to the socket.
        Method should be async
        '''
        self.socket_addr = f"/tmp/plugin_socket_{time.time()}"
        self.on_new_message = on_new_message
        self.socket = None
        self.reader = None
        self.writer = None

    async def setup_server(self):
        self.socket = await asyncio.start_unix_server(self._listen_for_method_call, path=self.socket_addr, limit=BUFFER_LIMIT)
    
    async def _open_socket_if_not_exists(self):
        if not self.reader:
            retries = 0
            while retries < 10:
                try:
                    self.reader, self.writer = await asyncio.open_unix_connection(self.socket_addr, limit=BUFFER_LIMIT)
                    return True
                except:
                    await asyncio.sleep(2)
                    retries += 1
            return False
        else:
            return True

    async def get_socket_connection(self):
        if not await self._open_socket_if_not_exists():
            return None, None
        
        return self.reader, self.writer
    
    async def close_socket_connection(self):
        if self.writer != None:
            self.writer.close()

        self.reader = None

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
        while True:
            try:
                line.extend(await reader.readuntil())
            except asyncio.LimitOverrunError:
                line.extend(await reader.read(reader._limit)) # type: ignore
                continue
            except asyncio.IncompleteReadError as err:
                line.extend(err.partial)
                break
            else:
                break

        return line.decode("utf-8")
    
    async def _write_single_line(self, writer: asyncio.StreamWriter, message : str):
        if not message.endswith("\n"):
            message += "\n"

        writer.write(message.encode("utf-8"))
        await writer.drain()

    async def _listen_for_method_call(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        while True:
            line = await self._read_single_line(reader)

            try:
                res = await self.on_new_message(line)
            except Exception:
                return

            if res != None:
                await self._write_single_line(writer, res)
            
class PortSocket (UnixSocket):
    def __init__(self, on_new_message: Callable[[str], Awaitable[str|None]]):
        '''
        on_new_message takes 1 string argument.
        It's return value gets used, if not None, to write data to the socket.
        Method should be async
        '''
        super().__init__(on_new_message)
        self.host = "127.0.0.1"
        self.port = random.sample(range(40000, 60000), 1)[0]
    
    async def setup_server(self):
        self.socket = await asyncio.start_server(self._listen_for_method_call, host=self.host, port=self.port, limit=BUFFER_LIMIT)
    
    async def _open_socket_if_not_exists(self):
        if not self.reader:
            retries = 0
            while retries < 10:
                try:
                    self.reader, self.writer = await asyncio.open_connection(host=self.host, port=self.port, limit=BUFFER_LIMIT)
                    return True
                except:
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