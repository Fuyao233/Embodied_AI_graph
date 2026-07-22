# Temporary Global Graph Search Design

## Problem

The global Graph View normally uses this allowlist filter:

```text
path:/^questions\// OR path:/^papers\/cards\// OR path:/^codes\/types\// OR path:/^codes\/readings\//
```

This keeps detailed paper notes and other linked files out of the default graph. In Obsidian's Graph View, `Ctrl+F` uses the same `search` option that stores this persistent filter. Entering graph search therefore clears or replaces the allowlist. Because paper cards link to paper notes, those notes are not orphans and become visible when the filter is empty.

The desired behavior is to retain the focused default graph while allowing `Ctrl+F` to search every graph node temporarily.

## Goals

- Keep the existing four-directory allowlist as the default global graph filter.
- In an active global Graph View, make `Ctrl+F` start a temporary full-vault graph search.
- Preserve Obsidian's normal graph-search experience and make all nodes searchable during that session.
- Restore the allowlist when the user presses `Escape`.
- Recover the allowlist after plugin reload, Obsidian restart, graph closure, or an interrupted search session.
- Leave `Ctrl+F` unchanged outside a global Graph View.
- Coexist with the existing Persistent Graph plugin, which remains responsible for node positions.

## Non-goals

- Changing local graph behavior.
- Hiding notes through CSS or changing note links.
- Replacing Obsidian's graph renderer or search implementation.
- Adding a general-purpose graph-filter preset manager.
- Modifying the third-party Persistent Graph plugin.

## Considered Approaches

### 1. Standalone local plugin (selected)

A small plugin manages a temporary graph-search session around Obsidian's existing `Ctrl+F` behavior. It stores the stable default filter separately, temporarily removes the filter for search, and restores it on `Escape`.

Advantages:

- Directly implements the requested keyboard behavior.
- Keeps third-party code untouched and upgrade-safe.
- Can recover from a stale empty filter on startup.
- Has a narrow, testable responsibility.

Risk:

- Obsidian does not expose all Graph View controls as a stable public API. Access to the graph view's data engine and search input must be isolated behind a small compatibility adapter.

### 2. Patch Persistent Graph

Persistent Graph already accesses graph internals, so it could be extended with the session behavior.

Rejected because its installed `main.js` is bundled third-party code. Editing it mixes position persistence with search behavior and an update could silently overwrite the change.

### 3. Separate graph tabs or workspaces

One graph could keep the allowlist while another graph remains unfiltered for searching.

Rejected because it changes the workflow, makes `Ctrl+F` context-dependent, duplicates graph state, and does not provide automatic `Escape` restoration.

## Architecture

Create a standalone community plugin at:

```text
.obsidian/plugins/temporary-global-graph-search/
```

The plugin has three logical units:

1. **Graph adapter**
   - Determines whether the active leaf is the global Graph View.
   - Reads and updates Graph View options through `view.dataEngine`.
   - Opens or focuses Obsidian's built-in graph-search input.
   - Contains all use of Obsidian graph internals and DOM selectors.

2. **Search-session controller**
   - Owns the runtime state: `idle` or `searching`.
   - Starts a session on `Ctrl+F` only when the global graph is active.
   - Restores the default filter on `Escape`.
   - Ignores repeated `Ctrl+F` presses while already searching so a temporary query can never replace the default filter.

3. **Settings and recovery**
   - Stores the default allowlist independently of `.obsidian/graph.json`.
   - Restores the allowlist when a graph opens, when the plugin unloads, and during startup recovery.
   - Does not store temporary search terms.

The initial stored filter is:

```text
path:/^questions\// OR path:/^papers\/cards\// OR path:/^codes\/types\// OR path:/^codes\/readings\//
```

No settings UI is included in the first version. The filter is kept in the plugin's `data.json`, which avoids adding UI unrelated to the requested workflow while keeping the value independent of Graph View's mutable search field.

## Event and State Flow

### Startup or graph open

