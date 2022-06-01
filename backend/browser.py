from injector import get_tab
from logging import getLogger
from os import path, rename
from shutil import rmtree
from aiohttp import ClientSession, web
from io import BytesIO
from zipfile import ZipFile
from concurrent.futures import ProcessPoolExecutor
from asyncio import get_event_loop
from time import time
from hashlib import sha256
from subprocess import Popen

class PluginInstallContext:
    def __init__(self, gh_url, version, hash) -> None:
        self.gh_url = gh_url
        self.version = version
        self.hash = hash

class PluginBrowser:
    def __init__(self, plugin_path, server_instance, store_url) -> None:
        self.log = getLogger("browser")
        self.plugin_path = plugin_path
        self.store_url = store_url
        self.install_requests = {}

        server_instance.add_routes([
            web.post("/browser/install_plugin", self.install_plugin),
            web.get("/browser/redirect", self.redirect_to_store)
        ])

    def _unzip_to_plugin_dir(self, zip, name, hash):
        zip_hash = sha256(zip.getbuffer()).hexdigest()
        if zip_hash != hash:
            return False
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)
        rename(path.join(self.plugin_path, zip_file.namelist()[0]), path.join(self.plugin_path, name))
        Popen(["chown", "-R", "deck:deck", self.plugin_path])
        Popen(["chmod", "-R", "555", self.plugin_path])
        return True

    async def _install(self, artifact, version, hash):
        name = artifact.split("/")[-1]
        rmtree(path.join(self.plugin_path, name), ignore_errors=True)
        self.log.info(f"Installing {artifact} (Version: {version})")
        async with ClientSession() as client:
            url = f"https://github.com/{artifact}/archive/refs/tags/{version}.zip"
            self.log.debug(f"Fetching {url}")
            res = await client.get(url)
            if res.status == 200:
                self.log.debug("Got 200. Reading...")
                data = await res.read()
                self.log.debug(f"Read {len(data)} bytes")
                res_zip = BytesIO(data)
                with ProcessPoolExecutor() as executor:
                    self.log.debug("Unzipping...")
                    ret = await get_event_loop().run_in_executor(
                        executor,
                        self._unzip_to_plugin_dir,
                        res_zip,
                        name,
                        hash
                    )
                    if ret:
                        self.log.info(f"Installed {artifact} (Version: {version})")
                    else:
                        self.log.fatal(f"SHA-256 Mismatch!!!! {artifact} (Version: {version})")
            else:
                self.log.fatal(f"Could not fetch from github. {await res.text()}")

    async def redirect_to_store(self, request):
        return web.Response(status=302, headers={"Location": self.store_url})
    
    async def install_plugin(self, request):
        data = await request.post()
        get_event_loop().create_task(self.request_plugin_install(data["artifact"], data["version"], data["hash"]))
        return web.Response(text="Requested plugin install")

    async def request_plugin_install(self, artifact, version, hash):
        request_id = str(time())
        self.install_requests[request_id] = PluginInstallContext(artifact, version, hash)
        tab = await get_tab("SP")
        await tab.open_websocket()
        await tab.evaluate_js(f"DeckyPluginLoader.addPluginInstallPrompt('{artifact}', '{version}', '{request_id}')")
    
    async def confirm_plugin_install(self, request_id):
        request = self.install_requests.pop(request_id)
        await self._install(request.gh_url, request.version, request.hash)

    def cancel_plugin_install(self, request_id):
        self.install_requests.pop(request_id)