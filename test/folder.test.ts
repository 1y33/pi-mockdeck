import assert from "node:assert/strict";
import { it } from "node:test";
import { createArtifact, normalizeFolder } from "../src/artifact.js";
import { DEFAULT_CONFIG } from "../src/config.js";

it("normalizes folder paths while preserving legacy root artifacts", () => {
  assert.equal(normalizeFolder(" / App // Mobile / "), "App/Mobile");
  assert.equal(normalizeFolder(undefined), "");
  assert.equal(createArtifact({ title: "Root", canvas: ["ok"] }, DEFAULT_CONFIG).folder, "");
  for (const value of ["../App", "App/./Mobile", "x".repeat(81), Array(13).fill("x").join("/"), 42]) {
    assert.throws(() => normalizeFolder(value), /folder/);
  }
});
