# Obsidian Lightweight Knowledge Vault Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Obsidian vault that supports a `paper view` and a `big picture view` using only Markdown files, Obsidian core features, Typora for editing, and AlphaXiv links.

**Architecture:** The vault has three note types: `paper card`, `paper note`, and `open question`. `paper card` is the structured entry point for a paper, `paper note` holds freeform reading notes, and `open question` owns the graph edges by linking to `paper card` files in its `## Related Papers` section. Obsidian Bases provides the paper table, and Graph view visualizes question-to-paper links without custom scripts or Dataview.

**Tech Stack:** Markdown, Obsidian core plugins (`Bases`, `Templates`, `Graph view`, `Backlinks`), Typora, AlphaXiv

---

## File Structure

**Current files to migrate**

- Move: `pi0.5.md` -> `papers/notes/pi05-note.md`
- Move: `pi06.md` -> `papers/notes/pi06-note.md`

**Files to create**

- `papers/cards/pi05-card.md`
- `papers/cards/pi06-card.md`
- `papers/notes/pi05-note.md`
- `papers/notes/pi06-note.md`
- `questions/数据规模化.md`
- `questions/Sim2Real Gap.md`
- `questions/Generalization.md`
- `questions/世界模型与物理因果理解.md`
- `questions/闭环控制与实时性.md`
- `questions/Continual learning.md`
- `questions/评价体系 benchmark 与真实能力脱节.md`
- `questions/安全 可解释性 与责任边界.md`
- `templates/paper-card.md`
- `templates/paper-note.md`
- `templates/open-question.md`
- `views/papers.base`
- `views/paper-view.md`
- `README.md`

**Directories to create**

- `papers/cards/`
- `papers/notes/`
- `questions/`
- `templates/`
- `views/`

**Implementation note**

This workspace is not currently a Git repository. The verification steps below use file checks and Obsidian UI checks instead of commit checkpoints.

### Task 1: Scaffold the vault structure and core templates

**Files:**
- Create: `papers/cards/`
- Create: `papers/notes/`
- Create: `questions/`
- Create: `templates/`
- Create: `views/`
- Create: `templates/paper-card.md`
- Create: `templates/paper-note.md`
- Create: `templates/open-question.md`
- Create: `views/papers.base`
- Create: `views/paper-view.md`

- [ ] **Step 1: Create the folder structure**

Run:

```powershell
New-Item -ItemType Directory -Force '.\papers\cards'
New-Item -ItemType Directory -Force '.\papers\notes'
New-Item -ItemType Directory -Force '.\questions'
New-Item -ItemType Directory -Force '.\templates'
New-Item -ItemType Directory -Force '.\views'
```

Expected: five directories are created under the vault root.

- [ ] **Step 2: Create `templates/paper-card.md`**

Write:

```markdown
---
type: paper-card
paper_id:
title:
status: seed
year:
alphaxiv:
pdf:
code:
created: {{date:YYYY-MM-DD}}
---

# {{title}}

## Navigation
- Paper note:

## Core Insight

## Why It Matters

## Improvement Ideas

## References
- AlphaXiv:
- PDF:
- Code:
```

- [ ] **Step 3: Create `templates/paper-note.md`**

Write:

```markdown
---
type: paper-note
paper_id:
created: {{date:YYYY-MM-DD}}
---

# {{title}}

## Navigation
- Paper card:

## Reading Notes

## Technical Details

## Questions

## Follow-up
- 
```

- [ ] **Step 4: Create `templates/open-question.md`**

Write:

```markdown
---
type: open-question
status: open
created: {{date:YYYY-MM-DD}}
---

# {{title}}

## Why This Matters

## Problem Statement

## Evaluation Criteria
- 

## Related Papers
- 

## Next Checks
- 
```

- [ ] **Step 5: Create `views/papers.base`**

Write:

