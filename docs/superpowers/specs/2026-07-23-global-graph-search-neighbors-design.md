# Global Graph Search Neighbors Design

## Problem

Global Graph Search currently turns `Ctrl+F` into a temporary full-vault search and restores the repository's four-directory allowlist on `Escape`. During that search, Obsidian still uses the global graph's normal filtering behavior:

- orphan files remain hidden when `showOrphans` is false;
- a text query shows matching nodes but does not retain their directly connected context;
- the global graph has no native equivalent of the local graph's `localJumps: 1` option.

The search mode should expose orphan files and show each match together with its direct inbound and outbound neighbors, without changing the default graph after the search ends.

## Goals

- On `Ctrl+F`, temporarily set `showOrphans` to `true`.
- Keep using Obsidian's built-in global graph search input and query syntax.
- Include every matched node's direct outgoing-link and incoming-link neighbors.
- For multiple matches, show the union of all matches and their one-hop neighbors.
- Allow orphan files to be found by the search query.
- Keep the input displaying only the user's original query.
- On `Escape`, restore the default filter and the exact previous `showOrphans` value.
- Cancel stale calculations when the user types quickly or exits search.
- Preserve behavior outside the global Graph View.

## Non-goals

- Supporting neighbor depths greater than one.
- Replacing Obsidian's graph renderer or query parser.
- Opening a local graph.
- Adding a general graph-query or preset editor.
- Showing non-file nodes as expanded neighbors.

## Confirmed Interaction

The one-hop neighborhood of a matched node consists of every file it links to and every file that links to it. For multiple matches, the visible set is:

```text
all matches ∪ all direct incoming neighbors ∪ all direct outgoing neighbors
```

Orphan visibility is temporary. `Ctrl+F` enables it for the session, and `Escape` restores the previous setting rather than always forcing it off.

## Considered Approaches

### 1. Two-phase native graph search (selected)

Use Obsidian's native input to resolve the raw query. After the graph renders the matches, compute their direct neighbors from the metadata cache and apply an internal exact-path filter for the expanded set. Keep the input's visible value equal to the raw query.

Advantages:

- Preserves Obsidian's existing query syntax and UI.
- Supports multiple matches and bidirectional neighbors.
- Reuses native matching instead of implementing another parser.
- Fits the existing plugin architecture.

Risks:

- Requires a second graph update after the native match render.
- Uses private renderer and DOM details that may change in future Obsidian versions.
- Must distinguish user input from plugin-generated filter updates.

### 2. Plugin-owned search box

Intercept `Ctrl+F`, prevent native search, and render a custom input.

Rejected because it duplicates Obsidian's UI and query parser and creates inconsistent behavior.

### 3. Depth-one local graph

Open a local graph with `localJumps: 1` for one result.

Rejected because it cannot represent multiple matches and changes the user's view.

## Architecture

### Search session state

`SearchSessionController` owns:

- the active graph leaf;
- the original `showOrphans` value;
- the raw user query;
- a revision number that invalidates stale work.

It restores the default filter and saved orphan setting on `Escape`, graph closure, plugin unload, or startup recovery.

### Graph compatibility adapter

`GraphAdapter` gains operations for:

- reading and patching multiple graph options atomically;
- reading and writing the native input value;
- attaching and disposing an input listener;
- reading node IDs from the latest native render;
- waiting until rendered IDs are stable across animation frames.

All private Graph View properties and DOM selectors remain isolated here.

### One-hop neighbor expansion

A pure `NeighborExpander` receives the native match set and `metadataCache.resolvedLinks`. It builds or reuses a reverse-link index, then returns matches plus outgoing targets and incoming sources.

The reverse index is invalidated when the metadata cache emits `resolved`.

## Search Data Flow

### Entering search

1. Confirm the active leaf is the global Graph View.
2. Save the current `showOrphans` value.
3. Start a new revision.
4. Patch options with `search: ""` and `showOrphans: true`.
5. Open and focus the native input.
6. Attach the session input listener.

