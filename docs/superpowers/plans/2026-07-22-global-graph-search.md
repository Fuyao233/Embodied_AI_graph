# Global Graph Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Obsidian plugin that makes `Ctrl+F` temporarily search every global-graph node and restores the repository's four-directory allowlist when `Escape` is pressed.

**Architecture:** A pure JavaScript session controller owns the `idle`/`searching` state and is unit-tested without Obsidian. A graph adapter isolates private Graph View APIs and DOM selectors. A thin Obsidian plugin entry point wires keyboard and workspace lifecycle events, while the existing Persistent Graph plugin remains responsible only for node positions.

**Tech Stack:** Obsidian community plugin API, CommonJS JavaScript, Node.js 18 built-in test runner, Python `unittest` repository checks.

---

## File Map

- Create `.obsidian/plugins/global-graph-search/session-controller.js`: pure search-session state machine.
- Create `.obsidian/plugins/global-graph-search/session-controller.test.js`: state-transition tests using a fake adapter and scheduler.
- Create `.obsidian/plugins/global-graph-search/graph-adapter.js`: Obsidian Graph View API and DOM compatibility boundary.
- Create `.obsidian/plugins/global-graph-search/graph-adapter.test.js`: adapter tests using fake leaves, engines, and inputs.
- Create `.obsidian/plugins/global-graph-search/main.js`: plugin lifecycle and event wiring.
- Create `.obsidian/plugins/global-graph-search/manifest.json`: Obsidian plugin metadata.
- Create `.obsidian/plugins/global-graph-search/data.json`: persistent default allowlist.
- Modify `.obsidian/community-plugins.json`: enable the local plugin.
- Modify `.obsidian/graph.json`: restore the default allowlist immediately.
- Modify `tests/test_repository_files.py`: verify plugin installation and consistent filter configuration.

### Task 1: Add failing repository integration checks

**Files:**
- Modify: `tests/test_repository_files.py`
- Test: `tests/test_repository_files.py`

- [ ] **Step 1: Add constants and failing plugin-package assertions**

Add these imports and constants after the existing imports:

```python
DEFAULT_GRAPH_FILTER = (
    "path:/^questions\\// OR path:/^papers\\/cards\\// OR "
    "path:/^codes\\/types\\// OR path:/^codes\\/readings\\//"
)
GRAPH_SEARCH_PLUGIN_ID = "global-graph-search"
```

Replace the literal expected search string in `test_graph_config_includes_code_paths_and_four_color_groups` with `DEFAULT_GRAPH_FILTER`, then add this test to `RepositoryFileTests`:

```python
    def test_global_graph_search_plugin_is_installed_and_enabled(self) -> None:
        plugin_dir = (
            REPO_ROOT
            / ".obsidian"
            / "plugins"
            / GRAPH_SEARCH_PLUGIN_ID
        )
        manifest = json.loads(
            (plugin_dir / "manifest.json").read_text(encoding="utf-8")
        )
        settings = json.loads(
            (plugin_dir / "data.json").read_text(encoding="utf-8")
        )
        enabled_plugins = json.loads(
            (REPO_ROOT / ".obsidian" / "community-plugins.json").read_text(
                encoding="utf-8"
            )
        )

        self.assertEqual(manifest["id"], GRAPH_SEARCH_PLUGIN_ID)
        self.assertEqual(settings["defaultFilter"], DEFAULT_GRAPH_FILTER)
        self.assertIn(GRAPH_SEARCH_PLUGIN_ID, enabled_plugins)
        self.assertTrue((plugin_dir / "main.js").is_file())
        self.assertTrue((plugin_dir / "session-controller.js").is_file())
        self.assertTrue((plugin_dir / "graph-adapter.js").is_file())
```

- [ ] **Step 2: Run the repository tests and verify the new test fails**

Run:

```bash
python -m unittest tests.test_repository_files -v
```

Expected: `test_graph_config_includes_code_paths_and_four_color_groups` fails because the current graph search is empty, and `test_global_graph_search_plugin_is_installed_and_enabled` fails because the plugin manifest does not exist.

- [ ] **Step 3: Commit the failing integration checks**

```bash
git add tests/test_repository_files.py
git commit -m "test: define temporary graph search contract"
```

### Task 2: Implement the search-session controller with TDD

**Files:**
- Create: `.obsidian/plugins/global-graph-search/session-controller.test.js`
- Create: `.obsidian/plugins/global-graph-search/session-controller.js`

- [ ] **Step 1: Write the controller tests**

