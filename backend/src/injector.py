# Injector code from https://github.com/SteamDeckHomebrew/steamdeck-ui-inject. More info on how it works there.

from asyncio import sleep
from logging import getLogger
from typing import Any, Callable, List, TypedDict, Dict

from aiohttp import ClientSession
from aiohttp.client_exceptions import ClientConnectorError, ClientOSError
from asyncio.exceptions import TimeoutError
import uuid

BASE_ADDRESS = "http://localhost:8080"

logger = getLogger("Injector")

class _TabResponse(TypedDict):
    title: str
    id: str
    url: str
    webSocketDebuggerUrl: str

class Tab:
    cmd_id = 0

    def __init__(self, res: _TabResponse) -> None:
        self.title: str = res["title"]
        self.id: str = res["id"]
        self.url: str = res["url"]
        self.ws_url: str = res["webSocketDebuggerUrl"]

        self.websocket = None
        self.client = None

    async def open_websocket(self):
        self.client = ClientSession()
        self.websocket = await self.client.ws_connect(self.ws_url) # type: ignore

    async def close_websocket(self):
        if self.websocket:
            await self.websocket.close()
        if self.client:
            await self.client.close()

    async def listen_for_message(self):
        if self.websocket:
            async for message in self.websocket:
                data = message.json()
                yield data
            logger.warn(f"The Tab {self.title} socket has been disconnected while listening for messages.")
            await self.close_websocket()
            
    async def _send_devtools_cmd(self, dc: Dict[str, Any], receive: bool = True):
        if self.websocket:
            self.cmd_id += 1
            dc["id"] = self.cmd_id
            await self.websocket.send_json(dc)
            if receive:
                async for msg in self.listen_for_message():
                    if "id" in msg and msg["id"] == dc["id"]:
                        return msg
            return None
        raise RuntimeError("Websocket not opened")

    async def evaluate_js(self, js: str, run_async: bool | None = False, manage_socket: bool | None = True, get_result: bool = True):
        try:
            if manage_socket:
                await self.open_websocket()

            res = await self._send_devtools_cmd({
                "method": "Runtime.evaluate",
                "params": {
                    "expression": js,
                    "userGesture": True,
                    "awaitPromise": run_async
                }
            }, get_result)

        finally:
            if manage_socket:
                await self.close_websocket()
        return res

    async def has_global_var(self, var_name: str, manage_socket: bool = True):
        res = await self.evaluate_js(f"window['{var_name}'] !== null && window['{var_name}'] !== undefined", False, manage_socket)
        assert res is not None

        if not "result" in res or not "result" in res["result"] or not "value" in res["result"]["result"]:
            return False

        return res["result"]["result"]["value"]

    async def close(self, manage_socket: bool = True):
        try:
            if manage_socket:
                await self.open_websocket()

            res = await self._send_devtools_cmd({
                "method": "Page.close",
            }, False)

        finally:
            if manage_socket:
                await self.close_websocket()
        return res

    async def enable(self):
        """
        Enables page domain notifications.
        """
        await self._send_devtools_cmd({
            "method": "Page.enable",
        }, False)

    async def disable(self):
        """
        Disables page domain notifications.
        """
        await self._send_devtools_cmd({
            "method": "Page.disable",
        }, False)

    async def refresh(self, manage_socket: bool = True):
        try:
            if manage_socket:
                await self.open_websocket()

            await self._send_devtools_cmd({
                "method": "Page.reload",
            }, False)

        finally:
            if manage_socket:
                await self.close_websocket()

        return
    async def reload_and_evaluate(self, js: str, manage_socket: bool = True):
        """
        Reloads the current tab, with JS to run on load via debugger
        """
        try:
            if manage_socket:
                await self.open_websocket()

            await self._send_devtools_cmd({
                "method": "Debugger.enable"
            }, True)

            await self._send_devtools_cmd({
                "method": "Runtime.evaluate",
                "params": {
                    "expression": "location.reload();",
                    "userGesture": True,
                    "awaitPromise": False
                }
            }, False)

            breakpoint_res = await self._send_devtools_cmd({
                "method": "Debugger.setInstrumentationBreakpoint",
                "params": {
                    "instrumentation": "beforeScriptExecution"
                }
            }, True)

            assert breakpoint_res is not None

            logger.info(breakpoint_res)
            
            # Page finishes loading when breakpoint hits

            for _ in range(20):
                # this works around 1/5 of the time, so just send it 8 times.
                # the js accounts for being injected multiple times allowing only one instance to run at a time anyway
                await self._send_devtools_cmd({
                    "method": "Runtime.evaluate",
                    "params": {
                        "expression": js,
                        "userGesture": True,
                        "awaitPromise": False
                    }
                }, False)

            await self._send_devtools_cmd({
                "method": "Debugger.removeBreakpoint",
                "params": {
                    "breakpointId": breakpoint_res["result"]["breakpointId"]
                }
            }, False)

            for _ in range(4):
                await self._send_devtools_cmd({
                    "method": "Debugger.resume"
                }, False)

            await self._send_devtools_cmd({
                "method": "Debugger.disable"
            }, True)

        finally:
            if manage_socket:
                await self.close_websocket()
        return

    async def add_script_to_evaluate_on_new_document(self, js: str, add_dom_wrapper: bool = True, manage_socket: bool = True, get_result: bool = True):
        """
        How the underlying call functions is not particularly clear from the devtools docs, so stealing puppeteer's description:

        Adds a function which would be invoked in one of the following scenarios:
        * whenever the page is navigated
        * whenever the child frame is attached or navigated. In this case, the
          function is invoked in the context of the newly attached frame.

        The function is invoked after the document was created but before any of
        its scripts were run. This is useful to amend the JavaScript environment,
        e.g. to seed `Math.random`.

        Parameters
        ----------
        js : str
            The script to evaluate on new document
        add_dom_wrapper : bool
            True to wrap the script in a wait for the 'DOMContentLoaded' event.
            DOM will usually not exist when this execution happens,
            so it is necessary to delay til DOM is loaded if you are modifying it
        manage_socket : bool
            True to have this function handle opening/closing the websocket for this tab
        get_result : bool
            True to wait for the result of this call

        Returns
        -------
        int or None
            The identifier of the script added, used to remove it later.
            (see remove_script_to_evaluate_on_new_document below)
            None is returned if `get_result` is False
        """
        try:

            wrappedjs = """
            function scriptFunc() {
                {js}
            }
            if (document.readyState === 'loading') {
                addEventListener('DOMContentLoaded', () => {
                scriptFunc();
            });
            } else {
                scriptFunc();
            }
            """.format(js=js) if add_dom_wrapper else js

            if manage_socket:
                await self.open_websocket()

            res = await self._send_devtools_cmd({
                "method": "Page.addScriptToEvaluateOnNewDocument",
                "params": {
                    "source": wrappedjs
                }
            }, get_result)

        finally:
            if manage_socket:
                await self.close_websocket()
        return res

    async def remove_script_to_evaluate_on_new_document(self, script_id: str, manage_socket: bool = True):
        """
        Removes a script from a page that was added with `add_script_to_evaluate_on_new_document`

        Parameters
        ----------
        script_id : int
            The identifier of the script to remove (returned from `add_script_to_evaluate_on_new_document`)
        """

        try:
            if manage_socket:
                await self.open_websocket()

            await self._send_devtools_cmd({
                "method": "Page.removeScriptToEvaluateOnNewDocument",
                "params": {
                    "identifier": script_id
                }
            }, False)

        finally:
            if manage_socket:
                await self.close_websocket()

    async def has_element(self, element_name: str, manage_socket: bool = True):
        res = await self.evaluate_js(f"document.getElementById('{element_name}') != null", False, manage_socket)
        assert res is not None

        if not "result" in res or not "result" in res["result"] or not "value" in res["result"]["result"]:
            return False

        return res["result"]["result"]["value"]

    async def inject_css(self, style: str, manage_socket: bool = True):
        try:
            css_id = str(uuid.uuid4())

            result = await self.evaluate_js(
                f"""
                (function() {{
                    const style = document.createElement('style');
                    style.id = "{css_id}";
                    document.head.append(style);
                    style.textContent = `{style}`;
                }})()
                """, False, manage_socket)

            assert result is not None

            if "exceptionDetails" in result["result"]:
                return {
                    "success": False,
                    "result": result["result"]
                }

            return {
                "success": True,
                "result": css_id
            }
        except Exception as e:
            return {
                "success": False,
                "result": e
            }

    async def remove_css(self, css_id: str, manage_socket: bool = True):
        try:
            result = await self.evaluate_js(
                f"""
                (function() {{
                    let style = document.getElementById("{css_id}");

                    if (style.nodeName.toLowerCase() == 'style')
                        style.parentNode.removeChild(style);
                }})()
                """, False, manage_socket)

            assert result is not None

            if "exceptionDetails" in result["result"]:
                return {
                    "success": False,
                    "result": result
                }

            return {
                "success": True
            }
        except Exception as e:
            return {
                "success": False,
                "result": e
            }

    async def get_steam_resource(self, url: str):
        res = await self.evaluate_js(f'(async function test() {{ return await (await fetch("{url}")).text() }})()', True)
        assert res is not None
        return res["result"]["result"]["value"]

    def __repr__(self):
        return self.title


