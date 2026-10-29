import unittest
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import Mock, call, patch

from decky_loader import reporting


def fake_which(name: str) -> str:
    return f"/bin/{name}"


class FakeResponse:
    def __init__(self, status: int = 200, payload: dict[str, Any] | None = None, text: str = "") -> None:
        self.status = status
        self.payload = payload or {}
        self.body_text = text

    async def __aenter__(self) -> "FakeResponse":
        return self

    async def __aexit__(self, *_: Any) -> None:
        return None

    async def json(self) -> dict[str, Any]:
        return self.payload

    async def text(self) -> str:
        return self.body_text


class FakeSession:
    def __init__(self, response: FakeResponse) -> None:
        self.put = Mock(return_value=response)

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *_: Any) -> None:
        return None


class ReportingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.ws = SimpleNamespace(add_route=Mock())
        self.reporting = reporting.Reporting(cast(Any, SimpleNamespace(ws=self.ws)))

    def test_registers_reporting_methods_with_websocket_router(self) -> None:
        self.assertEqual(
            self.ws.add_route.call_args_list,
            [
                call("reporting/upload_report", self.reporting.upload_report),
                call("reporting/copy_to_clipboard", self.reporting.copy_to_clipboard),
            ],
        )

    async def test_upload_report_returns_deckbrew_url(self) -> None:
        response = FakeResponse(payload={"id": "paste-id"})
        session = FakeSession(response)

        with (
            patch.object(reporting, "ClientSession", return_value=session) as client_session,
            patch.object(reporting.helpers, "user_agent", "Decky/test"),
            patch.object(reporting.helpers, "get_ssl_context", return_value="ssl-context"),
        ):
            result = await self.reporting.upload_report("report contents")

        self.assertEqual(result, "https://lp.deckbrew.xyz/paste-id")
        client_session.assert_called_once_with(timeout=reporting.paste_timeout)
        session.put.assert_called_once_with(
            "https://lp.deckbrew.xyz/",
            data="report contents",
            headers={
                "User-Agent": "Decky/test",
                "Content-Type": "text/plain; charset=utf-8",
            },
            ssl="ssl-context",
        )

    async def test_upload_report_rejects_invalid_body_and_failed_responses(self) -> None:
        with self.assertRaisesRegex(ValueError, "report body"):
            await self.reporting.upload_report(cast(str, None))

        response = FakeResponse(status=502, text="service unavailable")
        with patch.object(reporting, "ClientSession", return_value=FakeSession(response)):
            with self.assertRaisesRegex(RuntimeError, "Paste upload failed"):
                await self.reporting.upload_report("report contents")

    async def test_copy_to_clipboard_uses_first_available_command(self) -> None:
        with (
            patch.object(reporting.shutil, "which", side_effect=fake_which),
            patch.object(reporting.subprocess, "run") as run,
        ):
            await self.reporting.copy_to_clipboard("hello")

        run.assert_called_once_with(["wl-copy"], input=b"hello", check=True)

    async def test_copy_to_clipboard_tries_next_command_and_errors_if_none_work(self) -> None:
        with (
            patch.object(reporting.shutil, "which", side_effect=fake_which),
            patch.object(reporting.subprocess, "run", side_effect=[OSError("failed"), None]) as run,
        ):
            await self.reporting.copy_to_clipboard("hello")

        self.assertEqual(
            run.call_args_list,
            [
                call(["wl-copy"], input=b"hello", check=True),
                call(["xclip", "-selection", "clipboard"], input=b"hello", check=True),
            ],
        )

        with patch.object(reporting.shutil, "which", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "No clipboard utility"):
                await self.reporting.copy_to_clipboard("hello")


if __name__ == "__main__":
    unittest.main()
