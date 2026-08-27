const CARD_PATH = /^papers\/cards\//;

function filterCardToCardLinks(resolvedLinks) {
  const filtered = {};
  for (const [source, targets] of Object.entries(resolvedLinks || {})) {
    filtered[source] = {};
    for (const [target, count] of Object.entries(targets || {})) {
      if (!(CARD_PATH.test(source) && CARD_PATH.test(target))) {
        filtered[source][target] = count;
      }
    }
  }
  return filtered;
}

module.exports = { filterCardToCardLinks };

