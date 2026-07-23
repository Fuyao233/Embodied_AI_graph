const test = require("node:test");
const assert = require("node:assert/strict");

const { GraphAdapter } = require("./graph-adapter");

function makeLeaf({
  type = "graph",
  input = null,
  options = { search: "old", scale: 2 },
} = {}) {
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

test("setSearch skips a redundant graph update", () => {
  const graph = makeLeaf();
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(adapter.setSearch(graph.leaf, "old"), true);
  assert.deepEqual(graph.updates, []);
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

test("patchOptions updates search and orphan visibility atomically", () => {
  const graph = makeLeaf({
    options: { search: "old", showOrphans: false, scale: 2 },
  });
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(
    adapter.patchOptions(graph.leaf, { search: "", showOrphans: true }),
    true,
  );
  assert.deepEqual(graph.updates, [
    { search: "", showOrphans: true, scale: 2 },
  ]);
});

test("getOptions reads the current graph options", () => {
  const options = { search: "old", showOrphans: false };
  const graph = makeLeaf({ options });
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(adapter.getOptions(graph.leaf), options);
});

test("reads and writes the visible search input without dispatching", () => {
  const input = {
    value: "raw",
    focus() {},
    addEventListener() {},
    removeEventListener() {},
  };
  const graph = makeLeaf({ input });
  const adapter = new GraphAdapter({ workspace: {} });

  assert.equal(adapter.getSearchInputValue(graph.leaf), "raw");
  assert.equal(adapter.setSearchInputValue(graph.leaf, "next"), true);
  assert.equal(input.value, "next");
});

test("listens to and disposes visible search input events", () => {
  const calls = [];
  const listener = () => {};
  const input = {
    value: "",
    focus() {},
    addEventListener: (...args) => calls.push(["add", ...args]),
    removeEventListener: (...args) => calls.push(["remove", ...args]),
  };
  const graph = makeLeaf({ input });
  const adapter = new GraphAdapter({ workspace: {} });

  const dispose = adapter.listenSearchInput(graph.leaf, listener);
  dispose();

  assert.deepEqual(calls, [
    ["add", "input", listener],
    ["remove", "input", listener],
  ]);
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

  assert.deepEqual(
    adapter.getRenderedFileIds(graph.leaf),
    new Set(["cards/A.md"]),
  );
});
