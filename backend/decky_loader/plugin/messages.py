from typing import Any, TypedDict
from enum import IntEnum
from uuid import uuid4
from asyncio import Event

class SocketMessageType(IntEnum):
    CALL = 0
    RESPONSE = 1
    EVENT = 2

class SocketResponseDict(TypedDict):
    type: SocketMessageType
    id: str
    success: bool
    res: Any

class MethodCallResponse:
    def __init__(self, success: bool, result: Any) -> None:
        self.success = success
        self.result = result

class MethodCallRequest:
    def __init__(self) -> None:
        self.id = str(uuid4())
        self.event = Event()
        self.response: MethodCallResponse
    
    def set_result(self, dc: SocketResponseDict):
        self.response = MethodCallResponse(dc["success"], dc["res"])
        self.event.set()
    
    async def wait_for_result(self):
        await self.event.wait()
        if not self.response.success:
            raise Exception(self.response.result)
        return self.response.result