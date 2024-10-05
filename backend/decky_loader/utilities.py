from __future__ import annotations
from os import stat_result
import uuid
from urllib.parse import unquote
from json.decoder import JSONDecodeError
from os.path import splitext
import re
from traceback import format_exc
from stat import FILE_ATTRIBUTE_HIDDEN # pyright: ignore [reportAttributeAccessIssue, reportUnknownVariableType]

from asyncio import StreamReader, StreamWriter, start_server, gather, open_connection
from aiohttp import ClientSession, hdrs
from aiohttp.web import Request, StreamResponse, Response, json_response, post
from typing import TYPE_CHECKING, Callable, Coroutine, Dict, Any, List, TypedDict

from logging import getLogger
from pathlib import Path

from .browser import PluginInstallRequest, PluginInstallType
if TYPE_CHECKING:
    from .main import PluginManager
from .injector import inject_to_tab, get_gamepadui_tab, close_old_tabs, get_tab
from . import helpers
from .localplatform.localplatform import ON_WINDOWS, service_stop, service_start, get_home_path, get_username, get_use_cef_close_workaround, close_cef_socket, restart_webhelper

class FilePickerObj(TypedDict):
    file: Path
    filest: stat_result
    is_dir: bool

decky_header_regex = re.compile("X-Decky-(.*)")
extra_header_regex = re.compile("X-Decky-Header-(.*)")

excluded_default_headers = ["Host", "Origin", "Sec-Fetch-Site", "Sec-Fetch-Mode", "Sec-Fetch-Dest"]

