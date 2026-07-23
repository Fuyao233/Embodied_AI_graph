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
