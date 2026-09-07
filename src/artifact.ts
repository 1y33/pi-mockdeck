import { randomUUID } from "node:crypto";
import { normalizeCanvas } from "./canvas.js";
import { assertBoxGeometry } from "./geometry.js";
import type { MockdeckConfig } from "./config.js";
import { markupWidth, sanitizeLine, validateMarkup } from "./markup.js";
import { MOCKUP_SCHEMA_VERSION, type MockupArtifact, type MockupInput } from "./types.js";

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const clean = sanitizeLine(value).trim();
  return clean ? clean.slice(0, maxLength) : fallback;
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => cleanText(item, "", maxLength)).filter(Boolean);
}

export function createArtifact(input: MockupInput, config: MockdeckConfig, now = new Date()): MockupArtifact {
  if (!Array.isArray(input.canvas) || input.canvas.length === 0) throw new Error("canvas must contain at least one line");
  const viewport = {
    width: Number.isInteger(input.viewport?.width) ? Math.min(Math.max(input.viewport!.width!, 20), 500) : config.defaultViewport.width,
    height: Number.isInteger(input.viewport?.height) ? Math.min(Math.max(input.viewport!.height!, 8), 120) : config.defaultViewport.height,
  };
  const lineLimit = Math.min(config.maxLineWidth, viewport.width);
  const heightLimit = Math.min(config.maxCanvasLines, viewport.height);
  if (input.canvas.length > heightLimit) throw new Error(`canvas exceeds viewport height of ${heightLimit} lines`);
  const canvas = input.canvas.map((line, index) => {
    if (typeof line !== "string") throw new Error(`canvas line ${index + 1} must be a string`);
    const clean = sanitizeLine(line);
    validateMarkup(clean);
    const width = markupWidth(clean);
    if (width > lineLimit) throw new Error(`canvas line ${index + 1} is ${width} columns; maximum is ${lineLimit}`);
    return clean;
  });
  const normalizedCanvas = normalizeCanvas(canvas);
  if (config.strictBoxGeometry) assertBoxGeometry(normalizedCanvas);
  return {
    schemaVersion: MOCKUP_SCHEMA_VERSION,
    id: randomUUID(),
    title: cleanText(input.title, "Untitled mockup", 120),
    brief: cleanText(input.brief, "", 1_000),
    variant: cleanText(input.variant, "Concept", 80),
    viewport,
    canvas: normalizedCanvas,
    notes: cleanList(input.notes, 30, 500),
    tags: [...new Set(cleanList(input.tags, 20, 40).map((tag) => tag.toLowerCase()))],
    createdAt: now.toISOString(),
  };
}
