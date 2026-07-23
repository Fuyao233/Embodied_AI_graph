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

module.exports = { GraphAdapter, SEARCH_INPUT_SELECTOR };
