# Vault Python CLI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PowerShell vault helper scripts with standalone Python scripts that preserve the existing behavior and update the documentation to use Python commands.

**Architecture:** Keep three user-facing entry points, one per workflow, and move shared logic into a small private helper module under `scripts/`. Migrate tests from `Pester` to Python `unittest` so the toolchain depends only on Python itself.

**Tech Stack:** Python standard library (`argparse`, `pathlib`, `re`, `datetime`, `tempfile`, `subprocess`, `unittest`), Markdown templates, PowerShell only for legacy file removal

---

## File Structure

**Files to create**

- `scripts/_vault_common.py`
- `scripts/new-paper.py`
- `scripts/new-insight.py`
- `scripts/check-vault.py`
- `tests/__init__.py`
- `tests/test_new_paper.py`
- `tests/test_new_insight.py`
- `tests/test_check_vault.py`
- `docs/superpowers/specs/2026-05-08-vault-python-cli-migration-design.md`

**Files to modify**

- `README.md`
- `.gitignore`

**Files to delete**

- `scripts/new-paper.ps1`
- `scripts/new-insight.ps1`
- `scripts/check-vault.ps1`
- `tests/new-paper.Tests.ps1`
- `tests/new-insight.Tests.ps1`
- `tests/check-vault.Tests.ps1`

### Task 1: Write Python regression tests for the paper scaffold

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/test_new_paper.py`

- [ ] **Step 1: Write the failing CLI regression tests**

Add `tests/test_new_paper.py` covering:

```python
def test_renders_both_paper_files_with_normalized_id():
    ...

def test_rejects_duplicate_paper():
    ...

def test_rejects_invalid_paper_id():
    ...

def test_rejects_blank_title():
    ...

def test_rejects_blank_alphaxiv():
    ...

def test_writes_utf8_without_bom():
    ...
```

- [ ] **Step 2: Run the paper tests to verify they fail**

Run:

```powershell
python -m unittest tests.test_new_paper -v
```

Expected: failures because `scripts/new-paper.py` does not exist yet and the test harness cannot invoke it successfully.

- [ ] **Step 3: Implement the minimal paper scaffold**

Create `scripts/_vault_common.py` and `scripts/new-paper.py` with:

```python
def normalize_identifier(raw: str, label: str) -> str: ...
def require_non_empty(raw: str, label: str) -> str: ...
def render_template(template_path: Path, values: dict[str, str]) -> str: ...
def write_utf8(path: Path, content: str) -> None: ...
```

and a CLI that writes:

```text
Created:
  <card path>
  <note path>
Paper view will pick up the new card automatically.
```

- [ ] **Step 4: Run the paper tests to verify they pass**

Run:

```powershell
python -m unittest tests.test_new_paper -v
```

Expected: all paper scaffold tests pass.

### Task 2: Write Python regression tests for the insight scaffold

**Files:**
- Create: `tests/test_new_insight.py`

- [ ] **Step 1: Write the failing insight tests**

Add `tests/test_new_insight.py` covering:

```python
def test_renders_insight_file_with_normalized_id():
    ...

def test_rejects_duplicate_insight():
    ...

def test_rejects_invalid_insight_id():
    ...

def test_rejects_blank_claim():
    ...

def test_writes_utf8_without_bom():
    ...

def test_creates_insights_directory_when_missing():
    ...
```

- [ ] **Step 2: Run the insight tests to verify they fail**

Run:

```powershell
python -m unittest tests.test_new_insight -v
```

Expected: failures because `scripts/new-insight.py` does not exist yet.

- [ ] **Step 3: Implement the minimal insight scaffold**

Create `scripts/new-insight.py` so it shares helper functions, renders `templates/insight.md`, creates `insights/`, and prints:

```text
Created:
  <insight path>
Fill in the Evidence section with links, experiments, or work experience.
```

- [ ] **Step 4: Run the insight tests to verify they pass**

Run:

```powershell
python -m unittest tests.test_new_insight -v
```

Expected: all insight scaffold tests pass.

### Task 3: Write Python regression tests for the vault checker

**Files:**
- Create: `tests/test_check_vault.py`

- [ ] **Step 1: Write the failing vault-check tests**

Add tests covering:

```python
def test_passes_for_canonical_vault():
    ...

def test_reports_missing_note_for_card():
    ...

def test_reports_missing_mutual_links():
    ...

def test_reports_missing_card_for_note():
    ...

def test_reports_missing_required_frontmatter():
    ...

def test_rejects_non_canonical_question_targets():
    ...
```

- [ ] **Step 2: Run the vault-check tests to verify they fail**

Run:

```powershell
python -m unittest tests.test_check_vault -v
```

Expected: failures because `scripts/check-vault.py` does not exist yet.

- [ ] **Step 3: Implement the minimal vault checker**

Create `scripts/check-vault.py` with helpers for:

```python
def extract_markdown_link_targets(content: str) -> list[str]: ...
def is_local_markdown_target(target: str) -> bool: ...
def has_required_card_frontmatter(content: str) -> bool: ...
```

and preserve the current output contract:

```text
Vault check passed.
```

or:

```text
[ERROR] ...
Vault check failed with <n> issue(s).
```

- [ ] **Step 4: Run the vault-check tests to verify they pass**

Run:

```powershell
python -m unittest tests.test_check_vault -v
```

Expected: all vault-check tests pass.

### Task 4: Update docs and retire PowerShell entry points

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`
- Delete: `scripts/new-paper.ps1`
- Delete: `scripts/new-insight.ps1`
- Delete: `scripts/check-vault.ps1`
- Delete: `tests/new-paper.Tests.ps1`
- Delete: `tests/new-insight.Tests.ps1`
- Delete: `tests/check-vault.Tests.ps1`

- [ ] **Step 1: Update README usage examples**

Replace the PowerShell command examples with:

```markdown
python scripts/new-paper.py --paper-id pi07 --title "PI0.7" --alphaxiv "https://www.alphaxiv.org/overview/xxxx"
python scripts/new-insight.py --insight-id pretrain-not-fully-converged --claim "Pretraining need not fully converge for downstream performance"
python scripts/check-vault.py
python -m unittest discover -s tests -p "test_*.py" -v
```

- [ ] **Step 2: Ignore Python cache artifacts**

Add to `.gitignore`:

```gitignore
__pycache__/
*.py[cod]
```

- [ ] **Step 3: Remove the obsolete PowerShell files**

Delete the `.ps1` scripts and `.Tests.ps1` tests once the Python replacements exist.

### Task 5: Verify the migration

**Files:**
- Test: `tests/test_new_paper.py`
- Test: `tests/test_new_insight.py`
- Test: `tests/test_check_vault.py`

- [ ] **Step 1: Run the full Python test suite**

Run:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

Expected: all Python tests pass.

- [ ] **Step 2: Run the vault checker against the real repository**

Run:

```powershell
python scripts/check-vault.py
```

Expected: either `Vault check passed.` or a precise list of current vault issues.

- [ ] **Step 3: Smoke-test the scaffold commands**

Run:

```powershell
python scripts/new-paper.py --paper-id temp-check --title "Temp Check" --alphaxiv "https://example.com"
python scripts/new-insight.py --insight-id temp-check --claim "Temporary smoke test"
```

Expected: both commands create files with the expected structure.

- [ ] **Step 4: Remove temporary smoke-test files if created**

Delete:

```powershell
Remove-Item papers/cards/temp-check.md
Remove-Item papers/notes/temp-check-note.md
Remove-Item insights/temp-check.md
```