Create `.obsidian/plugins/global-graph-search/session-controller.test.js`:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");

const { SearchSessionController } = require("./session-controller");

const DEFAULT_FILTER = "path:/^questions\\// OR path:/^papers\\/cards\\//";

function makeHarness() {
  const graphA = { id: "graph-a" };
  const graphB = { id: "graph-b" };
  const calls = [];
  const scheduled = [];
  let activeGraph = graphA;
  let graphLeaves = [graphA];

  const adapter = {
    getActiveGraphLeaf: () => activeGraph,
    getGlobalGraphLeaves: () => graphLeaves,
    setSearch: (leaf, search) => calls.push(["setSearch", leaf.id, search]),
    focusSearch: (leaf) => calls.push(["focusSearch", leaf.id]),
  };

  const controller = new SearchSessionController({
    adapter,
    defaultFilter: DEFAULT_FILTER,
    schedule: (callback) => scheduled.push(callback),
  });

  return {
    adapter,
    calls,
    controller,
    graphA,
    graphB,
    flush() {
      while (scheduled.length > 0) scheduled.shift()();
    },
    setActiveGraph(leaf) {
      activeGraph = leaf;
    },
    setGraphLeaves(leaves) {
      graphLeaves = leaves;
    },
  };
}

function findEvent() {
  return { key: "f", ctrlKey: true, metaKey: false, altKey: false };
}

function escapeEvent() {
  return { key: "Escape", ctrlKey: false, metaKey: false, altKey: false };
}

test("Ctrl+F outside a global graph is ignored", () => {
  const harness = makeHarness();
  harness.setActiveGraph(null);

  assert.equal(harness.controller.handleKeydown(findEvent()), false);
  harness.flush();

  assert.deepEqual(harness.calls, []);
});

test("Ctrl+F starts a temporary full-graph search", () => {
  const harness = makeHarness();

  assert.equal(harness.controller.handleKeydown(findEvent()), true);
  assert.deepEqual(harness.calls, []);
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-a", ""],
    ["focusSearch", "graph-a"],
  ]);
});

test("Escape restores the default filter", () => {
  const harness = makeHarness();
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;

  assert.equal(harness.controller.handleKeydown(escapeEvent()), true);
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-a", DEFAULT_FILTER],
  ]);
});

test("Escape while idle is ignored", () => {
  const harness = makeHarness();

  assert.equal(harness.controller.handleKeydown(escapeEvent()), false);
  harness.flush();

  assert.deepEqual(harness.calls, []);
});

test("repeated Ctrl+F never replaces the default filter", () => {
  const harness = makeHarness();
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;

  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.controller.handleKeydown(escapeEvent());
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-a", ""],
    ["focusSearch", "graph-a"],
    ["setSearch", "graph-a", DEFAULT_FILTER],
  ]);
});

test("a delayed restore cannot clobber a newly started search", () => {
  const harness = makeHarness();
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;

  harness.controller.handleKeydown(escapeEvent());
  harness.controller.handleKeydown(findEvent());
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-a", ""],
    ["focusSearch", "graph-a"],
  ]);
});

test("syncGraphs restores idle graphs but preserves the active search", () => {
  const harness = makeHarness();
  harness.setGraphLeaves([harness.graphA, harness.graphB]);
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;

  harness.controller.syncGraphs();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-b", DEFAULT_FILTER],
  ]);
});

test("closing a searched graph recovers the remaining graphs", () => {
  const harness = makeHarness();
  harness.setGraphLeaves([harness.graphA, harness.graphB]);
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;
  harness.setGraphLeaves([harness.graphB]);

  harness.controller.syncGraphs();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-b", DEFAULT_FILTER],
  ]);
  assert.equal(harness.controller.isSearching(), false);
});

test("restoreAll resets every open graph and ends the session", () => {
  const harness = makeHarness();
  harness.setGraphLeaves([harness.graphA, harness.graphB]);
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;

  harness.controller.restoreAll();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-a", DEFAULT_FILTER],
    ["setSearch", "graph-b", DEFAULT_FILTER],
  ]);
  assert.equal(harness.controller.isSearching(), false);
});
```

- [ ] **Step 2: Run the controller tests and verify they fail**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/session-controller.test.js
```

Expected: FAIL with `Cannot find module './session-controller'`.

- [ ] **Step 3: Implement the minimal controller**

Create `.obsidian/plugins/global-graph-search/session-controller.js`:

