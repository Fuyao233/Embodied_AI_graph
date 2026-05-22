# Code Reading Note Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `code-type` and `code-reading` note support so code-reading notes become first-class graph nodes, with templates, graph configuration, and vault validation that mirror the existing paper workflow without changing it.

**Architecture:** Extend the current Markdown-first vault in parallel with the paper subsystem. Keep `questions -> papers/cards` unchanged, add a second structural path `codes/readings -> codes/types`, and enforce the new rules through templates, `check-vault.py`, and focused regression tests rather than through a new scaffold CLI.

**Tech Stack:** Python standard library (`pathlib`, `re`, `json`, `unittest`), Markdown templates, Obsidian `.json` configuration, repository-level documentation in `README.md`

---

## File Structure

**Files to create**

- `templates/code-type.md`
- `templates/code-reading.md`
- `tests/test_repository_files.py`

**Files to modify**

- `.obsidian/graph.json`
- `scripts/_vault_common.py`
- `scripts/check-vault.py`
- `tests/test_check_vault.py`
- `README.md`

**Current worktree constraints**

- `README.md` already has unstaged user edits; merge the code-note documentation into those edits instead of overwriting them
- `papers/cards/robotwin.md` and `papers/notes/robotwin-note.md` are untracked user files; do not edit, stage, or revert them as part of this feature
- `python scripts/check-vault.py` already fails on the current repository because of a pre-existing `papers/cards/mem.md` frontmatter issue; use targeted regression tests as the execution gate for this feature instead of requiring the live vault to be clean

### Task 1: Add static repository tests for code templates and graph scope

**Files:**
- Create: `tests/test_repository_files.py`
- Create: `templates/code-type.md`
- Create: `templates/code-reading.md`
- Modify: `.obsidian/graph.json`
- Test: `tests/test_repository_files.py`

- [ ] **Step 1: Write the failing repository file tests**

Create `tests/test_repository_files.py` with these assertions:

```python
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
        graph = json.loads((REPO_ROOT / ".obsidian" / "graph.json").read_text(encoding="utf-8"))

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
```

- [ ] **Step 2: Run the repository file tests to verify they fail**

Run:

```powershell
python -m unittest tests.test_repository_files -v
```

Expected:

- `FileNotFoundError` for `templates/code-type.md`
- `FileNotFoundError` for `templates/code-reading.md`
- one `FAIL` because `.obsidian/graph.json` still only includes `questions` and `papers/cards`

- [ ] **Step 3: Create the `code-type` template**

Add `templates/code-type.md` with this exact content:

```md
---
type: code-type
code_id: ""
title: ""
---

# {{title}}

## Why This Matters

## Scope

## Related Concepts
- 
```

- [ ] **Step 4: Create the `code-reading` template**

Add `templates/code-reading.md` with this exact content:

```md
---
type: code-reading
reading_id: ""
title: ""
---

# {{title}}

## Context

## Reading Notes

## Related Code Types
- Example: `[Infra](../types/infra.md)`

## Follow-up
- 
```

- [ ] **Step 5: Expand the global graph to include the code subsystem**

Replace `.obsidian/graph.json` with this content:

```json
{
  "collapse-filter": true,
  "search": "path:/^questions\\// OR path:/^papers\\/cards\\// OR path:/^codes\\/types\\// OR path:/^codes\\/readings\\//",
  "showTags": false,
  "showAttachments": false,
  "hideUnresolved": false,
  "showOrphans": true,
  "collapse-color-groups": false,
  "colorGroups": [
    {
      "query": "path:/^questions\\//",
      "color": {
        "a": 1,
        "rgb": 3381759
      }
    },
    {
      "query": "path:/^papers\\/cards\\//",
      "color": {
        "a": 1,
        "rgb": 16750848
      }
    },
    {
      "query": "path:/^codes\\/types\\//",
      "color": {
        "a": 1,
        "rgb": 4236116
      }
    },
    {
      "query": "path:/^codes\\/readings\\//",
      "color": {
        "a": 1,
        "rgb": 13662033
      }
    }
  ],
  "collapse-display": false,
  "showArrow": false,
  "textFadeMultiplier": -1.1,
  "nodeSizeMultiplier": 2.12612456747405,
  "lineSizeMultiplier": 2.55,
  "collapse-forces": false,
  "centerStrength": 0.317708333333333,
  "repelStrength": 12.8125,
  "linkStrength": 0.46875,
  "linkDistance": 436,
  "scale": 0.36288736930120946,
  "close": true
}
```

- [ ] **Step 6: Run the repository file tests again**

Run:

```powershell
python -m unittest tests.test_repository_files -v
```

Expected: all three tests pass.

- [ ] **Step 7: Commit the static repository changes**

