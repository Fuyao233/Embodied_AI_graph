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

  isSearching() {
    return this.searchingLeaf !== null;
  }
}

module.exports = { SearchSessionController };
