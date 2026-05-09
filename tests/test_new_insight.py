from __future__ import annotations

import shutil
from datetime import date

from tests.support import CliTestCase


class NewInsightCliTests(CliTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.ensure_directory("insights")
        self.copy_script("_vault_common.py", "new-insight.py")
        self.copy_template("insight.md")

    def test_renders_the_template_into_an_insight_file_with_normalized_lowercase_id(
        self,
    ) -> None:
        template_path = self.vault_root / "templates/insight.md"
        template_path.write_text(
            template_path.read_text(encoding="utf-8").rstrip()
            + "\n\n<!-- insight-template-sentinel -->\n",
            encoding="utf-8",
        )

        result = self.run_python(
            "scripts/new-insight.py",
            "--insight-id",
            " Pretrain-Not-Fully-Converged ",
            "--claim",
            "Pretraining need not fully converge for downstream performance",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))

        today = date.today().isoformat()
        insight_content = self.read_file(
            "insights/pretrain-not-fully-converged.md"
        )

        self.assertIn("<!-- insight-template-sentinel -->", insight_content)
        self.assertIn("type: insight", insight_content)
        self.assertIn("insight_id: pretrain-not-fully-converged", insight_content)
        self.assertIn(f"created: {today}", insight_content)
        self.assertIn(
            "# Pretraining need not fully converge for downstream performance",
            insight_content,
        )
        self.assertIn("## Evidence", insight_content)
        self.assertNotIn("{{", insight_content)

    def test_fails_when_the_insight_already_exists(self) -> None:
        self.write_file("insights/pretrain-not-fully-converged.md", "")

        result = self.run_python(
            "scripts/new-insight.py",
            "--insight-id",
            "Pretrain-Not-Fully-Converged",
            "--claim",
            "Pretraining need not fully converge for downstream performance",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Insight already exists: pretrain-not-fully-converged", result.stderr)

    def test_fails_validation_for_invalid_insight_ids(self) -> None:
        result = self.run_python(
            "scripts/new-insight.py",
            "--insight-id",
            "bad id",
            "--claim",
            "Pretraining need not fully converge for downstream performance",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("InsightId must match ^[a-z0-9][a-z0-9.-]*$", result.stderr)

    def test_fails_validation_for_whitespace_only_claims(self) -> None:
        result = self.run_python(
            "scripts/new-insight.py",
            "--insight-id",
            "pretrain-not-fully-converged",
            "--claim",
            "   ",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Claim must not be empty or whitespace", result.stderr)

    def test_writes_generated_markdown_as_utf8_without_a_bom(self) -> None:
        result = self.run_python(
            "scripts/new-insight.py",
            "--insight-id",
            "pretrain-not-fully-converged",
            "--claim",
            "Pretraining need not fully converge for downstream performance",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertNoUtf8Bom("insights/pretrain-not-fully-converged.md")

    def test_creates_the_insights_directory_when_it_does_not_exist_yet(self) -> None:
        shutil.rmtree(self.vault_root / "insights")

        result = self.run_python(
            "scripts/new-insight.py",
            "--insight-id",
            "pretrain-not-fully-converged",
            "--claim",
            "Pretraining need not fully converge for downstream performance",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertTrue((self.vault_root / "insights").is_dir())
        self.assertTrue(
            (self.vault_root / "insights/pretrain-not-fully-converged.md").exists()
        )
