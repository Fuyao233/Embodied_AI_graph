# Global Graph Search Neighbors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Global Graph Search so `Ctrl+F` temporarily shows orphans and expands native graph matches with all direct incoming and outgoing file neighbors.

**Architecture:** Keep Obsidian's native input as the raw-query resolver. Pure neighbor utilities expand native matches, an adapter isolates renderer and input internals, and the session controller saves/restores graph options while cancelling stale work. A small local bundler generates the self-contained `main.js` required by Obsidian from the tested source modules.

**Tech Stack:** Obsidian community plugin API, CommonJS JavaScript, Node.js 18 built-in test runner, Python `unittest` repository checks.

---

## File Map

- Create `.obsidian/plugins/global-graph-search/neighbor-expander.js`: reverse-link index, one-hop union, and exact-path query generation.
- Create `.obsidian/plugins/global-graph-search/neighbor-expander.test.js`: pure expansion and escaping tests.
- Create `.obsidian/plugins/global-graph-search/search-expansion-controller.js`: raw-input listener, native render wait, expansion, and cancellation.
- Create `.obsidian/plugins/global-graph-search/search-expansion-controller.test.js`: asynchronous expansion tests with fakes.
- Modify `.obsidian/plugins/global-graph-search/graph-adapter.js`: atomic option patches, input access, rendered IDs, and stabilization.
- Modify `.obsidian/plugins/global-graph-search/graph-adapter.test.js`: adapter coverage for new operations.
- Modify `.obsidian/plugins/global-graph-search/session-controller.js`: orphan snapshot/restore and expansion lifecycle.
- Modify `.obsidian/plugins/global-graph-search/session-controller.test.js`: session option tests.
- Create `.obsidian/plugins/global-graph-search/plugin-entry.js`: Obsidian lifecycle wiring using tested modules.
- Create `.obsidian/plugins/global-graph-search/build-main.js`: deterministic self-contained bundle generator.
- Modify `.obsidian/plugins/global-graph-search/main.js`: generated bundle.
- Modify `.obsidian/plugins/global-graph-search/main-bundle.test.js`: restricted-loader and runtime integration coverage.
- Modify `.obsidian/plugins/global-graph-search/manifest.json`: bump version to `1.1.0`.

### Task 1: Build one-hop neighbor expansion with TDD

**Files:**
- Create: `.obsidian/plugins/global-graph-search/neighbor-expander.test.js`
- Create: `.obsidian/plugins/global-graph-search/neighbor-expander.js`

- [ ] **Step 1: Write failing pure unit tests**

Create tests covering this public API:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildReverseLinks,
  expandOneHop,
  buildExactPathQuery,
} = require("./neighbor-expander");

test("expands matches through outgoing and incoming links", () => {
  const links = {
    "cards/A.md": { "notes/A-note.md": 1 },
    "questions/Q.md": { "cards/A.md": 1 },
  };
  const reverse = buildReverseLinks(links);

  assert.deepEqual(
    [...expandOneHop(new Set(["cards/A.md"]), links, reverse)].sort(),
    ["cards/A.md", "notes/A-note.md", "questions/Q.md"],
  );
});

test("deduplicates neighborhoods for multiple matches", () => {
  const links = {
    "cards/A.md": { "shared.md": 1 },
    "cards/B.md": { "shared.md": 1 },
  };
  const reverse = buildReverseLinks(links);
  const result = expandOneHop(
    new Set(["cards/A.md", "cards/B.md"]),
    links,
    reverse,
  );

  assert.deepEqual([...result].sort(), ["cards/A.md", "cards/B.md", "shared.md"]);
});

test("keeps a matching orphan", () => {
  assert.deepEqual(
    [...expandOneHop(new Set(["orphan.md"]), {}, new Map())],
    ["orphan.md"],
  );
});

