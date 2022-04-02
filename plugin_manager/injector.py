#Injector code from https://github.com/SteamDeckHomebrew/steamdeck-ui-inject. More info on how it works there.

from aiohttp import ClientSession
from logging import info

BASE_ADDRESS = "http://localhost:8080"
web = None

class Tab:
    def __init__(self, res) -> None:
        self.title = res["title"]
        self.id = res["id"]
        self.ws_url = res["webSocketDebuggerUrl"]

    async def evaluate_js(self, js):
        async with ClientSession() as web:
            async with web.ws_connect(self.ws_url) as ws:
                await ws.send_json({
                    "id": 1,
                    "method": "Runtime.evaluate",
                    "params": {
                        "expression": js,
                        "userGesture": True
                    }
                })
                return await ws.receive_json()
    
    def __repr__(self):
        return self.title

async def get_tabs():
    async with ClientSession() as web:
        res = await web.get("{}/json".format(BASE_ADDRESS))
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
    info(await tab.evaluate_js(js))