import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import launch


class LauncherTests(unittest.TestCase):
    def make_app(self, root):
        for relative in ("server/app.py", "server/native.py", "server/structure.py",
                         "server/export_structure.py", "server/vendor/VirtuosTerminalBridge.ps1"):
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("", encoding="utf-8")
        (root / 'dist/assets').mkdir(parents=True)
        (root / 'dist/assets/app.js').write_text('console.log("app")', encoding='utf-8')
        (root / 'dist/assets/app.css').write_text('body{}', encoding='utf-8')
        (root / 'dist/index.html').write_text('<title>Signal Studio</title><div id="root"></div>'
            '<link rel="stylesheet" href="/assets/app.css"><script src="/assets/app.js"></script>', encoding='utf-8')

    def test_copied_build_needs_neither_node_nor_npm(self):
        with tempfile.TemporaryDirectory(prefix='Signal Studio ') as directory:
            root = Path(directory)
            self.make_app(root)
            with patch.object(launch.shutil, 'which', return_value=None), patch.object(launch.subprocess, 'run') as command:
                launch.ensure_frontend(root)
                command.assert_not_called()

    def test_missing_hashed_assets_are_not_accepted_as_ready(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_app(root)
            (root / 'dist/assets/app.js').unlink()
            self.assertFalse(launch.frontend_ready(root))
            with patch.object(launch.shutil, 'which', return_value=None):
                with self.assertRaisesRegex(RuntimeError, 'UI-Build'):
                    launch.ensure_frontend(root)

    def test_existing_app_is_reused_and_opened_without_restarting_connection(self):
        with patch.object(launch, 'ensure_frontend'), patch.object(launch, 'probe', return_value='ready'), \
             patch.object(launch.subprocess, 'Popen') as spawn, patch.object(launch.webbrowser, 'open', return_value=True) as browser:
            self.assertEqual(launch.run(Path('copied app'), port=8766), 0)
            spawn.assert_not_called()
            browser.assert_called_once_with('http://127.0.0.1:8766', new=2)

    def test_browser_is_opened_only_after_service_is_ready(self):
        events = []
        child = Mock()
        child.wait.return_value = 0
        child.poll.return_value = 0
        with patch.object(launch, 'ensure_frontend'), patch.object(launch, 'probe', return_value='absent'), \
             patch.object(launch.subprocess, 'Popen', return_value=child), \
             patch.object(launch, 'wait_ready', side_effect=lambda *_: events.append('ready')), \
             patch.object(launch.webbrowser, 'open', side_effect=lambda *_, **__: events.append('browser') or True):
            launch.run(Path('copied app'))
        self.assertEqual(events, ['ready', 'browser'])

    def test_foreign_port_is_not_reused_or_terminated(self):
        with patch.object(launch, 'ensure_frontend'), patch.object(launch, 'probe', return_value='foreign'), \
             patch.object(launch.subprocess, 'Popen') as spawn, patch.object(launch.webbrowser, 'open') as browser:
            with self.assertRaisesRegex(RuntimeError, 'Port 8765'):
                launch.run(Path('app'))
            spawn.assert_not_called()
            browser.assert_not_called()

    def test_start_failure_does_not_open_browser_and_cleans_up_owned_child(self):
        child = Mock()
        child.poll.return_value = None
        with patch.object(launch, 'ensure_frontend'), patch.object(launch, 'probe', return_value='absent'), \
             patch.object(launch.subprocess, 'Popen', return_value=child), \
             patch.object(launch, 'wait_ready', side_effect=RuntimeError('not ready')), \
             patch.object(launch.webbrowser, 'open') as browser:
            with self.assertRaisesRegex(RuntimeError, 'not ready'):
                launch.run(Path('app'))
            browser.assert_not_called()
            child.terminate.assert_called_once()

    def test_readiness_detects_early_server_exit(self):
        child = Mock(returncode=7)
        child.poll.return_value = 7
        with self.assertRaisesRegex(RuntimeError, 'Exitcode 7'):
            launch.wait_ready(child, 'http://127.0.0.1:8765')

    def test_build_failure_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.make_app(root)
            (root / 'package.json').write_text('{}', encoding='utf-8')
            (root / 'src').mkdir()
            with patch.object(launch.shutil, 'which', return_value='npm.cmd'), \
                 patch.object(launch.subprocess, 'run', side_effect=subprocess.CalledProcessError(1, ['npm.cmd', 'ci'])):
                with self.assertRaises(subprocess.CalledProcessError):
                    launch.ensure_frontend(root, rebuild=True)


if __name__ == '__main__':
    unittest.main()
