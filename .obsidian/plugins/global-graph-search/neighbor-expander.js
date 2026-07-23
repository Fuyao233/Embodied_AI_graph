function buildReverseLinks(resolvedLinks) {
  const reverse = new Map();
  for (const [source, targets] of Object.entries(resolvedLinks || {})) {
    for (const target of Object.keys(targets || {})) {
      if (!reverse.has(target)) reverse.set(target, new Set());
      reverse.get(target).add(source);
    }
  }
  return reverse;
}

function expandOneHop(matches, resolvedLinks, reverseLinks) {
  const expanded = new Set(matches);
  for (const match of matches) {
    for (const target of Object.keys(resolvedLinks?.[match] || {})) {
      expanded.add(target);
    }
    for (const source of reverseLinks.get(match) || []) {
      expanded.add(source);
    }
  }
  return expanded;
}

function escapeGraphPath(path) {
  return path.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
}

function buildExactPathQuery(paths) {
  const alternatives = [...paths].sort().map(escapeGraphPath);
  if (alternatives.length === 0) return "";
  return `path:/^(?:${alternatives.join("|")})$/`;
}

module.exports = {
  buildReverseLinks,
  expandOneHop,
  buildExactPathQuery,
};
