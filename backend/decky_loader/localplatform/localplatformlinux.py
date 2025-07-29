from re import compile
from asyncio import Lock, create_subprocess_exec
from asyncio.subprocess import PIPE, DEVNULL, STDOUT, Process
from subprocess import call as call_sync
import os, pwd, grp, sys, logging
from typing import IO, Any, Mapping
from ..enums import UserType

logger = logging.getLogger("localplatform")

# subprocess._ENV
ENV = Mapping[str, str]
ProcessIO = int | IO[Any] | None
async def run(args: list[str], stdin: ProcessIO = DEVNULL, stdout: ProcessIO = PIPE, stderr: ProcessIO = PIPE, env: ENV | None = {"LD_LIBRARY_PATH": ""}) -> tuple[Process, bytes | None, bytes | None]:
    proc = await create_subprocess_exec(args[0], *(args[1:]), stdin=stdin, stdout=stdout, stderr=stderr, env=env)
    proc_stdout, proc_stderr = await proc.communicate()
    return (proc, proc_stdout, proc_stderr)

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
    else:
        raise Exception("Unknown User Type")

    result = call_sync(["chown", "-R", user_str, path] if recursive else ["chown", user_str, path])
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

def file_owner(path : str) -> UserType|None:
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
    else:
        raise Exception("Unknown User Type")

    return pwd.getpwnam(user_name).pw_dir

def get_effective_username() -> str:
    return _get_effective_user()

def get_username() -> str:
    return _get_user()

def setgid(user : UserType = UserType.HOST_USER):
    user_id = 0

    if user == UserType.HOST_USER:
        user_id = _get_user_group_id()
    elif user == UserType.EFFECTIVE_USER:
        pass # we already are
    else:
        raise Exception("Unknown user type")
    
    os.setgid(user_id)

def setuid(user : UserType = UserType.HOST_USER):
    user_id = 0

    if user == UserType.HOST_USER:
        user_id = _get_user_id()
    elif user == UserType.EFFECTIVE_USER:
        pass # we already are
    else:
        raise Exception("Unknown user type")
    
    os.setuid(user_id)

async def service_active(service_name : str) -> bool:
    res, _, _ = await run(["systemctl", "is-active", service_name], stdout=DEVNULL, stderr=DEVNULL)
    return res.returncode == 0

async def service_restart(service_name : str, block : bool = True) -> bool:
    await run(["systemctl", "daemon-reload"])
    logger.info("Systemd reload done.")
    cmd = ["systemctl", "restart", service_name]

    if not block:
        cmd.append("--no-block")

    res, _, _ = await run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

async def service_stop(service_name : str) -> bool:
    if not await service_active(service_name):
        # Service isn't running. pretend we stopped it
        return True

    cmd = ["systemctl", "stop", service_name]
    res, _, _ = await run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

async def service_start(service_name : str) -> bool:
    if await service_active(service_name):
        # Service is running. pretend we started it
        return True

    cmd = ["systemctl", "start", service_name]
    res, _, _ = await run(cmd, stdout=PIPE, stderr=STDOUT)
    return res.returncode == 0

async def restart_webhelper() -> bool:
    logger.info("Restarting steamwebhelper")
    # TODO move to pkill
    res, _, _ = await run(["killall", "-s", "SIGTERM", "steamwebhelper"], stdout=DEVNULL, stderr=DEVNULL)
    return res.returncode == 0

def get_privileged_path() -> str:
    path = os.getenv("PRIVILEGED_PATH")

    if path == None:
        path = get_unprivileged_path()

    os.makedirs(path, exist_ok=True)

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

        if hasattr(sys, 'frozen'):
            # Expected path of loader binary is /home/deck/homebrew/service/PluginLoader
            path = _parent_dir(_parent_dir(os.path.realpath(sys.argv[0])))
        else:
            # Expected path of this file is $src_root/backend/src/localplatformlinux.py
            path = _parent_dir(_parent_dir(_parent_dir(__file__)))

        if path != None and not os.path.exists(path):
            path = None

    if path == None:
        logger.warning("Unprivileged path is not properly configured. Defaulting to /home/deck/homebrew")
        path = "/home/deck/homebrew" # We give up
    
    os.makedirs(path, exist_ok=True)

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
        logger.warning("Unprivileged user is not properly configured. Defaulting to 'deck'")
        user = 'deck'

    return user

# Works around the CEF debugger TCP socket not closing properly when Steam restarts
# Group 1 is PID, group 2 is FD. this also filters for "steamwebhelper" in the process name.
cef_socket_lsof_regex = compile(r"^p(\d+)(?:\s|.)+csteamwebhelper(?:\s|.)+f(\d+)(?:\s|.)+TST=LISTEN")
close_cef_socket_lock = Lock()

async def close_cef_socket():
    async with close_cef_socket_lock:
        if _get_effective_user_id() != 0:
            logger.warning("Can't close CEF socket as Decky isn't running as root.")
            return
        # Look for anything listening TCP on port 8080
        lsof, stdout, _ = await run(["lsof", "-F", "-iTCP:8080", "-sTCP:LISTEN"], stdout=PIPE)
        if not stdout or lsof.returncode != 0 or len(stdout) < 1:
            logger.error(f"lsof call failed in close_cef_socket! return code: {str(lsof.returncode)}")
            return

        lsof_data = cef_socket_lsof_regex.match(stdout.decode())
        
        if not lsof_data:
            logger.error("lsof regex match failed in close_cef_socket!")
            return

        pid = lsof_data.group(1)
        fd = lsof_data.group(2)

        logger.info(f"Closing CEF socket with PID {pid} and FD {fd}")

        # Use gdb to inject a close() call for the socket fd into steamwebhelper
        gdb_ret, _, _ = await run(["gdb", "--nx", "-p", pid, "--batch", "--eval-command", f"call (int)close({fd})"])

        if gdb_ret.returncode != 0:
            logger.error(f"Failed to close CEF socket with gdb! return code: {str(gdb_ret.returncode)}", exc_info=True)
            return

        logger.info("CEF socket closed")
