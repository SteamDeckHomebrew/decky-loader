import re
import ssl
import uuid
import os
import subprocess
from hashlib import sha256
import importlib.metadata

import certifi
from aiohttp.web import Request, Response, middleware
from aiohttp.typedefs import Handler
from aiohttp import ClientSession
from .localplatform import localplatform
from .enums import UserType
from logging import getLogger
from packaging.version import Version

SSHD_UNIT = "sshd.service"
REMOTE_DEBUGGER_UNIT = "steam-web-debug-portforward.service"

# global vars
csrf_token = str(uuid.uuid4())
ssl_ctx = ssl.create_default_context(cafile=certifi.where())

assets_regex = re.compile("^/plugins/.*/assets/.*")
data_regex = re.compile("^/plugins/.*/data/.*")
dist_regex = re.compile("^/plugins/.*/dist/.*")
frontend_regex = re.compile("^/frontend/.*")
logger = getLogger("Main")

def get_ssl_context():
    return ssl_ctx

def get_csrf_token():
    return csrf_token

@middleware
async def csrf_middleware(request: Request, handler: Handler):
    if str(request.method) == "OPTIONS" or \
        request.headers.get('X-Decky-Auth') == csrf_token or \
        str(request.rel_url) == "/auth/token" or \
        str(request.rel_url).startswith("/plugins/load_main/") or \
        str(request.rel_url).startswith("/static/") or \
        str(request.rel_url).startswith("/steam_resource/") or \
        str(request.rel_url).startswith("/frontend/") or \
        str(request.rel_url.path) == "/fetch" or \
        str(request.rel_url.path) == "/ws" or \
        assets_regex.match(str(request.rel_url)) or \
        data_regex.match(str(request.rel_url)) or \
        dist_regex.match(str(request.rel_url)) or \
        frontend_regex.match(str(request.rel_url)):

        return await handler(request)
    return Response(text='Forbidden', status=403)

def create_inject_script(script: str) -> str:
    return "try{if (window.deckyHasLoaded){setTimeout(() => SteamClient.Browser.RestartJSContext(), 100)}else{window.deckyHasLoaded = true;(async()=>{try{await import('http://localhost:1337/frontend/%s?v=%s')}catch(e){console.error(e)};})();}}catch(e){console.error(e)}" % (script, get_loader_version(), )

# Get the default homebrew path unless a home_path is specified. home_path argument is deprecated
def get_homebrew_path() -> str:
    return localplatform.get_unprivileged_path()

# Recursively create path and chown as user
def mkdir_as_user(path: str):
    path = os.path.realpath(path)
    os.makedirs(path, exist_ok=True)
    localplatform.chown(path)

# Fetches the version of loader
def get_loader_version() -> str:
    try:
        # Normalize Python-style version to conform to Decky style
        v = Version(importlib.metadata.version("decky_loader"))
        if v.major == 0 and v.minor == 0 and v.micro == 0:
            # We are probably running from source
            return "dev"

        version_str = f'v{v.major}.{v.minor}.{v.micro}'

        if v.pre:
            version_str += f'-pre{v.pre[1]}'

        if v.post:
            version_str += f'-dev{v.post}'

        return version_str
    except Exception as e:
        logger.warning(f"Failed to execute get_loader_version(): {str(e)}")
        return "unknown"

user_agent = f"Decky/{get_loader_version()} (https://decky.xyz)"

# returns the appropriate system python paths
def get_system_pythonpaths() -> list[str]:
    try:
        # run as normal normal user if on linux to also include user python paths
        proc = subprocess.run(["python3" if localplatform.ON_LINUX else "python", "-c", "import sys; print('\\n'.join(x for x in sys.path if x))"],
        # TODO make this less insane
                              capture_output=True, user=localplatform.localplatform._get_user_id() if localplatform.ON_LINUX else None, env={} if localplatform.ON_LINUX else None) # pyright: ignore [reportPrivateUsage]
        
        proc.check_returncode()

        versions = [x.strip() for x in proc.stdout.decode().strip().split("\n")]
        return [x for x in versions if x and not x.isspace()]
    except Exception as e:
        logger.warning(f"Failed to execute get_system_pythonpaths(): {str(e)}")
        return []

# Download Remote Binaries to local Plugin
async def download_remote_binary_to_path(url: str, binHash: str, path: str) -> bool:
    rv = False
    try:
        if os.access(os.path.dirname(path), os.W_OK):
            async with ClientSession() as client:
                res = await client.get(url, ssl=get_ssl_context())
                if res.status == 200:
                    logger.debug("Download attempt of URL: " + url)
                    data = await res.read()
                    remoteHash = sha256(data).hexdigest()
                    if binHash == remoteHash:
                        with open(path, 'wb') as f:
                            f.write(data)
                            rv = True
                    else:
                        raise Exception(f"Fatal Error: Hash Mismatch for remote binary {path}@{url}")
                else:
                    rv = False
    except Exception as e:
        logger.error("Error during download " + str(e))
        rv = False

    return rv

# Deprecated
def set_user():
    pass

# Deprecated
def set_user_group() -> str:
    return get_user_group()

#########
# Below is legacy code, provided for backwards compatibility. This will break on windows
#########

# Get the user id hosting the plugin loader
def get_user_id() -> int:
    return localplatform.localplatform._get_user_id() # pyright: ignore [reportPrivateUsage]

# Get the user hosting the plugin loader
def get_user() -> str:
    return localplatform.localplatform._get_user() # pyright: ignore [reportPrivateUsage]

# Get the effective user id of the running process
def get_effective_user_id() -> int:
    return localplatform.localplatform._get_effective_user_id() # pyright: ignore [reportPrivateUsage]

# Get the effective user of the running process
def get_effective_user() -> str:
    return localplatform.localplatform._get_effective_user() # pyright: ignore [reportPrivateUsage]

# Get the effective user group id of the running process
def get_effective_user_group_id() -> int:
    return localplatform.localplatform._get_effective_user_group_id() # pyright: ignore [reportPrivateUsage]

# Get the effective user group of the running process
def get_effective_user_group() -> str:
    return localplatform.localplatform._get_effective_user_group() # pyright: ignore [reportPrivateUsage]

# Get the user owner of the given file path.
def get_user_owner(file_path: str) -> str:
    return localplatform.localplatform._get_user_owner(file_path) # pyright: ignore [reportPrivateUsage]

# Get the user group of the given file path, or the user group hosting the plugin loader
def get_user_group(file_path: str | None = None) -> str:
    return localplatform.localplatform._get_user_group(file_path) # pyright: ignore [reportPrivateUsage]

# Get the group id of the user hosting the plugin loader
def get_user_group_id() -> int:
    return localplatform.localplatform._get_user_group_id() # pyright: ignore [reportPrivateUsage]

# Get the default home path unless a user is specified
def get_home_path(username: str | None = None) -> str:
    return localplatform.get_home_path(UserType.ROOT if username == "root" else UserType.HOST_USER)

async def is_systemd_unit_active(unit_name: str) -> bool:
    return await localplatform.service_active(unit_name)

async def stop_systemd_unit(unit_name: str) -> bool:
    return await localplatform.service_stop(unit_name)

async def start_systemd_unit(unit_name: str) -> bool:
    return await localplatform.service_start(unit_name)
