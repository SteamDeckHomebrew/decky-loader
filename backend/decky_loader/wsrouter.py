from logging import getLogger

from aiohttp import web


class WSRouter:
    def __init__(self) -> None:
        self.ws = None
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
                if msg.type == aiohttp.WSMsgType.TEXT:
                    self.logger.debug(msg.data)
                    if msg.data == 'close':
                        # DO NOT RELY ON THIS!
                        break
                    else:
                        # do stuff with the message
                        data = msg.json()
                        if self.routes[data.route]:
                            res = await self.routes[data.route](data.data)
        finally:
            try:
                await ws.close()
            except:
                pass

        self.logger.debug('Websocket connection closed')
        return ws

    async def write(self, dta: Dict[str, any]):
        await self.ws.send_json(dta)