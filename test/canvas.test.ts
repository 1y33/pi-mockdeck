import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeCanvas } from "../src/canvas.js";
import { markupWidth, stripMarkup } from "../src/markup.js";

describe("normalizeCanvas", () => {
  it("aligns ragged right borders from generated framed mockups", () => {
    const normalized = normalizeCanvas([
      "╭─ [accent]TITLE[/] ─╮",
      "│ short │",
      "│ a much longer row │",
      "╰──────╯",
    ]);
    const widths = normalized.map(markupWidth);
    assert.ok(widths.every((width) => width === widths[0]));
    assert.ok(stripMarkup(normalized[1]!).endsWith("│"));
    assert.match(stripMarkup(normalized[0]!), /─╮$/u);
    assert.match(stripMarkup(normalized[3]!), /─╯$/u);
  });

  it("pads unframed rows without changing their content", () => {
    const normalized = normalizeCanvas(["long row", "short"]);
    assert.deepEqual(normalized, ["long row", "short   "]);
  });
});
