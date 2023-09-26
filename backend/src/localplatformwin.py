from .customtypes import UserType
import os, sys

def chown(path : str,  user : UserType = UserType.HOST_USER, recursive : bool = True) -> bool:
    return True # Stubbed

def chmod(path : str, permissions : int, recursive : bool = True) -> bool:
    return True # Stubbed

def folder_owner(path : str) -> UserType|None:
    return UserType.HOST_USER # Stubbed

def get_home_path(user : UserType = UserType.HOST_USER) -> str:
    return os.path.expanduser("~") # Mostly stubbed

def setgid(user : UserType = UserType.HOST_USER):
    pass # Stubbed

def setuid(user : UserType = UserType.HOST_USER):
    pass # Stubbed

async def service_active(service_name : str) -> bool:
    return True # Stubbed

async def service_stop(service_name : str) -> bool:
    return True # Stubbed

async def service_start(service_name : str) -> bool:
    return True # Stubbed

async def service_restart(service_name : str) -> bool:
    if service_name == "plugin_loader":
        sys.exit(42)

    return True # Stubbed

def get_username() -> str:
    return os.getlogin()

def get_privileged_path() -> str:
    '''On windows, privileged_path is equal to unprivileged_path'''
    return get_unprivileged_path()

def get_unprivileged_path() -> str:
    path = os.getenv("UNPRIVILEGED_PATH")

    if path == None:
        path = os.getenv("PRIVILEGED_PATH", os.path.join(os.path.expanduser("~"), "homebrew"))

    return path

def get_unprivileged_user() -> str:
    return os.getenv("UNPRIVILEGED_USER", os.getlogin())
