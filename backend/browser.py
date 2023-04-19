# Full imports
import json
# import pprint
# from pprint import pformat

# Partial imports
from aiohttp import ClientSession, web
from asyncio import get_event_loop, sleep
from concurrent.futures import ProcessPoolExecutor
from hashlib import sha256
from io import BytesIO
from logging import getLogger
from os import R_OK, W_OK, path, rename, listdir, access, mkdir
from shutil import rmtree
from time import time
from zipfile import ZipFile
from localplatform import chown, chmod

# Local modules
from helpers import get_ssl_context, download_remote_binary_to_path
from injector import get_gamepadui_tab

logger = getLogger("Browser")

class PluginInstallContext:
    def __init__(self, artifact, name, version, hash, reinstall) -> None:
        self.artifact = artifact
        self.name = name
        self.version = version
        self.hash = hash
        self.reinstall = reinstall

class PluginBrowser:
    def __init__(self, plugin_path, plugins, loader, settings) -> None:
        self.plugin_path = plugin_path
        self.plugins = plugins
        self.loader = loader
        self.settings = settings
        self.install_requests = {}

    def _unzip_to_plugin_dir(self, zip, name, hash):
        zip_hash = sha256(zip.getbuffer()).hexdigest()
        if hash and (zip_hash != hash):
            return False
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)
        plugin_dir = path.join(self.plugin_path, self.find_plugin_folder(name))

        if not chown(plugin_dir) or not chmod(plugin_dir, 555):
            logger.error(f"chown/chmod exited with a non-zero exit code")
            return False
        return True
    
    async def _download_remote_binaries_for_plugin_with_name(self, pluginBasePath):
        rv = False
        try:
            packageJsonPath = path.join(pluginBasePath, 'package.json')
            pluginBinPath = path.join(pluginBasePath, 'bin')

            if access(packageJsonPath, R_OK):
                with open(packageJsonPath, "r", encoding="utf-8") as f:
                    packageJson = json.load(f)
                    if "remote_binary" in packageJson and len(packageJson["remote_binary"]) > 0:
                        # create bin directory if needed.
                        chmod(pluginBasePath, 777)
                        if access(pluginBasePath, W_OK):
                            
                            if not path.exists(pluginBinPath):
                                mkdir(pluginBinPath)
                            
                            if not access(pluginBinPath, W_OK):
                                chmod(pluginBinPath, 777)

                        rv = True
                        for remoteBinary in packageJson["remote_binary"]:
                            # Required Fields. If any Remote Binary is missing these fail the install.
                            binName = remoteBinary["name"]
                            binURL = remoteBinary["url"]
                            binHash = remoteBinary["sha256hash"]
                            if not await download_remote_binary_to_path(binURL, binHash, path.join(pluginBinPath, binName)):
                                rv = False
                                raise Exception(f"Error Downloading Remote Binary {binName}@{binURL} with hash {binHash} to {path.join(pluginBinPath, binName)}")

                        chown(self.plugin_path)
                        chmod(pluginBasePath, 555)
                    else:
                        rv = True
                        logger.debug(f"No Remote Binaries to Download")
                
        except Exception as e:
            rv = False
            logger.debug(str(e))

        return rv

    """Return the filename (only) for the specified plugin"""
    def find_plugin_folder(self, name):
        for folder in listdir(self.plugin_path):
            try:
                with open(path.join(self.plugin_path, folder, 'plugin.json'), "r", encoding="utf-8") as f:
                    plugin = json.load(f)

                if plugin['name'] == name:
                    return folder
            except:
                logger.debug(f"skipping {folder}")

    async def uninstall_plugin(self, name):
        if self.loader.watcher:
            self.loader.watcher.disabled = True
        tab = await get_gamepadui_tab()
        plugin_dir = path.join(self.plugin_path, self.find_plugin_folder(name))
        try:
            logger.info("uninstalling " + name)
            logger.info(" at dir " + plugin_dir)
            logger.debug("calling frontend unload for %s" % str(name))
            res = await tab.evaluate_js(f"DeckyPluginLoader.unloadPlugin('{name}')")
            logger.debug("result of unload from UI: %s", res)
            # plugins_snapshot = self.plugins.copy()
            # snapshot_string = pformat(plugins_snapshot)
            # logger.debug("current plugins: %s", snapshot_string)
            if self.plugins[name]:
                logger.debug("Plugin %s was found", name)
                self.plugins[name].stop()
                logger.debug("Plugin %s was stopped", name)
                del self.plugins[name]
                logger.debug("Plugin %s was removed from the dictionary", name)
                current_plugin_order = self.settings.getSetting("pluginOrder")
                current_plugin_order.remove(name)
                self.settings.setSetting("pluginOrder", current_plugin_order)
                logger.debug("Plugin %s was removed from the pluginOrder setting", name)
            logger.debug("removing files %s" % str(name))
            rmtree(plugin_dir)
        except FileNotFoundError:
            logger.warning(f"Plugin {name} not installed, skipping uninstallation")
        except Exception as e:
            logger.error(f"Plugin {name} in {plugin_dir} was not uninstalled")
            logger.error(f"Error at %s", exc_info=e)
        if self.loader.watcher:
            self.loader.watcher.disabled = False

    async def _install(self, artifact, name, version, hash):
        isInstalled = False
        if self.loader.watcher:
            self.loader.watcher.disabled = True
        try:
            pluginFolderPath = self.find_plugin_folder(name)
            if pluginFolderPath:
                isInstalled = True
        except:
            logger.error(f"Failed to determine if {name} is already installed, continuing anyway.")
        logger.info(f"Installing {name} (Version: {version})")
        async with ClientSession() as client:
            logger.debug(f"Fetching {artifact}")
            res = await client.get(artifact, ssl=get_ssl_context())
            if res.status == 200:
                logger.debug("Got 200. Reading...")
                data = await res.read()
                logger.debug(f"Read {len(data)} bytes")
                res_zip = BytesIO(data)
                if isInstalled:
                    try:
                        logger.debug("Uninstalling existing plugin...")
                        await self.uninstall_plugin(name)
                    except:
                        logger.error(f"Plugin {name} could not be uninstalled.")
                logger.debug("Unzipping...")
                ret = self._unzip_to_plugin_dir(res_zip, name, hash)
                if ret:
                    plugin_folder = self.find_plugin_folder(name)
                    plugin_dir = path.join(self.plugin_path, plugin_folder)
                    ret = await self._download_remote_binaries_for_plugin_with_name(plugin_dir)
                    if ret:
                        logger.info(f"Installed {name} (Version: {version})")
                        if name in self.loader.plugins:
                            self.loader.plugins[name].stop()
                            self.loader.plugins.pop(name, None)
                        await sleep(1)
                        
                        current_plugin_order = self.settings.getSetting("pluginOrder")
                        current_plugin_order.append(name)
                        self.settings.setSetting("pluginOrder", current_plugin_order)
                        logger.debug("Plugin %s was added to the pluginOrder setting", name)
                        self.loader.import_plugin(path.join(plugin_dir, "main.py"), plugin_folder)
                    else:
                        logger.fatal(f"Failed Downloading Remote Binaries")
                else:
                    self.log.fatal(f"SHA-256 Mismatch!!!! {name} (Version: {version})")
                if self.loader.watcher:
                    self.loader.watcher.disabled = False
            else:
                logger.fatal(f"Could not fetch from URL. {await res.text()}")

    async def request_plugin_install(self, artifact, name, version, hash, reinstall):
        request_id = str(time())
        self.install_requests[request_id] = PluginInstallContext(artifact, name, version, hash, reinstall)
        tab = await get_gamepadui_tab()
        await tab.open_websocket()
        await tab.evaluate_js(f"DeckyPluginLoader.addPluginInstallPrompt('{name}', '{version}', '{request_id}', '{hash}', '{reinstall}')")

    async def confirm_plugin_install(self, request_id):
        request = self.install_requests.pop(request_id)
        await self._install(request.artifact, request.name, request.version, request.hash)

    def cancel_plugin_install(self, request_id):
        self.install_requests.pop(request_id)