test("builds a stable escaped exact-path query", () => {
  assert.equal(
    buildExactPathQuery(new Set(["folder/A+B.md", "plain.md"])),
    "path:/^(?:folder\\/A\\+B\\.md|plain\\.md)$/",
  );
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/neighbor-expander.test.js
```

Expected: FAIL with `Cannot find module './neighbor-expander'`.

- [ ] **Step 3: Implement the pure utility**

Create `.obsidian/plugins/global-graph-search/neighbor-expander.js`:

```javascript
function buildReverseLinks(resolvedLinks) {
  const reverse = new Map();
  for (const [source, targets] of Object.entries(resolvedLinks || {})) {
    for (const target of Object.keys(targets || {})) {
      if (!reverse.has(target)) reverse.set(target, new Set());
      reverse.get(target).add(source);
    }
  }
  return reverse;
}

function expandOneHop(matches, resolvedLinks, reverseLinks) {
  const expanded = new Set(matches);
  for (const match of matches) {
    for (const target of Object.keys(resolvedLinks?.[match] || {})) {
      expanded.add(target);
    }
    for (const source of reverseLinks.get(match) || []) {
      expanded.add(source);
    }
  }
  return expanded;
}

function escapeGraphPath(path) {
  return path.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function buildExactPathQuery(paths) {
  const alternatives = [...paths].sort().map(escapeGraphPath);
  return alternatives.length === 0
    ? ""
    : `path:/^(?:${alternatives.join("|")})$/`;
}

module.exports = { buildReverseLinks, expandOneHop, buildExactPathQuery };
```

- [ ] **Step 4: Run the tests and verify GREEN**

Run the Task 1 command. Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add .obsidian/plugins/global-graph-search/neighbor-expander.js .obsidian/plugins/global-graph-search/neighbor-expander.test.js
git commit -m "feat: add graph neighbor expansion"
```

### Task 2: Extend the Graph adapter with TDD

**Files:**
- Modify: `.obsidian/plugins/global-graph-search/graph-adapter.test.js`
- Modify: `.obsidian/plugins/global-graph-search/graph-adapter.js`

- [ ] **Step 1: Add failing adapter tests**

Add tests for these behaviors:

```javascript
test("patchOptions updates search and orphan visibility atomically", () => {
  const graph = makeLeaf({ options: { search: "old", showOrphans: false, scale: 2 } });
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(
    adapter.patchOptions(graph.leaf, { search: "", showOrphans: true }),
    true,
  );
  assert.deepEqual(graph.updates, [{ search: "", showOrphans: true, scale: 2 }]);
});

test("reads and writes the visible search input without dispatching", () => {
  const input = { value: "raw", focus() {}, addEventListener() {}, removeEventListener() {} };
  const graph = makeLeaf({ input });
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(adapter.getSearchInputValue(graph.leaf), "raw");
  assert.equal(adapter.setSearchInputValue(graph.leaf, "next"), true);
  assert.equal(input.value, "next");
});

test("returns rendered markdown file IDs only", () => {
  const graph = makeLeaf();
  graph.leaf.view.renderer = {
    nodes: [{ id: "cards/A.md" }, { id: "#tag" }, { id: "missing.md" }],
  };
  const adapter = new GraphAdapter({
    workspace: {},
    vault: {
      getAbstractFileByPath: (id) =>
        id === "cards/A.md" ? { path: id, extension: "md" } : null,
    },
  });

  assert.deepEqual(adapter.getRenderedFileIds(graph.leaf), new Set(["cards/A.md"]));
});
```

- [ ] **Step 2: Run adapter tests and verify RED**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/graph-adapter.test.js
```

Expected: FAIL because `patchOptions`, input access, and rendered ID access do not exist.

- [ ] **Step 3: Implement adapter operations**

Add `vault` to the constructor and implement:

```javascript
patchOptions(leaf, patch) {
  try {
    const engine = leaf?.view?.dataEngine;
    if (!engine?.getOptions || !engine?.setOptions) return false;
    const options = engine.getOptions() || {};
    if (Object.entries(patch).every(([key, value]) => options[key] === value)) return true;
    engine.setOptions({ ...options, ...patch });
    return true;
  } catch (error) {
    this.warn(`Global Graph Search: failed to update graph options: ${error}`);
    return false;
  }
}

setSearch(leaf, search) {
  return this.patchOptions(leaf, { search });
}

getSearchInput(leaf) {
  return leaf?.view?.containerEl?.querySelector?.(SEARCH_INPUT_SELECTOR) || null;
}

getSearchInputValue(leaf) {
  return this.getSearchInput(leaf)?.value ?? "";
}

setSearchInputValue(leaf, value) {
  const input = this.getSearchInput(leaf);
  if (!input) return false;
  input.value = value;
  return true;
}

listenSearchInput(leaf, listener) {
  const input = this.getSearchInput(leaf);
  if (!input) return () => {};
  input.addEventListener("input", listener);
  return () => input.removeEventListener("input", listener);
}

getRenderedFileIds(leaf) {
  const ids = new Set();
  for (const node of leaf?.view?.renderer?.nodes || []) {
    const file = this.vault?.getAbstractFileByPath?.(node.id);
    if (file?.path === node.id && file.extension === "md") ids.add(node.id);
  }
  return ids;
}
```

- [ ] **Step 4: Run adapter tests and verify GREEN**

Expected: all adapter tests pass.

- [ ] **Step 5: Commit**

```bash
git add .obsidian/plugins/global-graph-search/graph-adapter.js .obsidian/plugins/global-graph-search/graph-adapter.test.js
git commit -m "feat: expose graph search rendering state"
```

### Task 3: Add asynchronous search expansion and orphan restoration

**Files:**
- Create: `.obsidian/plugins/global-graph-search/search-expansion-controller.test.js`
- Create: `.obsidian/plugins/global-graph-search/search-expansion-controller.js`
- Modify: `.obsidian/plugins/global-graph-search/session-controller.test.js`
- Modify: `.obsidian/plugins/global-graph-search/session-controller.js`

- [ ] **Step 1: Write failing search-expansion tests**

Test that a non-empty raw query waits for native matches, expands them, applies an exact-path filter, and restores the raw visible input. Test that an empty query applies `search: ""`, and that `stop()` invalidates a pending revision.

The controller API is:

```javascript
const controller = new SearchExpansionController({
  adapter,
  getResolvedLinks: () => resolvedLinks,
  waitForStableIds: async (leaf, isCurrent) =>
    isCurrent() ? new Set(["cards/A.md"]) : new Set(),
});

controller.start(graphLeaf);
await controller.processRawQuery("A");
controller.stop();
controller.invalidateLinks();
```

Expected expanded patch:

```javascript
["patchOptions", graphLeaf, {
  search: "path:/^(?:cards\\/A\\.md|notes\\/A-note\\.md|questions\\/Q\\.md)$/",
}]
```

- [ ] **Step 2: Run the new tests and verify RED**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/search-expansion-controller.test.js
```

Expected: FAIL with missing module.

- [ ] **Step 3: Implement `SearchExpansionController`**

Implement session activation, input listener disposal, a query revision counter, cached reverse links, native render waiting, `expandOneHop`, `buildExactPathQuery`, and raw input restoration. `processRawQuery("")` must cancel earlier work and patch `{ search: "" }` immediately.

The stabilization helper must sample rendered IDs once per animation frame, return after two consecutive identical samples, and stop after 12 frames so an animation that never settles cannot leave a query pending forever. At every sample it must call `isCurrent()` and return an empty set immediately when the query revision is stale.

- [ ] **Step 4: Add failing session tests for orphan state**

Add assertions that `Ctrl+F` snapshots `showOrphans: false`, patches `{ search: "", showOrphans: true }`, starts expansion, and `Escape` stops expansion then patches `{ search: DEFAULT_FILTER, showOrphans: false }`. Add a second test proving an original `showOrphans: true` value is restored as true.

- [ ] **Step 5: Implement session integration**

Pass `expansionController` into `SearchSessionController`. On start, read options through the adapter, save `showOrphans`, patch both options, focus input, and start expansion. On end, stop expansion and restore both options for a real session; the manual-Escape fallback restores only `search`.

- [ ] **Step 6: Run all source tests**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/neighbor-expander.test.js .obsidian/plugins/global-graph-search/graph-adapter.test.js .obsidian/plugins/global-graph-search/search-expansion-controller.test.js .obsidian/plugins/global-graph-search/session-controller.test.js
```

Expected: all source tests pass.

- [ ] **Step 7: Commit**

```bash
git add .obsidian/plugins/global-graph-search/search-expansion-controller.js .obsidian/plugins/global-graph-search/search-expansion-controller.test.js .obsidian/plugins/global-graph-search/session-controller.js .obsidian/plugins/global-graph-search/session-controller.test.js
git commit -m "feat: expand graph search with direct neighbors"
```

### Task 4: Generate and verify the Obsidian bundle

**Files:**
- Create: `.obsidian/plugins/global-graph-search/plugin-entry.js`
- Create: `.obsidian/plugins/global-graph-search/build-main.js`
- Modify: `.obsidian/plugins/global-graph-search/main.js`
- Modify: `.obsidian/plugins/global-graph-search/main-bundle.test.js`
- Modify: `.obsidian/plugins/global-graph-search/manifest.json`

- [ ] **Step 1: Extract lifecycle wiring into `plugin-entry.js`**

The entry imports `Plugin`, `GraphAdapter`, `SearchSessionController`, and `SearchExpansionController`; constructs the adapter with `workspace` and `vault`; constructs expansion with `metadataCache.resolvedLinks`; invalidates its reverse index on metadata `resolved`; and preserves the existing `window` capture key listener.

- [ ] **Step 2: Create deterministic `build-main.js`**

Bundle these module IDs in order:

```javascript
const moduleFiles = [
  "neighbor-expander.js",
  "graph-adapter.js",
  "search-expansion-controller.js",
  "session-controller.js",
  "plugin-entry.js",
];
```

Generate `main.js` with an internal module table and `localRequire`. Only `localRequire("obsidian")` delegates to the external Obsidian `require`; every relative module resolves from the table. End with:

```javascript
module.exports = localRequire("./plugin-entry");
```

- [ ] **Step 3: Run the bundle generator**

```bash
node .obsidian/plugins/global-graph-search/build-main.js
```

Expected: `main.js` changes and contains no external relative `require` calls.

- [ ] **Step 4: Extend bundled-runtime tests**

Verify restricted loading, `window` capture registration, `showOrphans: true` on Ctrl+F, expanded one-hop filter application, raw input preservation, and exact orphan restoration on `Escape`.

- [ ] **Step 5: Bump manifest version**

Set:

```json
"version": "1.1.0"
```

- [ ] **Step 6: Run bundle and repository checks**

```bash
node --test .obsidian/plugins/global-graph-search/*.test.js
node --check .obsidian/plugins/global-graph-search/main.js
python -m unittest tests.test_repository_files.RepositoryFileTests.test_global_graph_search_plugin_is_installed_and_enabled -v
```

Expected: all plugin tests and the repository contract test pass.

- [ ] **Step 7: Commit**

```bash
git add .obsidian/plugins/global-graph-search
git commit -m "CTRL+F 优化"
git push origin main
```

Expected: only the plugin source, tests, generated bundle, and manifest are included in the feature commit; unrelated vault edits remain unstaged.
