const test = require("node:test");
const assert = require("node:assert/strict");

const { filterCardToCardLinks } = require("./graph-link-filter");

test("filters only links between paper card nodes", () => {
  const links = {
    "papers/cards/Qwen-VLA.md": {
      "papers/cards/LA4VLA.md": 1,
      "papers/notes/Qwen-VLA-note.md": 1,
    },
    "questions/数据规模化.md": {
      "papers/cards/Qwen-VLA.md": 1,
    },
  };

  assert.deepEqual(filterCardToCardLinks(links), {
    "papers/cards/Qwen-VLA.md": {
      "papers/notes/Qwen-VLA-note.md": 1,
    },
    "questions/数据规模化.md": {
      "papers/cards/Qwen-VLA.md": 1,
    },
  });
  assert.equal(links["papers/cards/Qwen-VLA.md"]["papers/cards/LA4VLA.md"], 1);
});