Run:

```powershell
git add templates/code-type.md templates/code-reading.md .obsidian/graph.json tests/test_repository_files.py
git commit -m "feat: add code note templates and graph scope"
```

Expected: one commit containing the two templates, the graph config update, and the new repository file test.

### Task 2: Add failing vault-check regression tests for the code subsystem

**Files:**
- Modify: `tests/test_check_vault.py`
- Test: `tests/test_check_vault.py`

- [ ] **Step 1: Extend the test fixture for code directories**

In `CheckVaultCliTests.setUp`, add the two new directories before copying scripts:

```python
    def setUp(self) -> None:
        super().setUp()
        self.ensure_directory("papers/cards")
        self.ensure_directory("papers/notes")
        self.ensure_directory("questions")
        self.ensure_directory("codes/types")
        self.ensure_directory("codes/readings")
        self.copy_script("_vault_common.py", "check-vault.py")
```

- [ ] **Step 2: Add canonical content helpers for `code-type` and `code-reading`**

Insert these helper functions near `canonical_card_content` and `canonical_note_content`:

```python
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
```

- [ ] **Step 3: Add failing regression tests for valid and invalid code-note structures**

Add these test methods to `CheckVaultCliTests`:

```python
    def test_passes_for_code_reading_with_multiple_canonical_code_type_links(self) -> None:
        self.write_file("codes/types/infra.md", canonical_code_type_content("infra", "Infra"))
        self.write_file("codes/types/vla.md", canonical_code_type_content("vla", "VLA"))
        self.write_file(
            "codes/readings/openvla-data-pipeline.md",
            canonical_code_reading_content(
                "openvla-data-pipeline",
                "OpenVLA Data Pipeline",
                "infra",
                "vla",
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
            canonical_code_reading_content("openvla-data-pipeline", "OpenVLA Data Pipeline", "infra"),
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

    def test_ignores_non_code_type_local_links_outside_related_code_types_section(self) -> None:
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
```

- [ ] **Step 4: Run the vault-check tests to verify the new cases fail**

Run:

```powershell
python -m unittest tests.test_check_vault -v
```

Expected:

- the existing paper tests still pass
- the new `code-type` and `code-reading` error tests fail because `scripts/check-vault.py` does not inspect `codes/types` or `codes/readings` yet

### Task 3: Implement `code-type` and `code-reading` validation

**Files:**
- Modify: `scripts/_vault_common.py`
- Modify: `scripts/check-vault.py`
- Test: `tests/test_check_vault.py`

- [ ] **Step 1: Add reusable titled-frontmatter helpers and a section extractor**

In `scripts/_vault_common.py`, replace the current `has_required_card_frontmatter` implementation with these helpers and wrappers:

```python
def has_required_titled_frontmatter(
    content: str,
    *,
    expected_type: str,
    identifier_key: str,
) -> bool:
    match = FRONTMATTER_PATTERN.match(content)
    if match is None:
        return False

    frontmatter = match.group(1)
    has_required_type = (
        re.search(rf"(?mi)^type:\s*{re.escape(expected_type)}\s*$", frontmatter)
        is not None
    )
    has_identifier = (
        re.search(rf"(?mi)^{re.escape(identifier_key)}:\s*\S.*$", frontmatter)
        is not None
    )
    title_match = re.search(r"(?mi)^title:\s*(.*)$", frontmatter)
    has_title = title_match is not None and is_valid_yaml_scalar(title_match.group(1))
    return has_required_type and has_identifier and has_title


def has_required_card_frontmatter(content: str) -> bool:
    return has_required_titled_frontmatter(
        content,
        expected_type="paper-card",
        identifier_key="paper_id",
    )


def has_required_code_type_frontmatter(content: str) -> bool:
    return has_required_titled_frontmatter(
        content,
        expected_type="code-type",
        identifier_key="code_id",
    )


def has_required_code_reading_frontmatter(content: str) -> bool:
    return has_required_titled_frontmatter(
        content,
        expected_type="code-reading",
        identifier_key="reading_id",
    )


def extract_markdown_section(content: str, heading: str) -> str:
    escaped_heading = re.escape(heading)
    match = re.search(
        rf"(?ms)^##\s+{escaped_heading}\s*$\r?\n(.*?)(?=^##\s+|\Z)",
        content,
    )
    return match.group(1) if match is not None else ""
```

- [ ] **Step 2: Extend `check-vault.py` to scan the new directories and enforce canonical code-type links**

Update `scripts/check-vault.py` as follows.

First, extend the imports:

```python
from _vault_common import (
    extract_markdown_link_targets,
    extract_markdown_section,
    has_required_card_frontmatter,
    has_required_code_reading_frontmatter,
    has_required_code_type_frontmatter,
    is_local_markdown_file_target,
    list_markdown_files,
    repo_root_from,
)
```

