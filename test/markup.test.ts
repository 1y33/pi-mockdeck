import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { markupWidth, sanitizeLine, stripMarkup, validateMarkup } from "../src/markup.js";

describe("markup", () => {
  it("removes semantic tags without changing visible content", () => {
    assert.equal(stripMarkup("[accent]Hello[/] [warning]world[/]"), "Hello world");
    assert.equal(markupWidth("[accent]Hello[/]界"), 7);
  });

  it("strips terminal control sequences and line breaks", () => {
    const malicious = "safe\u001b]52;c;secret\u0007\nnext\tcell";
    const clean = sanitizeLine(malicious);
    assert.ok(!clean.includes("\u001b"));
    assert.ok(!clean.includes("\u0007"));
    assert.equal(clean, "safe]52;c;secret next cell");
  });

  it("leaves unknown tags visible rather than interpreting them", () => {
    assert.equal(stripMarkup("[blink]unsafe"), "[blink]unsafe");
  });

  it("rejects malformed semantic markup", () => {
    assert.throws(() => validateMarkup("[accent]open"), /not closed/);
    assert.throws(() => validateMarkup("[/]close"), /no matching/);
    assert.throws(() => validateMarkup("[accent][warning]nested[/][/]"), /nested/);
    assert.doesNotThrow(() => validateMarkup("[accent]valid[/]"));
  });
});
