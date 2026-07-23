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
