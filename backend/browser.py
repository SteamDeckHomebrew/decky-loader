from injector import get_tab
from logging import getLogger
from os import path, rename, listdir
from shutil import rmtree
from aiohttp import ClientSession, web
from io import BytesIO
from zipfile import ZipFile
from concurrent.futures import ProcessPoolExecutor
from asyncio import get_event_loop
from time import time, sleep
from hashlib import sha256
from subprocess import Popen, check_output, PIPE
from injector import inject_to_tab

import json

import helpers

class PluginInstallContext:
    def __init__(self, artifact, name, version, hash) -> None:
        self.artifact = artifact
        self.name = name
        self.version = version
        self.hash = hash

class PluginBrowser:
    def __init__(self, plugin_path, server_instance, plugins) -> None:
        self.log = getLogger("browser")
        self.plugin_path = plugin_path
        self.plugins = plugins
        self.install_requests = {}

        server_instance.add_routes([
            web.post("/browser/install_plugin", self.install_plugin),
            web.post("/browser/uninstall_plugin", self.uninstall_plugin)
        ])

    def _unzip_to_plugin_dir(self, zip, name, hash):
        zip_hash = sha256(zip.getbuffer()).hexdigest()
        if hash and (zip_hash != hash):
            return False
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)

        USER = None
        cmd = "who | awk '{print $1}' | sort | head -1"
        # Get the user by checking for the first logged in user. As this is run
        # by systemd at startup the process is likely to start before the user
        # logs in, so we will wait here until they are available. Note that
        # other methods such as getenv wont work as there was no $SUDO_USER to
        # start the systemd service.
        while USER == None:
            USER_LIST = Popen(cmd, stdin=PIPE, stdout=PIPE, stderr=PIPE, shell=True)
            for get_first in USER_LIST.stdout:
                name = get_first.decode().strip()
                if name is not None:
                    USER = name
                    break
            sleep(1)
        GROUP = check_output(["id", "-g", "-n", USER]).decode().strip()
        Popen(["chown", "-R", USER+":"+GROUP, self.plugin_path])
        Popen(["chmod", "-R", "555", self.plugin_path])
        return True

    def find_plugin_folder(self, name):
        for folder in listdir(self.plugin_path):
            try:
                with open(path.join(self.plugin_path, folder, 'plugin.json'), 'r') as f:
                    plugin = json.load(f)

                if plugin['name'] == name:
                    return path.join(self.plugin_path, folder)
            except:
                self.log.debug(f"skipping {folder}")

    async def uninstall_plugin(self, name):
        tab = await get_tab("SP")

        try:
            if type(name) != str:
                data = await name.post()
                name = data.get("name", "undefined")
            self.log.info("uninstalling " + name)
            self.log.info(" at dir " + self.find_plugin_folder(name))
            await tab.evaluate_js(f"DeckyPluginLoader.unloadPlugin('{name}')")
            if self.plugins[name]:
                self.plugins[name].stop()
                self.plugins.pop(name, None)
            rmtree(self.find_plugin_folder(name))
        except FileNotFoundError:
            self.log.warning(f"Plugin {name} not installed, skipping uninstallation")

        return web.Response(text="Requested plugin uninstall")

    async def _install(self, artifact, name, version, hash):
        try: 
            await self.uninstall_plugin(name)
        except:
            self.log.error(f"Plugin {name} not installed, skipping uninstallation")
        self.log.info(f"Installing {name} (Version: {version})")
        async with ClientSession() as client:
            self.log.debug(f"Fetching {artifact}")
            res = await client.get(artifact, ssl=helpers.get_ssl_context())
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
                        self.log.info(f"Installed {name} (Version: {version})")
                        await inject_to_tab("SP", "window.syncDeckyPlugins()")
                    else:
                        self.log.fatal(f"SHA-256 Mismatch!!!! {name} (Version: {version})")
            else:
                self.log.fatal(f"Could not fetch from URL. {await res.text()}")

    async def install_plugin(self, request):
        data = await request.post()
        get_event_loop().create_task(self.request_plugin_install(data.get("artifact", ""), data.get("name", "No name"), data.get("version", "dev"), data.get("hash", False)))
        return web.Response(text="Requested plugin install")

    async def request_plugin_install(self, artifact, name, version, hash):
        request_id = str(time())
        self.install_requests[request_id] = PluginInstallContext(artifact, name, version, hash)
        tab = await get_tab("SP")
        await tab.open_websocket()
        await tab.evaluate_js(f"DeckyPluginLoader.addPluginInstallPrompt('{name}', '{version}', '{request_id}', '{hash}')")
    
    async def confirm_plugin_install(self, request_id):
        request = self.install_requests.pop(request_id)
        await self._install(request.artifact, request.name, request.version, request.hash)

    def cancel_plugin_install(self, request_id):
        self.install_requests.pop(request_id)
