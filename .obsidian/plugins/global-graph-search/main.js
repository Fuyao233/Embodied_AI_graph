const { Plugin } = require("obsidian");

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
      if (options.search === search) return true;
      engine.setOptions({ ...options, search });
      return true;
    } catch (error) {
      this.warn(
        `Global Graph Search: failed to update graph filter: ${error}`,
      );
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
      !event.shiftKey &&
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
    const leaf = this.searchingLeaf || this.adapter.getActiveGraphLeaf();
    if (!leaf) return false;

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
}

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
      window,
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
