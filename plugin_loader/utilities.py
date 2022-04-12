from aiohttp import ClientSession
from injector import inject_to_tab

class Utilities:
    def __init__(self, context) -> None:
        self.context = context
        self.util_methods = {
            "ping": self.ping,
            "http_request": self.http_request,
            "confirm_plugin_install": self.confirm_plugin_install,
            "execute_in_tab": self.execute_in_tab
        }

    async def confirm_plugin_install(self, request_id):
        return await self.context.plugin_browser.confirm_plugin_install(request_id)

    async def http_request(self, method="", url="", **kwargs):
        async with ClientSession() as web:
            res = await web.request(method, url, **kwargs)
            return {
                "status": res.status,
                "headers": dict(res.headers),
                "body": await res.text()
            }

    async def ping(self, **kwargs):
        return "pong"

    async def execute_in_tab(self, tab, run_async, code):       
        try:
            return {
                "success": True,
                "result" : await inject_to_tab(tab, code, run_async)
            }
        except Exception as e:
            return { 
                "success": False,
                "result": e
            }

