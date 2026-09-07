import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertBoxGeometry, inspectBoxGeometry } from "../src/geometry.js";

describe("box geometry", () => {
  it("accepts connected outer and nested frames", () => {
    const canvas = [
      "╭──────────╮",
      "│ ╭──────╮ │",
      "│ │ body │ │",
      "│ ╰──────╯ │",
      "╰──────────╯",
    ];
    assert.deepEqual(inspectBoxGeometry(canvas), []);
    assert.doesNotThrow(() => assertBoxGeometry(canvas));
  });

  it("reports a shifted internal vertical border", () => {
    const canvas = [
      "╭────────╮",
      "│ ┌────┐ │",
      "│  │ x │ │",
      "│ └────┘ │",
      "╰────────╯",
    ];
    const issues = inspectBoxGeometry(canvas);
    assert.ok(issues.some((issue) => issue.row === 2 && issue.direction === "south"));
    assert.throws(() => assertBoxGeometry(canvas), /fix spacing/);
  });
});
