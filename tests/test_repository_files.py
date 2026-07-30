from __future__ import annotations

import json
import unittest

from tests.support import REPO_ROOT


DEFAULT_GRAPH_FILTER = (
    "path:/^questions\\// OR path:/^papers\\/cards\\// OR "
    "path:/^codes\\/types\\// OR path:/^codes\\/readings\\//"
)
GRAPH_SEARCH_PLUGIN_ID = "global-graph-search"


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
            DEFAULT_GRAPH_FILTER,
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

    def test_persistent_graph_does_not_restore_empty_graph_options(self) -> None:
        source = (
            REPO_ROOT / ".obsidian" / "plugins" / "persistent-graph" / "main.js"
        ).read_text(encoding="utf-8")

        self.assertIn(
            's&&s.hasOwnProperty("search")&&t.view.dataEngine.setOptions',
            source,
        )
        self.assertNotIn(
            'a={};s&&s.hasOwnProperty("search")&&(a=s),t.view.dataEngine.setOptions',
            source,
        )

    def test_global_graph_search_plugin_is_installed_and_enabled(self) -> None:
        plugin_dir = REPO_ROOT / ".obsidian" / "plugins" / GRAPH_SEARCH_PLUGIN_ID
        manifest = json.loads(
            (plugin_dir / "manifest.json").read_text(encoding="utf-8")
        )
        settings = json.loads(
            (plugin_dir / "data.json").read_text(encoding="utf-8")
        )
        enabled_plugins = json.loads(
            (REPO_ROOT / ".obsidian" / "community-plugins.json").read_text(
                encoding="utf-8"
            )
        )

        self.assertEqual(manifest["id"], GRAPH_SEARCH_PLUGIN_ID)
        self.assertEqual(settings["defaultFilter"], DEFAULT_GRAPH_FILTER)
        self.assertIn(GRAPH_SEARCH_PLUGIN_ID, enabled_plugins)
        self.assertTrue((plugin_dir / "main.js").is_file())
        self.assertTrue((plugin_dir / "session-controller.js").is_file())
        self.assertTrue((plugin_dir / "graph-adapter.js").is_file())