```javascript
class SearchSessionController {
  constructor({ adapter, defaultFilter, schedule }) {
    this.adapter = adapter;
    this.defaultFilter = defaultFilter;
    this.schedule = schedule;
    this.searchingLeaf = null;
    this.revision = 0;
  }

  handleKeydown(event) {
    if (this.isFindShortcut(event)) return this.startSearch();
    if (event.key === "Escape") return this.endSearch();
    return false;
  }

  isFindShortcut(event) {
    return (
      event.key.toLowerCase() === "f" &&
      (event.ctrlKey || event.metaKey) &&
      !event.altKey
    );
  }

  startSearch() {
    const leaf = this.adapter.getActiveGraphLeaf();
    if (!leaf) return false;

    if (this.searchingLeaf && this.searchingLeaf !== leaf) {
      this.adapter.setSearch(this.searchingLeaf, this.defaultFilter);
    }

    this.searchingLeaf = leaf;
    const revision = ++this.revision;
    this.schedule(() => {
      if (this.revision !== revision || this.searchingLeaf !== leaf) return;
      this.adapter.setSearch(leaf, "");
      this.adapter.focusSearch(leaf);
    });
    return true;
  }

  endSearch() {
    if (!this.searchingLeaf) return false;

    const leaf = this.searchingLeaf;
    this.searchingLeaf = null;
    const revision = ++this.revision;
    this.schedule(() => {
      if (this.revision !== revision || this.searchingLeaf) return;
      this.adapter.setSearch(leaf, this.defaultFilter);
    });
    return true;
  }

  syncGraphs() {
    const leaves = this.adapter.getGlobalGraphLeaves();
    if (this.searchingLeaf && !leaves.includes(this.searchingLeaf)) {
      this.searchingLeaf = null;
      this.revision += 1;
    }

    for (const leaf of leaves) {
      if (leaf !== this.searchingLeaf) {
        this.adapter.setSearch(leaf, this.defaultFilter);
      }
    }
  }

  restoreAll() {
    this.searchingLeaf = null;
    this.revision += 1;
    for (const leaf of this.adapter.getGlobalGraphLeaves()) {
      this.adapter.setSearch(leaf, this.defaultFilter);
    }
  }

  isSearching() {
    return this.searchingLeaf !== null;
  }
}

module.exports = { SearchSessionController };
```

- [ ] **Step 4: Run the controller tests and verify they pass**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/session-controller.test.js
```

Expected: 9 tests pass and 0 fail.

- [ ] **Step 5: Commit the controller**

```bash
git add .obsidian/plugins/global-graph-search/session-controller.js .obsidian/plugins/global-graph-search/session-controller.test.js
git commit -m "feat: add graph search session controller"
```

### Task 3: Implement the graph compatibility adapter with TDD

**Files:**
- Create: `.obsidian/plugins/global-graph-search/graph-adapter.test.js`
- Create: `.obsidian/plugins/global-graph-search/graph-adapter.js`

- [ ] **Step 1: Write the graph adapter tests**

Create `.obsidian/plugins/global-graph-search/graph-adapter.test.js`:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");

const { GraphAdapter } = require("./graph-adapter");

function makeLeaf({ type = "graph", input = null, options = { search: "old", scale: 2 } } = {}) {
  const updates = [];
  const selectors = [];
  return {
    updates,
    selectors,
    leaf: {
      view: {
        getViewType: () => type,
        dataEngine: {
          getOptions: () => options,
          setOptions: (nextOptions) => updates.push(nextOptions),
        },
        containerEl: {
          querySelector: (selector) => {
            selectors.push(selector);
            return input;
          },
        },
      },
    },
  };
}

test("getActiveGraphLeaf returns only a global graph", () => {
  const graph = makeLeaf();
  let activeLeaf = graph.leaf;
  const adapter = new GraphAdapter({
    workspace: {
      getMostRecentLeaf: () => activeLeaf,
      getLeavesOfType: () => [graph.leaf],
    },
  });

  assert.equal(adapter.getActiveGraphLeaf(), graph.leaf);
  activeLeaf = makeLeaf({ type: "markdown" }).leaf;
  assert.equal(adapter.getActiveGraphLeaf(), null);
});

test("getGlobalGraphLeaves filters non-global leaves", () => {
  const graph = makeLeaf();
  const localGraph = makeLeaf({ type: "localgraph" });
  const adapter = new GraphAdapter({
    workspace: {
      getMostRecentLeaf: () => graph.leaf,
      getLeavesOfType: () => [graph.leaf, localGraph.leaf],
    },
  });

  assert.deepEqual(adapter.getGlobalGraphLeaves(), [graph.leaf]);
});

test("setSearch preserves unrelated graph options", () => {
  const graph = makeLeaf();
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(adapter.setSearch(graph.leaf, "new-query"), true);
  assert.deepEqual(graph.updates, [{ search: "new-query", scale: 2 }]);
});

test("setSearch fails safely when graph internals are unavailable", () => {
  const warnings = [];
  const adapter = new GraphAdapter({
    workspace: {},
    warn: (message) => warnings.push(message),
  });
  const leaf = { view: { getViewType: () => "graph" } };

  assert.equal(adapter.setSearch(leaf, "query"), false);
  assert.equal(warnings.length, 1);
});

test("focusSearch focuses Obsidian's graph search input", () => {
  const focusCalls = [];
  const input = { focus: (options) => focusCalls.push(options) };
  const graph = makeLeaf({ input });
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(adapter.focusSearch(graph.leaf), true);
  assert.deepEqual(focusCalls, [{ preventScroll: true }]);
  assert.equal(graph.selectors.length, 1);
});

test("focusSearch fails safely when no compatible input exists", () => {
  const warnings = [];
  const graph = makeLeaf();
  const adapter = new GraphAdapter({
    workspace: {},
    warn: (message) => warnings.push(message),
  });

  assert.equal(adapter.focusSearch(graph.leaf), false);
  assert.equal(warnings.length, 1);
});
```

