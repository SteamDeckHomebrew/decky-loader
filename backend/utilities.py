import uuid
import shutil
import contextlib
from pathlib import Path
from json.decoder import JSONDecodeError

from aiohttp import ClientSession, web

from injector import inject_to_tab
import helpers

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
            "remove_css_from_tab": self.remove_css_from_tab,
            "allow_remote_debugging": self.allow_remote_debugging,
            "disallow_remote_debugging": self.disallow_remote_debugging,
            "remote_debugging_allowed": self.remote_debugging_allowed,
            "uninstall_decky": self.uninstall_decky,
            "set_setting": self.set_setting,
            "get_setting": self.get_setting
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
            async with web.request(method, url, ssl=helpers.get_ssl_context(), **kwargs) as res:
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

    async def get_setting(self, key, default):
        return self.context.settings.getSetting(key, default)

    async def uninstall_decky(keepConfig=True) -> None:
        username: str = helpers.get_user()
        user_dir = Path(f"~{username}").expanduser()
        homebrew_dir = user_dir / "homebrew"
        possible_unit_paths = [
            user_dir / ".config" / "systemd" / "user" / helpers.PLUGIN_LOADER_UNIT,
            Path("/etc") / "systemd" / "system" / helpers.PLUGIN_LOADER_UNIT
        ]

        # https://stackoverflow.com/a/27045091
        with contextlib.suppress(FileNotFoundError):
            # Disable and remove services
            helpers.disable_systemd_unit(helpers.PLUGIN_LOADER_UNIT, now=True)
            for path in possible_unit_paths:
                path.unlink(missing_ok=True)

            # Remove temporary folder if it exists from the install process
            shutil.rmtree("/tmp/plugin_loader")

            if keepConfig:
                shutil.rmtree(homebrew_dir / "services")
            else:
                shutil.rmtree(homebrew_dir)

    async def set_setting(self, key, value):
        return self.context.settings.setSetting(key, value)

    async def remote_debugging_allowed(self):
        return await helpers.is_systemd_unit_active(helpers.REMOTE_DEBUGGER_UNIT)

    async def allow_remote_debugging(self):
        await helpers.start_systemd_unit(helpers.REMOTE_DEBUGGER_UNIT)
        return True

    async def disallow_remote_debugging(self):
        await helpers.stop_systemd_unit(helpers.REMOTE_DEBUGGER_UNIT)
        return True
