#Injector code from https://github.com/SteamDeckHomebrew/steamdeck-ui-inject. More info on how it works there.

from aiohttp import ClientSession
from logging import debug, getLogger
from asyncio import sleep

BASE_ADDRESS = "http://localhost:8080"

logger = getLogger("Injector")

class Tab:
    def __init__(self, res) -> None:
        self.title = res["title"]
        self.id = res["id"]
        self.ws_url = res["webSocketDebuggerUrl"]

        self.websocket = None
        self.client = None

    async def open_websocket(self):
        self.client = ClientSession()
        self.websocket = await self.client.ws_connect(self.ws_url)
    
    async def listen_for_message(self):
        async for message in self.websocket:
            yield message

    async def _send_devtools_cmd(self, dc, receive=True):
        if self.websocket:
            await self.websocket.send_json(dc)
            return (await self.websocket.receive_json()) if receive else None
        raise RuntimeError("Websocket not opened")

    async def evaluate_js(self, js):
        await self.open_websocket()
        res = await self._send_devtools_cmd({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": js,
                "userGesture": True
            }
        })
        await self.client.close()
        return res
        
    async def get_steam_resource(self, url):
        await self.open_websocket()
        res = await self._send_devtools_cmd({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": f'(async function test() {{ return await (await fetch("{url}")).text() }})()',
                "userGesture": True,
                "awaitPromise": True
            }
        })
        await self.client.close()
        return res["result"]["result"]["value"]
    
    def __repr__(self):
        return self.title

async def get_tabs():
    async with ClientSession() as web:
        res = {}

        while True:
            try:
                res = await web.get("{}/json".format(BASE_ADDRESS))
                break
            except:
                logger.info("Steam isn't available yet. Wait for a moment...")
                await sleep(5)

        if res.status == 200:
            res = await res.json()
            return [Tab(i) for i in res]
        else:
            raise Exception("/json did not return 200. {}".format(await res.text()))

async def inject_to_tab(tab_name, js):
    tabs = await get_tabs()
    tab = next((i for i in tabs if i.title == tab_name), None)
    if not tab:
        raise ValueError("Tab {} not found in running tabs".format(tab_name))
    logger.debug(f"Injected JavaScript Result: {await tab.evaluate_js(js)}")

async def tab_has_element(tab_name, element_name):
    tabs = await get_tabs()
    tab = next((i for i in tabs if i.title == tab_name), None)
    if not tab:
        return False
    res = await tab.evaluate_js(f"document.getElementById('{element_name}') != null")
    
    if not "result" in res or not "result" in res["result"] or not "value" in res["result"]["result"]:
        return False;

    return res["result"]["result"]["value"]