- [ ] **Step 2: Run the adapter tests and verify they fail**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/graph-adapter.test.js
```

Expected: FAIL with `Cannot find module './graph-adapter'`.

- [ ] **Step 3: Implement the graph adapter**

Create `.obsidian/plugins/global-graph-search/graph-adapter.js`:

```javascript
const SEARCH_INPUT_SELECTOR = [
  ".mod-search-setting input[type='text']",
  ".mod-search-setting input",
  ".graph-controls input[type='search']",
  ".search-input-container input",
].join(", ");

class GraphAdapter {
  constructor({ workspace, warn = console.warn }) {
    this.workspace = workspace;
    this.warn = warn;
  }

  isGlobalGraphLeaf(leaf) {
    return leaf?.view?.getViewType?.() === "graph";
  }

  getActiveGraphLeaf() {
    const leaf = this.workspace.getMostRecentLeaf?.();
    return this.isGlobalGraphLeaf(leaf) ? leaf : null;
  }

  getGlobalGraphLeaves() {
    const leaves = this.workspace.getLeavesOfType?.("graph") || [];
    return leaves.filter((leaf) => this.isGlobalGraphLeaf(leaf));
  }

  setSearch(leaf, search) {
    try {
      const engine = leaf?.view?.dataEngine;
      if (!engine?.getOptions || !engine?.setOptions) {
        this.warn("Global Graph Search: graph data engine unavailable");
        return false;
      }
      const options = engine.getOptions() || {};
      engine.setOptions({ ...options, search });
      return true;
    } catch (error) {
      this.warn(`Global Graph Search: failed to update graph filter: ${error}`);
      return false;
    }
  }

  focusSearch(leaf) {
    const input = leaf?.view?.containerEl?.querySelector?.(SEARCH_INPUT_SELECTOR);
    if (!input?.focus) {
      this.warn("Global Graph Search: graph search input unavailable");
      return false;
    }
    input.focus({ preventScroll: true });
    return true;
  }
}

module.exports = { GraphAdapter, SEARCH_INPUT_SELECTOR };
```

- [ ] **Step 4: Run all JavaScript unit tests**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/*.test.js
```

Expected: 15 tests pass and 0 fail.

- [ ] **Step 5: Commit the adapter**

```bash
git add .obsidian/plugins/global-graph-search/graph-adapter.js .obsidian/plugins/global-graph-search/graph-adapter.test.js
git commit -m "feat: isolate Obsidian graph access"
```

### Task 4: Wire and enable the Obsidian plugin

**Files:**
- Create: `.obsidian/plugins/global-graph-search/main.js`
- Create: `.obsidian/plugins/global-graph-search/manifest.json`
- Create: `.obsidian/plugins/global-graph-search/data.json`
- Modify: `.obsidian/community-plugins.json`
- Modify: `.obsidian/graph.json`

- [ ] **Step 1: Create the plugin entry point**

Create `.obsidian/plugins/global-graph-search/main.js`:

```javascript
const { Plugin } = require("obsidian");

const { GraphAdapter } = require("./graph-adapter");
const { SearchSessionController } = require("./session-controller");

const DEFAULT_SETTINGS = {
  defaultFilter:
    "path:/^questions\\// OR path:/^papers\\/cards\\// OR " +
    "path:/^codes\\/types\\// OR path:/^codes\\/readings\\//",
};

class GlobalGraphSearchPlugin extends Plugin {
  async onload() {
    const savedSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
    if (!savedSettings?.defaultFilter) await this.saveData(this.settings);

    this.adapter = new GraphAdapter({ workspace: this.app.workspace });
    this.controller = new SearchSessionController({
      adapter: this.adapter,
      defaultFilter: this.settings.defaultFilter,
      schedule: (callback) => window.requestAnimationFrame(callback),
    });

    this.registerDomEvent(
      document,
      "keydown",
      (event) => this.controller.handleKeydown(event),
      true,
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.controller.syncGraphs()),
    );
    this.app.workspace.onLayoutReady(() => this.controller.syncGraphs());
  }

  onunload() {
    this.controller?.restoreAll();
  }
}

module.exports = GlobalGraphSearchPlugin;
```

- [ ] **Step 2: Create manifest and settings data**

Create `.obsidian/plugins/global-graph-search/manifest.json`:

```json
{
  "id": "global-graph-search",
  "name": "Global Graph Search",
  "version": "1.0.0",
  "minAppVersion": "1.4.0",
  "description": "Temporarily searches every global graph node and restores the default filter on Escape.",
  "author": "Local",
  "isDesktopOnly": false
}
```

Create `.obsidian/plugins/global-graph-search/data.json`:

```json
{
  "defaultFilter": "path:/^questions\\// OR path:/^papers\\/cards\\// OR path:/^codes\\/types\\// OR path:/^codes\\/readings\\//"
}
```

- [ ] **Step 3: Enable the plugin and restore the graph allowlist**

Set `.obsidian/community-plugins.json` to:

```json
[
  "persistent-graph",
  "global-graph-search"
]
```

Set `.obsidian/graph.json`'s `search` property to:

```json
"search": "path:/^questions\\// OR path:/^papers\\/cards\\// OR path:/^codes\\/types\\// OR path:/^codes\\/readings\\//"
```

Preserve every unrelated Graph View option in that file.

- [ ] **Step 4: Run syntax and integration checks**

Run:

```bash
node --check .obsidian/plugins/global-graph-search/main.js
node --check .obsidian/plugins/global-graph-search/graph-adapter.js
node --check .obsidian/plugins/global-graph-search/session-controller.js
python -m unittest tests.test_repository_files -v
```

Expected: all JavaScript syntax checks exit 0 and all repository-file tests pass.

- [ ] **Step 5: Commit plugin wiring and configuration**

```bash
git add .obsidian/plugins/global-graph-search/main.js .obsidian/plugins/global-graph-search/manifest.json .obsidian/plugins/global-graph-search/data.json .obsidian/community-plugins.json .obsidian/graph.json
git commit -m "feat: enable temporary global graph search"
```

### Task 5: Verify the complete implementation

**Files:**
- Test: `.obsidian/plugins/global-graph-search/*.test.js`
- Test: `tests/`

- [ ] **Step 1: Run plugin unit tests**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/*.test.js
```

Expected: 15 tests pass and 0 fail.

- [ ] **Step 2: Run the full repository test suite**

Run:

```bash
python -m unittest discover -v
```

Expected: all tests pass.

- [ ] **Step 3: Check formatting and the exact staged scope**

Run:

```bash
git diff --check HEAD~3..HEAD
git status --short
```

Expected: no whitespace errors. `git status` may still show the user's pre-existing paper, question, and Persistent Graph position changes, but no implementation files should remain uncommitted.

- [ ] **Step 4: Perform Obsidian smoke verification**

In the vault:

1. Reload Obsidian or disable and re-enable Global Graph Search.
2. Open the global Graph View and confirm `papers/notes/` nodes are absent.
3. Press `Ctrl+F`, type `EgoVerse-note`, and confirm that the note becomes searchable.
4. Press `Escape` and confirm the four-directory graph returns without pasting the filter.
5. Press `Ctrl+F` twice, search again, and press `Escape`; confirm restoration still works.
6. In a Markdown note, press `Ctrl+F`; confirm normal in-note search still opens.

Expected: every acceptance criterion in the design document is satisfied.