```yaml
filters:
  and:
    - file.inFolder("papers/cards")
    - 'type = "paper-card"'
properties:
  paper_id:
    displayName: Paper ID
  title:
    displayName: Title
  status:
    displayName: Status
  year:
    displayName: Year
  alphaxiv:
    displayName: AlphaXiv
  file.mtime:
    displayName: Updated
views:
  - type: table
    name: Papers
    order:
      - paper_id
      - title
      - status
      - year
      - alphaxiv
      - file.mtime
```

- [ ] **Step 6: Create `views/paper-view.md`**

Write:

```markdown
# Paper View

![[papers.base#Papers]]
```

- [ ] **Step 7: Enable the required Obsidian core settings**

In Obsidian:

1. Open the vault at `E:\Study\EmbodiedAI`.
2. Enable `Bases` under `Settings -> Core plugins`.
3. Enable `Templates` under `Settings -> Core plugins`.
4. Confirm `Graph view` is enabled under `Settings -> Core plugins`.
5. Set `Settings -> Templates -> Template folder location` to `templates`.
6. Set `Settings -> Files and links -> Use [[Wikilinks]]` to `Off`.
7. Set `Settings -> Files and links -> Automatically update internal links` to `On`.

Expected: the vault is configured to use Markdown links that remain compatible with Typora.

- [ ] **Step 8: Verify the scaffold**

Run:

```powershell
Get-ChildItem '.\papers'
Get-ChildItem '.\questions'
Get-ChildItem '.\templates'
Get-ChildItem '.\views'
```

Expected: `cards`, `notes`, `templates`, `views`, and `questions` all exist, and `views/papers.base` plus `views/paper-view.md` are present.

### Task 2: Migrate the two existing paper notes and create their paper cards

**Files:**
- Move: `pi0.5.md` -> `papers/notes/pi05-note.md`
- Move: `pi06.md` -> `papers/notes/pi06-note.md`
- Modify: `papers/notes/pi05-note.md`
- Modify: `papers/notes/pi06-note.md`
- Create: `papers/cards/pi05-card.md`
- Create: `papers/cards/pi06-card.md`

- [ ] **Step 1: Move the two existing notes into `papers/notes/`**

Run:

```powershell
Move-Item '.\pi0.5.md' '.\papers\notes\pi05-note.md'
Move-Item '.\pi06.md' '.\papers\notes\pi06-note.md'
```

Expected: the vault root no longer contains `pi0.5.md` or `pi06.md`, and both notes now live under `papers/notes/`.

- [ ] **Step 2: Normalize the top of `papers/notes/pi05-note.md`**

Prepend this block above the current content and keep the existing body below it:

```markdown
---
type: paper-note
paper_id: pi05
created: 2026-04-29
---

# PI0.5 Note

## Navigation
- Paper card: [PI0.5 card](../cards/pi05-card.md)

```

- [ ] **Step 3: Normalize the top of `papers/notes/pi06-note.md`**

Prepend this block above the current content and keep the existing body below it:

```markdown
---
type: paper-note
paper_id: pi06
created: 2026-04-29
---

# PI0.6 Note

## Navigation
- Paper card: [PI0.6 card](../cards/pi06-card.md)

```

- [ ] **Step 4: Create `papers/cards/pi05-card.md`**

Write:

```markdown
---
type: paper-card
paper_id: pi05
title: PI0.5
status: seed
year:
alphaxiv:
pdf:
code:
created: 2026-04-29
---

# PI0.5

## Navigation
- Paper note: [PI0.5 note](../notes/pi05-note.md)

## Core Insight

## Why It Matters

## Improvement Ideas

## References
- AlphaXiv:
- PDF:
- Code:
```

Do not mark this step complete until the real AlphaXiv URL for this paper has been added under both `alphaxiv:` and `- AlphaXiv:`.

- [ ] **Step 5: Create `papers/cards/pi06-card.md`**

Write:

