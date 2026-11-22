"""PC fault injection: python -m unittest discover -s tests -v (from backend)."""
import asyncio
import copy
import json
import subprocess
import sys
import textwrap
import unittest
from hashlib import sha256
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock, patch
from zipfile import ZipFile

from aiohttp import ClientError

from decky_loader.browser import PluginBrowser, PluginInstallContext
from decky_loader.loader import Loader, Plugins
from decky_loader.plugin.plugin import PluginWrapper
from decky_loader.settings import SettingsManager


class PluginUpdateTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.plugin_root = self.root / 'plugins'
        self.old = self.plugin_root / 'original-folder'
        self.old.mkdir(parents=True)
        self.manifest: dict[str, Any] = {'name': 'Example', 'author': 'Test', 'flags': []}
        (self.old / 'plugin.json').write_text(json.dumps(self.manifest))
        (self.old / 'main.py').write_text('old version')
        self.old_contents = self.snapshot()
        self.state: dict[str, Any] = {
            'pluginOrder': ['Before', 'Example', 'After'],
            'disabled_plugins': [], 'hiddenPlugins': ['Example'],
            'frozenPlugins': ['Example'],
        }
        self.settings = MagicMock(spec=SettingsManager)
        def get_setting(key: str, default: Any = None) -> Any:
            return self.state.get(key, default)
        self.settings.getSetting.side_effect = get_setting
        self.settings.setSetting.side_effect = self.state.__setitem__
        self.old_plugin = MagicMock(spec=PluginWrapper)
        self.old_plugin.stop = AsyncMock()
        self.plugins: Plugins = {'Example': cast(PluginWrapper, self.old_plugin)}
        self.loader = MagicMock(spec=Loader)
        self.loader.plugins = self.plugins
        self.loader.watcher = SimpleNamespace(disabled=False)
        self.loader.ws = SimpleNamespace(emit=AsyncMock())
        self.loader.import_plugin = AsyncMock(side_effect=self.load)
        self.browser = PluginBrowser(str(self.plugin_root), self.plugins,
                                     cast(Loader, self.loader), cast(SettingsManager, self.settings))
        permissions = patch.object(self.browser, 'set_plugin_dir_permissions', return_value=True)
        self.permissions = permissions.start()
        self.addCleanup(permissions.stop)
        self.archive = self.root / 'update.zip'
        self.make_zip()

    def snapshot(self) -> dict[str, bytes]:
        return {str(p.relative_to(self.old)): p.read_bytes() for p in self.old.rglob('*') if p.is_file()}

    def make_zip(self, remote: bool = False) -> None:
        package: dict[str, Any] = {'version': '2'}
        if remote:
            package['remote_binary'] = [{'name': 'tool', 'url': 'https://binary.invalid/tool',
                                         'sha256hash': sha256(b'correct binary').hexdigest()}]
        with ZipFile(self.archive, 'w') as archive:
            archive.writestr('new-folder/plugin.json', json.dumps(self.manifest))
            archive.writestr('new-folder/package.json', json.dumps(package))
            archive.writestr('new-folder/main.py', 'new version')

    async def load(self, file: str, folder: str, *, ensure_started: bool = False) -> None:
        self.assertTrue(ensure_started)
        self.assertEqual(folder, 'original-folder')
        self.assertTrue(self.loader.watcher.disabled)
        plugin = MagicMock(spec=PluginWrapper)
        plugin.disabled = 'Example' in self.state['disabled_plugins']
        plugin.stop = AsyncMock()
        self.plugins['Example'] = cast(PluginWrapper, plugin)
        self.assertTrue(Path(file).is_file())

    async def install(self, artifact: str, name: str = 'Example', version: str = '2', digest: str = '') -> None:
        self.browser.install_requests['test'] = PluginInstallContext(artifact, name, version, digest)
        await self.browser.confirm_plugin_install('test')

    async def update(self, digest: str = '', version: str = '2') -> None:
        await self.install(self.archive.as_uri(), version=version, digest=digest)

    def assert_clean(self, disabled: bool = False) -> None:
        self.assertEqual(self.loader.watcher.disabled, disabled)
        self.assertEqual(list(self.root.glob('.decky-install-*')), [])

    def assert_untouched(self) -> None:
        self.assertEqual(self.snapshot(), self.old_contents)
        self.assertIs(self.plugins['Example'], self.old_plugin)
        self.old_plugin.stop.assert_not_awaited()
        self.loader.import_plugin.assert_not_awaited()
        self.settings.setSetting.assert_not_called()
        self.assert_clean()

    async def test_sha_mismatch(self) -> None:
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            await self.update('incorrect')
        self.assert_untouched()

    async def test_corrupt_zip(self) -> None:
        self.archive.write_bytes(b'not a zip')
        with self.assertRaises(Exception):
            await self.update()
        self.assert_untouched()

    async def test_extraction_failure(self) -> None:
        with patch.object(ZipFile, 'extractall', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                await self.update()
        self.assert_untouched()

    async def test_remote_binary_network_failure(self) -> None:
        self.make_zip(remote=True)
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.get = AsyncMock(side_effect=ClientError('offline'))
        with patch('decky_loader.helpers.ClientSession', return_value=client):
            with self.assertRaisesRegex(RuntimeError, 'remote binaries'):
                await self.update()
        self.assert_untouched()

    async def test_remote_binary_hash_mismatch(self) -> None:
        self.make_zip(remote=True)
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.get = AsyncMock(return_value=SimpleNamespace(status=200, read=AsyncMock(return_value=b'wrong binary')))
        with patch('decky_loader.helpers.ClientSession', return_value=client):
            with self.assertRaisesRegex(RuntimeError, 'remote binaries'):
                await self.update()
        self.assert_untouched()

    async def test_permissions_failure(self) -> None:
        self.permissions.return_value = False
        with self.assertRaisesRegex(RuntimeError, 'permissions'):
            await self.update()
        self.assert_untouched()

    async def test_success_and_settings_preservation(self) -> None:
        before = copy.deepcopy(self.state)
        await self.update(sha256(self.archive.read_bytes()).hexdigest())
        self.assertEqual((self.old / 'main.py').read_text(), 'new version')
        self.assertIsNot(self.plugins['Example'], self.old_plugin)
        self.old_plugin.stop.assert_awaited_once_with()
        self.assertEqual(self.state, before)
        self.settings.setSetting.assert_not_called()
        self.assert_clean()

    async def test_disabled_state_survives(self) -> None:
        self.state['disabled_plugins'] = ['Example']
        await self.test_success_and_settings_preservation()
        self.assertTrue(self.plugins['Example'].disabled)

    async def test_dev_update_resolves_existing_plugin_after_reading_manifest(self) -> None:
        await self.install(self.archive.as_uri(), 'No name', 'dev')
        self.assertEqual((self.old / 'main.py').read_text(), 'new version')
        self.assert_clean()

    async def test_load_failure_restores_and_reloads_old(self) -> None:
        async def fail_new(file: str, folder: str, *, ensure_started: bool = False) -> None:
            if Path(file).read_text() == 'new version':
                await self.load(file, folder, ensure_started=ensure_started)
                raise RuntimeError('startup failed')
            await self.load(file, folder, ensure_started=ensure_started)
        self.loader.import_plugin.side_effect = fail_new
        before = copy.deepcopy(self.state)
        with self.assertRaisesRegex(RuntimeError, 'startup failed'):
            await self.update()
        self.assertEqual(self.snapshot(), self.old_contents)
        self.assertEqual(self.loader.import_plugin.await_count, 2)
        self.assertEqual(self.state, before)
        self.assert_clean()

    async def test_swap_failure_restores_old(self) -> None:
        from os import rename
        def fail_swap(source: str, target: str) -> None:
            if 'staged' in source:
                raise OSError('rename failed')
            rename(source, target)
        with patch('decky_loader.browser.rename', side_effect=fail_swap):
            with self.assertRaisesRegex(OSError, 'rename failed'):
                await self.update()
        self.assertEqual(self.snapshot(), self.old_contents)
        self.loader.import_plugin.assert_awaited_once()
        self.assert_clean()

    async def test_watcher_already_disabled(self) -> None:
        self.loader.watcher.disabled = True
        await self.update()
        self.assert_clean(disabled=True)

    async def test_cancelled_load_rolls_back(self) -> None:
        self.loader.import_plugin.side_effect = [asyncio.CancelledError(), None]
        with self.assertRaises(asyncio.CancelledError):
            await self.update()
        self.assertEqual(self.snapshot(), self.old_contents)
        self.assert_clean()

    async def test_staging_is_outside_watcher(self) -> None:
        def check_stage(directory: str) -> bool:
            self.assertFalse(Path(directory).is_relative_to(self.plugin_root))
            self.assertEqual(self.snapshot(), self.old_contents)
            self.old_plugin.stop.assert_not_awaited()
            return True
        self.permissions.side_effect = check_stage
        await self.update()
        self.assert_clean()

    async def test_unsafe_zip_entry(self) -> None:
        with ZipFile(self.archive, 'a') as archive:
            archive.writestr('new-folder/../../plugins/original-folder/main.py', 'destroyed')
        with self.assertRaisesRegex(ValueError, 'Invalid ZIP entry'):
            await self.update()
        self.assert_untouched()

    async def test_remote_zip_uses_same_transaction(self) -> None:
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.get = AsyncMock(return_value=SimpleNamespace(status=200, read=AsyncMock(return_value=self.archive.read_bytes())))
        client.post = AsyncMock(return_value=SimpleNamespace(status=200))
        with patch('decky_loader.browser.ClientSession', return_value=client):
            with self.assertRaisesRegex(ValueError, 'SHA-256'):
                await self.install('https://zip.invalid/update.zip', digest='wrong')
        self.assert_untouched()

    async def test_remote_binary_success_is_staged(self) -> None:
        self.make_zip(remote=True)
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.get = AsyncMock(return_value=SimpleNamespace(status=200, read=AsyncMock(return_value=b'correct binary')))
        with patch('decky_loader.helpers.ClientSession', return_value=client):
            await self.update()
        self.assertEqual((self.old / 'bin/tool').read_bytes(), b'correct binary')
        self.assert_clean()

    async def test_reload_failure_still_restores_files(self) -> None:
        self.loader.import_plugin.side_effect = RuntimeError('load failed')
        with self.assertRaisesRegex(RuntimeError, 'load failed'):
            await self.update()
        self.assertEqual(self.snapshot(), self.old_contents)
        self.assert_clean()

    async def test_disabled_watcher_survives_failure(self) -> None:
        self.loader.watcher.disabled = True
        with self.assertRaisesRegex(ValueError, 'SHA-256'):
            await self.update('wrong')
        self.assert_clean(disabled=True)

    async def test_without_watcher(self) -> None:
        self.loader.watcher = None
        async def load_without_watcher(file: str, folder: str, *, ensure_started: bool = False) -> None:
            self.assertTrue(ensure_started)
            self.assertTrue(Path(file).is_file())
        self.loader.import_plugin.side_effect = load_without_watcher
        await self.update()
        self.assertEqual((self.old / 'main.py').read_text(), 'new version')
        self.assertEqual(list(self.root.glob('.decky-install-*')), [])

    async def test_rollback_failure_retains_backup(self) -> None:
        from os import rename
        def fail_restore(source: str, target: str) -> None:
            if source.endswith('previous'):
                raise OSError('restore failed')
            rename(source, target)
        self.loader.import_plugin.side_effect = RuntimeError('load failed')
        with patch('decky_loader.browser.rename', side_effect=fail_restore):
            with self.assertRaisesRegex(OSError, 'restore failed'):
                await self.update()
        backups = list(self.root.glob('.decky-install-*/previous/main.py'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_text(), 'old version')
        self.assertFalse(self.loader.watcher.disabled)


class LoaderStartupTests(unittest.IsolatedAsyncioTestCase):
    async def test_import_failure_propagates_only_when_requested(self) -> None:
        loader = Loader.__new__(Loader)
        loader.plugin_path = "/unused"
        loader.context = cast(Any, SimpleNamespace())
        loader.logger = MagicMock()
        with patch('decky_loader.loader.PluginWrapper', side_effect=ValueError('bad manifest')):
            with self.assertRaisesRegex(ValueError, 'bad manifest'):
                await loader.import_plugin('main.py', 'example', ensure_started=True)
            await loader.import_plugin('main.py', 'example')

    async def test_start_failure_propagates(self) -> None:
        loader = Loader.__new__(Loader)
        loader.plugin_path = "/unused"
        loader.context = cast(Any, SimpleNamespace())
        loader.logger = MagicMock()
        loader.plugins = {}
        wrapper = MagicMock()
        wrapper.name = 'Example'
        wrapper.passive = False
        wrapper.start.return_value = wrapper
        wrapper.wait_started = AsyncMock(side_effect=RuntimeError('backend exited'))
        with patch('decky_loader.loader.PluginWrapper', return_value=wrapper):
            with self.assertRaisesRegex(RuntimeError, 'backend exited'):
                await loader.import_plugin('main.py', 'example', ensure_started=True)
        wrapper.wait_started.assert_awaited_once()

    async def test_disabled_import_never_starts(self) -> None:
        loader = Loader.__new__(Loader)
        loader.plugin_path = "/unused"
        loader.context = cast(Any, SimpleNamespace())
        loader.logger = MagicMock()
        loader.context = cast(Any, SimpleNamespace(utilities=SimpleNamespace(get_setting=AsyncMock(return_value=['Example']))))
        loader.plugins = {}
        wrapper = MagicMock()
        wrapper.name = 'Example'
        with patch('decky_loader.loader.PluginWrapper', return_value=wrapper):
            await loader.import_plugin('main.py', 'example', ensure_started=True)
        self.assertTrue(wrapper.disabled)
        wrapper.start.assert_not_called()
        wrapper.wait_started.assert_not_called()

    async def test_wait_started_detects_dead_backend(self) -> None:
        wrapper = PluginWrapper.__new__(PluginWrapper)
        wrapper.passive = False
        wrapper.disabled = False
        wrapper.proc = None
        wrapper.name = 'Example'
        with self.assertRaisesRegex(RuntimeError, 'exited during startup'):
            await wrapper.wait_started()

    async def test_wait_started_detects_timeout(self) -> None:
        wrapper = PluginWrapper.__new__(PluginWrapper)
        wrapper.passive = False
        wrapper.disabled = False
        wrapper.proc = MagicMock()
        wrapper.name = 'Example'
        wrapper._socket = cast(Any, SimpleNamespace(writer=None))  # pyright: ignore[reportPrivateUsage]
        with patch('decky_loader.plugin.plugin.time', side_effect=[0, 0, 21]), \
             patch('decky_loader.plugin.plugin.sleep', new_callable=AsyncMock):
            with self.assertRaises(TimeoutError):
                await wrapper.wait_started()

    async def test_wait_started_accepts_live_backend_with_ipc(self) -> None:
        wrapper = PluginWrapper.__new__(PluginWrapper)
        wrapper.passive = False
        wrapper.disabled = False
        wrapper.proc = MagicMock()
        wrapper._socket = cast(Any, SimpleNamespace(writer=object()))  # pyright: ignore[reportPrivateUsage]
        await wrapper.wait_started()


class SandboxInitializationTests(unittest.TestCase):
    def run_backend(self, source: str) -> subprocess.CompletedProcess[str]:
        # An isolated interpreter keeps sandbox environment/module changes out of
        # the test runner. All privilege and platform operations are mocked.
        with TemporaryDirectory() as directory:
            file = Path(directory) / 'main.py'
            file.write_text(source)
            script = textwrap.dedent("""
                import sys
                import asyncio
                from types import ModuleType
                from unittest.mock import AsyncMock, MagicMock, patch
                from decky_loader.plugin import sandboxed_plugin as sandbox
                decky = ModuleType('decky')
                decky.emit = AsyncMock()
                sys.modules['decky_loader.plugin.imports.decky'] = decky
                socket = MagicMock()
                socket.setup_server = AsyncMock()
                plugin = sandbox.SandboxedPlugin('Test', False, [], sys.argv[1],
                                                 'test', sys.argv[2], '1', 'Test', 1)
                loop_calls = 0
                original = asyncio.BaseEventLoop.run_forever
                def run_once(loop):
                    global loop_calls
                    loop_calls += 1
                    if loop_calls <= (2 if '_migration' in open(sys.argv[1]).read() else 1):
                        original(loop)
                with patch.multiple(sandbox, setproctitle=MagicMock(), setthreadtitle=MagicMock(),
                                    setgid=MagicMock(), setuid=MagicMock(), ON_LINUX=False,
                                    get_home_path=MagicMock(return_value=sys.argv[2]),
                                    get_username=MagicMock(return_value='test')), \
                     patch.object(sandbox.helpers, 'get_homebrew_path', return_value=sys.argv[2]), \
                     patch('asyncio.BaseEventLoop.run_forever', run_once):
                    try:
                        plugin.initialize(socket)
                    except SystemExit:
                        sys.exit(3)
                socket.setup_server.assert_awaited_once()
            """)
            return subprocess.run([sys.executable, '-c', script, str(file), directory],
                                  capture_output=True, text=True, timeout=10)

    def test_import_exception_never_advertises_ready(self) -> None:
        result = self.run_backend('raise RuntimeError("import failed")')
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn('import failed', result.stderr)

    def test_migration_exception_never_advertises_ready(self) -> None:
        result = self.run_backend('class Plugin:\n    async def _migration(self):\n        raise RuntimeError("migration failed")')
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn('migration failed', result.stderr)

    def test_immediate_main_exception_never_advertises_ready(self) -> None:
        result = self.run_backend('class Plugin:\n    async def _main(self):\n        raise RuntimeError("main failed")')
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn('main failed', result.stderr)

    def test_initialized_backend_advertises_ready(self) -> None:
        result = self.run_backend('class Plugin:\n    async def _main(self):\n        pass')
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
