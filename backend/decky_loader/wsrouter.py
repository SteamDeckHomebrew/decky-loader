from logging import getLogger

from asyncio import Future

from aiohttp import web, WSMsgType

from enum import Enum

from typing import Dict, Any, Callable

from traceback import format_exc

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
    def __init__(self) -> None:
        self.ws = None
        self.req_id = 0
        self.routes = {}
        self.running_calls: Dict[int, Future] = {}
        # self.subscriptions: Dict[str, Callable[[Any]]] = {}
        self.logger = getLogger("WSRouter")

    async def add_route(self, name, route):
        self.routes[name] = route

    async def handle(self, request):
        self.logger.debug('Websocket connection starting')
        ws = web.WebSocketResponse()
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
                        match data.type:
                            case MessageType.CALL:
                                # do stuff with the message
                                data = msg.json()
                                if self.routes[data.route]:
                                    try:
                                        res = await self.routes[data.route](*data.args)
                                        await self.write({"type": MessageType.REPLY, "id": data.id, "result": res})
                                        self.logger.debug(f"Started PY call {data.route} ID {data.id}")
                                    except:
                                        await self.write({"type": MessageType.ERROR, "id": data.id, "error": format_exc()})
                                else:
                                    await self.write({"type": MessageType.ERROR, "id": data.id, "error": "Route does not exist."})
                            case MessageType.REPLY:
                                if self.running_calls[data.id]:
                                    self.running_calls[data.id].set_result(data.result)
                                    del self.running_calls[data.id]
                                    self.logger.debug(f"Resolved JS call {data.id} with value {str(data.result)}")
                            case MessageType.ERROR:
                                if self.running_calls[data.id]:
                                    self.running_calls[data.id].set_exception(data.error)
                                    del self.running_calls[data.id]
                                    self.logger.debug(f"Errored JS call {data.id} with error {data.error}")

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

    async def write(self, dta: Dict[str, any]):
        await self.ws.send_json(dta)