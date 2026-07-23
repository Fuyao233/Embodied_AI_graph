const {
  buildReverseLinks,
  expandOneHop,
  buildExactPathQuery,
} = require("./neighbor-expander");

function sameIds(left, right) {
  if (!left || left.size !== right.size) return false;
  for (const id of left) {
    if (!right.has(id)) return false;
  }
  return true;
}

function defaultScheduleFrame(callback) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
}

async function waitForStableRenderedIds(
  adapter,
  leaf,
  isCurrent,
  scheduleFrame = defaultScheduleFrame,
  maxFrames = 12,
) {
  let previous = null;
  let latest = new Set();

  for (let frame = 0; frame < maxFrames; frame += 1) {
    await new Promise((resolve) => scheduleFrame(resolve));
    if (!isCurrent()) return new Set();

    latest = adapter.getRenderedFileIds(leaf);
    if (sameIds(previous, latest)) return latest;
    previous = latest;
  }

  return latest;
}

class SearchExpansionController {
  constructor({
    adapter,
    getResolvedLinks,
    waitForStableIds,
    scheduleFrame = defaultScheduleFrame,
  }) {
    this.adapter = adapter;
    this.getResolvedLinks = getResolvedLinks;
    this.waitForStableIds =
      waitForStableIds ||
      ((leaf, isCurrent) =>
        waitForStableRenderedIds(
          this.adapter,
          leaf,
          isCurrent,
          scheduleFrame,
        ));
    this.leaf = null;
    this.disposeInput = null;
    this.revision = 0;
    this.reverseLinks = null;
  }

  start(leaf) {
    this.stop();
    this.leaf = leaf;
    this.disposeInput = this.adapter.listenSearchInput(leaf, () => {
      void this.processRawQuery(this.adapter.getSearchInputValue(leaf));
    });
  }

  stop() {
    this.revision += 1;
    this.disposeInput?.();
    this.disposeInput = null;
    this.leaf = null;
  }

  invalidateLinks() {
    this.reverseLinks = null;
  }

  getReverseLinks(resolvedLinks) {
    if (!this.reverseLinks) {
      this.reverseLinks = buildReverseLinks(resolvedLinks);
    }
    return this.reverseLinks;
  }

  async processRawQuery(rawQuery) {
    const leaf = this.leaf;
    if (!leaf) return false;

    const revision = ++this.revision;
    const isCurrent = () =>
      this.leaf === leaf && this.revision === revision;

    this.adapter.patchOptions(leaf, { search: rawQuery });
    this.adapter.setSearchInputValue(leaf, rawQuery);
    if (rawQuery === "") return true;

    const matches = await this.waitForStableIds(leaf, isCurrent);
    if (!isCurrent()) return false;
    if (matches.size === 0) return true;

    const resolvedLinks = this.getResolvedLinks() || {};
    const expanded = expandOneHop(
      matches,
      resolvedLinks,
      this.getReverseLinks(resolvedLinks),
    );
    const search = buildExactPathQuery(expanded);

    if (!isCurrent()) return false;
    this.adapter.patchOptions(leaf, { search });
    this.adapter.setSearchInputValue(leaf, rawQuery);
    return true;
  }
}

module.exports = {
  SearchExpansionController,
  waitForStableRenderedIds,
};
