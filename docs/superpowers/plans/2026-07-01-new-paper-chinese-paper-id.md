# New Paper Chinese Paper ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow `scripts/new-paper.py` to accept Chinese `--paper-id` values while keeping the change isolated to that script.

**Architecture:** Add a script-local `paper_id` normalizer in `scripts/new-paper.py` instead of relaxing the shared identifier helper in `scripts/_vault_common.py`. Extend `tests/test_new_paper.py` first so the new accepted case and the still-invalid spacing case are both locked in before the implementation changes.

**Tech Stack:** Python 3, `argparse`, `unittest`

---

### Task 1: Add regression coverage for localized paper-id validation

**Files:**
- Modify: `tests/test_new_paper.py`
- Test: `tests/test_new_paper.py`

- [ ] **Step 1: Write the failing test**

```python
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
        self.assertFileExists("papers/cards/动作空间设计.md")
        self.assertFileExists("papers/notes/动作空间设计-note.md")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_new_paper.NewPaperCliTests.test_accepts_chinese_paper_ids -v`
Expected: FAIL with the current `PaperId must match ^[A-Za-z0-9][A-Za-z0-9.-]*$` validation error.

- [ ] **Step 3: Tighten the invalid-case test around whitespace**

```python
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
```

- [ ] **Step 4: Run the focused test file and confirm only the new acceptance case fails**

Run: `python -m unittest tests.test_new_paper -v`
Expected: one failure for the Chinese `paper-id` acceptance test before implementation; existing invalid cases still fail.

### Task 2: Implement script-local paper-id validation

**Files:**
- Modify: `scripts/new-paper.py`
- Test: `tests/test_new_paper.py`

- [ ] **Step 1: Add a local normalizer**

```python
def normalize_paper_id(raw_value: str) -> str:
    paper_id = raw_value.strip()
    if not paper_id:
        raise ValueError("PaperId must not be empty or whitespace")
    if not paper_id[0].isalnum():
        raise ValueError(
            "PaperId must start with a letter or digit and contain only letters, digits, '.' or '-'"
        )
    if any(not (character.isalnum() or character in ".-") for character in paper_id):
        raise ValueError(
            "PaperId must start with a letter or digit and contain only letters, digits, '.' or '-'"
        )
    return paper_id
```

- [ ] **Step 2: Switch `main()` to the local normalizer**

```python
paper_id = normalize_paper_id(args.paper_id)
```

- [ ] **Step 3: Keep shared validation untouched**

No edit to `scripts/_vault_common.py`.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `python -m unittest tests.test_new_paper -v`
Expected: PASS

### Task 3: Run final relevant verification

**Files:**
- Test: `tests/test_new_paper.py`

- [ ] **Step 1: Run the focused suite one more time**

Run: `python -m unittest tests.test_new_paper -v`
Expected: PASS

- [ ] **Step 2: Run the broader vault regression suite if time permits**

Run: `python -m unittest discover -s tests -p "test_*.py" -v`
Expected: PASS
