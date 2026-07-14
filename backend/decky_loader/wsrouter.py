from logging import getLogger

from asyncio import AbstractEventLoop
from aiohttp import WSCloseCode, WSMsgType, WSMessage
from aiohttp.web import Application, WebSocketResponse, Request, Response, get

from enum import IntEnum
from typing import Callable, Coroutine, Dict, Any, cast
from traceback import format_exc

from .helpers import get_csrf_token
from .plugin.messages import PluginStopped

class MessageType(IntEnum):
    ERROR = -1
    # Call-reply, Frontend (CALL) -> Backend (REPLY|DISCARD) -> Frontend (RECEIVED_RESPONSE) -> Backend
    CALL = 0
    REPLY = 1
    DISCARD = 2
    RECEIVED_RESPONSE = 3
    # Call-reply sync on connection lost,
    #   Frontend (FULL_SYNC) -> Backend (REPLY|DISCARD...) -> Frontend (RECEIVED_RESPONSE...) -> Backend
    FULL_SYNC = 4
    # Pub/Sub, Backend -> Frontend
    EVENT = 5

# WSMessage with slightly better typings
class WSMessageExtra(WSMessage):
    # TODO message typings here too
    data: Any # pyright: ignore [reportIncompatibleVariableOverride]
    type: WSMsgType # pyright: ignore [reportIncompatibleVariableOverride]

# see wsrouter.ts for typings

Route = Callable[..., Coroutine[Any, Any, Any]]

class WSRouter:
    def __init__(self, loop: AbstractEventLoop, server_instance: Application) -> None:
        self.loop = loop
        self.ws: WebSocketResponse | None = None
        self.routes: Dict[str, Route]  = {}
        self.pending_responses: Dict[int, Dict[str, Any] | None] = {}
        self.logger = getLogger("WSRouter")

        server_instance.add_routes([
            get("/ws", self.handle)
        ])

    async def write(self, data: Dict[str, Any]):
        # Cache all of the pending responses in case the connection is lost.
        # Cleanup will happen during full-sync or when frontend confirms it has received the message
        can_drop_message = True
        if "id" in data and data["id"] in self.pending_responses:
            self.pending_responses[data["id"]] = data
            can_drop_message = False

        if self.ws != None:
            await self.ws.send_json(data)
        elif can_drop_message:
            self.logger.warning("Dropping message as there is no connected socket: %s", data)

    def add_route(self, name: str, route: Route):
        self.routes[name] = route

    def remove_route(self, name: str):
        del self.routes[name]

    async def _call_route(self, route: str, args: ..., call_id: int):
        try:
            res = await self.routes[route](*args)
            message = {"type": MessageType.REPLY.value, "id": call_id, "result": res}
        except PluginStopped as err:
            message = {"type": MessageType.DISCARD.value, "id": call_id}
        except Exception as err:
            error = {"name":err.__class__.__name__, "message":str(err), "traceback":format_exc()}
            message = {"type": MessageType.ERROR.value, "id": call_id, "error": error}
        
        await self.write(message)

    async def handle(self, request: Request):
        # Auth is a query param as JS WebSocket doesn't support headers
        if request.rel_url.query["auth"] != get_csrf_token():
            return Response(text='Forbidden', status=403) 
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
                msg = cast(WSMessageExtra, msg)

                if msg.type == WSMsgType.TEXT:
                    if msg.data == 'close':
                        # TODO DO NOT RELY ON THIS!
                        break
                    else:
                        data = msg.json()
                        match data["type"]:
                            case MessageType.CALL.value:
                                self.handle_call_message(data)
                            case MessageType.RECEIVED_RESPONSE.value:
                                self.handle_received_response_message(data["id"])
                            case MessageType.FULL_SYNC.value:
                                self.handle_full_sync_message(data)
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

    def handle_call_message(self, data: Dict[str, Any]):
        call_id = data["id"]
        if call_id in self.pending_responses:
            reply = self.pending_responses[call_id]
            if reply:
                self.logger.debug(f'Found pending PY call matching ID {call_id}. Sending reply...')
                self.loop.create_task(self.write(reply))
            else:
                self.logger.debug(f'Found pending PY call matching ID {call_id}. Waiting for reply from plugin...')

            return
        
        # Prepare a call entry for caching the reply once we have it, this will also
        # help us identify (above) if we are already handling the call message or not. 
        self.pending_responses[call_id] = None
        if data["route"] in self.routes:
            self.logger.debug(f'Started PY call {data["route"]} ID {call_id}')
            self.loop.create_task(self._call_route(data["route"], data["args"], call_id))
        else:
            error = {"error":f'Route {data["route"]} does not exist.', "name": "RouteNotFoundError", "traceback": None}
            self.loop.create_task(self.write({"type": MessageType.ERROR.value, "id": call_id, "error": error}))

    def handle_received_response_message(self, call_id: int):
        self.logger.debug(f'Removing pending response with ID {call_id}')
        self.pending_responses.pop(call_id, None)
            
    def handle_full_sync_message(self, data: Dict[str, Any]):
        messages = data["messages"]
        outdated_response_ids = set(self.pending_responses.keys())

        for message in messages:
            outdated_response_ids.discard(message["id"])
            self.handle_call_message(message)

        for outdated_id in outdated_response_ids:
            self.handle_received_response_message(outdated_id)

    async def emit(self, event: str, *args: Any):
        self.logger.debug(f'Firing frontend event {event} with args {args}')
        await self.write({ "type": MessageType.EVENT.value, "event": event, "args": args })

    async def disconnect(self):
        if self.ws:
            await self.ws.close(code=WSCloseCode.GOING_AWAY, message=b"Loader is shutting down")