An empty query displays the full vault, including orphan files.

### Processing a non-empty query

1. Record the exact raw input.
2. Increment the revision.
3. Allow Obsidian to apply the raw query normally.
4. Wait until renderer node IDs stabilize across animation frames.
5. Treat rendered file IDs as the native match set.
6. Expand the set through incoming and outgoing resolved links.
7. Build one anchored exact-path query for the expanded set.
8. Apply it as an internal graph update.
9. Restore the visible input to the raw query without emitting another input event.

The exact-path filter uses one escaped regular-expression alternation:

```text
path:/^(?:path-one\.md|folder\/path-two\.md)$/
```

Every regex metacharacter in a path is escaped.

### Processing an empty query

Cancel pending expansion and set the internal graph search option to an empty string. The graph shows all eligible files, including orphans.

### Exiting search

1. Increment the revision to invalidate pending work.
2. Remove the input listener.
3. Restore the four-directory default filter.
4. Restore the saved `showOrphans` value.
5. Clear session state.

Manual filter edits remain compatible with the existing fallback: `Escape` in an active global graph restores defaults even without a `Ctrl+F` session.

## Stability and Cancellation

Renderer stabilization uses animation frames rather than a fixed sleep. It waits for the node-ID set to remain unchanged for consecutive frames, with a bounded maximum.

Every continuation captures the current revision and exits if:

- a newer query was typed;
- `Escape` ended the session;
- the graph leaf closed;
- another graph became the search leaf.

Plugin-generated updates are marked so they do not start another raw-query expansion cycle.

## Error Handling and Fallback

- If renderer or input access fails, leave the native raw-query result visible.
- If neighbor expansion fails, keep native matches rather than clearing the graph.
- Missing resolved-link entries mean no outgoing neighbors; incoming neighbors may still exist.
- Ignore tags, unresolved placeholders, and other non-file renderer nodes.
- Repeated option application remains idempotent.
- Log concise compatibility warnings without interrupting keyboard behavior.

## Performance

- Build the reverse-link index lazily.
- Reuse it until metadata resolution invalidates it.
- Use `Set` objects for union operations.
- Generate one path-regex query rather than many `OR` clauses.
- Cancel superseded renderer waits through revision checks.

## Testing Strategy

### Pure unit tests

- A match includes itself, outgoing targets, and incoming sources.
- Multiple matches produce a deduplicated union.
- A matching orphan remains visible.
- Missing link entries do not throw.
- Path query generation escapes regex metacharacters.

### Session tests

- `Ctrl+F` saves and enables orphan visibility.
- `Escape` restores the filter and exact previous orphan setting.
- Empty query leaves the graph unfiltered.
- A newer query invalidates older expansion.
- Manual filter editing followed by `Escape` still restores defaults.

### Adapter and bundled-runtime tests

- Bundled `main.js` loads under Obsidian's restricted `require`.
- Input listeners attach and dispose with the session.
- Internal updates preserve the visible raw query.
- Renderer stabilization stops for stale revisions.
- Keyboard listening remains on `window` capture.

### Manual verification

1. Start with orphan visibility off and the default filter active.
2. Press `Ctrl+F`; confirm orphan visibility turns on.
3. Search for a linked card; confirm it and all direct neighbors appear.
4. Search for multiple files; confirm their neighborhoods are unioned.
5. Search for an orphan file; confirm it appears.
6. Press `Escape`; confirm the default filter and prior orphan setting return.
7. Type several queries quickly; confirm stale results never overwrite the latest query.

## Acceptance Criteria

- `Ctrl+F` temporarily enables orphan visibility.
- Native graph-query syntax remains usable.
- Matches include every direct incoming and outgoing file neighbor.
- Multiple matches show a deduplicated union.
- The visible input never exposes the expanded path query.
- Empty search shows the full vault including orphans.
- `Escape` restores the default filter and previous orphan setting.
- Stale expansion cannot overwrite a newer query or restored graph.
- Existing non-graph and manual-`Escape` behavior remains unchanged.
