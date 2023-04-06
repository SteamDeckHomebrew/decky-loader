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
    # Pub/sub

running_calls: Dict[str, Future] = {}

subscriptions: Dict[str, Callable[[Any]]]

# {type: MessageType, data: dta, id: id}

class WSRouter:
    def __init__(self) -> None:
        self.ws = None
        self.req_id = 0
        self.routes = {}
        self.logger = getLogger("WSRouter")

    async def add_routes(self, routes):
        self.routes.update(routes)

    async def handle(self, request):
        self.logger.debug('Websocket connection starting')
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self.logger.debug('Websocket connection ready')

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
                                        res = await self.routes[data.route](data.data)
                                        await ws.send_json({type: MessageType.REPLY, id: data.id, data: res})
                                    except:
                                        await ws.send_json({type: MessageType.ERROR, id: data.ud, data: format_exc()})
                            case MessageType.REPLY:
                                if running_calls[data.id]:
                                    running_calls[data.id].set_result(data.data)
                            case MessageType.ERROR:
                                if running_calls[data.id]:
                                    running_calls[data.id].set_exception(data.data)
        finally:
            try:
                await ws.close()
            except:
                pass

        self.logger.debug('Websocket connection closed')
        return ws

    async def write(self, dta: Dict[str, any]):
        await self.ws.send_json(dta)