from logging import getLogger
from os import path

from ..localplatform.localsocket import LocalSocket
from .. import helpers
from ..customtypes import UserType
from ..localplatform.localplatform import get_username


from typing import Dict, List

class SandboxedPlugin:
    def __init__(self,
                 socket: LocalSocket,
                 name: str,
                 flags: List[str],
                 file: str,
                 plugin_directory: str,
                 plugin_path: str,
                 version: str|None,
                 author: str,
                 env: Dict[str, str]) -> None:
        self.name = name
        self.flags = flags
        self.file = file
        self.plugin_path = plugin_path
        self.plugin_directory = plugin_directory
        self.version = version
        self.author = author

        self.log = getLogger("plugin")
        self.env = env
        self.socket = socket

        # export a bunch of environment variables to help plugin developers
        self.env.update({
            "HOME": helpers.get_home_path(UserType.ROOT if "root" in self.flags else UserType.HOST_USER),
            "USER": "root" if "root" in self.flags else get_username(),
            "DECKY_VERSION": helpers.get_loader_version(),
            "DECKY_USER": get_username(),
            "DECKY_USER_HOME": helpers.get_home_path(),
            "DECKY_HOME": helpers.get_homebrew_path(),
            "DECKY_PLUGIN_SETTINGS_DIR": path.join(helpers.get_homebrew_path(), "settings", self.plugin_directory),
            "DECKY_PLUGIN_DIR": path.join(self.plugin_path, self.plugin_directory),
            "DECKY_PLUGIN_NAME": self.name,
            "DECKY_PLUGIN_AUTHOR": self.author,
            "DECKY_PLUGIN_VERSION": self.version or "",
            "DECKY_PLUGIN_RUNTIME_DIR": path.join(helpers.get_homebrew_path(), "data", self.plugin_directory),
            "DECKY_PLUGIN_LOG_DIR": path.join(helpers.get_homebrew_path(), "logs", self.plugin_directory)
        })
        helpers.mkdir_as_user(self.env["DECKY_PLUGIN_SETTINGS_DIR"])
        helpers.mkdir_as_user(self.env["DECKY_PLUGIN_RUNTIME_DIR"])
        helpers.mkdir_as_user(self.env["DECKY_PLUGIN_LOG_DIR"])
    
    def start(self): pass

    async def stop(self): pass