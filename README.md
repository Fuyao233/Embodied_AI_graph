# EmbodiedAI Knowledge Vault

## Note Types
- `papers/cards/`: structured paper entry points
- `papers/notes/`: freeform reading and implementation notes
- `questions/`: open questions that own the graph edges

## Operating Rules
1. Create one card and one note for every new paper.
2. Create new paper cards, paper notes, and question notes from the templates in `templates/`, not from blank files.
3. Put AlphaXiv and the concise summary in the card.
4. Put freeform analysis only in the note file.
5. Add paper relationships only under `questions/* -> ## Related Papers`.
6. Every card must link to its note using `../notes/<paper_id>-note.md`.
7. Every note must link back to its card using `../cards/<paper_id>.md`.
8. Every question must link only to `../papers/cards/<paper_id>.md`.
9. Use `views/paper-view.md` for the paper table and Graph view for the big picture.

## Naming Convention
- Use lowercase `paper_id` values such as `pi05` and `pi06`.
- Paper card filename: `papers/cards/<paper_id>.md`
- Paper note filename: `papers/notes/<paper_id>-note.md`
- Keep the displayed title human-readable, for example `PI0.5`.

## Adding Papers
Use the scaffold script to create a matching paper card and note:

```powershell
.\scripts\new-paper.ps1 -PaperId pi07 -Title "PI0.7" -AlphaXiv "https://www.alphaxiv.org/overview/xxxx"
```

Optional metadata can be filled during creation with `-Year`, `-Pdf`, and `-Code`.
The script renders `templates/paper-card.md` and `templates/paper-note.md`, so those templates are the scaffold source of truth.

## Auditing Completeness
Run the vault integrity checker from the repo root:

```powershell
.\scripts\check-vault.ps1
```

It verifies that every paper card has a matching note, every note has a matching card, card-note links are mutual, paper cards contain the required frontmatter for `views/paper-view.md`, and question files link only to canonical `../papers/cards/<paper_id>.md` targets.
The script exits with `0` and prints `Vault check passed.` when no issues are found, or exits with `1` and prints the collected `[ERROR]` lines followed by `Vault check failed with <n> issue(s).`.

## Obsidian Setup
- Enable the Bases and Templates core plugins.
- Set the template folder to `templates`.
- Turn wikilinks off and automatic link updates on.
- Use Graph search filter: `path:/^questions\// OR path:/^papers\/cards\//`.
- Keep `showOrphans` enabled so unlinked open questions still appear in the scoped graph.
- Set Graph node size multiplier to `1.6` for easier scanning.
- Add Graph color groups so `path:/^questions\//` nodes render blue and `path:/^papers\/cards\//` nodes render orange.
- `views/paper-view.md` is Obsidian-only because it embeds the base view.

## Smoke Check
- Open `views/paper-view.md` and confirm `PI0.5` and `PI0.6` appear.
- Open Graph view and confirm these edges exist:
  - `数据规模化 -> PI0.6`
  - `闭环控制与实时性 -> PI0.5`
- Open a paper card and confirm Backlinks shows the related question note.
