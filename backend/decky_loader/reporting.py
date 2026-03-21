from __future__ import annotations

import re
import shutil
import subprocess
from logging import getLogger
from pathlib import Path
from typing import Dict, List, TYPE_CHECKING

from aiohttp import ClientSession, ClientTimeout, web

from . import helpers
from .helpers import get_home_path
from .localplatform.localplatform import ON_LINUX
if TYPE_CHECKING:
    from .main import PluginManager

logger = getLogger("Reporting")
paste_timeout = ClientTimeout(total=10)
clipboard_commands = (
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
    ["xsel", "--clipboard", "--input"],
)


def _parse_os_release(contents: str) -> Dict[str, str]:
    data: Dict[str, str] = {}
    for line in contents.splitlines():
        if not line or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        data[key.strip()] = value
    return data


def _get_steamos_version() -> str:
    if not ON_LINUX:
        return "unknown"
    try:
        with open("/etc/os-release", "r", encoding="utf-8") as f:
            info = _parse_os_release(f.read())
        if "PRETTY_NAME" in info and info["PRETTY_NAME"].strip():
            pretty = info["PRETTY_NAME"].strip()
            if pretty.lower() == "steamos":
                version = info.get("VERSION_ID") or info.get("VERSION") or ""
                build = info.get("BUILD_ID") or info.get("STEAMOS_BUILD_ID") or ""
                if version and build:
                    return f"{pretty} {version}_{build}"
                if version:
                    return f"{pretty} {version}"
            return pretty
        if "NAME" in info and "VERSION" in info:
            return f'{info["NAME"]} {info["VERSION"]}'
        if "NAME" in info and "VERSION_ID" in info:
            return f'{info["NAME"]} {info["VERSION_ID"]}'
        return info.get("NAME", "unknown")
    except Exception as e:
        logger.warning(f"Failed to read /etc/os-release: {e}")
        return "unknown"


