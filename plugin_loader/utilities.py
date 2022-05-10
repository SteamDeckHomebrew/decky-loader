from aiohttp import ClientSession
from injector import get_tab, get_tabs, inject_to_tab
import uuid

class Utilities:
    def __init__(self, context) -> None:
        self.context = context
        self.util_methods = {
            "ping": self.ping,
            "http_request": self.http_request,
            "confirm_plugin_install": self.confirm_plugin_install,
            "execute_in_tab": self.execute_in_tab,
            "inject_css_into_tab": self.inject_css_into_tab,
            "remove_css_from_tab": self.remove_css_from_tab,
            "open_plugin_store": self.open_plugin_store
        }

    async def confirm_plugin_install(self, request_id):
        return await self.context.plugin_browser.confirm_plugin_install(request_id)

    async def http_request(self, method="", url="", **kwargs):
        async with ClientSession() as web:
            async with web.request(method, url, **kwargs) as res:
                return {
                    "status": res.status,
                    "headers": dict(res.headers),
                    "body": await res.text()
                }

    async def ping(self, **kwargs):
        return "pong"

    async def execute_in_tab(self, tab, run_async, code):       
        try:
            result = await inject_to_tab(tab, code, run_async)
            if "exceptionDetails" in result["result"]:
                return {
                    "success": False,
                    "result": result["result"]
                }

            return {
                "success": True,
                "result" : result["result"]["result"].get("value")
            }
        except Exception as e:
            return { 
                "success": False,
                "result": e
            }

    async def inject_css_into_tab(self, tab, style):
        try:
            css_id = str(uuid.uuid4())

            result = await inject_to_tab(tab, 
                f"""
                (function() {{
                    const style = document.createElement('style');
                    style.id = "{css_id}";
                    document.head.append(style);
                    style.textContent = `{style}`;
                }})()
                """, False)

            if "exceptionDetails" in result["result"]:
                return {
                    "success": False,
                    "result": result["result"]
                }

            return {
                "success": True,
                "result" : css_id
            }
        except Exception as e:
            return { 
                "success": False,
                "result": e
            }

    async def remove_css_from_tab(self, tab, css_id):
        try:
            result = await inject_to_tab(tab, 
                f"""
                (function() {{
                    let style = document.getElementById("{css_id}");

                    if (style.nodeName.toLowerCase() == 'style')
                        style.parentNode.removeChild(style);
                }})()
                """, False)

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

    async def open_plugin_store(self):
        if self.context.plugin_browser.store_url in await get_tabs():
            return
        res = await inject_to_tab("SP", """
        window.PLUGIN_STORE_TAB_INSTANCE = (function() {
            let i = SteamClient.BrowserView.Create()
            i.SetBounds(0, 60, 1280, 800-59-60)
            i.LoadURL('http://127.0.0.1:1337/browser/redirect')
            i.SetVisible(true);
            return i;
        })();
        """)
        setattr(self, "store_is_open", True)