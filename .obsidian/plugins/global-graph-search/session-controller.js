class SearchSessionController {
  constructor({ adapter, defaultFilter, schedule, expansionController }) {
    this.adapter = adapter;
    this.defaultFilter = defaultFilter;
    this.schedule = schedule;
    this.expansionController = expansionController || {
      start() {},
      stop() {},
    };
    this.searchingLeaf = null;
    this.previousShowOrphans = undefined;
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
      this.expansionController.stop();
      this.adapter.patchOptions(this.searchingLeaf, {
        search: this.defaultFilter,
        showOrphans: this.previousShowOrphans,
      });
      this.searchingLeaf = null;
      this.previousShowOrphans = undefined;
    }

    if (!this.searchingLeaf) {
      this.previousShowOrphans =
        this.adapter.getOptions(leaf)?.showOrphans ?? false;
    }

    this.searchingLeaf = leaf;
    const revision = ++this.revision;
    this.schedule(() => {
      if (this.revision !== revision || this.searchingLeaf !== leaf) return;
      this.adapter.patchOptions(leaf, { search: "", showOrphans: true });
      this.adapter.focusSearch(leaf);
      this.expansionController.start(leaf);
    });
    return true;
  }

  endSearch() {
    const leaf = this.searchingLeaf || this.adapter.getActiveGraphLeaf();
    if (!leaf) return false;

    const hadSession = this.searchingLeaf !== null;
    const previousShowOrphans = this.previousShowOrphans;
    this.searchingLeaf = null;
    this.previousShowOrphans = undefined;
    if (hadSession) this.expansionController.stop();
    const revision = ++this.revision;
    this.schedule(() => {
      if (this.revision !== revision || this.searchingLeaf) return;
      if (hadSession) {
        this.adapter.patchOptions(leaf, {
          search: this.defaultFilter,
          showOrphans: previousShowOrphans,
        });
      } else {
        this.adapter.setSearch(leaf, this.defaultFilter);
      }
    });
    return true;
  }

  syncGraphs() {
    const leaves = this.adapter.getGlobalGraphLeaves();
    if (this.searchingLeaf && !leaves.includes(this.searchingLeaf)) {
      this.expansionController.stop();
      this.searchingLeaf = null;
      this.previousShowOrphans = undefined;
      this.revision += 1;
    }

    for (const leaf of leaves) {
      if (leaf !== this.searchingLeaf) {
        this.adapter.setSearch(leaf, this.defaultFilter);
      }
    }
  }

  restoreAll() {
    const searchedLeaf = this.searchingLeaf;
    const previousShowOrphans = this.previousShowOrphans;
    if (searchedLeaf) this.expansionController.stop();
    this.searchingLeaf = null;
    this.previousShowOrphans = undefined;
    this.revision += 1;
    for (const leaf of this.adapter.getGlobalGraphLeaves()) {
      if (leaf === searchedLeaf) {
        this.adapter.patchOptions(leaf, {
          search: this.defaultFilter,
          showOrphans: previousShowOrphans,
        });
      } else {
        this.adapter.setSearch(leaf, this.defaultFilter);
      }
    }
  }

  isSearching() {
    return this.searchingLeaf !== null;
  }
}

module.exports = { SearchSessionController };
