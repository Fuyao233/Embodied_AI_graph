# Obsidian Vault Hardening And Paper CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the current vault inconsistencies, make `paper view` reliable, keep the graph focused on `open question -> paper card`, and add a command-line paper scaffold plus a vault integrity checker.

**Architecture:** Keep the vault lightweight and Markdown-first. A paper is represented by exactly two files: `papers/cards/<paper_id>.md` and `papers/notes/<paper_id>-note.md`. Graph edges continue to be owned only by `questions/*.md`, which should link only to paper cards. A small PowerShell scaffold command creates a consistent paper pair, and a second PowerShell command audits naming, frontmatter, and link integrity.

**Tech Stack:** Markdown, Obsidian core plugins (`Bases`, `Graph`, `Templates`, `Backlinks`), PowerShell 7+/Windows PowerShell, Typora

---

## File Structure

**Files to modify**

- `README.md`
- `views/papers.base`
- `.obsidian/graph.json`
- `templates/paper-card.md`
- `templates/paper-note.md`
- `papers/cards/pi05.md`
- `papers/cards/pi06.md`
- `papers/notes/pi05-note.md`
- `papers/notes/pi06-note.md`
- `questions/数据规模化.md`
- `questions/闭环控制与实时性.md`

**Files to create**

- `scripts/new-paper.ps1`
- `scripts/check-vault.ps1`

**Optional file to create if graph display needs CSS fallback**

- `.obsidian/snippets/graph-overrides.css`

**Implementation note**

This vault is not a Git repository. Verification for this plan is command-based plus a short Obsidian UI smoke check.

### Task 1: Normalize the vault contract and repair broken links

**Files:**
- Modify: `README.md`
- Modify: `templates/paper-card.md`
- Modify: `templates/paper-note.md`
- Modify: `papers/cards/pi05.md`
- Modify: `papers/cards/pi06.md`
- Modify: `papers/notes/pi05-note.md`
- Modify: `papers/notes/pi06-note.md`
- Modify: `questions/数据规模化.md`
- Modify: `questions/闭环控制与实时性.md`

- [ ] **Step 1: Verify the current broken links and mismatched contract**

Run:

```powershell
rg -n "\[.*\]\(pi0?6?\.md\)|\]\(pi05\.md\)|\]\(pi06\.md\)" papers questions
```

Expected: results show note-to-card and question-to-card links using wrong relative targets.

- [ ] **Step 2: Update the written contract in `README.md`**

Write these rules into `README.md`:

```markdown
- Paper card filename: `papers/cards/<paper_id>.md`
- Paper note filename: `papers/notes/<paper_id>-note.md`
- Every card must link to its note using `../notes/<paper_id>-note.md`
- Every note must link back to its card using `../cards/<paper_id>.md`
- Every question must link only to `../papers/cards/<paper_id>.md`
```

- [ ] **Step 3: Update the paper templates to emit the correct relative links**

Set `templates/paper-card.md` navigation to:

```markdown
## Navigation
- Paper note: [{{title}} note](../notes/{{paper_id}}-note.md)
```

Set `templates/paper-note.md` navigation to:

```markdown
## Navigation
- Paper card: [{{title}} card](../cards/{{paper_id}}.md)
```

- [ ] **Step 4: Repair the existing note-to-card links**

Change:

```markdown
- Paper card: [PI0.5 card](pi05.md)
```

to:

```markdown
- Paper card: [PI0.5 card](../cards/pi05.md)
```

Change:

```markdown
- Paper card: [PI0.6 card](pi06.md)
```

to:

```markdown
- Paper card: [PI0.6 card](../cards/pi06.md)
```

- [ ] **Step 5: Repair the existing question-to-card links**

Change `questions/数据规模化.md`:

```markdown
## Related Papers
- [PI0.6 card](pi06.md)
```

to:

```markdown
## Related Papers
- [PI0.6 card](../papers/cards/pi06.md)
```

Change `questions/闭环控制与实时性.md`:

```markdown
## Related Papers
- [PI0.5 card](pi05.md)
```

to:

```markdown
## Related Papers
- [PI0.5 card](../papers/cards/pi05.md)
```

- [ ] **Step 6: Re-scan the vault to confirm only valid card targets remain**

Run:

```powershell
rg -n "\]\(\.\./cards/|\]\(\.\./papers/cards/" papers questions
```

Expected: note files point to `../cards/*.md`, and question files point to `../papers/cards/*.md`.

### Task 2: Fix `paper view` and tighten graph scope

**Files:**
- Modify: `views/papers.base`
- Modify: `.obsidian/graph.json`
- Modify: `README.md`
- Optional create: `.obsidian/snippets/graph-overrides.css`

- [ ] **Step 1: Fix the base filter so cards actually appear**

Replace the broken filter expression in `views/papers.base`:

```yaml
- type = "paper-card"
```

with:

```yaml
- type == "paper-card"
```

Keep:

