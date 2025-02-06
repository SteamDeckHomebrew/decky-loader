# Full imports
import json
# import pprint
# from pprint import pformat

# Partial imports
from aiohttp import ClientSession
from asyncio import sleep
from hashlib import sha256
from io import BytesIO
from logging import getLogger
from os import R_OK, W_OK, path, listdir, access, mkdir
from re import sub
from shutil import rmtree
from time import time
from zipfile import ZipFile
from enum import IntEnum
from typing import Dict, List, TypedDict

# Local modules
from .localplatform.localplatform import chown, chmod
from .loader import Loader, Plugins
from .helpers import get_ssl_context, download_remote_binary_to_path
from .settings import SettingsManager

logger = getLogger("Browser")

class PluginInstallType(IntEnum):
    INSTALL = 0
    REINSTALL = 1
    UPDATE = 2
    DOWNGRADE = 3
    OVERWRITE = 4

class PluginInstallRequest(TypedDict):
    name: str
    artifact: str
    version: str
    hash: str
    install_type: PluginInstallType

class PluginInstallContext:
    def __init__(self, artifact: str, name: str, version: str, hash: str) -> None:
        self.artifact = artifact
        self.name = name
        self.version = version
        self.hash = hash

class PluginBrowser:
    def __init__(self, plugin_path: str, plugins: Plugins, loader: Loader, settings: SettingsManager) -> None:
        self.plugin_path = plugin_path
        self.plugins = plugins
        self.loader = loader
        self.settings = settings
        self.install_requests: Dict[str, PluginInstallContext | List[PluginInstallContext]] = {}

    def _unzip_to_plugin_dir(self, zip: BytesIO, name: str, hash: str):
        zip_hash = sha256(zip.getbuffer()).hexdigest()
        if hash and (zip_hash != hash):
            return False
        zip_file = ZipFile(zip)
        zip_file.extractall(self.plugin_path)
        plugin_folder = self.find_plugin_folder(name)
        assert plugin_folder is not None
        plugin_dir = path.join(self.plugin_path, plugin_folder)

        if not chown(plugin_dir) or not chmod(plugin_dir, 555):
            logger.error(f"chown/chmod exited with a non-zero exit code")
            return False
        return True

    async def _download_remote_binaries_for_plugin_with_name(self, pluginBasePath: str):
        """Download and install remote binary dependencies for a plugin"""
        
        try:
            # Validate plugin path
            if not path.exists(pluginBasePath):
                raise ValueError(f"Plugin path does not exist: {pluginBasePath}")
                
            packageJsonPath = path.join(pluginBasePath, 'package.json')
            pluginBinPath = path.join(pluginBasePath, 'bin')

            logger.debug(f"Checking package.json at {packageJsonPath}")

            if not access(packageJsonPath, R_OK):
                raise PermissionError(f"Cannot read package.json at {packageJsonPath}")

            with open(packageJsonPath, "r", encoding="utf-8") as f:
                try:
                    packageJson = json.load(f)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid package.json format: {str(e)}")

            if "remote_binary" not in packageJson:
                logger.debug("No remote binaries specified")
                return True

            binaries = packageJson["remote_binary"]
            if not binaries:
                logger.debug("Empty remote_binary list")
                return True

            # Create bin directory with proper permissions
            chmod(pluginBasePath, 0o777)
            if not access(pluginBasePath, W_OK):
                raise PermissionError(f"Cannot write to plugin directory: {pluginBasePath}")

            if not path.exists(pluginBinPath):
                logger.debug(f"Creating bin directory at {pluginBinPath}")
                mkdir(pluginBinPath)
            
            chmod(pluginBinPath, 0o777)
            if not access(pluginBinPath, W_OK):
                raise PermissionError(f"Cannot write to bin directory: {pluginBinPath}")

            # Download each binary
            for binary in binaries:
                try:
                    # Validate required fields
                    required = ['name', 'url', 'sha256hash']
                    if not all(k in binary for k in required):
                        raise ValueError(f"Missing required binary fields: {required}")

                    binPath = path.join(pluginBinPath, binary['name'])
                    logger.debug(f"Downloading {binary['name']} from {binary['url']}")
                    
                    if not await download_remote_binary_to_path(
                        binary['url'], 
                        binary['sha256hash'],
                        binPath
                    ):
                        raise RuntimeError(f"Failed to download binary {binary['name']}")
                        
                except Exception as e:
                    logger.error(f"Error downloading binary {binary.get('name', 'unknown')}: {str(e)}")
                    return False

            # Set final permissions
            chown(self.plugin_path)
            chmod(pluginBasePath, 0o555)
            return True

        except Exception as e:
            logger.error(f"Failed to download remote binaries: {str(e)}")
            return False

    """Return the filename (only) for the specified plugin"""
    def find_plugin_folder(self, name: str) -> str | None:
        for folder in listdir(self.plugin_path):
            try:
                with open(path.join(self.plugin_path, folder, 'plugin.json'), "r", encoding="utf-8") as f:
                    plugin = json.load(f)

                if plugin['name'] == name:
                    return folder
            except:
                logger.debug(f"skipping {folder}")

    async def uninstall_plugin(self, name: str):
        if self.loader.watcher:
            self.loader.watcher.disabled = True
        plugin_folder = self.find_plugin_folder(name)
        assert plugin_folder is not None
        plugin_dir = path.join(self.plugin_path, plugin_folder)
        try:
            logger.info("uninstalling " + name)
            logger.info(" at dir " + plugin_dir)
            logger.debug("calling frontend unload for %s" % str(name))
            await self.loader.ws.emit("loader/unload_plugin", name)
            # plugins_snapshot = self.plugins.copy()
            # snapshot_string = pformat(plugins_snapshot)
            # logger.debug("current plugins: %s", snapshot_string)
            if name in self.plugins:
                logger.debug("Plugin %s was found", name)
                await self.plugins[name].stop(uninstall=True)
                logger.debug("Plugin %s was stopped", name)
                del self.plugins[name]
                logger.debug("Plugin %s was removed from the dictionary", name)
                self.cleanup_plugin_settings(name)
            logger.debug("removing files %s" % str(name))
            rmtree(plugin_dir)
        except FileNotFoundError:
            logger.warning(f"Plugin {name} not installed, skipping uninstallation")
        except Exception as e:
            logger.error(f"Plugin {name} in {plugin_dir} was not uninstalled")
            logger.error(f"Error at {str(e)}", exc_info=e)
        finally:
            if self.loader.watcher:
                self.loader.watcher.disabled = False

    async def _install(self, artifact: str, name: str, version: str, hash: str):
        await self.loader.ws.emit("loader/plugin_download_start", name)
        await self.loader.ws.emit("loader/plugin_download_info", 5, "Store.download_progress_info.start")
        # Will be set later in code
        res_zip = None

        # Check if plugin was already installed before this
        isInstalled = False

        try:
            pluginFolderPath = self.find_plugin_folder(name)
            if pluginFolderPath:
                isInstalled = True
        except:
            logger.error(f"Failed to determine if {name} is already installed, continuing anyway.")

        # Preserve plugin order before removing plugin (uninstall alters the order and removes the plugin from the list)
        current_plugin_order = self.settings.getSetting("pluginOrder")[:]
        if self.loader.watcher:
            self.loader.watcher.disabled = True

        # Check if the file is a local file or a URL
        if artifact.startswith("file://"):
            logger.info(f"Installing {name} from local ZIP file (Version: {version})")
            await self.loader.ws.emit("loader/plugin_download_info", 10, "Store.download_progress_info.open_zip")
            res_zip = BytesIO(open(artifact[7:], "rb").read())
        else:
            logger.info(f"Installing {name} from URL (Version: {version})")
            await self.loader.ws.emit("loader/plugin_download_info", 10, "Store.download_progress_info.download_zip")

            async with ClientSession() as client:
                logger.debug(f"Fetching {artifact}")
                res = await client.get(artifact, ssl=get_ssl_context())
                #TODO track progress of this download in chunks like with decky updates
                #TODO but squish with min 15 and max 75
                if res.status == 200:
                    logger.debug("Got 200. Reading...")
                    data = await res.read()
                    logger.debug(f"Read {len(data)} bytes")
                    res_zip = BytesIO(data)
                else:
                    logger.fatal(f"Could not fetch from URL. {await res.text()}")

            await self.loader.ws.emit("loader/plugin_download_info", 80, "Store.download_progress_info.increment_count")
            storeUrl = ""
            match self.settings.getSetting("store", 0):
                case 0: storeUrl = "https://plugins.deckbrew.xyz/plugins" # default
                case 1: storeUrl = "https://testing.deckbrew.xyz/plugins" # testing
                case 2: storeUrl = self.settings.getSetting("store-url", "https://plugins.deckbrew.xyz/plugins")  # custom
                case _: storeUrl = "https://plugins.deckbrew.xyz/plugins"
            logger.info(f"Incrementing installs for {name} from URL {storeUrl} (version {version})")
            async with ClientSession() as client:
                res = await client.post(storeUrl+f"/{name}/versions/{version}/increment?isUpdate={isInstalled}", ssl=get_ssl_context())
                if res.status != 200:
                    logger.error(f"Server did not accept install count increment request. code: {res.status}")

        await self.loader.ws.emit("loader/plugin_download_info", 85, "Store.download_progress_info.parse_zip")
        if res_zip and version == "dev":
            with ZipFile(res_zip) as plugin_zip:
                plugin_json_list = [file for file in plugin_zip.namelist() if file.endswith("/plugin.json") and file.count("/") == 1]

                if len(plugin_json_list) == 0:
                    logger.fatal("No plugin.json found in plugin ZIP")
                    return

                elif len(plugin_json_list) > 1:
                    logger.fatal("Multiple plugin.json found in plugin ZIP")
                    return

                else:
                    plugin_json_file = plugin_json_list[0]
                    name = sub(r"/.+$", "", plugin_json_file)
                    try:
                        with plugin_zip.open(plugin_json_file) as f:
                            plugin_json_data = json.loads(f.read().decode('utf-8'))
                            plugin_name_from_plugin_json = plugin_json_data.get('name')
                            if plugin_name_from_plugin_json and plugin_name_from_plugin_json.strip():
                                logger.info(f"Extracted plugin name from {plugin_json_file}: {plugin_name_from_plugin_json}")
                                name = plugin_name_from_plugin_json
                            else:
                                logger.warning(f"Nonexistent or invalid 'name' key value in {plugin_json_file}. Falling back to extracting from path.")
                    except Exception as e:
                        logger.error(f"Failed to read or parse {plugin_json_file}: {str(e)}. Falling back to extracting from path.")

        # Check to make sure we got the file
        if res_zip is None:
            logger.fatal(f"Could not fetch {artifact}")
            return

        # If plugin is installed, uninstall it
        if isInstalled:
            await self.loader.ws.emit("loader/plugin_download_info", 90, "Store.download_progress_info.uninstalling_previous")
            try:
                logger.debug("Uninstalling existing plugin...")
                await self.uninstall_plugin(name)
            except:
                logger.error(f"Plugin {name} could not be uninstalled.")


        await self.loader.ws.emit("loader/plugin_download_info", 95, "Store.download_progress_info.installing_plugin")
        # Install the plugin
        logger.debug("Unzipping...")
        ret = self._unzip_to_plugin_dir(res_zip, name, hash)
        if ret:
            plugin_folder = self.find_plugin_folder(name)
            assert plugin_folder is not None
            plugin_dir = path.join(self.plugin_path, plugin_folder)
            #TODO count again from 0% to 100% quickly for this one if it does anything
            ret = await self._download_remote_binaries_for_plugin_with_name(plugin_dir)
            if ret:
                logger.info(f"Installed {name} (Version: {version})")
                if name in self.loader.plugins:
                    await self.loader.plugins[name].stop()
                    self.loader.plugins.pop(name, None)
                await sleep(1)
                if not isInstalled:
                    current_plugin_order = self.settings.getSetting("pluginOrder")
                    current_plugin_order.append(name)
                    self.settings.setSetting("pluginOrder", current_plugin_order)
                    logger.debug("Plugin %s was added to the pluginOrder setting", name)
                await self.loader.import_plugin(path.join(plugin_dir, "main.py"), plugin_folder)
            else:
                logger.fatal(f"Failed Downloading Remote Binaries")
        else:
            logger.fatal(f"SHA-256 Mismatch!!!! {name} (Version: {version})")
        if self.loader.watcher:
            self.loader.watcher.disabled = False
        await self.loader.ws.emit("loader/plugin_download_finish", name)

    async def request_plugin_install(self, artifact: str, name: str, version: str, hash: str, install_type: PluginInstallType):
        request_id = str(time())
        self.install_requests[request_id] = PluginInstallContext(artifact, name, version, hash)

        await self.loader.ws.emit("loader/add_plugin_install_prompt", name, version, request_id, hash, install_type)

    async def request_multiple_plugin_installs(self, requests: List[PluginInstallRequest]):
        request_id = str(time())
        self.install_requests[request_id] = [PluginInstallContext(req['artifact'], req['name'], req['version'], req['hash']) for req in requests]

        await self.loader.ws.emit("loader/add_multiple_plugins_install_prompt", request_id, requests)

    async def confirm_plugin_install(self, request_id: str):
        requestOrRequests = self.install_requests.pop(request_id)
        if isinstance(requestOrRequests, list):
            [await self._install(req.artifact, req.name, req.version, req.hash) for req in requestOrRequests]
        else:
            await self._install(requestOrRequests.artifact, requestOrRequests.name, requestOrRequests.version, requestOrRequests.hash)

    def cancel_plugin_install(self, request_id: str):
        self.install_requests.pop(request_id)

    def cleanup_plugin_settings(self, name: str):
        """Removes any settings related to a plugin. Propably called when a plugin is uninstalled.

        Args:
            name (string): The name of the plugin
        """
        frozen_plugins = self.settings.getSetting("frozenPlugins", [])
        if name in frozen_plugins:
            frozen_plugins.remove(name)
            self.settings.setSetting("frozenPlugins", frozen_plugins)

        hidden_plugins = self.settings.getSetting("hiddenPlugins", [])
        if name in hidden_plugins:
            hidden_plugins.remove(name)
            self.settings.setSetting("hiddenPlugins", hidden_plugins)

        plugin_order = self.settings.getSetting("pluginOrder", [])

        if name in plugin_order:
            plugin_order.remove(name)
            self.settings.setSetting("pluginOrder", plugin_order)

        logger.debug("Removed any settings for plugin %s", name)
