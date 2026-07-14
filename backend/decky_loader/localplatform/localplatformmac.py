from ..enums import UserType
from . import localplatformlinux

# NOTE: localplatformlinux has these private functions that get used in helpers.py
def _get_user_id() -> int: # pyright: ignore[reportUnusedFunction]
    return localplatformlinux._get_user_id() # pyright: ignore[reportPrivateUsage]

def _get_effective_user_id() -> int: # pyright: ignore[reportUnusedFunction]
    return localplatformlinux._get_effective_user_id() # pyright: ignore[reportPrivateUsage]

def chown(path : str,  user : UserType = UserType.HOST_USER, recursive : bool = True) -> bool:
    return localplatformlinux.chown(path, user, recursive)

def chmod(path : str, permissions : int, recursive : bool = True) -> bool:
    return localplatformlinux.chmod(path, permissions, recursive)

def file_owner(path : str) -> UserType|None:
    return localplatformlinux.file_owner(path)

def get_home_path(user : UserType = UserType.HOST_USER) -> str:
    return localplatformlinux.get_home_path(user)

def setgid(user : UserType = UserType.HOST_USER):
    return localplatformlinux.setgid(user)

def setuid(user : UserType = UserType.HOST_USER):
    return localplatformlinux.setuid(user)

async def service_active(service_name : str) -> bool:
    return True # Stubbed

async def service_stop(service_name : str) -> bool:
    return True # Stubbed

async def service_start(service_name : str) -> bool:
    return True # Stubbed

async def service_restart(service_name : str, block : bool = True) -> bool:
    return True # Stubbed

def get_effective_username() -> str:
    return localplatformlinux.get_effective_username()

def get_username() -> str:
    return localplatformlinux.get_username()

def get_privileged_path() -> str:
    # On Mac, privileged_path is equal to unprivileged_path
    return get_unprivileged_path()

def get_unprivileged_path() -> str:
    return localplatformlinux.get_unprivileged_path()

def get_unprivileged_user() -> str:
    return localplatformlinux.get_unprivileged_user()

async def restart_webhelper() -> bool:
    return await localplatformlinux.restart_webhelper()

async def close_cef_socket():
    return # Stubbed