async def get_tabs() -> List[Tab]:
    res = {}

    na = False
    while True:
        try:
            async with ClientSession() as web:
                res = await web.get(f"{BASE_ADDRESS}/json", timeout=3)
        except ClientConnectorError:
            if not na:
                logger.debug("Steam isn't available yet. Wait for a moment...")
                na = True
            await sleep(5)
        except ClientOSError:
            logger.warn(f"The request to {BASE_ADDRESS}/json was reset")
            await sleep(1)
        except TimeoutError:
            logger.warn(f"The request to {BASE_ADDRESS}/json timed out")
            await sleep(1)
        else:
            break

    if res.status == 200:
        r = await res.json()
        return [Tab(i) for i in r]
    else:
        raise Exception(f"/json did not return 200. {await res.text()}")


async def get_tab(tab_name: str) -> Tab:
    tabs = await get_tabs()
    tab = next((i for i in tabs if i.title == tab_name), None)
    if not tab:
        raise ValueError(f"Tab {tab_name} not found")
    return tab

async def get_tab_lambda(test: Callable[[Tab], bool]) -> Tab:
    tabs = await get_tabs()
    tab = next((i for i in tabs if test(i)), None)
    if not tab:
        raise ValueError(f"Tab not found by lambda")
    return tab

SHARED_CTX_NAMES = ["SharedJSContext", "Steam Shared Context presented by Valve™", "Steam", "SP"]
CLOSEABLE_URLS = ["about:blank", "data:text/html,%3Cbody%3E%3C%2Fbody%3E"] # Closing anything other than these *really* likes to crash Steam
DO_NOT_CLOSE_URL = "Valve Steam Gamepad/default" # Steam Big Picture Mode tab

def tab_is_gamepadui(t: Tab) -> bool:
    return "https://steamloopback.host/routes/" in t.url and t.title in SHARED_CTX_NAMES

async def get_gamepadui_tab() -> Tab:
    tabs = await get_tabs()
    tab = next((i for i in tabs if tab_is_gamepadui(i)), None)
    if not tab:
        raise ValueError(f"GamepadUI Tab not found")
    return tab

async def inject_to_tab(tab_name: str, js: str, run_async: bool = False):
    tab = await get_tab(tab_name)

    return await tab.evaluate_js(js, run_async)

async def close_old_tabs():
    tabs = await get_tabs()
    for t in tabs:
        if not t.title or (t.title not in SHARED_CTX_NAMES and any(url in t.url for url in CLOSEABLE_URLS) and DO_NOT_CLOSE_URL not in t.url):
            logger.debug("Closing tab: " + getattr(t, "title", "Untitled"))
            await t.close()
            await sleep(0.5)
