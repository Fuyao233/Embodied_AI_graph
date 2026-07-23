const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildReverseLinks,
  expandOneHop,
  buildExactPathQuery,
} = require("./neighbor-expander");

test("expands matches through outgoing and incoming links", () => {
  const links = {
    "cards/A.md": { "notes/A-note.md": 1 },
    "questions/Q.md": { "cards/A.md": 1 },
  };
  const reverse = buildReverseLinks(links);

  assert.deepEqual(
    [...expandOneHop(new Set(["cards/A.md"]), links, reverse)].sort(),
    ["cards/A.md", "notes/A-note.md", "questions/Q.md"],
  );
});

test("deduplicates neighborhoods for multiple matches", () => {
  const links = {
    "cards/A.md": { "shared.md": 1 },
    "cards/B.md": { "shared.md": 1 },
  };
  const reverse = buildReverseLinks(links);
  const result = expandOneHop(
    new Set(["cards/A.md", "cards/B.md"]),
    links,
    reverse,
  );

  assert.deepEqual([...result].sort(), [
    "cards/A.md",
    "cards/B.md",
    "shared.md",
  ]);
});

test("keeps a matching orphan", () => {
  assert.deepEqual(
    [...expandOneHop(new Set(["orphan.md"]), {}, new Map())],
    ["orphan.md"],
  );
});

test("builds a stable escaped exact-path query", () => {
  assert.equal(
    buildExactPathQuery(new Set(["folder/A+B.md", "plain.md"])),
    "path:/^(?:folder\\/A\\+B\\.md|plain\\.md)$/",
  );
});
