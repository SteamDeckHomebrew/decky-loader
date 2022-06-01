import uuid
from json.decoder import JSONDecodeError

from aiohttp import ClientSession, web

from injector import inject_to_tab


class Utilities:
    def __init__(self, context) -> None:
        self.context = context
        self.util_methods = {
            "ping": self.ping,
            "http_request": self.http_request,
            "cancel_plugin_install": self.cancel_plugin_install,
            "confirm_plugin_install": self.confirm_plugin_install,
            "execute_in_tab": self.execute_in_tab,
            "inject_css_into_tab": self.inject_css_into_tab,
            "remove_css_from_tab": self.remove_css_from_tab
        }

        if context:
            context.web_app.add_routes([
                web.post("/methods/{method_name}", self._handle_server_method_call)
            ])

    async def _handle_server_method_call(self, request):
        method_name = request.match_info["method_name"]
        try:
            args = await request.json()
        except JSONDecodeError:
            args = {}
        res = {}
        try:
            r = await self.util_methods[method_name](**args)
            res["result"] = r
            res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        return web.json_response(res)

    async def confirm_plugin_install(self, request_id):
        return await self.context.plugin_browser.confirm_plugin_install(request_id)

    def cancel_plugin_install(self, request_id):
        return self.context.plugin_browser.cancel_plugin_install(request_id)

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
