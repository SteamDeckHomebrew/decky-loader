import grp
import pwd
import re
import ssl
import subprocess
import uuid
import os
import sys
from subprocess import check_output
from time import sleep
from hashlib import sha256
from io import BytesIO

import certifi
from aiohttp.web import Response, middleware
from aiohttp import ClientSession

REMOTE_DEBUGGER_UNIT = "steam-web-debug-portforward.service"

# global vars
csrf_token = str(uuid.uuid4())
ssl_ctx = ssl.create_default_context(cafile=certifi.where())

assets_regex = re.compile("^/plugins/.*/assets/.*")
frontend_regex = re.compile("^/frontend/.*")

def get_ssl_context():
    return ssl_ctx

def get_csrf_token():
    return csrf_token

@middleware
async def csrf_middleware(request, handler):
    if str(request.method) == "OPTIONS" or request.headers.get('Authentication') == csrf_token or str(request.rel_url) == "/auth/token" or str(request.rel_url).startswith("/plugins/load_main/") or str(request.rel_url).startswith("/static/") or str(request.rel_url).startswith("/legacy/") or str(request.rel_url).startswith("/steam_resource/") or str(request.rel_url).startswith("/frontend/") or assets_regex.match(str(request.rel_url)) or frontend_regex.match(str(request.rel_url)):
        return await handler(request)
    return Response(text='Forbidden', status='403')

# Deprecated
def set_user():
    pass

# Get the user id hosting the plugin loader
def get_user_id() -> int:
    proc_path = os.path.realpath(sys.argv[0])
    pws = sorted(pwd.getpwall(), reverse=True, key=lambda pw: len(pw.pw_dir))
    for pw in pws:
        if proc_path.startswith(os.path.realpath(pw.pw_dir)):
            return pw.pw_uid
    raise PermissionError("The plugin loader does not seem to be hosted by any known user.")

# Get the user hosting the plugin loader
def get_user() -> str:
    return pwd.getpwuid(get_user_id()).pw_name

# Get the effective user id of the running process
def get_effective_user_id() -> int:
    return os.geteuid()

# Get the effective user of the running process
def get_effective_user() -> str:
    return pwd.getpwuid(get_effective_user_id()).pw_name

# Get the effective user group id of the running process
def get_effective_user_group_id() -> int:
    return os.getegid()

# Get the effective user group of the running process
def get_effective_user_group() -> str:
    return grp.getgrgid(get_effective_user_group_id()).gr_name

# Get the user owner of the given file path.
def get_user_owner(file_path) -> str:
    return pwd.getpwuid(os.stat(file_path).st_uid).pw_name

# Get the user group of the given file path.
def get_user_group(file_path) -> str:
    return grp.getgrgid(os.stat(file_path).st_gid).gr_name

# Deprecated
def set_user_group() -> str:
    return get_user_group()

# Get the group id of the user hosting the plugin loader
def get_user_group_id() -> int:
    return pwd.getpwuid(get_user_id()).pw_gid

# Get the group of the user hosting the plugin loader
def get_user_group() -> str:
    return grp.getgrgid(get_user_group_id()).gr_name

# Get the default home path unless a user is specified
def get_home_path(username = None) -> str:
    if username == None:
        username = get_user()
    return pwd.getpwnam(username).pw_dir

# Get the default homebrew path unless a home_path is specified
def get_homebrew_path(home_path = None) -> str:
    if home_path == None:
        home_path = get_home_path()
    return os.path.join(home_path, "homebrew")

# Recursively create path and chown as user
def mkdir_as_user(path):
    path = os.path.realpath(path)
    os.makedirs(path, exist_ok=True)
    chown_path = get_home_path()
    parts = os.path.relpath(path, chown_path).split(os.sep)
    uid = get_user_id()
    gid = get_user_group_id()
    for p in parts:
        chown_path = os.path.join(chown_path, p)
        os.chown(chown_path, uid, gid)

# Fetches the version of loader
def get_loader_version() -> str:
    with open(os.path.join(os.path.dirname(sys.argv[0]), ".loader.version"), "r", encoding="utf-8") as version_file:
        return version_file.readline().replace("\n", "")

# Download Remote Binaries to local Plugin
async def download_remote_binary_to_path(url, binHash, path) -> bool:
    rv = False
    try:
        if os.access(os.path.dirname(path), os.W_OK):
            async with ClientSession() as client:
                res = await client.get(url, ssl=get_ssl_context())
            if res.status == 200:
                data = BytesIO(await res.read())
                remoteHash = sha256(data.getbuffer()).hexdigest()
                if binHash == remoteHash:
                    data.seek(0)
                    with open(path, 'wb') as f:
                        f.write(data.getbuffer())
                        rv = True
                else:
                    raise Exception(f"Fatal Error: Hash Mismatch for remote binary {path}@{url}")
            else:
                rv = False
    except:
        rv = False

    return rv

async def is_systemd_unit_active(unit_name: str) -> bool:
    res = subprocess.run(["systemctl", "is-active", unit_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return res.returncode == 0

async def stop_systemd_unit(unit_name: str) -> subprocess.CompletedProcess:
    cmd = ["systemctl", "stop", unit_name]

    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

async def start_systemd_unit(unit_name: str) -> subprocess.CompletedProcess:
    cmd = ["systemctl", "start", unit_name]

    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
