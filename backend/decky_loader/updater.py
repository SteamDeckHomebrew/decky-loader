from __future__ import annotations
from asyncio import sleep
from logging import getLogger
from os import getcwd, getenv, path, remove, mkdir
from typing import TYPE_CHECKING, TypedDict
if TYPE_CHECKING:
    from .main import PluginManager
from .localplatform.localplatform import chmod, service_restart, service_stop, ON_LINUX, ON_WINDOWS, ON_MAC, ON_ARM64, get_keep_systemd_service, get_selinux
import shutil
import zipfile
import hashlib

from aiohttp import ClientSession

from . import helpers
from .settings import SettingsManager
if TYPE_CHECKING:
    from .main import PluginManager


logger = getLogger("Updater")

class RemoteVerAsset(TypedDict):
    name: str
    size: int
    digest: str | None
    browser_download_url: str
class RemoteVer(TypedDict):
    tag_name: str
    prerelease: bool
    assets: list[RemoteVerAsset]
class TestingVersion(TypedDict):
    id: int
    name: str
    link: str
    head_sha: str

class Updater:
    def __init__(self, context: PluginManager) -> None:
        self.context = context
        self.settings = self.context.settings
        self.remoteVer: RemoteVer | None = None
        self.allRemoteVers: list[RemoteVer] = []
        self.localVer = helpers.get_loader_version()
        self.isSupported: bool = ON_LINUX
        self.repo = getenv('DECKY_REPO', 'SteamDeckHomebrew/decky-loader')
        self.git_branch = getenv('DECKY_BRANCH', 'dirty')

        try:
            self.currentBranch = self.get_branch(self.context.settings)
        except:
            self.currentBranch = 0
            logger.error("Current branch could not be determined, defaulting to \"Stable\"")

        if context:
            context.ws.add_route("updater/get_version_info", self.get_version_info)
            context.ws.add_route("updater/check_for_updates", self.check_for_updates)
            context.ws.add_route("updater/do_restart", self.do_restart)
            context.ws.add_route("updater/do_shutdown", self.do_shutdown)
            context.ws.add_route("updater/do_update", self.do_update)
            context.ws.add_route("updater/get_testing_versions", self.get_testing_versions)
            context.ws.add_route("updater/download_testing_version", self.download_testing_version)
            context.loop.create_task(self.version_reloader())

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
                url = f"https://raw.githubusercontent.com/{self.repo}/{self.git_branch}/dist/plugin_loader-release.service"
            case 1 | 2:
                url = f"https://raw.githubusercontent.com/{self.repo}/{self.git_branch}/dist/plugin_loader-prerelease.service"
            case _:
                logger.error("You have an invalid branch set... Defaulting to prerelease service, please send the logs to the devs!")
                url = f"https://raw.githubusercontent.com/{self.repo}/{self.git_branch}/dist/plugin_loader-prerelease.service"
        return str(url)

    async def get_version_info(self):
        return {
            "current": self.localVer,
            "repo": self.repo,
            "gitBranch": self.git_branch,
            "remote": self.remoteVer,
            "all": self.allRemoteVers,
            "updatable": self.localVer != "unknown" and self.localVer != "dev",
            "supported": self.isSupported
        }

    async def check_for_updates(self):
        logger.debug("checking for updates")
        selectedBranch = self.get_branch(self.context.settings)
        async with ClientSession() as web:
            async with web.request("GET", f"https://api.github.com/repos/{self.repo}/releases", headers={'X-GitHub-Api-Version': '2022-11-28'}, ssl=helpers.get_ssl_context()) as res:
                remoteVersions: list[RemoteVer] = await res.json()
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
        await self.context.ws.emit("loader/notify_updates")
        return await self.get_version_info()

    async def version_reloader(self):
        await sleep(30)
        while True:
            try:
                await self.check_for_updates()
            except:
                pass
            await sleep(60 * 60 * 6) # 6 hours

    def get_remote_binary_name(self, with_extension: bool = True):
        """
            The binaries on GitHub contain an extra part in their name to denote their architecture
            
            For example:
                Windows: PluginLoader.exe
                Linux (x86_64): PluginLoader
                Linux (arm64): PluginLoader-arm64
        """
        binary_name = "PluginLoader"

        if ON_ARM64 and ON_LINUX:
            binary_name += "-arm64"

        if ON_WINDOWS:
            binary_name += "-win"
            if ON_ARM64:
                binary_name += "-arm64"
            if bool(getenv("DECKY_NOCONSOLE", "0")):
                binary_name += "-noconsole"
            if with_extension:
                binary_name += ".exe"

        if ON_MAC:
            binary_name += "-mac"

        return binary_name
    
    def get_local_binary_name(self):
        binary_name = "PluginLoader"

        if ON_WINDOWS:
            binary_name += ".exe"

        return binary_name

    async def download_decky_binary(self, download_url: str, version: str, sha256: str | None, validate: bool = True, is_zip: bool = False, size_in_bytes: int | None = None):
        download_filename = self.get_local_binary_name()
        download_temp_filename = download_filename + ".new"

        if size_in_bytes == None:
            size_in_bytes = 35000000 # 35MiB, a reasonable overestimate (30.00 MiB as of 2026/10/05)

        # GitHub release redirects can carry CSP headers larger than 8 KiB.
        async with ClientSession(max_field_size=32 * 1024) as web:
            logger.debug("Downloading binary")
            async with web.request("GET", download_url, ssl=helpers.get_ssl_context(), allow_redirects=True) as res:
                total = int(res.headers.get('content-length', size_in_bytes))
                if total == 0: total = 1
                with open(path.join(getcwd(), download_temp_filename), "wb") as out:
                    progress = 0
                    raw = 0
                    async for c in res.content.iter_chunked(512):
                        out.write(c)
                        raw += len(c)
                        new_progress = round((raw / total) * 100)
                        if progress != new_progress:
                            self.context.loop.create_task(self.context.ws.emit("updater/update_download_percentage", new_progress))
                            progress = new_progress

        with open(path.join(getcwd(), ".loader.version"), "w", encoding="utf-8") as out:
            out.write(version)

        if ON_LINUX:
            remove(path.join(getcwd(), download_filename))
            if (is_zip):
                with zipfile.ZipFile(path.join(getcwd(), download_temp_filename), 'r') as file:
                    file.getinfo(download_filename).filename = download_filename + ".unzipped"
                    file.extract(download_filename)
                remove(path.join(getcwd(), download_temp_filename))

                # If the hashes do not match, signal it to the user and return without overwriting the file.
                if validate and sha256 is not None and not self.check_file_hash(path.join(getcwd(), download_filename + ".unzipped"), sha256):
                    await self.context.ws.emit("updater/sha256_mismatch")
                    return
                shutil.move(path.join(getcwd(), download_filename + ".unzipped"), path.join(getcwd(), download_filename))
            else:

                # Same as above.
                if validate and sha256 is not None and not self.check_file_hash(path.join(getcwd(), download_temp_filename), sha256):
                    await self.context.ws.emit("updater/sha256_mismatch")
                    return
                shutil.move(path.join(getcwd(), download_temp_filename), path.join(getcwd(), download_filename))
            
            chmod(path.join(getcwd(), download_filename), 777, False)
            if get_selinux():
                from asyncio.subprocess import create_subprocess_exec
                process = await create_subprocess_exec("chcon", "-t", "bin_t", path.join(getcwd(), download_filename))
                logger.info(f"Setting the executable flag with chcon returned {await process.wait()}")

        logger.info("Updated loader installation.")
        await self.context.ws.emit("updater/finish_download")
        await self.do_restart()

    def check_file_hash(self, file_path: str, exp_sha256: str) -> bool:
        down_sha256 = self._sha256_on_file(file_path)
        # If the hash doesn't match, delete the file, signal it to the user and return from this function.
        if down_sha256 != exp_sha256:
            remove(file_path)
            return False
        else:
            return True

    # Hash the file in blocks of 4096 bytes each and update the hash each time, then returns the corresponding .hexdigest representation for comparison.
    def _sha256_on_file(self, fpath: str) -> str:
        digest = hashlib.sha256()
        with open(fpath, "rb") as file:
            for block in iter(lambda: file.read(4096), b""):
                digest.update(block)
        return digest.hexdigest()

    async def do_update(self):
        logger.debug("Starting update.")
        try:
            assert self.remoteVer
        except AssertionError:
            logger.error("Unable to update as remoteVer is missing")
            return

        version = self.remoteVer["tag_name"]
        download_url = None
        size_in_bytes = None
        sha256 = None
        remote_binary_name = self.get_remote_binary_name()

        for x in self.remoteVer["assets"]:
            if x["name"] == remote_binary_name:
                download_url = x["browser_download_url"]
                size_in_bytes = x["size"]
                # According to GitHub API, the returned digest value can be null. Set it to none to distinguish from a mismatch case.
                sha256 = x["digest"].split(sep=':')[1] if x["digest"] is not None else None
                break
        
        if download_url == None:
            raise Exception("Download url not found")
        
        if sha256 == None:
            await self.context.ws.emit("updater/sha256_update_null_value")
            return

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
                if not path.exists(path.join(getcwd(), ".systemd")):
                    mkdir(path.join(getcwd(), ".systemd"))
                shutil.move(service_file_path, path.join(getcwd(), ".systemd")+"/plugin_loader.service")
            
        await self.download_decky_binary(download_url, version, sha256, size_in_bytes=size_in_bytes)

    async def do_restart(self):
        logger.info("Restarting loader for update.")
        await service_restart("plugin_loader", block=False)

    async def do_shutdown(self):
        await service_stop("plugin_loader")

    async def get_testing_versions(self) -> list[TestingVersion]:
        result: list[TestingVersion] = []
        async with ClientSession() as web:
            async with web.request("GET", f"https://api.github.com/repos/{self.repo}/pulls", 
                    headers={'X-GitHub-Api-Version': '2022-11-28'}, params={'state':'open'}, ssl=helpers.get_ssl_context()) as res:
                open_prs = await res.json()
                for pr in open_prs:
                    result.append({
                        "id": int(pr['number']),
                        "name": pr['title'],
                        "link":  pr['html_url'],
                        "head_sha": pr['head']['sha'],
                    })
        return result

    async def download_testing_version(self, pr_id: int, sha_id: str):
        down_id = ''
        #Get all the associated workflow run for the given sha_id code hash
        async with ClientSession() as web:
            async with web.request("GET", f"https://api.github.com/repos/{self.repo}/actions/runs", 
                    headers={'X-GitHub-Api-Version': '2022-11-28'}, params={'head_sha': sha_id}, ssl=helpers.get_ssl_context()) as res:
                works = await res.json()
        
        #Iterate over the workflow_run to get the two builds if they exists
        for work in works['workflow_runs']:
            if ON_WINDOWS and ON_ARM64 and work['name'] == 'Builder (Windows, arm64)':
                down_id=work['id']
                break
            elif ON_WINDOWS and not ON_ARM64 and work['name'] == 'Builder (Windows, x86_64)':
                down_id=work['id']
                break
            elif ON_LINUX and ON_ARM64 and work['name'] == 'Builder (Linux, arm64)':
                down_id=work['id']
                break
            elif ON_LINUX and not ON_ARM64 and work['name'] == 'Builder (Linux, x86_64)':
                down_id=work['id']
                break
            elif ON_MAC and work['name'] == 'Builder (macOS)':
                down_id=work['id']
                break
        
        if down_id != '':
            async with ClientSession() as web:
                async with web.request("GET", f"https://api.github.com/repos/{self.repo}/actions/runs/{down_id}/artifacts",
                        headers={'X-GitHub-Api-Version': '2022-11-28'}, ssl=helpers.get_ssl_context()) as res:
                    jresp = await res.json()
                    #If the request found at least one artifact to download...
                    if int(jresp['total_count']) != 0:
                        # this assumes that the artifact we want is the first one!
                        artifact = jresp['artifacts'][0]
                        target_art = self.get_remote_binary_name(False)
                        for art in jresp['artifacts']:
                            if art['name'] == target_art:
                                artifact = art
                                break
                        down_link = f"https://nightly.link/{self.repo}/actions/artifacts/{artifact['id']}.zip"

                        if artifact['digest'] is None:
                            # FIXME: Do we want this to fail safe and warn the user on a null value or just ignore it and install it regardless?
                            await self.context.ws.emit("updater/sha256_actions_null_value")
                            return
                        
                        # Then fetch it and restart itself
                        await self.download_decky_binary(down_link, f'PR-{pr_id}', artifact['digest'], is_zip=True, size_in_bytes=artifact.get('size_in_bytes',None))
        else:
            logger.error("workflow run not found", str(works))
            raise Exception("Workflow run not found.")
