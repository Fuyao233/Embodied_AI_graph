# Obsidian Paper Vault Plugin Design

## Goal

Create a standalone Obsidian community plugin, developed in a sibling directory to this repository, that scaffolds and validates a fixed paper-research vault structure inside an Obsidian vault.

The plugin is paper-focused but domain-agnostic. It does not target embodied AI specifically, and it intentionally depends on Obsidian as the host environment.

## Product Positioning

This project is an Obsidian plugin first, not a generic Markdown library and not a full paper management system.

The plugin should help a researcher:

- initialize a consistent vault layout
- create canonical note pairs for papers
- create stable research-question and claim notes
- keep graph links and frontmatter structurally correct

It should not try to replace reference managers, PDF readers, or literature search tools in version 1.

## Scope

Version 1 includes:

- one Obsidian community plugin project in a sibling directory, using the working folder name `D:\obsidian-paper-vault-plugin`
- five commands:
  - `Initialize Paper Vault`
  - `New Paper`
  - `New Question`
  - `New Claim`
  - `Validate Paper Vault`
- a fixed note schema with four note types:
  - `paper-card`
  - `paper-note`
  - `open-question`
  - `claim`
- built-in template rendering inside the plugin code
- validation for canonical filenames, frontmatter, and core links

Version 1 explicitly excludes:

- arXiv, DOI, Crossref, or Semantic Scholar metadata fetching
- PDF import, attachment management, or annotation sync
- custom database layers beyond Markdown files and frontmatter
- user-defined schemas, user-defined paths, or arbitrary note-type configuration
- custom Obsidian views, dashboards, or ribbon-heavy UI
- mobile-specific UI work beyond basic command compatibility

## Target Vault Model

### Directory layout

The plugin initializes these directories inside the active Obsidian vault:

- `papers/cards/`
- `papers/notes/`
- `questions/`
- `claims/`

No additional configuration directory is required in version 1.

### Note types

#### Paper card

- Path: `papers/cards/<paper_id>.md`
- Purpose: structured entry point for one paper
- Required frontmatter:
  - `type: paper-card`
  - `paper_id`
  - `title`
  - `status`
  - `year`
  - `venue`
  - `source`
  - `pdf`
  - `code`
  - `created`
- Body sections:
  - `# <title>`
  - `## Navigation`
  - `## Core Insight`
  - `## Why It Matters`
  - `## Related Questions`
  - `## Related Claims`
  - `## References`

#### Paper note

- Path: `papers/notes/<paper_id>-note.md`
- Purpose: freeform reading and implementation notes for one paper
- Required frontmatter:
  - `type: paper-note`
  - `paper_id`
  - `created`
- Body sections:
  - `# <title> Note`
  - `## Navigation`
  - `## Reading Notes`
  - `## Technical Details`
  - `## Questions`
  - `## Follow-up`

#### Open question

- Path: `questions/<question_id>.md`
- Purpose: stable research-question node that can connect multiple papers and claims
- Required frontmatter:
  - `type: open-question`
  - `question_id`
  - `title`
  - `status`
  - `created`
- Body sections:
  - `# <title>`
  - `## Why This Matters`
  - `## Problem Statement`
  - `## Evaluation Criteria`
  - `## Related Papers`
  - `## Next Checks`

#### Claim

- Path: `claims/<claim_id>.md`
- Purpose: reusable research claim that can aggregate evidence across papers
- Required frontmatter:
  - `type: claim`
  - `claim_id`
  - `claim`
  - `status`
  - `created`
- Body sections:
  - `# <claim>`
  - `## Why It Matters`
  - `## Evidence`
  - `## Counterevidence`
  - `## Related Papers`
  - `## Related Questions`
  - `## Open Follow-up`

### Identifier rules

Identifiers are ASCII-only, lowercase, and stable:

- `paper_id`
- `question_id`
- `claim_id`

Validation pattern:

- `^[a-z0-9][a-z0-9.-]*$`

Human-readable text belongs in `title` or `claim`, not in filenames. This keeps paths predictable across operating systems and makes validation logic simple.

## Relationship Rules

The graph model is intentionally strict in version 1:

- Every paper must have both a `paper-card` and a `paper-note`
- Every `paper-card` must link to `../notes/<paper_id>-note.md`
- Every `paper-note` must link to `../cards/<paper_id>.md`
- `open-question` notes may link to papers only through canonical card paths in `## Related Papers`
- `claim` notes may link to papers only through canonical card paths in `## Related Papers`
- `claim` notes may link to questions only through canonical paths in `## Related Questions`

Version 1 does not attempt to validate semantic correctness of prose content. It only validates structural correctness.

## Command Design

### Initialize Paper Vault

Purpose:

- create the canonical folder layout for the active vault
- make later commands deterministic

