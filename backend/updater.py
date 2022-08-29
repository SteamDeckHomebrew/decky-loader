from ensurepip import version
import uuid
from asyncio import sleep
from json.decoder import JSONDecodeError
from logging import getLogger
from os import getcwd, path, remove
from subprocess import call

from aiohttp import ClientSession, web

import helpers
from injector import get_tab, inject_to_tab
from settings import SettingsManager

logger = getLogger("Updater")

class Updater:
    def __init__(self, context) -> None:
        self.context = context
        self.settings = self.context.settings
        # Exposes updater methods to frontend
        self.updater_methods = {
            "get_branch": self.get_branch,
            "get_version": self.get_version,
            "do_update": self.do_update,
            "do_restart": self.do_restart,
            "check_for_updates": self.check_for_updates
        }
        self.remoteVer = None
        self.allRemoteVers = None
        try:
            self.currentBranch = self.get_branch(self.context.settings)
            if int(self.currentBranch) == -1:
                raise ValueError("get_branch could not determine branch!")
        except:
            self.currentBranch = 0
            logger.error("Current branch could not be determined, defaulting to \"Stable\"")
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

    async def _handle_release_filtering(self, branch: int) :
        logger.debug("determining release type to find, branch is %i" % branch)
        if branch == 0:
            logger.debug("release type: release")
            return lambda ver: ver["release"] and ver["tag_name"].startswith("v") and ver["tag_name"]
        elif branch == 1:
            logger.debug("release type: pre-release")
            return lambda ver: ver["prerelease"] and ver["tag_name"].startswith("v") and ver["tag_name"].find("-pre")
        elif branch == 2:
            logger.debug("release type: nightly")
            return lambda ver: ver["prerelease"] and ver["tag_name"].startswith("v") and ver["tag_name"].find("nightly")
        else:
            logger.error("release type: NOT FOUND")
            raise ValueError("no valid branch found")

    async def get_branch(self, manager: SettingsManager):
        logger.debug("current branch: %i" % manager.getSetting("branch", -1))
        return manager.getSetting("branch", -1)

    async def get_version(self):
        if self.localVer:
            return {
                "current": self.localVer,
                "remote": self.remoteVer,
                "all": self.allRemoteVers,
                "updatable": self.localVer != None
            }
        else:
            return {"current": "unknown", "remote": self.remoteVer, "all": self.allRemoteVers, "updatable": False}

    async def check_for_updates(self):
        logger.debug("checking for updates")
        selectedBranch = await self.get_branch(self.context.settings)
        versionFilterLambda = await self._handle_release_filtering(selectedBranch)
        async with ClientSession() as web:
            async with web.request("GET", "https://api.github.com/repos/SteamDeckHomebrew/decky-loader/releases", ssl=helpers.get_ssl_context()) as res:
                remoteVersions = await res.json()
                self.allRemoteVers = remoteVersions
                # issue occurs after this line
                self.remoteVer = next(filter(versionFilterLambda), None)
                logger.debug("Remote Version: %s" % self.remoteVer)
                # self.remoteVer = next(versionFilter, None)
                # doesn't make it to this line below or farther
                logger.info("Updated remote version information")
                tab = await get_tab("SP")
                await tab.evaluate_js(f"window.DeckyPluginLoader.notifyUpdates()", False, True, False)
        return await self.get_version()

    async def version_reloader(self):
        await sleep(30)
        while True:
            try:
                await self.check_for_updates()
            except:
                pass
            await sleep(60 * 60 * 6) # 6 hours

    async def do_update(self):
        version = self.remoteVer["tag_name"]
        download_url = self.remoteVer["assets"][0]["browser_download_url"]

        tab = await get_tab("SP")
        await tab.open_websocket()
        async with ClientSession() as web:
            async with web.request("GET", download_url, ssl=helpers.get_ssl_context(), allow_redirects=True) as res:
                total = int(res.headers.get('content-length', 0))
                try:
                    remove(path.join(getcwd(), "PluginLoader"))
                except:
                    pass
                with open(path.join(getcwd(), "PluginLoader"), "wb") as out:
                    progress = 0
                    raw = 0
                    async for c in res.content.iter_chunked(512):
                        out.write(c)
                        raw += len(c)
                        new_progress = round((raw / total) * 100)
                        if progress != new_progress:
                            self.context.loop.create_task(tab.evaluate_js(f"window.DeckyUpdater.updateProgress({new_progress})", False, False, False))
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
