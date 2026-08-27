const { Plugin } = require("obsidian");
const { GraphAdapter } = require("./graph-adapter");
const { filterCardToCardLinks } = require("./graph-link-filter");
const { SearchSessionController } = require("./session-controller");
const {
  SearchExpansionController,
} = require("./search-expansion-controller");

const DEFAULT_SETTINGS = {
  defaultFilter:
    "path:/^questions\\// OR path:/^papers\\/cards\\// OR " +
    "path:/^codes\\/types\\// OR path:/^codes\\/readings\\//",
};

class GlobalGraphSearchPlugin extends Plugin {
  filterGraphLinks() {
    const resolvedLinks = this.app.metadataCache?.resolvedLinks;
    if (!resolvedLinks || typeof resolvedLinks !== "object") return;

    const filtered = filterCardToCardLinks(resolvedLinks);
    for (const source of Object.keys(resolvedLinks)) delete resolvedLinks[source];
    Object.assign(resolvedLinks, filtered);
  }

  async onload() {
    const savedSettings = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
    if (!savedSettings?.defaultFilter) await this.saveData(this.settings);

    this.filterGraphLinks();

    this.adapter = new GraphAdapter({
      workspace: this.app.workspace,
      vault: this.app.vault,
    });
    this.expansionController = new SearchExpansionController({
      adapter: this.adapter,
      getResolvedLinks: () => this.app.metadataCache?.resolvedLinks || {},
      scheduleFrame: (callback) => window.requestAnimationFrame(callback),
    });
    this.controller = new SearchSessionController({
      adapter: this.adapter,
      defaultFilter: this.settings.defaultFilter,
      schedule: (callback) => window.requestAnimationFrame(callback),
      expansionController: this.expansionController,
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
    if (this.app.metadataCache?.on) {
      this.registerEvent(
        this.app.metadataCache.on("resolved", () => {
          this.filterGraphLinks();
          this.expansionController.invalidateLinks();
        }),
      );
    }
    this.app.workspace.onLayoutReady(() => this.controller.syncGraphs());
  }

  onunload() {
    this.controller?.restoreAll();
  }
}

module.exports = GlobalGraphSearchPlugin;
