import os
import shutil
import uuid
import zipfile
from asyncio import sleep
from ensurepip import version
from json.decoder import JSONDecodeError
from logging import getLogger
from os import getcwd, path, remove
from localplatform import chmod, service_restart, ON_LINUX, ON_WINDOWS, get_keep_systemd_service

from aiohttp import ClientSession, web

import helpers
from injector import get_gamepadui_tab, inject_to_tab
from settings import SettingsManager

logger = getLogger("Updater")

class Updater:
    def __init__(self, context) -> None:
        self.context = context
        self.settings = self.context.settings
        # Exposes updater methods to frontend
        self.updater_methods = {
            "get_branch": self._get_branch,
            "get_version": self.get_version,
            "do_update": self.do_update,
            "do_restart": self.do_restart,
            "check_for_updates": self.check_for_updates,
            "get_testing_versions": self.get_testing_versions,
            "download_testing_version": self.download_testing_version
        }
        self.remoteVer = None
        self.allRemoteVers = None
        self.localVer = helpers.get_loader_version()

        try:
            self.currentBranch = self.get_branch(self.context.settings)
        except:
            self.currentBranch = 0
            logger.error("Current branch could not be determined, defaulting to \"Stable\"")

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

    def get_branch(self, manager: SettingsManager):
        ver = manager.getSetting("branch", -1)
        logger.debug("current branch: %i" % ver)
        if ver == -1:
            logger.info("Current branch is not set, determining branch from version...")
            if self.localVer.startswith("v") and "-pre" in self.localVer:
                logger.info("Current version determined to be pre-release")
                manager.setSetting('branch', 1)
                return 1
            else:
                logger.info("Current version determined to be stable")
                manager.setSetting('branch', 0)
                return 0
        return ver

    async def _get_branch(self, manager: SettingsManager):
        return self.get_branch(manager)

    # retrieve relevant service file's url for each branch
    def get_service_url(self):
        logger.debug("Getting service URL")
        branch = self.get_branch(self.context.settings)
        match branch:
            case 0:
                url = "https://raw.githubusercontent.com/SteamDeckHomebrew/decky-loader/main/dist/plugin_loader-release.service"
            case 1 | 2:
                url = "https://raw.githubusercontent.com/SteamDeckHomebrew/decky-loader/main/dist/plugin_loader-prerelease.service"
            case _:
                logger.error("You have an invalid branch set... Defaulting to prerelease service, please send the logs to the devs!")
                url = "https://raw.githubusercontent.com/SteamDeckHomebrew/decky-loader/main/dist/plugin_loader-prerelease.service"
        return str(url)

    async def get_version(self):
        return {
            "current": self.localVer,
            "remote": self.remoteVer,
            "all": self.allRemoteVers,
            "updatable": self.localVer != "unknown"
        }

    async def check_for_updates(self):
        logger.debug("checking for updates")
        selectedBranch = self.get_branch(self.context.settings)
        async with ClientSession() as web:
            async with web.request("GET", "https://api.github.com/repos/SteamDeckHomebrew/decky-loader/releases", ssl=helpers.get_ssl_context()) as res:
                remoteVersions = await res.json()
                if selectedBranch == 0:
                    logger.debug("release type: release")
                    remoteVersions = list(filter(lambda ver: ver["tag_name"].startswith("v") and not ver["prerelease"] and not ver["tag_name"].find("-pre") > 0 and ver["tag_name"], remoteVersions))
                elif selectedBranch == 1:
                    logger.debug("release type: pre-release")
                    remoteVersions = list(filter(lambda ver:ver["tag_name"].startswith("v"), remoteVersions))
                else:
                    logger.error("release type: NOT FOUND")
                    raise ValueError("no valid branch found")
        self.allRemoteVers = remoteVersions
        logger.debug("determining release type to find, branch is %i" % selectedBranch)
        if selectedBranch == 0:
            logger.debug("release type: release")
            self.remoteVer = next(filter(lambda ver: ver["tag_name"].startswith("v") and not ver["prerelease"] and not ver["tag_name"].find("-pre") > 0 and ver["tag_name"], remoteVersions), None)
        elif selectedBranch == 1:
            logger.debug("release type: pre-release")
            self.remoteVer = next(filter(lambda ver:ver["tag_name"].startswith("v"), remoteVersions), None)
        else:
            logger.error("release type: NOT FOUND")
            raise ValueError("no valid branch found")
        logger.info("Updated remote version information")
        tab = await get_gamepadui_tab()
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

    async def download_decky_binary(self, download_url, version, is_zip = False):
        download_filename = "PluginLoader" if ON_LINUX else "PluginLoader.exe"
        download_temp_filename = download_filename + ".new"

        tab = await get_gamepadui_tab()
        await tab.open_websocket()
        async with ClientSession() as web:
            logger.debug("Downloading binary")
            #TODO: To allow fetching to the artifact API, this call need a token with repo scope, see here https://docs.github.com/en/rest/actions/artifacts?apiVersion=2022-11-28#download-an-artifact
            async with web.request("GET", download_url, ssl=helpers.get_ssl_context(), allow_redirects=True) as res:
                total = int(res.headers.get('content-length', 0))
                with open(path.join(getcwd(), download_temp_filename), "wb") as out:
                    progress = 0
                    raw = 0
                    async for c in res.content.iter_chunked(512):
                        out.write(c)
                        raw += len(c)
                        new_progress = round((raw / total) * 100)
                        if progress != new_progress:
                            self.context.loop.create_task(tab.evaluate_js(f"window.DeckyUpdater.updateProgress({new_progress})", False, False, False))
                            progress = new_progress

            if (is_zip):
                with zipfile.ZipFile(path.join(getcwd(), download_temp_filename), 'r') as zr:
                    zr.extractall(getcwd())
                remove(path.join(getcwd(), download_temp_filename))


            with open(path.join(getcwd(), ".loader.version"), "w", encoding="utf-8") as out:
                out.write(version)

            if ON_LINUX:
                if not is_zip:
                    remove(path.join(getcwd(), download_filename))
                    shutil.move(path.join(getcwd(), download_temp_filename), path.join(getcwd(), download_filename))
                chmod(path.join(getcwd(), download_filename), 777, False)

            logger.info("Updated loader installation.")
            await tab.evaluate_js("window.DeckyUpdater.finish()", False, False)
            await self.do_restart()
            await tab.close_websocket()

    async def do_update(self):
        download_filename = "PluginLoader" if ON_LINUX else "PluginLoader.exe"
        logger.debug("Starting update.")
        version = self.remoteVer["tag_name"]
        download_url = None

        for x in self.remoteVer["assets"]:
            if x["name"] == download_filename:
                download_url = x["browser_download_url"]
                break
        
        if download_url == None:
            raise Exception("Download url not found")

        service_url = self.get_service_url()
        logger.debug("Retrieved service URL")

        async with ClientSession() as web:
            if ON_LINUX and not get_keep_systemd_service():
                logger.debug("Downloading systemd service")
                # download the relevant systemd service depending upon branch
                async with web.request("GET", service_url, ssl=helpers.get_ssl_context(), allow_redirects=True) as res:
                    logger.debug("Downloading service file")
                    data = await res.content.read()
                logger.debug(str(data))
                service_file_path = path.join(getcwd(), "plugin_loader.service")
                try:
                    with open(path.join(getcwd(), "plugin_loader.service"), "wb") as out:
                        out.write(data)
                except Exception as e:
                    logger.error(f"Error at %s", exc_info=e)
                with open(path.join(getcwd(), "plugin_loader.service"), "r", encoding="utf-8") as service_file:
                    service_data = service_file.read()
                service_data = service_data.replace("${HOMEBREW_FOLDER}", helpers.get_homebrew_path())
                with open(path.join(getcwd(), "plugin_loader.service"), "w", encoding="utf-8") as service_file:
                        service_file.write(service_data)
                    
                logger.debug("Saved service file")
                logger.debug("Copying service file over current file.")
                shutil.copy(service_file_path, "/etc/systemd/system/plugin_loader.service")
                if not os.path.exists(path.join(getcwd(), ".systemd")):
                    os.mkdir(path.join(getcwd(), ".systemd"))
                shutil.move(service_file_path, path.join(getcwd(), ".systemd")+"/plugin_loader.service")
            
        await self.download_decky_binary(download_url, version)

    async def do_restart(self):
        await service_restart("plugin_loader")

    async def get_testing_versions(self):
        res = []
        async with ClientSession() as web:
            async with web.request("GET", "https://api.github.com/repos/SteamDeckHomebrew/decky-loader/pulls", params={'state':'open'}, ssl=helpers.get_ssl_context()) as res:
                open_prs = await res.json()
                for pr in open_prs:
                    res.id = int(pr['number'])
                    res.name = pr['title']
                    res.link = pr['html_url']
                    res.head_sha = pr['head']['sha']
        return res

    async def download_testing_version(self, pr_id, sha_id):
        manager.setSetting('branch', 2)
        n_arts = 0
        #Fetch the number of artifacts on the server itself, divided by the per page number
        async with ClientSession() as web:
            async with web.request("GET", "https://api.github.com/repos/SteamDeckHomebrew/decky-loader/actions/artifacts", params={'per_page':'1'}, ssl=helpers.get_ssl_context()) as res:
                arts = await res.json()
                n_arts = int(arts['total_count'])/30
        #Iterate over the API
        for i in range(1, n_arts+1):
            async with ClientSession() as web:
                async with web.request("GET", "https://api.github.com/repos/SteamDeckHomebrew/decky-loader/actions/artifacts", params={'per_page':'30', 'page': i}, ssl=helpers.get_ssl_context()) as res:
                    res = handle_response_from_artifact_api(await res.json(), sha_id)
                    if res != '':
                        self.download_decky_binary(url, res, pr_id, true)
        #We should never exit out from the inner loop if the call is correct (we should find the associated binary and exit before ending here). Log an error.
        logger.error("Couldn't find the requested artifact id, this shouldn't happen normally!")

    def handle_response_from_artifact_api(self, json_res, sha_id):
        for art in json_res['artifacts']:
            if art['workflow_run']['head_sha'] == sha_id:
                if ON_LINUX and not art['name'].endwith('Win'):
                    return art['archive_download_url']
                elif ON_WINDOWS:
                    return art['archive_download_url']
        return ''
