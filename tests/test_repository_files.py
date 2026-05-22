from __future__ import annotations

import json
import unittest

from tests.support import REPO_ROOT


class RepositoryFileTests(unittest.TestCase):
    def test_code_type_template_contains_required_frontmatter_and_sections(self) -> None:
        content = (REPO_ROOT / "templates" / "code-type.md").read_text(encoding="utf-8")

        self.assertIn("type: code-type", content)
        self.assertIn('code_id: ""', content)
        self.assertIn('title: ""', content)
        self.assertIn("## Why This Matters", content)
        self.assertIn("## Scope", content)
        self.assertIn("## Related Concepts", content)

    def test_code_reading_template_contains_related_code_types_section(self) -> None:
        content = (REPO_ROOT / "templates" / "code-reading.md").read_text(encoding="utf-8")

        self.assertIn("type: code-reading", content)
        self.assertIn('reading_id: ""', content)
        self.assertIn('title: ""', content)
        self.assertIn("## Context", content)
        self.assertIn("## Reading Notes", content)
        self.assertIn("## Related Code Types", content)
        self.assertIn("../types/infra.md", content)

    def test_graph_config_includes_code_paths_and_four_color_groups(self) -> None:
        graph = json.loads(
            (REPO_ROOT / ".obsidian" / "graph.json").read_text(encoding="utf-8")
        )

        self.assertEqual(
            graph["search"],
            "path:/^questions\\// OR path:/^papers\\/cards\\// OR path:/^codes\\/types\\// OR path:/^codes\\/readings\\//",
        )
        self.assertEqual(
            [group["query"] for group in graph["colorGroups"]],
            [
                "path:/^questions\\//",
                "path:/^papers\\/cards\\//",
                "path:/^codes\\/types\\//",
                "path:/^codes\\/readings\\//",
            ],
        )
