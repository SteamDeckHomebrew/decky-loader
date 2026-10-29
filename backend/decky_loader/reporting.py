from __future__ import annotations

import shutil
import subprocess
from logging import getLogger
from typing import TYPE_CHECKING

from aiohttp import ClientSession, ClientTimeout

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
        context.ws.add_route("reporting/upload_report", self.upload_report)
        context.ws.add_route("reporting/copy_to_clipboard", self.copy_to_clipboard)

    async def upload_report(self, body: object) -> str:
        if not isinstance(body, str):
            raise ValueError("Missing or invalid report body")
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
                        raise RuntimeError("Paste upload failed")
                    payload = await res.json()
                    paste_id = payload.get("id")
                    if not isinstance(paste_id, str) or not paste_id:
                        logger.error(f"lp.deckbrew.xyz returned invalid payload: {payload}")
                        raise RuntimeError("Paste upload failed")
                    return f"https://lp.deckbrew.xyz/{paste_id}"
        except Exception as e:
            logger.error(f"Failed to upload report: {e}")
            raise RuntimeError("Paste upload failed") from e

    async def copy_to_clipboard(self, text: object) -> None:
        if not isinstance(text, str):
            raise ValueError("Missing or invalid clipboard text")

        for cmd in clipboard_commands:
            if shutil.which(cmd[0]):
                try:
                    subprocess.run(cmd, input=text.encode("utf-8"), check=True)
                    return
                except Exception as e:
                    logger.error(f"Clipboard copy failed with {cmd[0]}: {e}")
                    continue

        raise RuntimeError("No clipboard utility available (install wl-clipboard)")