```markdown
---
type: paper-card
paper_id: pi06
title: PI0.6
status: seed
year:
alphaxiv:
pdf:
code:
created: 2026-04-29
---

# PI0.6

## Navigation
- Paper note: [PI0.6 note](../notes/pi06-note.md)

## Core Insight

## Why It Matters

## Improvement Ideas

## References
- AlphaXiv:
- PDF:
- Code:
```

Do not mark this step complete until the real AlphaXiv URL for this paper has been added under both `alphaxiv:` and `- AlphaXiv:`.

- [ ] **Step 6: Verify note-card navigation and the paper base**

Run:

```powershell
rg --files .\papers
rg '^type: paper-card$' .\papers\cards -g '*.md'
rg '^type: paper-note$' .\papers\notes -g '*.md'
```

Expected:

- `papers/cards/pi05-card.md` and `papers/cards/pi06-card.md` exist.
- `papers/notes/pi05-note.md` and `papers/notes/pi06-note.md` exist.
- Obsidian opens note-card links in both directions.
- `views/paper-view.md` shows two paper rows after the vault index refreshes.

### Task 3: Seed the eight open-question notes

**Files:**
- Create: `questions/数据规模化.md`
- Create: `questions/Sim2Real Gap.md`
- Create: `questions/Generalization.md`
- Create: `questions/世界模型与物理因果理解.md`
- Create: `questions/闭环控制与实时性.md`
- Create: `questions/Continual learning.md`
- Create: `questions/评价体系 benchmark 与真实能力脱节.md`
- Create: `questions/安全 可解释性 与责任边界.md`

- [ ] **Step 1: Create the eight question files from the open-question template**

Create these files and insert `templates/open-question.md` into each one:

```text
questions/数据规模化.md
questions/Sim2Real Gap.md
questions/Generalization.md
questions/世界模型与物理因果理解.md
questions/闭环控制与实时性.md
questions/Continual learning.md
questions/评价体系 benchmark 与真实能力脱节.md
questions/安全 可解释性 与责任边界.md
```

Expected: every question becomes a first-class node in Obsidian rather than a heading inside one summary note.

- [ ] **Step 2: Write the first-pass descriptions for all eight question notes**

For each question file, complete these sections before moving on:

1. `## Why This Matters` with 2-4 sentences.
2. `## Problem Statement` with 2-4 sentences.
3. `## Evaluation Criteria` with at least 2 bullets.

Expected: each question note can stand on its own even before any paper links are added.

- [ ] **Step 3: Verify all question files exist**

Run:

```powershell
Get-ChildItem '.\questions' -Filter '*.md' | Measure-Object
rg '^type: open-question$' .\questions -g '*.md'
```

Expected: the question count is `8`, and every question file contains `type: open-question`.

### Task 4: Wire the graph edges from open questions to paper cards

**Files:**
- Modify: `questions/数据规模化.md`
- Modify: `questions/Sim2Real Gap.md`
- Modify: `questions/Generalization.md`
- Modify: `questions/世界模型与物理因果理解.md`
- Modify: `questions/闭环控制与实时性.md`
- Modify: `questions/Continual learning.md`
- Modify: `questions/评价体系 benchmark 与真实能力脱节.md`
- Modify: `questions/安全 可解释性 与责任边界.md`

- [ ] **Step 1: Add canonical question-to-paper links under `## Related Papers`**

Use standard Markdown links that point to paper cards, not paper notes.

Example:

```markdown
## Related Papers
- [PI0.5 card](../papers/cards/pi05-card.md)
- [PI0.6 card](../papers/cards/pi06-card.md)
```

Rule: the graph relationship is owned only by question notes. Do not duplicate the same links in paper cards if you want link direction to remain clean.

- [ ] **Step 2: Keep paper notes out of the graph edge model**

Do not add links like these under `## Related Papers`:

```markdown
- [PI0.5 note](../papers/notes/pi05-note.md)
- [PI0.6 note](../papers/notes/pi06-note.md)
```

