import imp, pwd
from json import dump, load
from os import mkdir, path, stat, listdir, rename
from shutil import chown

from helpers import get_home_path, get_homebrew_path, get_user, set_user


class SettingsManager:
    def __init__(self, name, settings_directory = None) -> None:
        set_user()
        USER = get_user()
        if settings_directory == None:
            settings_directory = path_join(get_homebrew_path(get_home_path(USER)), "settings")
            wrong_dir = get_homebrew_path(get_home_path(USER))
        
        self.path = path.join(settings_directory, name + ".json")
        
        #Create the folder with the correct permission
        if not path.exists(settings_directory):
            mkdir(settings_directory)
            chown(settings_directory, USER, USER)
        
        #Copy all old settings file in the root directory to the correct folder
        for file in listdir(wrong_dir):
            if file.endswith(".json"):
                rename(path_join(wrong_dir,file),
                       path_join(settings_directory, file)) 
                self.path = path.join(settings_directory, name + ".json")
                
        
        #If the owner of the settings directory is not the user, then set it as the user:
        if pwd.getpwuid(stat(settings_directory).st_uid)[0] != USER:
            chown(settings_directory, USER, USER)

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
