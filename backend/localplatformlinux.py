import os, pwd, grp, sys
from subprocess import call, run, DEVNULL, PIPE, STDOUT
from customtypes import UserType

# Get the user id hosting the plugin loader
def _get_user_id() -> int:
    proc_path = os.path.realpath(sys.argv[0])
    pws = sorted(pwd.getpwall(), reverse=True, key=lambda pw: len(pw.pw_dir))
    for pw in pws:
        if proc_path.startswith(os.path.realpath(pw.pw_dir)):
            return pw.pw_uid
    raise PermissionError("The plugin loader does not seem to be hosted by any known user.")

# Get the user hosting the plugin loader
def _get_user() -> str:
    return pwd.getpwuid(_get_user_id()).pw_name

# Get the effective user id of the running process
def _get_effective_user_id() -> int:
    return os.geteuid()

# Get the effective user of the running process
def _get_effective_user() -> str:
    return pwd.getpwuid(_get_effective_user_id()).pw_name

# Get the effective user group id of the running process
def _get_effective_user_group_id() -> int:
    return os.getegid()

# Get the effective user group of the running process
def _get_effective_user_group() -> str:
    return grp.getgrgid(_get_effective_user_group_id()).gr_name

# Get the user owner of the given file path.
def _get_user_owner(file_path) -> str:
    return pwd.getpwuid(os.stat(file_path).st_uid).pw_name

# Get the user group of the given file path.
def _get_user_group(file_path) -> str:
    return grp.getgrgid(os.stat(file_path).st_gid).gr_name

# Get the group id of the user hosting the plugin loader
def _get_user_group_id() -> int:
    return pwd.getpwuid(_get_user_id()).pw_gid

# Get the group of the user hosting the plugin loader
def _get_user_group() -> str:
    return grp.getgrgid(_get_user_group_id()).gr_name

def chown(path : str,  user : UserType = UserType.HOST_USER, recursive : bool = True) -> bool:
    user_str = ""

    if (user == UserType.HOST_USER):
        user_str = f"{_get_user()}:{_get_user_group()}"
    elif (user == UserType.EFFECTIVE_USER):
        user_str = f"{_get_effective_user()}:{_get_effective_user_group()}"
    else:
        raise Exception("Unknown User Type")

    result = call(["chown", "-R", user_str, path] if recursive else ["chown", user_str, path])
    return result == 0

def chmod(path : str, permissions : int, recursive : bool = True) -> bool:
    result = call(["chmod", "-R", str(permissions), path] if recursive else ["chmod", str(permissions), path])
    return result == 0

def folder_owner(path : str) -> UserType|None:
    user_owner = _get_user_owner(path)

    if (user_owner == _get_user()):
        return UserType.HOST_USER

    elif (user_owner == _get_effective_user()):
        return UserType.EFFECTIVE_USER

    else:
        return None 

def get_home_path(user : UserType = UserType.HOST_USER) -> str:
    user_name = "root"

    if user == UserType.HOST_USER:
        user_name = _get_user()
    elif user == UserType.EFFECTIVE_USER:
        user_name = _get_effective_user()
    elif user != UserType.ROOT:
        raise Exception("Unknown User Type")

    return pwd.getpwnam(user_name).pw_dir

def get_username() -> str:
    return _get_user()

def setgid(user : UserType = UserType.HOST_USER):
    user_id = 0

    if user == UserType.HOST_USER:
        user_id = _get_user_group_id()
    elif user != UserType.ROOT:
        raise Exception("Unknown user type")

    os.setgid(user_id)

def setuid(user : UserType = UserType.HOST_USER):
    user_id = 0

    if user == UserType.HOST_USER:
        user_id = _get_user_id()
    elif user != UserType.ROOT:
        raise Exception("Unknown user type")

    os.setuid(user_id)

async def service_active(service_name : str) -> bool:
    res = run(["systemctl", "is-active", service_name], stdout=DEVNULL, stderr=DEVNULL)
    return res.returncode == 0

async def service_restart(service_name : str) -> bool:
    call(["systemctl", "daemon-reload"])
    cmd = ["systemctl", "restart", service_name]
    res = run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

async def service_stop(service_name : str) -> bool:
    cmd = ["systemctl", "stop", service_name]
    res = run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

async def service_start(service_name : str) -> bool:
    cmd = ["systemctl", "start", service_name]
    res = run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0