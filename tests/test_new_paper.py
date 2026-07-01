from __future__ import annotations

from datetime import date

from tests.support import CliTestCase


class NewPaperCliTests(CliTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.ensure_directory("papers/cards")
        self.ensure_directory("papers/notes")
        self.copy_script("_vault_common.py", "new-paper.py")
        self.copy_template("paper-card.md", "paper-note.md")

    def test_renders_templates_into_both_files_with_trimmed_paper_id_and_mutual_links(
        self,
    ) -> None:
        card_template_path = self.vault_root / "templates/paper-card.md"
        note_template_path = self.vault_root / "templates/paper-note.md"
        card_template_path.write_text(
            card_template_path.read_text(encoding="utf-8").rstrip()
            + "\n\n<!-- card-template-sentinel -->\n",
            encoding="utf-8",
        )
        note_template_path.write_text(
            note_template_path.read_text(encoding="utf-8").rstrip()
            + "\n\n<!-- note-template-sentinel -->\n",
            encoding="utf-8",
        )

        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            " PI07 ",
            "--title",
            "PI0.7",
            "--alphaxiv",
            "https://www.alphaxiv.org/overview/xxxx",
            "--year",
            "2026",
            "--pdf",
            "https://example.com/pi07.pdf",
            "--code",
            "https://github.com/example/pi07",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))

        today = date.today().isoformat()
        card_content = self.read_file("papers/cards/PI07.md")
        note_content = self.read_file("papers/notes/PI07-note.md")

        self.assertIn("<!-- card-template-sentinel -->", card_content)
        self.assertIn("<!-- note-template-sentinel -->", note_content)
        self.assertIn("paper_id: PI07", card_content)
        self.assertIn('title: "PI0.7"', card_content)
        self.assertIn("year: 2026", card_content)
        self.assertIn("alphaxiv: https://www.alphaxiv.org/overview/xxxx", card_content)
        self.assertIn("pdf: https://example.com/pi07.pdf", card_content)
        self.assertIn("code: https://github.com/example/pi07", card_content)
        self.assertIn(f"created: {today}", card_content)
        self.assertIn("[PI0.7 note](../notes/PI07-note.md)", card_content)
        self.assertIn("## Core Insight", card_content)
        self.assertIn("## References", card_content)
        self.assertIn("- AlphaXiv: https://www.alphaxiv.org/overview/xxxx", card_content)
        self.assertIn("- PDF: https://example.com/pi07.pdf", card_content)
        self.assertIn("- Code: https://github.com/example/pi07", card_content)
        self.assertNotIn("{{", card_content)

        self.assertIn("paper_id: PI07", note_content)
        self.assertIn(f"created: {today}", note_content)
        self.assertIn("# PI0.7 Note", note_content)
        self.assertIn("[PI0.7 card](../cards/PI07.md)", note_content)
        self.assertIn("## Reading Notes", note_content)
        self.assertIn("## Follow-up", note_content)
        self.assertNotIn("{{", note_content)

    def test_quotes_titles_that_contain_yaml_sensitive_characters(self) -> None:
        title = 'World Model for Robot Learning: A "Comprehensive" Survey'
        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "wm-survey-2026",
            "--title",
            title,
            "--alphaxiv",
            "https://www.alphaxiv.org/abs/2605.00080v1",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))

        card_content = self.read_file("papers/cards/wm-survey-2026.md")

        self.assertIn(
            'title: "World Model for Robot Learning: A \\"Comprehensive\\" Survey"',
            card_content,
        )
        self.assertIn(f"# {title}", card_content)
        self.assertIn(f"[{title} note](../notes/wm-survey-2026-note.md)", card_content)

    def test_accepts_chinese_paper_ids(self) -> None:
        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "动作空间设计",
            "--title",
            "Demystifying Action Space Design for Robotic Manipulation Policies",
            "--alphaxiv",
            "https://www.alphaxiv.org/abs/2501.09747",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertTrue((self.vault_root / "papers/cards/动作空间设计.md").exists())
        self.assertTrue((self.vault_root / "papers/notes/动作空间设计-note.md").exists())

    def test_fails_when_the_paper_already_exists(self) -> None:
        self.write_file("papers/cards/PI07.md", "")

        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "PI07",
            "--title",
            "PI0.7",
            "--alphaxiv",
            "https://www.alphaxiv.org/overview/xxxx",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Paper already exists: PI07", result.stderr)

    def test_fails_validation_for_paper_ids_that_contain_spaces(self) -> None:
        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "bad id",
            "--title",
            "PI0.7",
            "--alphaxiv",
            "https://www.alphaxiv.org/overview/xxxx",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("PaperId must start with a letter or digit", result.stderr)

    def test_fails_validation_for_whitespace_only_titles(self) -> None:
        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "pi07",
            "--title",
            "   ",
            "--alphaxiv",
            "https://www.alphaxiv.org/overview/xxxx",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Title must not be empty or whitespace", result.stderr)

    def test_fails_validation_for_whitespace_only_alphaxiv_values(self) -> None:
        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "pi07",
            "--title",
            "PI0.7",
            "--alphaxiv",
            "   ",
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("AlphaXiv must not be empty or whitespace", result.stderr)

    def test_writes_generated_markdown_as_utf8_without_a_bom(self) -> None:
        result = self.run_python(
            "scripts/new-paper.py",
            "--paper-id",
            "pi07",
            "--title",
            "PI0.7",
            "--alphaxiv",
            "https://www.alphaxiv.org/overview/xxxx",
        )

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertNoUtf8Bom("papers/cards/pi07.md")
        self.assertNoUtf8Bom("papers/notes/pi07-note.md")
