# Code Reading Note Type Design

## Goal

Extend the vault with a new code-oriented note system that lets source-reading notes appear as first-class graph nodes without disturbing the existing paper workflow.

The new system should support a "general to specific" structure:

- `code-type` notes act as stable category hubs such as `Infra`, `VLM`, `VLA`, or `Worldmodel`
- `code-reading` notes capture concrete source-reading notes and connect directly to one or more `code-type` hubs

The resulting graph should show code categories and code-reading notes as separate node classes alongside the existing `open-question` and `paper-card` nodes.

## Scope

This change includes:

- a new `codes/types/` directory
- a new `codes/readings/` directory
- two new note templates:
  - `templates/code-type.md`
  - `templates/code-reading.md`
- graph configuration updates so the new directories appear in the existing global graph
- vault validation updates for the new note types and canonical link rules
- regression tests for the new validation behavior
- README updates that document the new note types and graph rules

This change does not include:

- a new scaffold script for code notes
- changes to `views/papers.base` or the paper table
- refactoring the existing paper-question graph model into a more abstract shared schema
- enforcing a fixed whitelist of code categories

## Product Positioning

The vault now has two parallel graph subsystems:

- paper subsystem:
  - `questions/*.md` own links to `papers/cards/*.md`
- code subsystem:
  - `codes/readings/*.md` own links to `codes/types/*.md`

They coexist in one global graph, but their structural rules remain separate. This keeps the current paper workflow intact while adding a second way to organize research knowledge around source code.

## Directory Layout

The vault directory structure gains:

- `codes/types/`
- `codes/readings/`

No new view directory or configuration directory is needed.

## Note Types

### Code type

- Path: `codes/types/<code_id>.md`
- Purpose: stable category hub for a code topic
- Required frontmatter:
  - `type: code-type`
  - `code_id`
  - `title`
- Body sections:
  - `# <title>`
  - `## Why This Matters`
  - `## Scope`
  - `## Related Concepts`

`code-type` notes are intentionally lightweight. They are not expected to maintain manual backlinks to every reading note under them.

### Code reading

- Path: `codes/readings/<reading_id>.md`
- Purpose: concrete source-reading note for one repository area, module, subsystem, or implementation topic
- Required frontmatter:
  - `type: code-reading`
  - `reading_id`
  - `title`
- Body sections:
  - `# <title>`
  - `## Context`
  - `## Reading Notes`
  - `## Related Code Types`
  - `## Follow-up`

`code-reading` replaces the need for a separate code card. The reading note itself is the graph-visible concrete node.

## Identifier Rules

Identifiers stay aligned with the existing vault conventions:

- `code_id`
- `reading_id`

Validation pattern:

- `^[a-z0-9][a-z0-9.-]*$`

This keeps filenames stable, script-friendly, and consistent with `paper_id`.

## Relationship Rules

The code subsystem follows a strict ownership rule:

- `code-reading` notes own graph edges to `code-type` notes
- `code-type` notes do not need to manually link back to `code-reading` notes
- `code-reading` notes may link to multiple `code-type` notes
- local Markdown links from `code-reading` notes to code-type notes must use canonical targets in the form `../types/<code_id>.md`

This mirrors the current paper rule where `open-question` notes own links to `paper-card` notes.

## Graph Model

The global graph should continue to be the main high-level view of the vault. It should now include four visible node classes:

- `questions/*`
- `papers/cards/*`
- `codes/types/*`
- `codes/readings/*`

The global graph filter should expand from:

- `path:/^questions\// OR path:/^papers\/cards\//`

to:

- `path:/^questions\// OR path:/^papers\/cards\// OR path:/^codes\/types\// OR path:/^codes\/readings\//`

Graph defaults should preserve the current behavior:

- keep `papers/notes/*` out of the global graph
- keep `insights/*`, `docs/*`, and `templates/*` out of the global graph
- keep `showArrow` unchanged

The graph color groups should expand from two groups to four groups:

- questions
- paper cards
- code types
- code readings

This keeps the code subsystem legible without weakening the original question-to-paper picture.

## Templates

Two new templates should be added.

### `templates/code-type.md`

This template should:

- render the required frontmatter for `code-type`
- scaffold a short category note with stable section headings
- stay lightweight so users can add new code categories quickly

### `templates/code-reading.md`

This template should:

- render the required frontmatter for `code-reading`
- always include `## Related Code Types`
- instruct the user, by example or placeholder, to link canonical targets such as `../types/infra.md`

Version 1 should rely on templates rather than adding a new scaffold CLI. The change is structurally important but operationally small enough that a new command would expand scope unnecessarily.

## Validation Design

`scripts/check-vault.py` should be extended to validate the code subsystem in parallel with the existing paper subsystem.

Validation should cover:

- each `codes/types/*.md` file has required `code-type` frontmatter
- each `codes/readings/*.md` file has required `code-reading` frontmatter
- each `code-reading` file contains at least one canonical code-type target
- local Markdown links in `code-reading` notes that point to code-type notes use only canonical `../types/<code_id>.md` paths

Validation should not require:

- every `code-type` to have at least one inbound reading immediately
- every `code-reading` to map to exactly one type
- semantic correctness of prose content

The existing paper checks must remain unchanged.

## Shared Utility Changes

`scripts/_vault_common.py` should gain helper functions parallel to the existing paper-card frontmatter checks so the validator can stay readable.

Recommended additions:

- a generic helper for checking required frontmatter fields by note type, or
- dedicated helpers for:
  - `has_required_code_type_frontmatter`
  - `has_required_code_reading_frontmatter`

Either approach is acceptable as long as the implementation stays explicit and testable.

## README Changes

`README.md` should be updated to document:

- the two new note directories
- the purpose of `code-type` and `code-reading`
- the rule that `code-reading` notes link to `codes/types/*`
- the fact that the global graph now includes four structural node classes

The README should continue to describe the paper subsystem separately so users do not confuse paper rules with code rules.

## Testing

Regression tests should cover at least these cases:

- valid `code-type` and `code-reading` files pass validation
- missing required frontmatter in a code-type file fails validation
- missing required frontmatter in a code-reading file fails validation
- a code-reading file with no canonical code-type target fails validation
- a code-reading file with a non-canonical local target fails validation
- a code-reading file with multiple canonical code-type targets passes validation

Graph behavior should be checked at file level by asserting the intended `.obsidian/graph.json` shape in the repository. It does not require automated UI testing.

## Error Handling

Validation errors should stay user-facing and path-specific, following the current checker style.

Examples of desired error categories:

- missing required frontmatter
- missing required code-type link
- non-canonical code-type target

The checker should continue collecting all errors before exiting.

## Risks

- If canonical-link validation is too broad, unrelated local Markdown links inside code-reading notes could be treated as code-type violations
- If graph configuration is widened incorrectly, notes that should stay private may reappear in the main graph
- If the template examples are vague, users may create structurally valid files with inconsistent naming habits

These risks are manageable because the repository already has a clear validator-and-template pattern to extend.

## Success Criteria

This design is successful when a user can:

- create a new `code-type` note from a template
- create a new `code-reading` note from a template
- link the reading note to one or more code types through canonical `../types/*.md` paths
- open the global graph and see code categories and code readings as distinct node classes
- run `python scripts/check-vault.py` and get structural validation for the new subsystem without regressions in the paper subsystem
