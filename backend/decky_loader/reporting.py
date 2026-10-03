from __future__ import annotations

import shutil
import subprocess
from logging import getLogger
from typing import TYPE_CHECKING

from aiohttp import ClientSession, ClientTimeout, web

from . import helpers

if TYPE_CHECKING:
    from .main import PluginManager

logger = getLogger("Reporting")
paste_timeout = ClientTimeout(total=10)
clipboard_commands = (
    ["wl-copy"],
    ["xclip", "-selection", "clipboard"],
    ["xsel", "--clipboard", "--input"],
)


class Reporting:
    def __init__(self, context: "PluginManager") -> None:
        self.context = context
        routes = [
            web.post("/report/paste", self.upload_report),
            web.post("/report/clipboard", self.copy_to_clipboard),
        ]
        context.web_app.add_routes(routes)

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
                async with session.put(
                    "https://lp.deckbrew.xyz/",
                    data=body,
                    headers={
                        "User-Agent": helpers.user_agent,
                        "Content-Type": "text/plain; charset=utf-8",
                    },
                    ssl=helpers.get_ssl_context(),
                ) as res:
                    if res.status < 200 or res.status >= 300:
                        text = await res.text()
                        logger.error(f"lp.deckbrew.xyz upload failed: {res.status} {text}")
                        return web.json_response({"error": "Paste upload failed"}, status=502)
                    payload = await res.json()
                    paste_id = payload.get("id")
                    if not isinstance(paste_id, str) or not paste_id:
                        logger.error(f"lp.deckbrew.xyz returned invalid payload: {payload}")
                        return web.json_response({"error": "Paste upload failed"}, status=502)
                    url = f"https://lp.deckbrew.xyz/{paste_id}"
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
