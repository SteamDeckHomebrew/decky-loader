import uuid
from logging import getLogger
from json.decoder import JSONDecodeError

from asyncio import sleep

from aiohttp import ClientSession, web

from injector import inject_to_tab, get_tab

from os import getcwd, path

from subprocess import call

import helpers

logger = getLogger("Updater")

class Updater:
    def __init__(self, context) -> None:
        self.context = context
        self.updater_methods = {
            "get_version": self.get_version,
            "do_update": self.do_update,
            "do_restart": self.do_restart,
            "check_for_updates": self.check_for_updates
        }
        self.remoteVer = None
        try:
            with open(path.join(getcwd(), ".loader.version"), 'r') as version_file:
                self.localVer = version_file.readline().replace("\n", "")
        except:
            self.localVer = False

        if context:
            context.web_app.add_routes([
                web.post("/updater/{method_name}", self._handle_server_method_call)
            ])
            context.loop.create_task(self.version_reloader())

    async def _handle_server_method_call(self, request):
        method_name = request.match_info["method_name"]
        try:
            args = await request.json()
        except JSONDecodeError:
            args = {}
        res = {}
        try:
            r = await self.updater_methods[method_name](**args)
            res["result"] = r
            res["success"] = True
        except Exception as e:
            res["result"] = str(e)
            res["success"] = False
        return web.json_response(res)

    async def get_version(self):
        if self.localVer:
            return {
                "current": self.localVer,
                "remote": self.remoteVer,
                "updatable": self.remoteVer != None
            }
        else:
            return {"current": "unknown", "updatable": False}

    async def check_for_updates(self):
        async with ClientSession() as web:
            async with web.request("GET", "https://api.github.com/repos/SteamDeckHomebrew/decky-loader/releases", ssl=helpers.get_ssl_context()) as res:
                remoteVersions = await res.json()
                self.remoteVer = next(filter(lambda ver: ver["prerelease"] and ver["tag_name"].startswith("v") and ver["tag_name"].endswith("-pre"), remoteVersions), None)
                logger.info("Updated remote version information")
        return await self.get_version()

    async def version_reloader(self):
        while True:
            try:
                await self.check_for_updates()
            except:
                pass
            await sleep(60 * 60) # 1 hour

    async def do_update(self):
        version = self.remoteVer["tag_name"]
        #TODO don't hardcode this
        download_url = self.remoteVer["assets"][0]["browser_download_url"]

        tab = await get_tab("SP")
        await tab.open_websocket()
        async with ClientSession() as web:
            async with web.request("GET", download_url, ssl=helpers.get_ssl_context(), allow_redirects=True) as res:
                total = int(res.headers.get('content-length', 0))

                with open(path.join(getcwd(), "PluginLoader"), "wb") as out:
                    progress = 0
                    raw = 0
                    async for c in res.content.iter_chunked(512):
                        out.write(c)
                        raw += len(c)
                        new_progress = round((raw / total) * 100)
                        if progress != new_progress:
                            if new_progress - progress>= 2:
                                self.context.loop.create_task(tab.evaluate_js(f"window.DeckyUpdater.updateProgress({progress})", False, False))
                            progress = new_progress

                with open(path.join(getcwd(), ".loader.version"), "w") as out:
                    out.write(version)

                call(['chmod', '+x', path.join(getcwd(), "PluginLoader")])

                logger.info("Updated loader installation.")
                await tab.evaluate_js("window.DeckyUpdater.finish()", False, False)
                await tab.client.close()

    async def do_restart(self):
        call(["systemctl", "daemon-reload"])
        call(["systemctl", "restart", "plugin_loader"])
        exit(0)
