import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import { createArtifact } from "../src/artifact.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { GalleryComponent, type GalleryAction } from "../src/gallery.js";

const theme = {
  fg: (_color: string, value: string) => value,
  bold: (value: string) => value,
} as Theme;

const artifacts = [
  createArtifact({ title: "First", canvas: ["┌────┐", "│ one│", "└────┘"] }, DEFAULT_CONFIG),
  createArtifact({ title: "Second", canvas: ["[accent]selected[/]"] }, DEFAULT_CONFIG),
];

describe("GalleryComponent", () => {
  it("never renders past the provided terminal width", () => {
    for (const width of [60, 80, 120, 160]) {
      const gallery = new GalleryComponent(artifacts, theme, () => {}, () => {});
      for (const line of gallery.render(width)) assert.ok(visibleWidth(line) <= width, `${visibleWidth(line)} > ${width}`);
    }
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