Then add the new canonical pattern and helper functions near `CANONICAL_QUESTION_TARGET_PATTERN`:

```python
CANONICAL_CODE_TYPE_TARGET_PATTERN = re.compile(
    r"^\.\./types/[a-z0-9][a-z0-9.-]*\.md$"
)


def extract_related_code_type_targets(content: str) -> List[str]:
    related_code_types_content = extract_markdown_section(content, "Related Code Types")
    return [
        target
        for target in extract_markdown_link_targets(related_code_types_content)
        if is_local_markdown_file_target(target)
    ]


def code_reading_has_code_type_target(content: str) -> bool:
    return bool(extract_related_code_type_targets(content))


def code_reading_has_non_canonical_code_type_target(content: str) -> bool:
    targets = extract_related_code_type_targets(content)
    return any(
        CANONICAL_CODE_TYPE_TARGET_PATTERN.fullmatch(target) is None
        for target in targets
    )
```

Finally, extend `collect_issues` to scan `codes/types` and `codes/readings`:

```python
def collect_issues(repo_root: Path) -> List[str]:
    cards_root = repo_root / "papers" / "cards"
    notes_root = repo_root / "papers" / "notes"
    questions_root = repo_root / "questions"
    code_types_root = repo_root / "codes" / "types"
    code_readings_root = repo_root / "codes" / "readings"

    card_files = list_markdown_files(cards_root, "*.md")
    note_files = list_markdown_files(notes_root, "*-note.md")
    question_files = list_markdown_files(questions_root, "*.md")
    code_type_files = list_markdown_files(code_types_root, "*.md")
    code_reading_files = list_markdown_files(code_readings_root, "*.md")

    cards_by_id = {card_file.stem: card_file for card_file in card_files}
    notes_by_id = {}
    for note_file in note_files:
        note_stem = note_file.stem
        note_id = note_stem[:-5] if note_stem.endswith("-note") else note_stem
        notes_by_id[note_id] = note_file

    issues: List[str] = []

    for card_id in sorted(cards_by_id):
        if card_id not in notes_by_id:
            issues.append(f"[ERROR] Missing note for card: {card_id}")

        card_file = cards_by_id[card_id]
        card_content = card_file.read_text(encoding="utf-8")
        card_targets = extract_markdown_link_targets(card_content)

        if f"../notes/{card_id}-note.md" not in card_targets:
            issues.append(f"[ERROR] Card missing note link: {card_id}")

        if not has_required_card_frontmatter(card_content):
            issues.append(f"[ERROR] Card missing required frontmatter: {card_file.name}")

    for note_id in sorted(notes_by_id):
        if note_id not in cards_by_id:
            issues.append(f"[ERROR] Missing card for note: {note_id}")

        note_file = notes_by_id[note_id]
        note_content = note_file.read_text(encoding="utf-8")
        note_targets = extract_markdown_link_targets(note_content)

        if f"../cards/{note_id}.md" not in note_targets:
            issues.append(f"[ERROR] Note missing card link: {note_id}")

    for question_file in question_files:
        question_content = question_file.read_text(encoding="utf-8")
        if question_has_non_canonical_paper_target(question_content):
            issues.append(
                f"[ERROR] Question contains non-canonical paper target: {question_file.name}"
            )

    for code_type_file in code_type_files:
        code_type_content = code_type_file.read_text(encoding="utf-8")
        if not has_required_code_type_frontmatter(code_type_content):
            issues.append(
                f"[ERROR] Code type missing required frontmatter: {code_type_file.name}"
            )

    for code_reading_file in code_reading_files:
        code_reading_content = code_reading_file.read_text(encoding="utf-8")
        if not has_required_code_reading_frontmatter(code_reading_content):
            issues.append(
                f"[ERROR] Code reading missing required frontmatter: {code_reading_file.name}"
            )

        if not code_reading_has_code_type_target(code_reading_content):
            issues.append(
                f"[ERROR] Code reading missing code-type link: {code_reading_file.name}"
            )

        if code_reading_has_non_canonical_code_type_target(code_reading_content):
            issues.append(
                "[ERROR] Code reading contains non-canonical code-type target: "
                f"{code_reading_file.name}"
            )

    return issues
```

- [ ] **Step 3: Run the vault-check tests again**

Run:

```powershell
python -m unittest tests.test_check_vault -v
```

Expected: every test in `tests.test_check_vault` passes, including the new code-subsystem cases and the existing paper-subsystem cases.

- [ ] **Step 4: Commit the validator implementation and the new regression tests**

Run:

