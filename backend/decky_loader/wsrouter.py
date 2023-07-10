from logging import getLogger

from asyncio import AbstractEventLoop, Future

from aiohttp import WSMsgType
from aiohttp.web import Application, WebSocketResponse, Request, Response, get

from enum import Enum

from typing import Dict

from traceback import format_exc

from helpers import get_csrf_token

class MessageType(Enum):
    # Call-reply
    CALL = 0
    REPLY = 1
    ERROR = 2
    # # Pub/sub
    # SUBSCRIBE = 3
    # UNSUBSCRIBE = 4
    # PUBLISH = 5

# see wsrouter.ts for typings

class WSRouter:
    def __init__(self, loop: AbstractEventLoop, server_instance: Application) -> None:
        self.loop = loop
        self.ws = None
        self.req_id = 0
        self.routes = {}
        self.running_calls: Dict[int, Future] = {}
        # self.subscriptions: Dict[str, Callable[[Any]]] = {}
        self.logger = getLogger("WSRouter")

        server_instance.add_routes([
            get("/ws", self.handle)
        ])

    async def write(self, dta: Dict[str, any]):
        await self.ws.send_json(dta)

    def add_route(self, name: str, route):
        self.routes[name] = route

    def remove_route(self, name: str):
        del self.routes[name]

    async def handle(self, request: Request):
        # Auth is a query param as JS WebSocket doesn't support headers
        if request.rel_url.query["auth"] != get_csrf_token():
            return Response(text='Forbidden', status='403') 
        self.logger.debug('Websocket connection starting')
        ws = WebSocketResponse()
        await ws.prepare(request)
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
                                if self.routes[data["route"]]:
                                    try:
                                        res = await self.routes[data["route"]](*data["args"])
                                        await self.write({"type": MessageType.REPLY.value, "id": data["id"], "result": res})
                                        self.logger.debug(f'Started PY call {data["route"]} ID {data["id"]}')
                                    except:
                                        await self.write({"type": MessageType.ERROR.value, "id": data["id"], "error": format_exc()})
                                else:
                                    await self.write({"type": MessageType.ERROR.value, "id": data["id"], "error": "Route does not exist."})
                            case MessageType.REPLY.value:
                                if self.running_calls[data["id"]]:
                                    self.running_calls[data["id"]].set_result(data["result"])
                                    del self.running_calls[data["id"]]
                                    self.logger.debug(f'Resolved JS call {data["id"]} with value {str(data["result"])}')
                            case MessageType.ERROR.value:
                                if self.running_calls[data["id"]]:
                                    self.running_calls[data["id"]].set_exception(data["error"])
                                    del self.running_calls[data["id"]]
                                    self.logger.debug(f'Errored JS call {data["id"]} with error {data["error"]}')

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

    async def call(self, route: str, *args):
        future = Future()

        self.req_id += 1

        id = self.req_id

        self.running_calls[id] = future

        self.logger.debug(f'Calling JS method {route} with args {str(args)}')

        self.write({ "type": MessageType.CALL.value, "route": route, "args": args, "id": id })

        return await future
