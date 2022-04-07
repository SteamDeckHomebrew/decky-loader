from aiohttp import ClientSession

class Utilities:
    def __init__(self, context) -> None:
        self.context = context
        self.util_methods = {
            "ping": self.ping,
            "http_request": self.http_request,
            "confirm_plugin_install": self.confirm_plugin_install
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