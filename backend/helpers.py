import re
import ssl
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
from localplatform import get_home_path, chown

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

# Get the default homebrew path unless a home_path is specified
def get_homebrew_path(home_path = None) -> str:
    return os.path.join(home_path if home_path != None else get_home_path(), "homebrew")

# Recursively create path and chown as user
def mkdir_as_user(path):
    path = os.path.realpath(path)
    os.makedirs(path, exist_ok=True)
    chown(path)

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