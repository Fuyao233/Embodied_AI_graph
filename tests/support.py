from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = REPO_ROOT / "scripts"
TEMPLATES_ROOT = REPO_ROOT / "templates"


class CliTestCase(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.vault_root = Path(self._temp_dir.name)

    def tearDown(self) -> None:
        self._temp_dir.cleanup()

    def ensure_directory(self, relative_path: str) -> Path:
        directory = self.vault_root / relative_path
        directory.mkdir(parents=True, exist_ok=True)
        return directory

    def copy_script(self, *script_names: str) -> None:
        scripts_root = self.ensure_directory("scripts")
        for script_name in script_names:
            shutil.copy2(SCRIPTS_ROOT / script_name, scripts_root / script_name)

    def copy_template(self, *template_names: str) -> None:
        templates_root = self.ensure_directory("templates")
        for template_name in template_names:
            shutil.copy2(TEMPLATES_ROOT / template_name, templates_root / template_name)

    def write_file(self, relative_path: str, content: str) -> Path:
        path = self.vault_root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def read_file(self, relative_path: str) -> str:
        return (self.vault_root / relative_path).read_text(encoding="utf-8")

    def run_python(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, *args],
            cwd=self.vault_root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )

    def assertNoUtf8Bom(self, relative_path: str) -> None:
        content = (self.vault_root / relative_path).read_bytes()
        self.assertFalse(content.startswith(b"\xef\xbb\xbf"))

    def format_process_failure(self, process: subprocess.CompletedProcess) -> str:
        return (
            f"exit={process.returncode}\n"
            f"stdout:\n{process.stdout}\n"
            f"stderr:\n{process.stderr}"
        )
