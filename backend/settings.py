from json import dump, load
from os import mkdir, path, listdir, rename
from typing import Any, Dict
from .localplatform import chown, folder_owner, get_chown_plugin_path
from .customtypes import UserType

from .helpers import get_homebrew_path


class SettingsManager:
    def __init__(self, name: str, settings_directory: str | None = None) -> None:
        wrong_dir = get_homebrew_path()
        if settings_directory == None:
            settings_directory = path.join(wrong_dir, "settings")

        self.path = path.join(settings_directory, name + ".json")

        #Create the folder with the correct permission
        if not path.exists(settings_directory):
            mkdir(settings_directory)

        #Copy all old settings file in the root directory to the correct folder
        for file in listdir(wrong_dir):
            if file.endswith(".json"):
                rename(path.join(wrong_dir,file),
                       path.join(settings_directory, file))
                self.path = path.join(settings_directory, name + ".json")


        #If the owner of the settings directory is not the user, then set it as the user:
        expected_user = UserType.HOST_USER if get_chown_plugin_path() else UserType.ROOT
        if folder_owner(settings_directory) != expected_user:
            chown(settings_directory, expected_user, False)

        self.settings: Dict[str, Any] = {}

        try:
            open(self.path, "x", encoding="utf-8")
        except FileExistsError as _:
            self.read()
            pass

    def read(self):
        try:
            with open(self.path, "r", encoding="utf-8") as file:
                self.settings = load(file)
        except Exception as e:
            print(e)
            pass

    def commit(self):
        with open(self.path, "w+", encoding="utf-8") as file:
            dump(self.settings, file, indent=4, ensure_ascii=False)

    def getSetting(self, key: str, default: Any = None) -> Any:
        return self.settings.get(key, default)

    def setSetting(self, key: str, value: Any) -> Any:
        self.settings[key] = value
        self.commit()
