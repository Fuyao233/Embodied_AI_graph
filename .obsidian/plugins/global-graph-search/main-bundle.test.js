const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("main.js loads with Obsidian's restricted require", () => {
  const mainPath = path.join(__dirname, "main.js");
  const source = fs.readFileSync(mainPath, "utf8");
  const pluginModule = { exports: {} };

  class Plugin {}

  function obsidianRequire(id) {
    if (id === "obsidian") return { Plugin };
    throw new Error(`Obsidian loader cannot resolve ${id}`);
  }

  const load = new Function(
    "require",
    "module",
    "exports",
    `${source}\n//# sourceURL=plugin:global-graph-search`,
  );

  load(obsidianRequire, pluginModule, pluginModule.exports);

  assert.equal(typeof pluginModule.exports, "function");
});

test("plugin listens on window capture before propagation stops at document", async () => {
  const mainPath = path.join(__dirname, "main.js");
  const source = fs.readFileSync(mainPath, "utf8");
  const pluginModule = { exports: {} };
  const registrations = [];
  const fakeWindow = {
    requestAnimationFrame: (callback) => callback(),
  };
  const fakeDocument = {};

  class Plugin {
    constructor(app) {
      this.app = app;
    }

    async loadData() {
      return { defaultFilter: "default-filter" };
    }

    registerDomEvent(...args) {
      registrations.push(args);
    }

    registerEvent() {}
  }

  function obsidianRequire(id) {
    if (id === "obsidian") return { Plugin };
    throw new Error(`Obsidian loader cannot resolve ${id}`);
  }

  const load = new Function("require", "module", "exports", source);
  load(obsidianRequire, pluginModule, pluginModule.exports);

  const workspace = {
    getLeavesOfType: () => [],
    getMostRecentLeaf: () => null,
    on: () => ({}),
    onLayoutReady: () => {},
  };

  global.window = fakeWindow;
  global.document = fakeDocument;
  try {
    const plugin = new pluginModule.exports({ workspace });
    await plugin.onload();
  } finally {
    delete global.window;
    delete global.document;
  }

  assert.equal(registrations[0][0], fakeWindow);
  assert.equal(registrations[0][1], "keydown");
  assert.equal(registrations[0][3], true);
});

test("Escape restores a graph filter changed without Ctrl+F", async () => {
  const mainPath = path.join(__dirname, "main.js");
  const source = fs.readFileSync(mainPath, "utf8");
  const pluginModule = { exports: {} };
  const registrations = [];
  const updates = [];
  const options = { search: "" };
  const fakeWindow = {
    requestAnimationFrame: (callback) => callback(),
  };

  class Plugin {
    constructor(app) {
      this.app = app;
    }

    async loadData() {
      return { defaultFilter: "default-filter" };
    }

    registerDomEvent(...args) {
      registrations.push(args);
    }

    registerEvent() {}
  }

  function obsidianRequire(id) {
    if (id === "obsidian") return { Plugin };
    throw new Error(`Obsidian loader cannot resolve ${id}`);
  }

  const load = new Function("require", "module", "exports", source);
  load(obsidianRequire, pluginModule, pluginModule.exports);

  const graphLeaf = {
    view: {
      getViewType: () => "graph",
      dataEngine: {
        getOptions: () => options,
        setOptions: (nextOptions) => {
          updates.push(nextOptions);
          Object.assign(options, nextOptions);
        },
      },
      containerEl: { querySelector: () => null },
    },
  };
  const workspace = {
    getLeavesOfType: () => [graphLeaf],
    getMostRecentLeaf: () => graphLeaf,
    on: () => ({}),
    onLayoutReady: () => {},
  };

  global.window = fakeWindow;
  try {
    const plugin = new pluginModule.exports({ workspace });
    await plugin.onload();
    const keydown = registrations[0][2];
    keydown({
      key: "Escape",
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    });
  } finally {
    delete global.window;
  }

  assert.deepEqual(updates, [{ search: "default-filter" }]);
});
