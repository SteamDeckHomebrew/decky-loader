import imp
from json import dump, load
from os import mkdir, path

from helpers import get_home_path, get_homebrew_path, get_user, set_user


class SettingsManager:
    def __init__(self, name, settings_directory = None) -> None:
        set_user()
        USER = get_user()
        if settings_directory == None:
            settings_directory = get_homebrew_path(get_home_path(USER))
        self.path = path.join(settings_directory, name + ".json")

        if not path.exists(settings_directory):
            mkdir(settings_directory)

        self.settings = {}

        try:
            open(self.path, "x")
        except FileExistsError as e:
            self.read()
            pass

    def read(self):
        try:
            with open(self.path, "r") as file:
                self.settings = load(file)
        except Exception as e:
            print(e)
            pass

    def commit(self):
        with open(self.path, "w+") as file:
            dump(self.settings, file, indent=4)

    def getSetting(self, key, default):
        return self.settings.get(key, default)

    def setSetting(self, key, value):
        self.settings[key] = value
        self.commit()
