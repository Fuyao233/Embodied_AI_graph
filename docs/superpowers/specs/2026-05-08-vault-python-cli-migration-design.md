# Vault Python CLI Migration Design

## Goal

Replace the current PowerShell-based vault helper scripts with standalone Python scripts so paper and insight scaffolding no longer depends on PowerShell execution policy.

## Scope

This change covers:

- `scripts/new-paper.py`
- `scripts/new-insight.py`
- `scripts/check-vault.py`
- Python-based tests for those scripts
- `README.md` command and workflow updates

This change does not add new vault behaviors. The Python scripts should preserve the current contract, output shape, validation rules, file layout, and exit-code behavior as closely as practical.

## Design

### Script layout

Keep three standalone entry points:

- `scripts/new-paper.py`
- `scripts/new-insight.py`
- `scripts/check-vault.py`

Add one shared helper module:

- `scripts/_vault_common.py`

The helper module owns reusable file, template, and Markdown parsing utilities while each entry script keeps its own CLI surface and user-facing messages.

### Command-line contract

The new commands preserve the existing semantics and move to explicit long-form Python flags:

- `python scripts/new-paper.py --paper-id <id> --title <title> --alphaxiv <url> [--year <year>] [--pdf <url>] [--code <url>]`
- `python scripts/new-insight.py --insight-id <id> --claim <text>`
- `python scripts/check-vault.py`

Identifier validation remains `^[a-z0-9][a-z0-9.-]*$`.

### Behavior compatibility

`new-paper.py` must still:

- normalize `paper_id` to lowercase
- reject empty `title` and `alphaxiv`
- render `templates/paper-card.md` and `templates/paper-note.md`
- write UTF-8 files without BOM
- fail if either target file already exists

`new-insight.py` must still:

- normalize `insight_id` to lowercase
- reject empty `claim`
- render `templates/insight.md`
- create `insights/` when missing
- write UTF-8 without BOM
- fail if the insight file already exists

`check-vault.py` must still:

- verify one card per note and one note per card
- require mutual card/note links
- require `paper-card` frontmatter keys
- reject non-canonical Markdown targets inside `questions/*.md`
- print all `[ERROR]` lines before the failure summary
- exit `0` on success and `1` on any issue

### Testing strategy

Replace the PowerShell `Pester` tests with Python `unittest` tests so the project only depends on a Python interpreter, not a PowerShell testing framework.

Tests will execute the CLI scripts in isolated temporary vaults by copying the scripts and templates under test into a temporary directory. This keeps assertions focused on user-visible behavior rather than internal implementation details.

## Risks

- The current environment does not expose a working `python.exe`; the migration can be implemented, but runtime verification may be blocked until Python is installed or the Windows app alias is fixed.
- Python path handling must stay relative to the repository root so copied scripts continue to work inside isolated test vaults.
