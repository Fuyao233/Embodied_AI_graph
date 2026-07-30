# Global Graph Search Input Rebinding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep one-hop graph-search expansion active when Obsidian replaces the visible graph search input after entering a `Ctrl+F` session.

**Architecture:** Move input-event ownership from the replaceable input element to the stable graph view container. The adapter filters delegated capture-phase events so the existing expansion controller receives callbacks only from the currently visible search input; all expansion and session logic stays unchanged.

**Tech Stack:** Obsidian desktop plugin JavaScript, Node.js built-in test runner, local deterministic bundle generator.

---

### Task 1: Add a regression test for replacement search inputs

**Files:**
- Modify: `.obsidian/plugins/global-graph-search/graph-adapter.test.js`

- [ ] **Step 1: Replace the direct-listener test with a delegated-listener regression test**

Use a mutable `currentInput`, a stable `container`, and captured listener registrations:

```js
test("listens through the graph container when the search input is replaced", () => {
  const calls = [];
  const firstInput = { id: "first" };
  const replacementInput = { id: "replacement" };
  const unrelatedInput = { id: "unrelated" };
  let currentInput = firstInput;
  let delegatedListener = null;
  const container = {
    querySelector: () => currentInput,
    addEventListener: (type, listener, capture) => {
      calls.push(["add", type, capture]);
      delegatedListener = listener;
    },
    removeEventListener: (type, listener, capture) => {
      calls.push(["remove", type, listener, capture]);
    },
  };
  const graph = makeLeaf();
  graph.leaf.view.containerEl = container;
  let notifications = 0;
  const adapter = new GraphAdapter({ workspace: {} });

  const dispose = adapter.listenSearchInput(graph.leaf, () => {
    notifications += 1;
  });
  currentInput = replacementInput;
  delegatedListener({ target: unrelatedInput });
  delegatedListener({ target: replacementInput });
  dispose();

  assert.equal(notifications, 1);
  assert.deepEqual(calls[0], ["add", "input", true]);
  assert.deepEqual(calls[1], ["remove", "input", delegatedListener, true]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test --test-name-pattern="search input is replaced" .obsidian/plugins/global-graph-search/graph-adapter.test.js
```

Expected: FAIL because the existing implementation registers on `firstInput`, so the stable container never receives a listener.

### Task 2: Delegate search input events from the graph container

**Files:**
- Modify: `.obsidian/plugins/global-graph-search/graph-adapter.js`
- Test: `.obsidian/plugins/global-graph-search/graph-adapter.test.js`

- [ ] **Step 1: Implement the minimal delegated listener**

Replace `listenSearchInput` with:

```js
listenSearchInput(leaf, listener) {
  const container = leaf?.view?.containerEl;
  if (!container?.addEventListener || !container?.removeEventListener) {
    return () => {};
  }
  const delegatedListener = (event) => {
    if (event.target === this.getSearchInput(leaf)) listener(event);
  };
  container.addEventListener("input", delegatedListener, true);
  return () =>
    container.removeEventListener("input", delegatedListener, true);
}
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
node --test --test-name-pattern="search input is replaced" .obsidian/plugins/global-graph-search/graph-adapter.test.js
```

Expected: PASS.

- [ ] **Step 3: Run the adapter test file**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/graph-adapter.test.js
```

Expected: all adapter tests pass.

### Task 3: Rebuild and verify the installed plugin

**Files:**
- Modify (generated): `.obsidian/plugins/global-graph-search/main.js`

- [ ] **Step 1: Rebuild the Obsidian bundle**

Run:

```bash
node .obsidian/plugins/global-graph-search/build-main.js
```

Expected: `main.js` contains the delegated container listener and no unresolved local `require` calls.

- [ ] **Step 2: Run the complete plugin suite and syntax check**

Run:

```bash
node --test .obsidian/plugins/global-graph-search/*.test.js
node --check .obsidian/plugins/global-graph-search/main.js
```

Expected: all plugin tests pass and syntax checking exits successfully.

- [ ] **Step 3: Run the repository integration test**

Run:

```bash
python -m unittest tests.test_repository_files.RepositoryFileTests.test_global_graph_search_plugin_is_installed_and_enabled -v
```

Expected: PASS.

- [ ] **Step 4: Review the focused diff**

Run:

```bash
git diff --check -- .obsidian/plugins/global-graph-search/graph-adapter.js .obsidian/plugins/global-graph-search/graph-adapter.test.js .obsidian/plugins/global-graph-search/main.js
git diff -- .obsidian/plugins/global-graph-search/graph-adapter.js .obsidian/plugins/global-graph-search/graph-adapter.test.js .obsidian/plugins/global-graph-search/main.js
```

Expected: only the delegated listener, its regression test, and the corresponding generated bundle change.