Behavior:

- check whether the four required directories already exist
- create any missing directories
- do not overwrite user files
- show a success notice summarizing what was created
- if everything already exists, show a no-op success notice

Version 1 does not create sample notes, dashboards, or views during initialization.

### New Paper

Purpose:

- create the canonical paper pair in one action

Prompt fields:

- `paper_id`
- `title`
- `source`
- optional `year`
- optional `venue`
- optional `pdf`
- optional `code`
- optional `status`, default `seed`

Behavior:

- require the vault to be initialized first
- normalize `paper_id` to lowercase
- validate identifier format
- reject empty `title` and empty `source`
- compute both target paths before writing
- fail if either target file already exists
- render both files from built-in templates
- insert mutual links between card and note
- write both files as UTF-8
- open the created card file after success

Safety rule:

- if any preflight check fails, write nothing
- if one file write succeeds and the second fails unexpectedly, attempt cleanup of the first file and report the failure

### New Question

Purpose:

- create a stable question node with a canonical filename

Prompt fields:

- `question_id`
- `title`
- optional `status`, default `open`

Behavior:

- require the vault to be initialized first
- normalize `question_id` to lowercase
- validate identifier format
- reject empty `title`
- fail if the target file already exists
- render the question note from the built-in template
- open the created file after success

### New Claim

Purpose:

- create a reusable research claim note

Prompt fields:

- `claim_id`
- `claim`
- optional `status`, default `seed`

Behavior:

- require the vault to be initialized first
- normalize `claim_id` to lowercase
- validate identifier format
- reject empty `claim`
- fail if the target file already exists
- render the claim note from the built-in template
- open the created file after success

### Validate Paper Vault

Purpose:

- give the user a fast structural integrity check

Behavior:

- scan the four canonical folders
- collect all validation errors before reporting
- show success when no issues are found
- show a modal or report view with all errors when issues exist
- keep messages user-facing and path-specific

The command should not mutate files in version 1. It only reports problems.

## Validation Rules

Version 1 validation covers:

- required directories exist
- each `papers/cards/*.md` file has a matching `papers/notes/*-note.md`
- each `papers/notes/*-note.md` file has a matching `papers/cards/*.md`
- each paper card contains the required paper-card frontmatter keys
- each paper note contains the required paper-note frontmatter keys
- each question file contains the required open-question frontmatter keys
- each claim file contains the required claim frontmatter keys
- each paper card links to its canonical note path
- each paper note links to its canonical card path
- each question filename stem matches `question_id`
- each claim filename stem matches `claim_id`
- local Markdown links in `## Related Papers` inside questions point only to `../papers/cards/<paper_id>.md`
- local Markdown links in `## Related Papers` inside claims point only to `../papers/cards/<paper_id>.md`
- local Markdown links in `## Related Questions` inside claims point only to `../questions/<question_id>.md`

Validation does not require backlink completeness from questions and claims in version 1. That would make normal note-taking too rigid for the first release.

## Plugin Architecture

The plugin should stay small and composable. Use focused modules rather than a single large `main.ts`.

Recommended responsibilities:

- plugin bootstrap
  - register commands
  - wire shared services
- schema module
  - canonical folder names
  - frontmatter field lists
  - identifier regex
- template module
  - string builders for each note type
- path module
  - canonical file path helpers
  - id normalization helpers
- modal module
  - command input forms
- vault service module
  - file existence checks
  - directory creation
  - file writing and opening
- validator module
  - directory checks
  - frontmatter checks
  - link checks
  - issue aggregation

## Error Handling

User-facing behavior should be strict and explicit:

- invalid identifiers should produce a clear validation error
- duplicate target paths should stop creation immediately
- missing initialization should instruct the user to run `Initialize Paper Vault`
- validation output should list every detected issue, not stop at the first one
- unexpected file-system failures should preserve the vault as much as possible and report the attempted paths

## Tech Stack

Use the standard Obsidian community plugin stack:

- TypeScript
- Obsidian plugin API
- Node-based build tooling from the official sample-plugin workflow

No external runtime dependency is required in version 1 beyond what the plugin bundler already needs.

## Risks

- Obsidian frontmatter parsing and raw Markdown parsing can diverge if validation relies on brittle text matching
- canonical path checks must handle Windows and POSIX separators consistently
- partial file creation must be guarded so `New Paper` does not leave an orphan card or note behind
- keeping all templates inside code improves packaging simplicity, but increases the need for clean template tests

## Success Criteria

Version 1 is successful when a user can:

- install the plugin in Obsidian
- run `Initialize Paper Vault` in an empty vault
- create a paper pair, a question, and a claim without touching raw templates
- run `Validate Paper Vault` and get actionable structural errors
- inspect the resulting Markdown files and see a clean, predictable schema