Expected: the graph expresses conceptual links between questions and paper summaries, while `paper note` remains a private deep-reading layer.

- [ ] **Step 3: Configure the global Graph view to show only the knowledge map**

In Obsidian Graph view settings:

1. Set `Search files` to:

```text
path:questions OR path:papers/cards -path:papers/notes
```

2. Turn `Attachments` off.
3. Turn `Existing files only` on.
4. Turn `Orphans` off.
5. Turn `Arrows` on.

Expected: only open questions and paper cards remain visible in the graph, and arrows point from question files to paper cards.

- [ ] **Step 4: Create two graph color groups**

In `Graph view -> Groups`, add:

```text
path:questions
```

and

```text
path:papers/cards
```

Expected: question nodes and paper-card nodes are visually separated by color.

- [ ] **Step 5: Verify the graph edges**

Manual check in Obsidian:

1. Open the global graph.
2. Click one question node.
3. Confirm it connects only to the paper cards listed under `## Related Papers`.
4. Confirm `papers/notes/*` files do not appear in the graph.

Expected: the `big picture view` is rebuilt automatically from Markdown links, with no separate graph-maintenance file.

### Task 5: Add a minimal operating guide and run the workflow smoke test

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md` with the operating rules**

Write:

```markdown
# EmbodiedAI Knowledge Vault

## Note Types
- `papers/cards/`: structured paper entry points
- `papers/notes/`: freeform reading and implementation notes
- `questions/`: open questions that own the graph edges

## Operating Rules
1. Create one card and one note for every new paper.
2. Put AlphaXiv and the concise summary in the card.
3. Put freeform analysis only in the note file.
4. Add paper relationships only under `questions/* -> ## Related Papers`.
5. Link questions to `papers/cards/*`, never to `papers/notes/*`.
6. Use `views/paper-view.md` for the paper table and Graph view for the big picture.
```

- [ ] **Step 2: Run the paper-view smoke test**

Manual check in Obsidian:

1. Open `views/paper-view.md`.
2. Confirm the embedded base renders as a table.
3. Confirm `PI0.5` and `PI0.6` appear as rows.
4. Confirm clicking a row opens the corresponding card.

Expected: the `paper view` is usable without any plugin beyond Obsidian core features.

- [ ] **Step 3: Run the graph-view smoke test**

Manual check in Obsidian:

1. Open the global Graph view.
2. Confirm at least one question note links to at least one paper card.
3. Open a paper card and confirm the Backlinks pane shows which question notes mention it.

Expected: reverse navigation is available through Backlinks without duplicating question links inside paper cards.

- [ ] **Step 4: Run the file-level verification**

Run:

```powershell
rg --files .\papers
rg --files .\questions
rg --files .\templates
rg --files .\views
```

Expected:

- `papers/cards/` contains one file per paper card.
- `papers/notes/` contains one file per paper note.
- `questions/` contains one file per open question.
- `views/` contains `papers.base` and `paper-view.md`.

## Self-Review

**Spec coverage**

- `paper view`: covered by `views/papers.base` and `views/paper-view.md`.
- `big picture view`: covered by `Graph view` and the question-to-card linking rule.
- lightweight architecture: covered by the three-note-type model and the “question owns links” rule.
- easy add/delete/edit: covered by templates, folder layout, and the rule that graph edges come from normal Markdown links.
- AlphaXiv integration: covered by the card `alphaxiv` property and `References` section.
- Typora compatibility: covered by Markdown link mode instead of Wikilinks.

**Placeholder scan**

- The only intentionally blank values are content fields the user must fill with real paper metadata and note text during note creation.
- No `TODO`, `TBD`, or undefined file references remain in the plan.

**Type consistency**

- The three note types are consistently named `paper-card`, `paper-note`, and `open-question`.
- Graph ownership consistently stays in `questions/*`.
- `paper view` consistently reads only from `papers/cards/*`.
