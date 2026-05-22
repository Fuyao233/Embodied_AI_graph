# EmbodiedAI Knowledge Vault

## Note Types
- `papers/cards/`: structured paper entry points
- `papers/notes/`: freeform reading and implementation notes
- `questions/`: open questions that own the graph edges
- `insights/`: reusable claims backed by links, experiments, or work experience
- `codes/types/`: stable code category hubs that appear as graph-visible summary nodes
- `codes/readings/`: concrete source-reading notes that link directly to one or more code types

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

## Naming Convention
- Use lowercase `paper_id` values such as `pi05` and `pi06`.
- Paper card filename: `papers/cards/<paper_id>.md`
- Paper note filename: `papers/notes/<paper_id>-note.md`
- Keep the displayed title human-readable, for example `PI0.5`.

## Python Requirement
- Install Python 3.8+ and make sure `python` works in your terminal from the repo root.

## Adding Papers
Use the scaffold script to create a matching paper card and note:

```powershell
python scripts/new-paper.py --paper-id pi07 --title "π_{0.7}: a Steerable Generalist Robotic Foundation Model with Emergent Capabilities" --alphaxiv "https://www.alphaxiv.org/overview/xxxx"
```

Optional metadata can be filled during creation with `--year`, `--pdf`, and `--code`.
The script renders `templates/paper-card.md` and `templates/paper-note.md`, so those templates are the scaffold source of truth.



## Adding Insights

Use the insight scaffold script to create a working claim note:

```powershell
python scripts/new-insight.py --insight-id pretrain-not-fully-converged --claim "Pretraining need not fully converge for downstream performance"
```

The script renders `templates/insight.md`.
Use the `## Evidence` section for paper links, experiment references, or concise work experience notes.



## Adding Code Notes

Create code category notes from `templates/code-type.md` and concrete source-reading notes from `templates/code-reading.md`.

Use these rules:

1. Save category notes as `codes/types/<code_id>.md`.
2. Save reading notes as `codes/readings/<reading_id>.md`.
3. Put code-type links only under `## Related Code Types`.
4. Link code types with canonical paths such as `../types/infra.md`.
5. Use the global Graph view to inspect the code-type and code-reading subgraph alongside question and paper-card nodes.

## Auditing Completeness
Run the vault integrity checker from the repo root:

```powershell
python scripts/check-vault.py
```

It verifies that every paper card has a matching note, every note has a matching card, card-note links are mutual, paper cards contain the required frontmatter for `views/paper-view.md`, question files link only to canonical `../papers/cards/<paper_id>.md` targets, code-type files contain the required frontmatter, and code-reading files link to canonical `../types/<code_id>.md` targets.
The script exits with `0` and prints `Vault check passed.` when no issues are found, or exits with `1` and prints the collected `[ERROR]` lines followed by `Vault check failed with <n> issue(s).`.

## Running Tests
Run the Python regression suite from the repo root:

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

