import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import { createArtifact } from "../src/artifact.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { GalleryComponent, type GalleryAction } from "../src/gallery.js";

const theme = {
  fg: (_color: string, value: string) => value,
  bg: (_color: string, value: string) => value,
  bold: (value: string) => value,
} as Theme;

const artifacts = [
  createArtifact({ title: "First", canvas: ["┌────┐", "│ one│", "└────┘"] }, DEFAULT_CONFIG),
  createArtifact({ title: "Second", canvas: ["[accent]selected[/]"] }, DEFAULT_CONFIG),
];

describe("GalleryComponent", () => {
  it("renders nested folders at wide and narrow widths and navigates branches", () => {
    const nested = createArtifact({ title: "Nested", folder: "App/Mobile", canvas: ["hello"] }, DEFAULT_CONFIG);
    let action: GalleryAction | undefined;
    const gallery = new GalleryComponent([nested, ...artifacts], theme, () => {}, value => { action = value; });
    for (const width of [40, 60, 100]) {
      const lines = gallery.render(width);
      assert.ok(lines.join("\n").includes("App/"));
      assert.ok(lines.join("\n").includes("Mobile/"));
      for (const line of lines) assert.ok(visibleWidth(line) <= width);
    }
    gallery.handleInput("h");
    assert.ok(!gallery.render(100).join("\n").includes("Mobile/"));
    gallery.handleInput("d");
    assert.equal((() => action)(), undefined);
    gallery.handleInput("\r"); // expand App
    gallery.handleInput("l"); // Mobile
    gallery.handleInput("l"); // Nested
    gallery.handleInput("m");
    assert.equal(action?.type, "move");
    if (action?.type === "move") assert.equal(action.artifact.id, nested.id);
    gallery.handleInput("h"); // parent Mobile
    gallery.handleInput("h"); // collapse Mobile
    assert.ok(!gallery.render(100).join("\n").includes("Nested"));
    gallery.handleInput("j"); // root First
    gallery.handleInput("u");
    const used = (() => action)() as GalleryAction | undefined;
    if (used?.type === "use") assert.equal(used.artifact.title, "First");
    else assert.fail("expected root mockup action");
  });

  it("never renders past the provided terminal width", () => {
    for (const width of [60, 80, 120, 160]) {
      const gallery = new GalleryComponent(artifacts, theme, () => {}, () => {});
      for (const line of gallery.render(width)) assert.ok(visibleWidth(line) <= width, `${visibleWidth(line)} > ${width}`);
    }
  });

  it("replaces malformed legacy canvases with a diagnostic", () => {
    const legacy = { ...artifacts[0]!, canvas: ["┌────┐", " │ x │", "└────┘"] };
    const gallery = new GalleryComponent([legacy], theme, () => {}, () => {});
    assert.ok(gallery.render(100).join("\n").includes("Invalid box geometry"));
  });

  it("navigates concepts and emits the selected action", () => {
    let action: GalleryAction | undefined;
    const gallery = new GalleryComponent(artifacts, theme, () => {}, (value) => { action = value; });
    gallery.handleInput("j");
    gallery.handleInput("u");
    assert.equal(action?.type, "use");
    if (action?.type === "use") assert.equal(action.artifact.title, "Second");
  });
});
