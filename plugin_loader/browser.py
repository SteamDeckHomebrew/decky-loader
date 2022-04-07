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

class PluginInstallContext:
    def __init__(self, gh_url, version) -> None:
        self.gh_url = gh_url
        self.version = version

class PluginBrowser:
    def __init__(self, plugin_path, server_instance, store_url) -> None:
        self.log = getLogger("browser")
        self.plugin_path = plugin_path
        self.store_url = store_url
        self.install_requests = {}

        server_instance.add_routes([
            web.post("/browser/install_plugin", self.install_plugin),
            web.get("/browser/iframe", self.redirect_to_store)
        ])

    def _unzip_to_plugin_dir(self, zip, name):
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)
        (rename(path.join(self.plugin_path, zip_file.namelist()[0]), path.join(self.plugin_path, name)))

    async def _install(self, artifact, version):
        name = artifact.split("/")[-1]
        rmtree(path.join(self.plugin_path, name), ignore_errors=True)
        self.log.info("Installing {} (Version: {})".format(artifact, version))
        async with ClientSession() as client:
            url = "https://github.com/{}/archive/refs/tags/{}.zip".format(artifact, version)
            self.log.debug("Fetching {}".format(url))
            res = await client.get(url)
            if res.status == 200:
                self.log.debug("Got 200. Reading...")
                data = await res.read()
                self.log.debug("Read {} bytes".format(len(data)))
                res_zip = BytesIO(data)
                with ProcessPoolExecutor() as executor:
                    self.log.debug("Unzipping...")
                    await get_event_loop().run_in_executor(
                        executor,
                        self._unzip_to_plugin_dir,
                        res_zip,
                        name
                    )
                    self.log.info("Installed {} (Version: {})".format(artifact, version))
            else:
                self.log.fatal("Could not fetch from github. {}".format(await res.text()))

    async def redirect_to_store(self, request):
        return web.Response(status=302, headers={"Location": self.store_url})
    
    async def install_plugin(self, request):
        data = await request.post()
        get_event_loop().create_task(self.request_plugin_install(data["artifact"], data["version"]))
        return web.Response(text="Requested plugin install")

    async def request_plugin_install(self, artifact, version):
        request_id = str(time())
        self.install_requests[request_id] = PluginInstallContext(artifact, version)
        tab = await get_tab("QuickAccess")
        await tab.open_websocket()
        await tab.evaluate_js("addPluginInstallPrompt('{}', '{}', '{}')".format(artifact, version, request_id))
    
    async def confirm_plugin_install(self, request_id):
        request = self.install_requests.pop(request_id)
        await self._install(request.gh_url, request.version)