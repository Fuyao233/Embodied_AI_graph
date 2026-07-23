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
  const options = new Map([
    [graphA, { search: DEFAULT_FILTER, showOrphans: false }],
    [graphB, { search: DEFAULT_FILTER, showOrphans: true }],
  ]);

  const adapter = {
    getActiveGraphLeaf: () => activeGraph,
    getGlobalGraphLeaves: () => graphLeaves,
    getOptions: (leaf) => options.get(leaf),
    patchOptions: (leaf, patch) =>
      calls.push(["patchOptions", leaf.id, patch]),
    setSearch: (leaf, search) => calls.push(["setSearch", leaf.id, search]),
    focusSearch: (leaf) => calls.push(["focusSearch", leaf.id]),
  };
  const expansionController = {
    start: (leaf) => calls.push(["expansionStart", leaf.id]),
    stop: () => calls.push(["expansionStop"]),
  };

  const controller = new SearchSessionController({
    adapter,
    defaultFilter: DEFAULT_FILTER,
    schedule: (callback) => scheduled.push(callback),
    expansionController,
  });

  return {
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
    setShowOrphans(leaf, value) {
      options.get(leaf).showOrphans = value;
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

test("Ctrl+Shift+F is left to Obsidian", () => {
  const harness = makeHarness();

  assert.equal(
    harness.controller.handleKeydown({ ...findEvent(), shiftKey: true }),
    false,
  );
  harness.flush();

  assert.deepEqual(harness.calls, []);
});

test("Ctrl+F starts a temporary full-graph search", () => {
  const harness = makeHarness();

  assert.equal(harness.controller.handleKeydown(findEvent()), true);
  assert.deepEqual(harness.calls, []);
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["patchOptions", "graph-a", { search: "", showOrphans: true }],
    ["focusSearch", "graph-a"],
    ["expansionStart", "graph-a"],
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
    ["expansionStop"],
    ["patchOptions", "graph-a", {
      search: DEFAULT_FILTER,
      showOrphans: false,
    }],
  ]);
});

test("Escape restores an originally enabled orphan setting", () => {
  const harness = makeHarness();
  harness.setShowOrphans(harness.graphA, true);
  harness.controller.handleKeydown(findEvent());
  harness.flush();
  harness.calls.length = 0;

  harness.controller.handleKeydown(escapeEvent());
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["expansionStop"],
    ["patchOptions", "graph-a", {
      search: DEFAULT_FILTER,
      showOrphans: true,
    }],
  ]);
});

test("Escape restores a manually edited active graph", () => {
  const harness = makeHarness();

  assert.equal(harness.controller.handleKeydown(escapeEvent()), true);
  harness.flush();

  assert.deepEqual(harness.calls, [
    ["setSearch", "graph-a", DEFAULT_FILTER],
  ]);
});

test("Escape outside a graph while idle is ignored", () => {
  const harness = makeHarness();
  harness.setActiveGraph(null);

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
    ["patchOptions", "graph-a", { search: "", showOrphans: true }],
    ["focusSearch", "graph-a"],
    ["expansionStart", "graph-a"],
    ["expansionStop"],
    ["patchOptions", "graph-a", {
      search: DEFAULT_FILTER,
      showOrphans: false,
    }],
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
    ["expansionStop"],
    ["patchOptions", "graph-a", { search: "", showOrphans: true }],
    ["focusSearch", "graph-a"],
    ["expansionStart", "graph-a"],
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
    ["expansionStop"],
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
    ["expansionStop"],
    ["patchOptions", "graph-a", {
      search: DEFAULT_FILTER,
      showOrphans: false,
    }],
    ["setSearch", "graph-b", DEFAULT_FILTER],
  ]);
  assert.equal(harness.controller.isSearching(), false);
});