1. Wait until the Obsidian workspace and graph renderer are ready.
2. Locate each global Graph View.
3. Set its search option to the stored default allowlist.
4. Mark the session controller as `idle`.

This also repairs `.obsidian/graph.json` if Obsidian previously closed while the temporary full-vault filter was active.

### `Ctrl+F` in a global Graph View

1. Verify that the active leaf is a global graph.
2. If the controller is already `searching`, keep the existing session and only refocus the search input.
3. Otherwise, mark the controller as `searching` before Obsidian can mutate the graph query.
4. Allow Obsidian's built-in `Ctrl+F` handling to open the graph-search interface.
5. In the next animation frame, explicitly set the graph search option to an empty string and focus the built-in input.
6. Subsequent typing uses Obsidian's native search parser against the full graph.

The empty search string is temporary runtime state and is never adopted as the default filter.

### `Escape` during a search session

1. Let Obsidian perform its normal dismissal behavior for the search input.
2. Restore the stored allowlist through the graph adapter.
3. Mark the controller as `idle`.
4. Ensure the graph rerenders using only allowed nodes.

`Escape` outside a graph-search session remains untouched.

### Interrupted session

If the graph leaf closes, the plugin unloads, or Obsidian restarts before `Escape` is pressed, the recovery path reapplies the stored allowlist. The next graph view therefore never begins in the temporary full-vault state.

## Interaction with Persistent Graph

Persistent Graph continues to save and restore node positions. Its `enableSaveOptions` setting stays disabled so it does not persist temporary search options. The new plugin does not read or modify Persistent Graph's `data.json`.

Restoring the allowlist changes the rendered node set. Persistent Graph may then reapply saved positions to the visible nodes as it already does; missing temporary nodes are harmless.

## Compatibility and Error Handling

- Keyboard listeners are registered and disposed through the Obsidian plugin lifecycle.
- The handler checks both the active leaf type and the required graph APIs before acting.
- If graph internals or the search input cannot be found, the plugin leaves the event to Obsidian and logs a concise warning instead of breaking `Ctrl+F` globally.
- DOM selectors and private API access live only in the graph adapter, so a future Obsidian compatibility update is localized.
- Restoration is idempotent: applying the allowlist multiple times has the same result as applying it once.

## Testing Strategy

The session controller will be separated from Obsidian-specific access so its state transitions can be tested with a fake graph adapter.

Required cases:

1. Startup applies the default allowlist.
2. `Ctrl+F` in a global graph begins a search session and clears only the runtime filter.
3. `Ctrl+F` outside a global graph is ignored.
4. A repeated `Ctrl+F` does not overwrite the stored allowlist.
5. `Escape` restores the allowlist and ends the session.
6. `Escape` while idle is ignored.
7. Graph closure or plugin unload during a session restores the allowlist.
8. Missing graph internals fail safely without intercepting unrelated search behavior.
9. Existing repository tests continue to pass.

Manual verification in Obsidian will confirm the native UI integration:

1. Open the global graph and confirm paper-note nodes are absent.
2. Press `Ctrl+F` and search for a known `papers/notes/` node.
3. Confirm that the note appears and can be selected.
4. Press `Escape` and confirm the graph returns to the four-directory allowlist.
5. Repeat the flow twice to confirm the default filter is not replaced.
6. Start a search, reload Obsidian without pressing `Escape`, and confirm the allowlist is recovered.

## Acceptance Criteria

- The default global graph shows only `questions/`, `papers/cards/`, `codes/types/`, and `codes/readings/` nodes permitted by the existing filter.
- `Ctrl+F` from the global graph can find linked nodes outside those directories.
- Pressing `Escape` reliably restores the default graph without requiring query pasting.
- Search sessions cannot permanently clear or replace the stored allowlist.
- Non-graph `Ctrl+F` behavior is unchanged.
- Restart and reload recovery restore the allowlist.
- Persistent Graph position restoration continues to work.
