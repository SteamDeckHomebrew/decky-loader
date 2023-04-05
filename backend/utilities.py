import uuid
import os
from json.decoder import JSONDecodeError
from traceback import format_exc

from asyncio import sleep, start_server, gather, open_connection
from aiohttp import ClientSession, web

from logging import getLogger
from injector import inject_to_tab, get_gamepadui_tab, close_old_tabs
import helpers
import subprocess
from localplatform import service_stop, service_start

class Utilities:
    def __init__(self, context) -> None:
        self.context = context
        self.util_methods = {
            "ping": self.ping,
            "http_request": self.http_request,
            "install_plugin": self.install_plugin,
            "cancel_plugin_install": self.cancel_plugin_install,
            "confirm_plugin_install": self.confirm_plugin_install,
            "uninstall_plugin": self.uninstall_plugin,
            "execute_in_tab": self.execute_in_tab,
            "inject_css_into_tab": self.inject_css_into_tab,
            "remove_css_from_tab": self.remove_css_from_tab,
            "allow_remote_debugging": self.allow_remote_debugging,
            "disallow_remote_debugging": self.disallow_remote_debugging,
            "set_setting": self.set_setting,
            "get_setting": self.get_setting,
            "filepicker_ls": self.filepicker_ls,
            "disable_rdt": self.disable_rdt,
            "enable_rdt": self.enable_rdt
        }

        self.logger = getLogger("Utilities")

        self.rdt_proxy_server = None
        self.rdt_script_id = None
        self.rdt_proxy_task = None

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

    async def install_plugin(self, artifact="", name="No name", version="dev", hash=False):
        return await self.context.plugin_browser.request_plugin_install(
            artifact=artifact,
            name=name,
            version=version,
            hash=hash
        )

    async def confirm_plugin_install(self, request_id):
        return await self.context.plugin_browser.confirm_plugin_install(request_id)

    def cancel_plugin_install(self, request_id):
        return self.context.plugin_browser.cancel_plugin_install(request_id)

    async def uninstall_plugin(self, name):
        return await self.context.plugin_browser.uninstall_plugin(name)

    async def http_request(self, method="", url="", **kwargs):
        async with ClientSession() as web:
            res = await web.request(method, url, ssl=helpers.get_ssl_context(), **kwargs)
            text = await res.text()
        return {
            "status": res.status,
            "headers": dict(res.headers),
            "body": text
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
                "result": result["result"]["result"].get("value")
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
                "result": css_id
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

    async def set_setting(self, key, value):
        return self.context.settings.setSetting(key, value)

    async def allow_remote_debugging(self):
        await service_start(helpers.REMOTE_DEBUGGER_UNIT)
        return True

    async def disallow_remote_debugging(self):
        await service_stop(helpers.REMOTE_DEBUGGER_UNIT)
        return True

    async def filepicker_ls(self, path, include_files : bool = True, max : int = 1000, page : int = 1):
        # def sorter(file): # Modification time
        #     if os.path.isdir(os.path.join(path, file)) or os.path.isfile(os.path.join(path, file)):
        #         return os.path.getmtime(os.path.join(path, file))
        #     return 0
        # file_names = sorted(os.listdir(path), key=sorter, reverse=True) # TODO provide more sort options

        realpath = os.path.realpath(path)
        files, folders = [], []

        for x in os.scandir(realpath):
            if x.is_dir():
                folders.append(x)
            elif include_files:
                files.append(x)

        files = sorted(files, key=lambda x: x.name)
        folders = sorted(folders, key=lambda x: x.name)
        all = [{ "isdir": x.is_dir(), "name": x.name, "realpath": x.path } for x in folders + files]

        return {
            "realpath": realpath,
            "files": all[(page-1)*max:(page)*max],
            "total": len(all)
        }

    # Based on https://stackoverflow.com/a/46422554/13174603
    def start_rdt_proxy(self, ip, port):
        async def pipe(reader, writer):
            try:
                while not reader.at_eof():
                    writer.write(await reader.read(2048))
            finally:
                writer.close()
        async def handle_client(local_reader, local_writer):
            try:
                remote_reader, remote_writer = await open_connection(
                    ip, port)
                pipe1 = pipe(local_reader, remote_writer)
                pipe2 = pipe(remote_reader, local_writer)
                await gather(pipe1, pipe2)
            finally:
                local_writer.close()

        self.rdt_proxy_server = start_server(handle_client, "127.0.0.1", port)
        self.rdt_proxy_task = self.context.loop.create_task(self.rdt_proxy_server)

    def stop_rdt_proxy(self):
        if self.rdt_proxy_server:
            self.rdt_proxy_server.close()
            self.rdt_proxy_task.cancel()

    async def _enable_rdt(self):
        # TODO un-hardcode port
        try:
            self.stop_rdt_proxy()
            ip = self.context.settings.getSetting("developer.rdt.ip", None)

            if ip != None:
                self.logger.info("Connecting to React DevTools at " + ip)
                async with ClientSession() as web:
                    res = await web.request("GET", "http://" + ip + ":8097", ssl=helpers.get_ssl_context())
                    script = """
                    if (!window.deckyHasConnectedRDT) {
                        window.deckyHasConnectedRDT = true;
                        // This fixes the overlay when hovering over an element in RDT
                        Object.defineProperty(window, '__REACT_DEVTOOLS_TARGET_WINDOW__', {
                            enumerable: true,
                            configurable: true,
                            get: function() {
                                return (GamepadNavTree?.m_context?.m_controller || FocusNavController)?.m_ActiveContext?.ActiveWindow || window;
                            }
                        });
                    """ + await res.text() + "\n}"
                if res.status != 200:
                    self.logger.error("Failed to connect to React DevTools at " + ip)
                    return False
                self.start_rdt_proxy(ip, 8097)
                self.logger.info("Connected to React DevTools, loading script")
                tab = await get_gamepadui_tab()
                # RDT needs to load before React itself to work.
                await close_old_tabs()
                result = await tab.reload_and_evaluate(script)
                self.logger.info(result)
                        
        except Exception:
            self.logger.error("Failed to connect to React DevTools")
            self.logger.error(format_exc())

    async def enable_rdt(self):
        self.context.loop.create_task(self._enable_rdt())

    async def disable_rdt(self):
        self.logger.info("Disabling React DevTools")
        tab = await get_gamepadui_tab()
        self.rdt_script_id = None
        await close_old_tabs()
        await tab.evaluate_js("location.reload();", False, True, False)
        self.logger.info("React DevTools disabled")
