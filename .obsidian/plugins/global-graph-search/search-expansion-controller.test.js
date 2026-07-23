const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SearchExpansionController,
  waitForStableRenderedIds,
} = require("./search-expansion-controller");

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function makeHarness({ waitForStableIds } = {}) {
  const leaf = { id: "graph" };
  const calls = [];
  let inputListener = null;
  let inputValue = "";
  const resolvedLinks = {
    "cards/A.md": { "notes/A-note.md": 1 },
    "questions/Q.md": { "cards/A.md": 1 },
  };
  const adapter = {
    patchOptions: (...args) => calls.push(["patchOptions", ...args]),
    getSearchInputValue: () => inputValue,
    setSearchInputValue: (...args) => {
      calls.push(["setSearchInputValue", ...args]);
      inputValue = args[1];
    },
    listenSearchInput: (_leaf, listener) => {
      inputListener = listener;
      calls.push(["listenSearchInput", _leaf]);
      return () => {
        inputListener = null;
        calls.push(["disposeSearchInput", _leaf]);
      };
    },
  };
  const controller = new SearchExpansionController({
    adapter,
    getResolvedLinks: () => resolvedLinks,
    waitForStableIds:
      waitForStableIds ||
      (async (_leaf, isCurrent) =>
        isCurrent() ? new Set(["cards/A.md"]) : new Set()),
  });

  return {
    calls,
    controller,
    leaf,
    fireInput(value) {
      inputValue = value;
      inputListener?.();
    },
  };
}

test("expands a raw query to incoming and outgoing direct neighbors", async () => {
  const harness = makeHarness();
  harness.controller.start(harness.leaf);
  harness.calls.length = 0;

  await harness.controller.processRawQuery("A");

  assert.deepEqual(harness.calls, [
    ["patchOptions", harness.leaf, { search: "A" }],
    ["setSearchInputValue", harness.leaf, "A"],
    [
      "patchOptions",
      harness.leaf,
      {
        search:
          "path:/^(?:cards\\/A\\.md|notes\\/A-note\\.md|questions\\/Q\\.md)$/",
      },
    ],
    ["setSearchInputValue", harness.leaf, "A"],
  ]);
});

test("keeps the native raw query when it has no rendered matches", async () => {
  const harness = makeHarness({
    waitForStableIds: async () => new Set(),
  });
  harness.controller.start(harness.leaf);
  harness.calls.length = 0;

  await harness.controller.processRawQuery("missing");

  assert.deepEqual(harness.calls, [
    ["patchOptions", harness.leaf, { search: "missing" }],
    ["setSearchInputValue", harness.leaf, "missing"],
  ]);
});

test("an empty query cancels earlier work and immediately shows all nodes", async () => {
  const pending = deferred();
  const harness = makeHarness({
    waitForStableIds: () => pending.promise,
  });
  harness.controller.start(harness.leaf);
  harness.calls.length = 0;

  const oldQuery = harness.controller.processRawQuery("old");
  await harness.controller.processRawQuery("");
  pending.resolve(new Set(["cards/A.md"]));
  await oldQuery;

  assert.deepEqual(harness.calls, [
    ["patchOptions", harness.leaf, { search: "old" }],
    ["setSearchInputValue", harness.leaf, "old"],
    ["patchOptions", harness.leaf, { search: "" }],
    ["setSearchInputValue", harness.leaf, ""],
  ]);
});

test("stop disposes input listening and invalidates pending work", async () => {
  const pending = deferred();
  const harness = makeHarness({
    waitForStableIds: () => pending.promise,
  });
  harness.controller.start(harness.leaf);
  harness.calls.length = 0;

  const processing = harness.controller.processRawQuery("A");
  harness.controller.stop();
  pending.resolve(new Set(["cards/A.md"]));
  await processing;

  assert.deepEqual(harness.calls, [
    ["patchOptions", harness.leaf, { search: "A" }],
    ["setSearchInputValue", harness.leaf, "A"],
    ["disposeSearchInput", harness.leaf],
  ]);
});

test("start processes later visible input events", async () => {
  const harness = makeHarness();
  harness.controller.start(harness.leaf);
  harness.calls.length = 0;

  harness.fireInput("A");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(harness.calls[0][0], "patchOptions");
  assert.equal(harness.calls.at(-1)[0], "setSearchInputValue");
});

test("waitForStableRenderedIds returns after two identical samples", async () => {
  const samples = [new Set(["A.md"]), new Set(["A.md"])] ;
  const adapter = { getRenderedFileIds: () => samples.shift() };
  const scheduled = [];
  const resultPromise = waitForStableRenderedIds(
    adapter,
    {},
    () => true,
    (callback) => scheduled.push(callback),
  );

  scheduled.shift()();
  await Promise.resolve();
  scheduled.shift()();

  assert.deepEqual(await resultPromise, new Set(["A.md"]));
});
