from logging import getLogger

from asyncio import AbstractEventLoop, create_task

from aiohttp import WSMsgType, WSMessage
from aiohttp.web import Application, WebSocketResponse, Request, Response, get

from enum import IntEnum

from typing import Callable, Coroutine, Dict, Any, cast, TypeVar, Type
from dataclasses import dataclass

from traceback import format_exc

from .helpers import get_csrf_token

class MessageType(IntEnum):
    ERROR = -1
    # Call-reply, Frontend -> Backend
    CALL = 0
    REPLY = 1
    # Pub/Sub, Backend -> Frontend
    EVENT = 3

# WSMessage with slightly better typings
class WSMessageExtra(WSMessage):
    data: Any
    type: WSMsgType
@dataclass
class Message:
    data: Any
    type: MessageType

# @dataclass
# class CallMessage

# see wsrouter.ts for typings

DataType = TypeVar("DataType")

Route = Callable[..., Coroutine[Any, Any, Any]]

class WSRouter:
    def __init__(self, loop: AbstractEventLoop, server_instance: Application) -> None:
        self.loop = loop
        self.ws: WebSocketResponse | None = None
        self.instance_id = 0
        self.routes: Dict[str, Route]  = {}
        # self.subscriptions: Dict[str, Callable[[Any]]] = {}
        self.logger = getLogger("WSRouter")

        server_instance.add_routes([
            get("/ws", self.handle)
        ])

    async def write(self, data: Dict[str, Any]):
        if self.ws != None:
            await self.ws.send_json(data)
        else:
            self.logger.warn("Dropping message as there is no connected socket: %s", data)

    def add_route(self, name: str, route: Route):
        self.routes[name] = route

    def remove_route(self, name: str):
        del self.routes[name]

    async def _call_route(self, route: str, args: ..., call_id: int):
        instance_id = self.instance_id
        res = await self.routes[route](*args)
        if instance_id != self.instance_id:
            try:
                self.logger.warn("Ignoring %s reply from stale instance %d with args %s and response %s", route, instance_id, args, res)
            except:
                self.logger.warn("Ignoring %s reply from stale instance %d (failed to log event data)", route, instance_id)
            finally:
                return
        await self.write({"type": MessageType.REPLY.value, "id": call_id, "result": res})

    async def handle(self, request: Request):
        # Auth is a query param as JS WebSocket doesn't support headers
        if request.rel_url.query["auth"] != get_csrf_token():
            return Response(text='Forbidden', status=403) 
        self.logger.debug('Websocket connection starting')
        ws = WebSocketResponse()
        await ws.prepare(request)
        self.instance_id += 1
        self.logger.debug('Websocket connection ready')

        if self.ws != None:
            try:
                await self.ws.close()
            except:
                pass
            self.ws = None

        self.ws = ws
        
        try:
            async for msg in ws:
                msg = cast(WSMessageExtra, msg)

                self.logger.debug(msg)
                if msg.type == WSMsgType.TEXT:
                    self.logger.debug(msg.data)
                    if msg.data == 'close':
                        # TODO DO NOT RELY ON THIS!
                        break
                    else:
                        data = msg.json()
                        match data["type"]:
                            case MessageType.CALL.value:
                                # do stuff with the message
                                if data["route"] in self.routes:
                                    try:
                                        self.logger.debug(f'Started PY call {data["route"]} ID {data["id"]}')
                                        create_task(self._call_route(data["route"], data["args"], data["id"]))
                                    except:
                                        create_task(self.write({"type": MessageType.ERROR.value, "id": data["id"], "error": format_exc()}))
                                else:
                                    # Dunno why but fstring doesnt work here
                                    create_task(self.write({"type": MessageType.ERROR.value, "id": data["id"], "error": "Route " + data["route"] + " does not exist."}))
                            case _:
                                self.logger.error("Unknown message type", data)
        finally:
            try:
                await ws.close()
                self.ws = None
            except:
                pass

        self.logger.debug('Websocket connection closed')
        return ws

    # DataType defaults to None so that if a plugin opts in to strict pyright checking and attempts to pass data witbout specifying the type (or any), the type check fails
    async def emit(self, event: str, data: DataType | None = None, data_type: Type[DataType]|None = None):
        self.logger.debug('Firing frontend event %s with args %s', data)

        await self.write({ "type": MessageType.EVENT.value, "event": event, "data": data })