```yaml
- file.inFolder("papers/cards")
```

- [ ] **Step 2: Add a stable graph search filter**

Set `.obsidian/graph.json` search to:

```json
"search": "path:questions OR path:papers/cards"
```

Also set:

```json
"showOrphans": false
```

Expected effect: `README`, `views/*`, `templates/*`, `docs/*`, and `paper note` nodes stop appearing in the global graph.

- [ ] **Step 3: Increase graph node size**

Set:

```json
"nodeSizeMultiplier": 1.6
```

Keep this as a vault default so the larger graph carries with the vault.

- [ ] **Step 4: Add graph color groups for questions and paper cards**

Store two groups in `.obsidian/graph.json`:

```json
"colorGroups": [
  {
    "query": "path:questions",
    "color": {
      "a": 1,
      "rgb": 15435054
    }
  },
  {
    "query": "path:papers/cards",
    "color": {
      "a": 1,
      "rgb": 5470720
    }
  }
]
```

If Obsidian rejects the serialized shape on reload, fall back to setting the two groups once in the UI and preserve the resulting `graph.json`.

- [ ] **Step 5: Document the graph scope and styling in `README.md`**

Add:

```markdown
- Global Graph uses the built-in filter `path:questions OR path:papers/cards`
- `papers/notes/*` should never appear in the main graph
- Question nodes and paper-card nodes use different color groups
```

- [ ] **Step 6: Verify the base and graph config at file level**

Run:

```powershell
Get-Content views\papers.base
Get-Content .obsidian\graph.json
```

Expected: `type == "paper-card"` is present, search is restricted, node size is increased, and two color groups are defined.

### Task 3: Add `new-paper.ps1` for consistent paper imports

**Files:**
- Create: `scripts/new-paper.ps1`
- Modify: `README.md`

- [ ] **Step 1: Create the `scripts/` directory if needed**

Run:

```powershell
New-Item -ItemType Directory -Force '.\scripts'
```

Expected: `scripts/` exists.

- [ ] **Step 2: Implement parameter parsing and validation**

The script should accept:

```powershell
param(
  [Parameter(Mandatory = $true)][string]$PaperId,
  [Parameter(Mandatory = $true)][string]$Title,
  [Parameter(Mandatory = $true)][string]$AlphaXiv,
  [string]$Year = "",
  [string]$Pdf = "",
  [string]$Code = ""
)
```

Validation rules:

```powershell
$normalizedPaperId = $PaperId.Trim().ToLowerInvariant()
if ($normalizedPaperId -notmatch '^[a-z0-9][a-z0-9.-]*$') {
  throw "PaperId must match ^[a-z0-9][a-z0-9.-]*$"
}
```

- [ ] **Step 3: Implement existence checks and target paths**

Use:

```powershell
$cardPath = Join-Path $PSScriptRoot "..\\papers\\cards\\$normalizedPaperId.md"
$notePath = Join-Path $PSScriptRoot "..\\papers\\notes\\$normalizedPaperId-note.md"
```

Reject duplicates:

```powershell
if (Test-Path $cardPath -or Test-Path $notePath) {
  throw "Paper already exists: $normalizedPaperId"
}
```

- [ ] **Step 4: Generate the card file with a valid Obsidian base shape**

Write card content in this exact shape:

```markdown
---
type: paper-card
paper_id: <paper_id>
title: <title>
status: seed
year: <year>
alphaxiv: <alphaxiv>
pdf: <pdf>
code: <code>
created: <yyyy-mm-dd>
---

# <title>

## Navigation
- Paper note: [<title> note](../notes/<paper_id>-note.md)

## Core Insight

## Why It Matters

## Improvement Ideas

## References
- AlphaXiv: <alphaxiv>
- PDF: <pdf>
- Code: <code>
```

- [ ] **Step 5: Generate the note file with a valid backlink**

Write note content in this exact shape:

```markdown
---
type: paper-note
paper_id: <paper_id>
created: <yyyy-mm-dd>
---

# <title> Note

## Navigation
- Paper card: [<title> card](../cards/<paper_id>.md)

## Reading Notes

## Technical Details

## Questions

## Follow-up
```

- [ ] **Step 6: Print a concise success summary**

Print:

```powershell
Write-Host "Created:"
Write-Host "  $cardPath"
Write-Host "  $notePath"
Write-Host "Paper view will pick up the new card automatically."
```

- [ ] **Step 7: Document the command in `README.md`**

Add example usage:

```powershell
.\scripts\new-paper.ps1 -PaperId pi07 -Title "PI0.7" -AlphaXiv "https://www.alphaxiv.org/overview/xxxx"
```

### Task 4: Add `check-vault.ps1` for completeness auditing

**Files:**
- Create: `scripts/check-vault.ps1`
- Modify: `README.md`

- [ ] **Step 1: Enumerate cards, notes, and questions**

Use:

```powershell
$cards = Get-ChildItem (Join-Path $PSScriptRoot "..\\papers\\cards") -Filter *.md | Sort-Object Name
$notes = Get-ChildItem (Join-Path $PSScriptRoot "..\\papers\\notes") -Filter *-note.md | Sort-Object Name
$questions = Get-ChildItem (Join-Path $PSScriptRoot "..\\questions") -Filter *.md | Sort-Object Name
```

- [ ] **Step 2: Build paper IDs from filenames**

Use:

```powershell
$cardIds = $cards | ForEach-Object { $_.BaseName }
$noteIds = $notes | ForEach-Object { $_.BaseName -replace '-note$','' }
```

- [ ] **Step 3: Detect missing pairs**

Implement checks for:

```powershell
$missingNotes = $cardIds | Where-Object { $_ -notin $noteIds }
$missingCards = $noteIds | Where-Object { $_ -notin $cardIds }
```

Report each missing item as:

```powershell
Write-Host "[ERROR] Missing note for card: $id"
Write-Host "[ERROR] Missing card for note: $id"
```

- [ ] **Step 4: Detect missing mutual links**

For each card, require:

```powershell
[regex]::Escape("../notes/$id-note.md")
```

For each note, require:

```powershell
[regex]::Escape("../cards/$id.md")
```

Report:

```powershell
Write-Host "[ERROR] Card missing note link: $id"
Write-Host "[ERROR] Note missing card link: $id"
```

- [ ] **Step 5: Detect invalid card frontmatter for paper view eligibility**

Require each card to contain:

```powershell
'type: paper-card'
'paper_id: '
'title: '
```

Report:

```powershell
Write-Host "[ERROR] Card missing required frontmatter: $($card.Name)"
```

- [ ] **Step 6: Detect invalid question targets**

For each `questions/*.md`, flag:

```powershell
if ($content -match '\.\./papers/notes/' -or $content -match '\.\./cards/' -or $content -match '\(pi[0-9].*\.md\)') {
  Write-Host "[ERROR] Question contains non-canonical paper target: $($question.Name)"
}
```

The canonical form is only:

```text
../papers/cards/<paper_id>.md
```

- [ ] **Step 7: Exit nonzero on any error**

Use:

```powershell
if ($errorCount -gt 0) {
  Write-Host "Vault check failed with $errorCount issue(s)."
  exit 1
}

Write-Host "Vault check passed."
exit 0
```

- [ ] **Step 8: Document the check command in `README.md`**

Add:

```powershell
.\scripts\check-vault.ps1
```

### Task 5: Verify the hardened vault

**Files:**
- Verify: `views/papers.base`
- Verify: `.obsidian/graph.json`
- Verify: `scripts/new-paper.ps1`
- Verify: `scripts/check-vault.ps1`
- Verify: existing paper and question notes

- [ ] **Step 1: Run the integrity checker against the repaired vault**

Run:

```powershell
.\scripts\check-vault.ps1
```

Expected: `Vault check passed.`

- [ ] **Step 2: Smoke-test the scaffold command**

Run:

```powershell
.\scripts\new-paper.ps1 -PaperId smoke01 -Title "Smoke Paper" -AlphaXiv "https://www.alphaxiv.org/overview/smoke"
```

Expected: one new card and one new note are created, both with mutual links.

- [ ] **Step 3: Re-run the integrity checker**

Run:

```powershell
.\scripts\check-vault.ps1
```

Expected: `Vault check passed.`

- [ ] **Step 4: Remove the smoke-test paper**

Delete only:

```powershell
Remove-Item -LiteralPath .\papers\cards\smoke01.md
Remove-Item -LiteralPath .\papers\notes\smoke01-note.md
```

Expected: the temporary paper pair is removed without touching any existing notes.

- [ ] **Step 5: Re-run the checker one final time**

Run:

```powershell
.\scripts\check-vault.ps1
```

Expected: `Vault check passed.`

- [ ] **Step 6: Perform the Obsidian UI smoke check**

In Obsidian:

1. Open `views/paper-view.md` and confirm `PI0.5` and `PI0.6` appear.
2. Open Global Graph and confirm `README`, `templates/*`, `views/*`, `docs/*`, and `*-note` nodes no longer appear.
3. Confirm question nodes and paper-card nodes are different colors.
4. Confirm graph nodes render larger than before.
5. Click `数据规模化` and confirm it links to `pi06`.
6. Open `papers/cards/pi06.md` and confirm Backlinks shows `数据规模化`.

## Self-Review

- Spec coverage: This plan covers the user’s three requested improvements: repair `paper view`, clean and style the graph, and add completeness protection through a scaffold command plus a checker.
- Placeholder scan: No `TODO` or unresolved placeholders remain. The only explicit fallback is for Obsidian’s serialized graph group shape, which is called out as an implementation verification point.
- Type consistency: The canonical paper card path is `papers/cards/<paper_id>.md` throughout, and the canonical note path is `papers/notes/<paper_id>-note.md` throughout.