```powershell
git add tests/test_check_vault.py scripts/_vault_common.py scripts/check-vault.py
git commit -m "feat: validate code note graph links"
```

Expected: one commit containing the new regression tests, the shared helper changes, and the extended vault checker.

### Task 4: Update the README without overwriting the user's existing edits and run final verification

**Files:**
- Modify: `README.md`
- Test: `tests/test_repository_files.py`
- Test: `tests/test_check_vault.py`

- [ ] **Step 1: Review the existing unstaged README diff before editing**

Run:

```powershell
git diff -- README.md
```

Expected: a non-empty diff. Keep those user edits in place and layer the new code-note documentation on top of them instead of rewriting the file from scratch.

- [ ] **Step 2: Update the Note Types and Operating Rules sections**

Make these exact content changes in `README.md`.

Update `## Note Types` so it reads:

```md
## Note Types
- `papers/cards/`: structured paper entry points
- `papers/notes/`: freeform reading and implementation notes
- `questions/`: open questions that own the graph edges
- `insights/`: reusable claims backed by links, experiments, or work experience
- `codes/types/`: stable code category hubs that appear as graph-visible summary nodes
- `codes/readings/`: concrete source-reading notes that link directly to one or more code types
```

Replace the `## Operating Rules` list with:

```md
## Operating Rules
1. Create one card and one note for every new paper.
2. Create new paper cards, paper notes, and question notes from the templates in `templates/`, not from blank files.
3. Put AlphaXiv and the concise summary in the card.
4. Put freeform analysis only in the note file.
5. Add paper relationships only under `questions/* -> ## Related Papers`.
6. Every card must link to its note using `../notes/<paper_id>-note.md`.
7. Every note must link back to its card using `../cards/<paper_id>.md`.
8. Every question must link only to `../papers/cards/<paper_id>.md`.
9. Create `code-type` notes in `codes/types/*` and `code-reading` notes in `codes/readings/*`.
10. Add code relationships only under `codes/readings/* -> ## Related Code Types`.
11. Every code-reading note must link to code types using canonical `../types/<code_id>.md` targets.
12. Use `views/paper-view.md` for the paper table and Graph view for the big picture.
13. The main Graph view includes only `questions`, `papers/cards`, `codes/types`, and `codes/readings`.
14. Create insight notes from `templates/insight.md` or `scripts/new-insight.py`, and keep them scoped to a single claim.
```

Add this new section after `## Adding Insights`:

```md
## Adding Code Notes

Create code category notes from `templates/code-type.md` and concrete source-reading notes from `templates/code-reading.md`.

Use these rules:

1. Save category notes as `codes/types/<code_id>.md`.
2. Save reading notes as `codes/readings/<reading_id>.md`.
3. Put code-type links only under `## Related Code Types`.
4. Link code types with canonical paths such as `../types/infra.md`.
5. Use the global Graph view to inspect the code-type and code-reading subgraph alongside question and paper-card nodes.
```

- [ ] **Step 3: Run the full test suite**

Run:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

Expected: all repository tests pass, including `tests.test_repository_files`, `tests.test_check_vault`, `tests.test_new_paper`, and `tests.test_new_insight`.

- [ ] **Step 4: Inspect the staged README diff before committing**

Run:

```powershell
git add README.md
git diff --cached -- README.md
```

Expected:

- the staged diff preserves the user's pre-existing README edits
- the staged diff includes the new code-note documentation
- no unrelated file from `papers/cards/robotwin.md` or `papers/notes/robotwin-note.md` appears in the staged set

- [ ] **Step 5: Commit the documentation update**

Run:

```powershell
git commit -m "docs: document code note graph workflow"
```

Expected: one docs-only commit for the README update.

## Self-Review

**1. Spec coverage**

- New directories and templates are covered by Task 1
- Graph scope and color-group expansion are covered by Task 1
- Code-subsystem vault validation is covered by Tasks 2 and 3
- README updates are covered by Task 4
- Regression testing is covered by Tasks 1 through 4
- The design explicitly excluded a new scaffold CLI and `views/papers.base` changes; neither appears in the plan
- The live repository `python scripts/check-vault.py` baseline failure on `papers/cards/mem.md` is acknowledged as out of scope, so the plan uses isolated tests instead of pretending the current vault is already clean

**2. Placeholder scan**

- No unresolved placeholder markers remain
- Every task includes exact file paths, commands, and expected outcomes
- Code-changing steps include concrete file contents or concrete code snippets

**3. Type consistency**

- `code-type` and `code-reading` are used consistently across templates, docs, and validator code
- `code_id`, `reading_id`, and `## Related Code Types` are named consistently across tests, templates, and validation helpers
- Canonical code-type links consistently use `../types/<code_id>.md`
