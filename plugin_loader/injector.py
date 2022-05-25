#Injector code from https://github.com/SteamDeckHomebrew/steamdeck-ui-inject. More info on how it works there.

from aiohttp import ClientSession
from logging import debug, getLogger
from asyncio import sleep, wait_for
from traceback import format_exc

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
    
    async def listen_for_response(self, id):
        while True:
            data = await self.websocket.receive_json()
            if data["id"] == id:
                return data

    async def _send_devtools_cmd(self, dc, receive=True):
        logger.warn("_send_devtools_cmd function is deprecated, use send_devtools_cmd for better response handling")
        if self.websocket:
            await self.websocket.send_json(dc)
            try:
                return (await self.websocket.receive_json()) if receive else None
            except TimeoutError:
                return None
        raise RuntimeError("Websocket not opened")

    id_iter = 1
    async def send_devtools_cmd(self, dc, response_timeout=10):
        if self.websocket:
            dc["id"] = self.id_iter
            self.id_iter += 1
            await self.websocket.send_json(dc)
            try:
                return (await wait_for(self.listen_for_response(dc["id"]), timeout=response_timeout)) if response_timeout else None
            except TimeoutError:
                return None
        raise RuntimeError("Websocket not opened")

    async def evaluate_js(self, js, run_async=False):
        await self.open_websocket()
        res = await self.send_devtools_cmd({
            "method": "Runtime.evaluate",
            "params": {
                "expression": js,
                "userGesture": True,
                "awaitPromise": run_async
            }
        })
        await self.client.close()
        return res
        
    async def get_steam_resource(self, url):
        res = await self.evaluate_js(f'(async function test() {{ return await (await fetch("{url}")).text() }})()', True)
        return res["result"]["result"]["value"]
    
    def __repr__(self):
        return self.title

async def get_tabs():
    async with ClientSession() as web:
        res = {}

        while True:
            try:
                res = await web.get(f"{BASE_ADDRESS}/json")
                break
            except:
                logger.debug("Steam isn't available yet. Wait for a moment...")
                logger.debug(format_exc())
                await sleep(5)

        if res.status == 200:
            r = await res.json()
            return [Tab(i) for i in r]
        else:
            raise Exception(f"/json did not return 200. {await r.text()}")

async def get_tab(tab_name):
    tabs = await get_tabs()
    tab = next((i for i in tabs if i.title == tab_name), None)
    if not tab:
        raise ValueError(f"Tab {tab_name} not found")
    return tab    

async def inject_to_tab(tab_name, js, run_async=False):
    tab = await get_tab(tab_name)

    return await tab.evaluate_js(js, run_async)

async def tab_has_element(tab_name, element_name):
    try:
        tab = await get_tab(tab_name)
    except ValueError:
        return False
    res = await tab.evaluate_js(f"document.getElementById('{element_name}') != null", False)
    
    if not "result" in res or not "result" in res["result"] or not "value" in res["result"]["result"]:
        return False

    return res["result"]["result"]["value"]
