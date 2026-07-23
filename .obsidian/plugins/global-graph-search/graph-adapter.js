const SEARCH_INPUT_SELECTOR = [
  ".mod-search-setting input[type='text']",
  ".mod-search-setting input",
  ".graph-controls input[type='search']",
  ".search-input-container input",
].join(", ");

class GraphAdapter {
  constructor({ workspace, vault, warn = console.warn }) {
    this.workspace = workspace;
    this.vault = vault;
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

  getOptions(leaf) {
    try {
      const engine = leaf?.view?.dataEngine;
      if (!engine?.getOptions) {
        this.warn("Global Graph Search: graph data engine unavailable");
        return null;
      }
      return engine.getOptions() || {};
    } catch (error) {
      this.warn(
        `Global Graph Search: failed to read graph options: ${error}`,
      );
      return null;
    }
  }

  patchOptions(leaf, patch) {
    try {
      const engine = leaf?.view?.dataEngine;
      if (!engine?.getOptions || !engine?.setOptions) {
        this.warn("Global Graph Search: graph data engine unavailable");
        return false;
      }
      const options = engine.getOptions() || {};
      const unchanged = Object.entries(patch).every(
        ([key, value]) => options[key] === value,
      );
      if (unchanged) return true;
      engine.setOptions({ ...options, ...patch });
      return true;
    } catch (error) {
      this.warn(`Global Graph Search: failed to update graph options: ${error}`);
      return false;
    }
  }

  setSearch(leaf, search) {
    return this.patchOptions(leaf, { search });
  }

  getSearchInput(leaf) {
    return (
      leaf?.view?.containerEl?.querySelector?.(SEARCH_INPUT_SELECTOR) || null
    );
  }

  getSearchInputValue(leaf) {
    return this.getSearchInput(leaf)?.value ?? "";
  }

  setSearchInputValue(leaf, value) {
    const input = this.getSearchInput(leaf);
    if (!input) return false;
    input.value = value;
    return true;
  }

  listenSearchInput(leaf, listener) {
    const input = this.getSearchInput(leaf);
    if (!input?.addEventListener || !input?.removeEventListener) return () => {};
    input.addEventListener("input", listener);
    return () => input.removeEventListener("input", listener);
  }

  getRenderedFileIds(leaf) {
    const ids = new Set();
    for (const node of leaf?.view?.renderer?.nodes || []) {
      const file = this.vault?.getAbstractFileByPath?.(node.id);
      if (file?.path === node.id && file.extension === "md") ids.add(node.id);
    }
    return ids;
  }

  focusSearch(leaf) {
    const input = this.getSearchInput(leaf);
    if (!input?.focus) {
      this.warn("Global Graph Search: graph search input unavailable");
      return false;
    }
    input.focus({ preventScroll: true });
    return true;
  }
}

module.exports = { GraphAdapter, SEARCH_INPUT_SELECTOR };
