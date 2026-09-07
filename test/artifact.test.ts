import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createArtifact } from "../src/artifact.js";
import { DEFAULT_CONFIG } from "../src/config.js";

describe("createArtifact", () => {
  it("normalizes metadata and uses configured viewport defaults", () => {
    const artifact = createArtifact({ title: " Dashboard ", canvas: ["┌──┐", "└──┘"], tags: ["Desktop", "desktop"] }, DEFAULT_CONFIG, new Date("2026-01-01T00:00:00Z"));
    assert.equal(artifact.title, "Dashboard");
    assert.deepEqual(artifact.tags, ["desktop"]);
    assert.deepEqual(artifact.viewport, DEFAULT_CONFIG.defaultViewport);
    assert.equal(artifact.createdAt, "2026-01-01T00:00:00.000Z");
  });

  it("rejects oversized canvas lines", () => {
    const config = { ...DEFAULT_CONFIG, maxLineWidth: 4 };
    assert.throws(() => createArtifact({ title: "Wide", canvas: ["界界界"] }, config), /maximum is 4/);
  });

  it("rejects empty canvases", () => {
    assert.throws(() => createArtifact({ title: "Empty", canvas: [] }, DEFAULT_CONFIG), /at least one line/);
  });

  it("rejects disconnected generated box geometry", () => {
    assert.throws(() => createArtifact({ title: "Broken", canvas: ["┌────┐", " │ x │", "└────┘"] }, DEFAULT_CONFIG), /disconnected box edge/);
  });
});