class Reporting:
    def __init__(self, context: "PluginManager") -> None:
        self.context = context
        routes = [
            web.get("/report/system", self.get_system),
            web.get("/report/plugins", self.get_plugins),
            web.post("/report/paste", self.upload_report),
            web.post("/report/clipboard", self.copy_to_clipboard),
        ]
        context.web_app.add_routes(routes)

    def _get_steamos_branch(self) -> str:
        if not ON_LINUX:
            return "Stable"
        candidates = [
            "/etc/steamos-update",
            "/etc/steamos-update.conf",
            "/etc/steamos-branch",
            "/etc/steamos-channel",
        ]
        branch_hint = ""
        for path in candidates:
            try:
                if Path(path).exists():
                    branch_hint = Path(path).read_text(encoding="utf-8", errors="ignore")
                    break
            except Exception:
                continue
        if branch_hint:
            lowered = branch_hint.lower()
            if any(key in lowered for key in ["beta", "preview", "main"]):
                return "Beta"
        return "Stable"

    def _get_decky_branch(self) -> str:
        branch = self.context.settings.getSetting("branch", 0)
        if branch == 1:
            return "Pre-Release"
        if branch == 2:
            return "Testing"
        return "Stable"

    def _get_steam_branch(self, steam_config: str) -> str:
        match = re.search(r"\"BetaParticipation\"\\s*\"([^\"]*)\"", steam_config)
        if not match:
            return "Stable"
        value = match.group(1).strip().lower()
        return "Beta" if value else "Stable"

    def _get_steam_version_from_dir(self, package_dir: Path, branch: str) -> str | None:
        candidates: List[str]
        if branch == "Beta":
            candidates = [
                "steam_client_publicbeta",
                "steam_client_beta",
                "steam_client",
                "steam_client_ubuntu12",
            ]
        else:
            candidates = [
                "steam_client",
                "steam_client_ubuntu12",
                "steam_client_publicbeta",
                "steam_client_beta",
            ]
        for name in candidates:
            path = package_dir.joinpath(name)
            try:
                if path.exists():
                    return path.read_text(encoding="utf-8", errors="ignore").strip() or None
            except Exception:
                continue
        return None

    def _get_steam_version_from_logs(self, home: str) -> str | None:
        log_paths = [
            Path(home).joinpath(".steam", "steam", "logs", "steam_update.log"),
            Path(home).joinpath(".steam", "steam", "logs", "bootstrap_log.txt"),
            Path(home).joinpath(".local", "share", "Steam", "logs", "steam_update.log"),
            Path(home).joinpath(".local", "share", "Steam", "logs", "bootstrap_log.txt"),
        ]
        for path in log_paths:
            try:
                if not path.exists():
                    continue
                content = path.read_text(encoding="utf-8", errors="ignore")
                matches = re.findall(r"\b\d{9,10}\b", content)
                if matches:
                    return matches[-1]
            except Exception:
                continue
        return None

    def _get_steam_version(self, home: str, branch: str) -> str:
        package_dirs = [
            Path(home).joinpath(".steam", "steam", "package"),
            Path(home).joinpath(".local", "share", "Steam", "package"),
        ]
        for package_dir in package_dirs:
            version = self._get_steam_version_from_dir(package_dir, branch)
            if version:
                return version
        log_version = self._get_steam_version_from_logs(home)
        if log_version:
            return log_version
        return "unknown"

    def _get_steam_info(self) -> Dict[str, str]:
        home = get_home_path()
        config_path = Path(home).joinpath(".steam", "steam", "config", "config.vdf")
        config_text = ""
        try:
            if config_path.exists():
                config_text = config_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            config_text = ""
        branch = self._get_steam_branch(config_text)
        version = self._get_steam_version(home, branch)
        return {"version": version, "branch": branch}

    async def get_system(self, _: web.Request) -> web.Response:
        steam_info = self._get_steam_info()
        return web.json_response(
            {
                "steamos": _get_steamos_version(),
                "steamos_branch": self._get_steamos_branch(),
                "steam": steam_info["version"],
                "steam_branch": steam_info["branch"],
                "decky": helpers.get_loader_version(),
                "decky_branch": self._get_decky_branch(),
            }
        )

    async def get_plugins(self, _: web.Request) -> web.Response:
        plugins = await self.context.plugin_loader.get_plugins()
        return web.json_response(
            {
                "plugins": [
                    {"name": plugin["name"], "version": plugin.get("version")}
                    for plugin in plugins
                ]
            }
        )

    async def upload_report(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)

        body = data.get("body")
        if not isinstance(body, str):
            return web.json_response({"error": "Missing or invalid fields"}, status=400)

        try:
            async with ClientSession(timeout=paste_timeout) as session:
                async with session.post(
                    "https://copyandpaste.at/api/log",
                    data=body.encode("utf-8"),
                    headers={
                        "User-Agent": helpers.user_agent,
                        "Content-Type": "text/plain; charset=utf-8",
                    },
                    ssl=helpers.get_ssl_context(),
                ) as res:
                    if res.status < 200 or res.status >= 300:
                        text = await res.text()
                        logger.error(f"copyandpaste.at upload failed: {res.status} {text}")
                        return web.json_response({"error": "Paste upload failed"}, status=502)
                    url = (await res.text()).strip()
        except Exception as e:
            logger.error(f"Failed to upload report: {e}")
            return web.json_response({"error": "Paste upload failed"}, status=502)

        return web.json_response({"success": True, "url": url})

    async def copy_to_clipboard(self, request: web.Request) -> web.Response:
        try:
            data = await request.json()
        except Exception:
            return web.json_response({"error": "Invalid JSON payload"}, status=400)

        text = data.get("text")
        if not isinstance(text, str):
            return web.json_response({"error": "Missing or invalid fields"}, status=400)

        for cmd in clipboard_commands:
            if shutil.which(cmd[0]):
                try:
                    subprocess.run(cmd, input=text.encode("utf-8"), check=True)
                    return web.json_response({"success": True})
                except Exception as e:
                    logger.error(f"Clipboard copy failed with {cmd[0]}: {e}")
                    continue

        return web.json_response({"error": "No clipboard utility available (install wl-clipboard)"}, status=502)
