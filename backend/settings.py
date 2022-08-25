from os import path, mkdir
from json import load, dump

class SettingsManager:
    def __init__(self, name, settings_directory) -> None:
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
        if key in self.settings:
            return self.settings[key]
        return default

    def setSetting(self, key, value):
        self.settings[key] = value
        self.commit()