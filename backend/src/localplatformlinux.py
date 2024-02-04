import os, pwd, grp, sys, logging
from subprocess import call, run, DEVNULL, PIPE, STDOUT
from .customtypes import UserType

logger = logging.getLogger("localplatform")

# Get the user id hosting the plugin loader
def _get_user_id() -> int:
    return pwd.getpwnam(_get_user()).pw_uid

# Get the user hosting the plugin loader
def _get_user() -> str:
    return get_unprivileged_user()

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
def _get_user_owner(file_path: str) -> str:
    return pwd.getpwuid(os.stat(file_path).st_uid).pw_name

# Get the user group of the given file path, or the user group hosting the plugin loader
def _get_user_group(file_path: str | None = None) -> str:
    return grp.getgrgid(os.stat(file_path).st_gid if file_path is not None else _get_user_group_id()).gr_name

# Get the group id of the user hosting the plugin loader
def _get_user_group_id() -> int:
    return pwd.getpwuid(_get_user_id()).pw_gid

def chown(path : str,  user : UserType = UserType.HOST_USER, recursive : bool = True) -> bool:
    user_str = ""

    if user == UserType.HOST_USER:
        user_str = _get_user()+":"+_get_user_group()
    elif user == UserType.EFFECTIVE_USER:
        user_str = _get_effective_user()+":"+_get_effective_user_group()
    elif user == UserType.ROOT:
        user_str = "root:root"
    else:
        raise Exception("Unknown User Type")

    result = call(["chown", "-R", user_str, path] if recursive else ["chown", user_str, path])
    return result == 0

def chmod(path : str, permissions : int, recursive : bool = True) -> bool:
    if _get_effective_user_id() != 0:
        return True

    try:
        octal_permissions = int(str(permissions), 8)

        if recursive:
            for root, dirs, files in os.walk(path):  
                for d in dirs:  
                    os.chmod(os.path.join(root, d), octal_permissions)
                for d in files:
                    os.chmod(os.path.join(root, d), octal_permissions)

        os.chmod(path, octal_permissions)
    except:
        return False

    return True

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
    elif user == UserType.ROOT:
        pass
    else:
        raise Exception("Unknown User Type")

    return pwd.getpwnam(user_name).pw_dir

def get_username() -> str:
    return _get_user()

def setgid(user : UserType = UserType.HOST_USER):
    user_id = 0

    if user == UserType.HOST_USER:
        user_id = _get_user_group_id()
    elif user == UserType.ROOT:
        pass
    else:
        raise Exception("Unknown user type")
    
    os.setgid(user_id)

def setuid(user : UserType = UserType.HOST_USER):
    user_id = 0

    if user == UserType.HOST_USER:
        user_id = _get_user_id()
    elif user == UserType.ROOT:
        pass
    else:
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
    if not await service_active(service_name):
        # Service isn't running. pretend we stopped it
        return True

    cmd = ["systemctl", "stop", service_name]
    res = run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

async def service_start(service_name : str) -> bool:
    if await service_active(service_name):
        # Service is running. pretend we started it
        return True

    cmd = ["systemctl", "start", service_name]
    res = run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

def get_privileged_path() -> str:
    path = os.getenv("PRIVILEGED_PATH")

    if path == None:
        path = get_unprivileged_path()

    return path

def _parent_dir(path : str | None) -> str | None:
    if path == None:
        return None

    if path.endswith('/'):
        path = path[:-1]
    
    return os.path.dirname(path)

def get_unprivileged_path() -> str:
    path = os.getenv("UNPRIVILEGED_PATH")
    
    if path == None:
        path = _parent_dir(os.getenv("PLUGIN_PATH"))
    
    if path == None:
        logger.debug("Unprivileged path is not properly configured. Making something up!")
        # Expected path of loader binary is /home/deck/homebrew/service/PluginLoader
        path = _parent_dir(_parent_dir(os.path.realpath(sys.argv[0])))

        if path != None and not os.path.exists(path):
            path = None

    if path == None:
        logger.warn("Unprivileged path is not properly configured. Defaulting to /home/deck/homebrew")
        path = "/home/deck/homebrew" # We give up
    
    return path


def get_unprivileged_user() -> str:
    user = os.getenv("UNPRIVILEGED_USER")

    if user == None:
        # Lets hope we can extract it from the unprivileged dir
        dir = os.path.realpath(get_unprivileged_path())

        pws = sorted(pwd.getpwall(), reverse=True, key=lambda pw: len(pw.pw_dir))
        for pw in pws:
            if dir.startswith(os.path.realpath(pw.pw_dir)):
                user = pw.pw_name
                break
    
    if user == None:
        logger.warn("Unprivileged user is not properly configured. Defaulting to 'deck'")
        user = 'deck'

    return user