class Utilities:
    def __init__(self, context: PluginManager) -> None:
        self.context = context
        self.legacy_util_methods: Dict[str, Callable[..., Coroutine[Any, Any, Any]]] = {
            "ping": self.ping,
            "http_request": self.http_request_legacy,
            "execute_in_tab": self.execute_in_tab,
            "inject_css_into_tab": self.inject_css_into_tab,
            "remove_css_from_tab": self.remove_css_from_tab,
            "set_setting": self.set_setting,
            "get_setting": self.get_setting,
            "filepicker_ls": self.filepicker_ls,
            "get_tab_id": self.get_tab_id,
            "get_user_info": self.get_user_info,
        }

        self.logger = getLogger("Utilities")

        self.rdt_proxy_server = None
        self.rdt_script_id = None
        self.rdt_proxy_task = None

        if context:
            context.ws.add_route("utilities/ping", self.ping)
            context.ws.add_route("utilities/settings/get", self.get_setting)
            context.ws.add_route("utilities/settings/set", self.set_setting)
            context.ws.add_route("utilities/install_plugin", self.install_plugin)
            context.ws.add_route("utilities/install_plugins", self.install_plugins)
            context.ws.add_route("utilities/cancel_plugin_install", self.cancel_plugin_install)
            context.ws.add_route("utilities/confirm_plugin_install", self.confirm_plugin_install)
            context.ws.add_route("utilities/uninstall_plugin", self.uninstall_plugin)
            context.ws.add_route("utilities/execute_in_tab", self.execute_in_tab)
            context.ws.add_route("utilities/inject_css_into_tab", self.inject_css_into_tab)
            context.ws.add_route("utilities/remove_css_from_tab", self.remove_css_from_tab)
            context.ws.add_route("utilities/allow_remote_debugging", self.allow_remote_debugging)
            context.ws.add_route("utilities/disallow_remote_debugging", self.disallow_remote_debugging)
            context.ws.add_route("utilities/start_ssh", self.allow_remote_debugging)
            context.ws.add_route("utilities/stop_ssh", self.allow_remote_debugging)
            context.ws.add_route("utilities/filepicker_ls", self.filepicker_ls)
            context.ws.add_route("utilities/disable_rdt", self.disable_rdt)
            context.ws.add_route("utilities/enable_rdt", self.enable_rdt)
            context.ws.add_route("utilities/get_tab_id", self.get_tab_id)
            context.ws.add_route("utilities/get_user_info", self.get_user_info)
            context.ws.add_route("utilities/http_request", self.http_request_legacy)
            context.ws.add_route("utilities/restart_webhelper", self.restart_webhelper)
            context.ws.add_route("utilities/close_cef_socket", self.close_cef_socket)
            context.ws.add_route("utilities/_call_legacy_utility", self._call_legacy_utility)

            context.web_app.add_routes([
                post("/methods/{method_name}", self._handle_legacy_server_method_call)
            ])

            for method in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'):
                context.web_app.router.add_route(method, "/fetch", self.http_request)


    async def _handle_legacy_server_method_call(self, request: Request) -> Response:
        method_name = request.match_info["method_name"]
        try:
            args = await request.json()
        except JSONDecodeError:
            args = {}
        res = {}
        try:
            r = await self.legacy_util_methods[method_name](**args)
            res["result"] = r
            res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        return json_response(res)

    async def _call_legacy_utility(self, method_name: str, kwargs: Dict[Any, Any]) -> Any:
        self.logger.debug(f"Calling utility {method_name} with legacy kwargs");
        res: Dict[Any, Any] = {}
        try:
            r = await self.legacy_util_methods[method_name](**kwargs)
            res["result"] = r
            res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        return res

    async def install_plugin(self, artifact: str="", name: str="No name", version: str="dev", hash: str="", install_type: PluginInstallType=PluginInstallType.INSTALL):
        return await self.context.plugin_browser.request_plugin_install(
            artifact=artifact,
            name=name,
            version=version,
            hash=hash,
            install_type=install_type
        )

    async def install_plugins(self, requests: List[PluginInstallRequest]):
        return await self.context.plugin_browser.request_multiple_plugin_installs(
            requests=requests
        )

    async def confirm_plugin_install(self, request_id: str):
        return await self.context.plugin_browser.confirm_plugin_install(request_id)

    async def cancel_plugin_install(self, request_id: str):
        return self.context.plugin_browser.cancel_plugin_install(request_id)

    async def uninstall_plugin(self, name: str):
        return await self.context.plugin_browser.uninstall_plugin(name)

    # Loosely based on https://gist.github.com/mosquito/4dbfacd51e751827cda7ec9761273e95#file-proxy-py
    async def http_request(self, req: Request) -> StreamResponse:
        if req.query['auth'] != helpers.get_csrf_token():
            return Response(text='Forbidden', status=403)

        url = unquote(req.query['fetch_url'])
        self.logger.info(f"Preparing {req.method} request to {url}")

        headers = dict(req.headers)

        headers["User-Agent"] = helpers.user_agent

        for excluded_header in excluded_default_headers:
            if excluded_header in headers:
                self.logger.debug(f"Excluding default header {excluded_header}: {headers[excluded_header]}")
                del headers[excluded_header]

        if "X-Decky-Fetch-Excluded-Headers" in req.headers:
            for excluded_header in req.headers["X-Decky-Fetch-Excluded-Headers"].split(", "):
                if excluded_header in headers:
                    self.logger.debug(f"Excluding header {excluded_header}: {headers[excluded_header]}")
                    del headers[excluded_header]

        for header in req.headers:
            match = extra_header_regex.search(header)
            if match:
                header_name = match.group(1)
                header_value = req.headers[header]
                self.logger.debug(f"Adding extra header {header_name}: {header_value}")
                headers[header_name] = header_value

        for header in list(headers.keys()):
            match = decky_header_regex.search(header)
            if match:
                self.logger.debug(f"Removing decky header {header} from request")
                del headers[header]

        self.logger.debug(f"Final request headers: {headers}")

        body = await req.read() # TODO can this also be streamed?

        # We disable auto-decompress so that the body is completely forwarded to the
        # JS engine for it to do the decompression. Otherwise we need need to clear
        # the Content-Encoding header in the response headers, however that would
        # defeat the point of this proxy.
        async with ClientSession(auto_decompress=False) as web:
            async with web.request(req.method, url, headers=headers, data=body, ssl=helpers.get_ssl_context()) as web_res:
                # Whenever the aiohttp_cors is used, it expects a near complete control over whatever headers are needed
                # for `aiohttp_cors.ResourceOptions`. As a server, if you delegate CORS handling to aiohttp_cors,
                # the headers below must NOT be set. Otherwise they would be overwritten by aiohttp_cors and there would be 
                # logic bugs, so it was probably a smart choice to assert if the headers are present.
                #
                # However, this request handler method does not act like our own local server, it always acts like a proxy 
                # where we do not have control over the response headers. For responses that do not allow CORS, we add the support
                # via aiohttp_cors. For responses that allow CORS, we have to remove the conflicting headers to allow
                # aiohttp_cors handle it for us as if there was no CORS support.
                aiohttp_cors_compatible_headers = web_res.headers.copy()
                aiohttp_cors_compatible_headers.popall(hdrs.ACCESS_CONTROL_ALLOW_ORIGIN, default=None)
                aiohttp_cors_compatible_headers.popall(hdrs.ACCESS_CONTROL_ALLOW_CREDENTIALS, default=None)
                aiohttp_cors_compatible_headers.popall(hdrs.ACCESS_CONTROL_EXPOSE_HEADERS, default=None)

                res = StreamResponse(headers=aiohttp_cors_compatible_headers, status=web_res.status)
                if web_res.headers.get('Transfer-Encoding', '').lower() == 'chunked':
                    res.enable_chunked_encoding()

                await res.prepare(req)
                self.logger.debug(f"Starting stream for {url}")
                async for data in web_res.content.iter_any():
                    await res.write(data)
                self.logger.debug(f"Finished stream for {url}")
        return res

    async def http_request_legacy(self, method: str, url: str, extra_opts: Any = {}, timeout: int | None = None):
        async with ClientSession() as web:
            res = await web.request(method, url, ssl=helpers.get_ssl_context(), timeout=timeout, **extra_opts)
            text = await res.text()
        return {
            "status": res.status,
            "headers": dict(res.headers),
            "body": text
        }

    async def ping(self, **kwargs: Any):
        return "pong"

    async def execute_in_tab(self, tab: str, run_async: bool, code: str):
        try:
            result = await inject_to_tab(tab, code, run_async)
            assert result
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

    async def inject_css_into_tab(self, tab: str, style: str) -> str:
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
        assert result is not None # TODO remove this once it has proper typings
        if "exceptionDetails" in result["result"]:
            raise result["result"]["exceptionDetails"]

        return css_id

    async def remove_css_from_tab(self, tab: str, css_id: str):
        result = await inject_to_tab(tab,
            f"""
            (function() {{
                let style = document.getElementById("{css_id}");

                if (style.nodeName.toLowerCase() == 'style')
                    style.parentNode.removeChild(style);
            }})()
            """, False)
        
        assert result
        if "exceptionDetails" in result["result"]:
            raise result["result"]["exceptionDetails"]

        return

    async def get_setting(self, key: str, default: Any):
        return self.context.settings.getSetting(key, default)

    async def set_setting(self, key: str, value: Any):
        return self.context.settings.setSetting(key, value)

    async def allow_remote_debugging(self):
        await service_start(helpers.REMOTE_DEBUGGER_UNIT)
        return True

    async def disallow_remote_debugging(self):
        await service_stop(helpers.REMOTE_DEBUGGER_UNIT)
        return True

    async def start_ssh(self):
        await service_start(helpers.SSHD_UNIT)
        return True

    async def stop_ssh(self):
        await service_stop(helpers.SSHD_UNIT)
        return True

    async def close_cef_socket(self):
        if get_use_cef_close_workaround():
            await close_cef_socket()

    async def restart_webhelper(self):
        await restart_webhelper()

    async def filepicker_ls(self, 
                            path: str | None = None, 
                            include_files: bool = True,
                            include_folders: bool = True,
                            include_ext: list[str] | None = None,
                            include_hidden: bool = False,
                            order_by: str = "name_desc",
                            filter_for: str | None = None,
                            page: int = 1,
                            max: int = 1000):
        
        if path == None:
            path = get_home_path()

        path_obj = Path(path).resolve()

        files: List[FilePickerObj] = []
        folders: List[FilePickerObj] = []

        #Resolving all files/folders in the requested directory
        for file in path_obj.iterdir():
            if file.exists():
                filest = file.stat()
                is_hidden = file.name.startswith('.')
                if ON_WINDOWS and not is_hidden:
                    is_hidden = bool(filest.st_file_attributes & FILE_ATTRIBUTE_HIDDEN) # type: ignore
                if include_folders and file.is_dir():
                    if (is_hidden and include_hidden) or not is_hidden:
                        folders.append({"file": file, "filest": filest, "is_dir": True})
                elif include_files:
                    # Handle requested extensions if present
                    if include_ext == None or len(include_ext) == 0 or 'all_files' in include_ext \
                        or splitext(file.name)[1].lstrip('.').upper() in (ext.upper() for ext in include_ext):
                        if (is_hidden and include_hidden) or not is_hidden:
                            files.append({"file": file, "filest": filest, "is_dir": False})
        # Filter logic
        if filter_for is not None:
            try:
                if re.compile(filter_for):
                    files = list(filter(lambda file: re.search(filter_for, file["file"].name) != None, files))
            except re.error:
                files = list(filter(lambda file: file["file"].name.find(filter_for) != -1, files))
        
        # Ordering logic
        ord_arg = order_by.split("_")
        ord = ord_arg[0]
        rev = True if ord_arg[1] == "asc" else False
        match ord:
            case 'name':
                files.sort(key=lambda x: x['file'].name.casefold(), reverse = rev)
                folders.sort(key=lambda x: x['file'].name.casefold(), reverse = rev)
            case 'modified':
                files.sort(key=lambda x: x['filest'].st_mtime, reverse = not rev)
                folders.sort(key=lambda x: x['filest'].st_mtime, reverse = not rev)
            case 'created':
                files.sort(key=lambda x: x['filest'].st_ctime, reverse = not rev)
                folders.sort(key=lambda x: x['filest'].st_ctime, reverse = not rev)
            case 'size':
                files.sort(key=lambda x: x['filest'].st_size, reverse = not rev)
                # Folders has no file size, order by name instead
                folders.sort(key=lambda x: x['file'].name.casefold())
            case _:
                files.sort(key=lambda x: x['file'].name.casefold(), reverse = rev)
                folders.sort(key=lambda x: x['file'].name.casefold(), reverse = rev)
        
        #Constructing the final file list, folders first
        all =   [{
                    "isdir": x['is_dir'],
                    "name": str(x['file'].name),
                    "realpath": str(x['file']),
                    "size": x['filest'].st_size,
                    "modified": x['filest'].st_mtime,
                    "created": x['filest'].st_ctime,
                } for x in folders + files ]

        return {
            "realpath": str(path),
            "files": all[(page-1)*max:(page)*max],
            "total": len(all),
        }
        

    # Based on https://stackoverflow.com/a/46422554/13174603
    def start_rdt_proxy(self, ip: str, port: int):
        async def pipe(reader: StreamReader, writer: StreamWriter):
            try:
                while not reader.at_eof():
                    writer.write(await reader.read(2048))
            finally:
                writer.close()
        async def handle_client(local_reader: StreamReader, local_writer: StreamWriter):
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
        if self.rdt_proxy_server != None:
            self.rdt_proxy_server.close()
            if self.rdt_proxy_task:
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
                    try {
                        if (!window.deckyHasConnectedRDT) {
                            window.deckyHasConnectedRDT = true;
                            // This fixes the overlay when hovering over an element in RDT
                            Object.defineProperty(window, '__REACT_DEVTOOLS_TARGET_WINDOW__', {
                                enumerable: true,
                                configurable: true,
                                get: function() {
                                    return window?.DFL?.findSP?.() || window;
                                }
                            });
                    """ + await res.text() + """
                    // they broke the script so we have to do this ourselves
                    ReactDevToolsBackend.initialize({
                        appendComponentStack: true,
                        breakOnConsoleErrors: false,
                        showInlineWarningsAndErrors: true,
                        hideConsoleLogsInStrictMode: false
                    });
                    ReactDevToolsBackend.connectToDevTools({port: 8097, host: 'localhost', useHttps: false});
                    } } catch(e) {console.error('RDT LOAD ERROR', e);}console.log('LOADED RDT');
                    """
                if res.status != 200:
                    self.logger.error("Failed to connect to React DevTools at " + ip)
                    return False
                self.start_rdt_proxy(ip, 8097)
                self.logger.info("Connected to React DevTools, loading script")
                tab = await get_gamepadui_tab()
                # RDT needs to load before React itself to work.
                try:
                    await close_old_tabs()
                except Exception:
                    pass
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

    async def get_user_info(self) -> Dict[str, str]:
        return {
            "username": get_username(),
            "path": get_home_path()
        }
    
    async def get_tab_id(self, name: str):
        return (await get_tab(name)).id
