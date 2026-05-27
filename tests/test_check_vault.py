from __future__ import annotations

from tests.support import CliTestCase


def canonical_card_content(paper_id: str, title: str) -> str:
    return f"""---
type: paper-card
paper_id: {paper_id}
title: {title}
---

# {title}

## Navigation
- Paper note: [{title} note](../notes/{paper_id}-note.md)
"""


def canonical_note_content(paper_id: str, title: str) -> str:
    return f"""---
type: paper-note
paper_id: {paper_id}
---

# {title} Note

## Navigation
- Paper card: [{title} card](../cards/{paper_id}.md)
"""


def canonical_code_type_content(code_id: str, title: str) -> str:
    return f"""---
type: code-type
code_id: {code_id}
title: {title}
---

# {title}

## Why This Matters
"""


def canonical_code_reading_content(reading_id: str, title: str, *code_ids: str) -> str:
    related_lines = "\n".join(
        f"- [{code_id}](../types/{code_id}.md)" for code_id in code_ids
    )
    return f"""---
type: code-reading
reading_id: {reading_id}
title: {title}
---

# {title}

## Context

## Reading Notes
- [PI0.7 card](../../papers/cards/pi07.md)

## Related Code Types
{related_lines}

## Follow-up
"""


class CheckVaultCliTests(CliTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.ensure_directory("papers/cards")
        self.ensure_directory("papers/notes")
        self.ensure_directory("questions")
        self.ensure_directory("codes/types")
        self.ensure_directory("codes/readings")
        self.copy_script("_vault_common.py", "check-vault.py")

    def run_check(self):
        return self.run_python("scripts/check-vault.py")

    def test_passes_for_a_canonical_isolated_vault(self) -> None:
        self.write_file("papers/cards/PI07.md", canonical_card_content("PI07", "PI0.7"))
        self.write_file(
            "papers/notes/PI07-note.md",
            canonical_note_content("PI07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7](../papers/cards/PI07.md)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertEqual(result.stdout.strip(), "Vault check passed.")

    def test_detects_a_missing_note_for_a_card(self) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Missing note for card: pi07", result.stdout)
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_missing_mutual_links_between_a_card_and_its_note(self) -> None:
        self.write_file(
            "papers/cards/pi07.md",
            """---
type: paper-card
paper_id: pi07
title: PI0.7
---

# PI0.7
""",
        )
        self.write_file(
            "papers/notes/pi07-note.md",
            """---
type: paper-note
paper_id: pi07
---

# PI0.7 Note
""",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Card missing note link: pi07", result.stdout)
        self.assertIn("[ERROR] Note missing card link: pi07", result.stdout)
        self.assertIn("Vault check failed with 2 issue(s).", result.stdout)

    def test_rejects_plain_text_target_mentions_that_are_not_markdown_links(self) -> None:
        self.write_file(
            "papers/cards/pi07.md",
            """---
type: paper-card
paper_id: pi07
title: PI0.7
---

# PI0.7

Reference path: ../notes/pi07-note.md
""",
        )
        self.write_file(
            "papers/notes/pi07-note.md",
            """---
type: paper-note
paper_id: pi07
---

# PI0.7 Note

Reference path: ../cards/pi07.md
""",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Card missing note link: pi07", result.stdout)
        self.assertIn("[ERROR] Note missing card link: pi07", result.stdout)
        self.assertIn("Vault check failed with 2 issue(s).", result.stdout)

    def test_detects_a_missing_card_for_a_note(self) -> None:
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Missing card for note: pi07", result.stdout)
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_missing_required_card_frontmatter(self) -> None:
        self.write_file(
            "papers/cards/pi07.md",
            """---
type: paper-card
paper_id: pi07
---

# PI0.7

## Navigation
- Paper note: [PI0.7 note](../notes/pi07-note.md)
""",
        )
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Card missing required frontmatter: pi07.md", result.stdout)
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_unquoted_titles_that_break_yaml_frontmatter(self) -> None:
        self.write_file(
            "papers/cards/pi07.md",
            """---
type: paper-card
paper_id: pi07
title: World Model for Robot Learning: A Comprehensive Survey
---

# World Model for Robot Learning: A Comprehensive Survey

## Navigation
- Paper note: [World Model for Robot Learning: A Comprehensive Survey note](../notes/pi07-note.md)
""",
        )
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "World Model for Robot Learning: A Comprehensive Survey"),
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Card missing required frontmatter: pi07.md", result.stdout)
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_non_canonical_question_targets(self) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7 note](../papers/notes/pi07-note.md)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Question contains non-canonical paper target: tracking.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_question_links_to_cards_outside_the_canonical_papers_path(
        self,
    ) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7](../cards/pi07.md)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Question contains non-canonical paper target: tracking.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_question_links_to_notes_outside_the_canonical_papers_path(
        self,
    ) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7 note](../notes/pi07-note.md)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Question contains non-canonical paper target: tracking.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_question_links_to_non_canonical_markdown_targets_with_fragments(
        self,
    ) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7 note section](../notes/pi07-note.md#section)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Question contains non-canonical paper target: tracking.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_question_links_to_windows_absolute_local_markdown_targets(
        self,
    ) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7 external copy](C:\\temp\\foo.md)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Question contains non-canonical paper target: tracking.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_question_links_to_canonical_paper_cards_with_fragments(
        self,
    ) -> None:
        self.write_file("papers/cards/pi07.md", canonical_card_content("pi07", "PI0.7"))
        self.write_file(
            "papers/notes/pi07-note.md",
            canonical_note_content("pi07", "PI0.7"),
        )
        self.write_file(
            "questions/tracking.md",
            "# Tracking\n\n## Related Papers\n- [PI0.7 section](../papers/cards/pi07.md#section)\n",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Question contains non-canonical paper target: tracking.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_passes_for_code_reading_with_multiple_canonical_code_type_links(self) -> None:
        self.write_file("codes/types/Infra.md", canonical_code_type_content("Infra", "Infra"))
        self.write_file("codes/types/VLA.md", canonical_code_type_content("VLA", "VLA"))
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            canonical_code_reading_content(
                "openvla-data-pipeline",
                "OpenVLA Data Pipeline",
                "Infra",
                "VLA",
            ),
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertEqual(result.stdout.strip(), "Vault check passed.")

    def test_detects_missing_required_code_type_frontmatter(self) -> None:
        self.write_file(
            "codes/types/infra.md",
            """---
type: code-type
code_id: infra
---

# Infra
""",
        )
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            canonical_code_reading_content(
                "openvla-data-pipeline",
                "OpenVLA Data Pipeline",
                "infra",
            ),
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn("[ERROR] Code type missing required frontmatter: infra.md", result.stdout)
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_missing_required_code_reading_frontmatter(self) -> None:
        self.write_file("codes/types/infra.md", canonical_code_type_content("infra", "Infra"))
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            """---
type: code-reading
reading_id: openvla-data-pipeline
---

# OpenVLA Data Pipeline

## Related Code Types
- [Infra](../types/infra.md)
""",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Code reading missing required frontmatter: openvla-data-pipeline.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_code_reading_without_any_code_type_link(self) -> None:
        self.write_file("codes/types/infra.md", canonical_code_type_content("infra", "Infra"))
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            """---
type: code-reading
reading_id: openvla-data-pipeline
title: OpenVLA Data Pipeline
---

# OpenVLA Data Pipeline

## Related Code Types

## Follow-up
""",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Code reading missing code-type link: openvla-data-pipeline.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_detects_non_canonical_code_type_targets(self) -> None:
        self.write_file("codes/types/infra.md", canonical_code_type_content("infra", "Infra"))
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            """---
type: code-reading
reading_id: openvla-data-pipeline
title: OpenVLA Data Pipeline
---

# OpenVLA Data Pipeline

## Related Code Types
- [Infra](../infra.md)
""",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 1, self.format_process_failure(result))
        self.assertIn(
            "[ERROR] Code reading contains non-canonical code-type target: openvla-data-pipeline.md",
            result.stdout,
        )
        self.assertIn("Vault check failed with 1 issue(s).", result.stdout)

    def test_ignores_non_code_type_local_links_outside_related_code_types_section(
        self,
    ) -> None:
        self.write_file("codes/types/infra.md", canonical_code_type_content("infra", "Infra"))
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            """---
type: code-reading
reading_id: openvla-data-pipeline
title: OpenVLA Data Pipeline
---

# OpenVLA Data Pipeline

## Reading Notes
- [PI0.7 card](../../papers/cards/pi07.md)

## Related Code Types
- [Infra](../types/infra.md)
""",
        )

        result = self.run_check()

        self.assertEqual(result.returncode, 0, self.format_process_failure(result))
        self.assertEqual(result.stdout.strip(), "Vault check passed.")
