import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

export interface MockdeckConfig {
  storageDir: string;
  autoOpenAfterGeneration: boolean;
  defaultVariantCount: number;
  defaultViewport: { width: number; height: number };
  maxArtifacts: number;
  maxCanvasLines: number;
  maxLineWidth: number;
}

export const DEFAULT_CONFIG: MockdeckConfig = {
  storageDir: ".pi/mockdeck",
  autoOpenAfterGeneration: true,
  defaultVariantCount: 4,
  defaultViewport: { width: 100, height: 30 },
  maxArtifacts: 500,
  maxCanvasLines: 120,
  maxLineWidth: 500,
};

function readConfig(path: string): Partial<MockdeckConfig> {
  if (!existsSync(path)) return {};
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Mockdeck config must be a JSON object: ${path}`);
  }
  return value as Partial<MockdeckConfig>;
}

function positiveInteger(value: unknown, fallback: number, max: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Math.min(Number(value), max) : fallback;
}

export function loadConfig(cwd: string): MockdeckConfig {
  const globalConfig = readConfig(resolve(homedir(), ".pi/agent/mockdeck.json"));
  const projectConfig = readConfig(resolve(cwd, ".pi/mockdeck.json"));
  const merged = { ...DEFAULT_CONFIG, ...globalConfig, ...projectConfig };
  const viewport = {
    ...DEFAULT_CONFIG.defaultViewport,
    ...globalConfig.defaultViewport,
    ...projectConfig.defaultViewport,
  };
  const storageDir = typeof merged.storageDir === "string" && merged.storageDir.trim()
    ? merged.storageDir.trim()
    : DEFAULT_CONFIG.storageDir;
  return {
    storageDir: isAbsolute(storageDir) ? storageDir : resolve(cwd, storageDir),
    autoOpenAfterGeneration: merged.autoOpenAfterGeneration !== false,
    defaultVariantCount: positiveInteger(merged.defaultVariantCount, DEFAULT_CONFIG.defaultVariantCount, 12),
    defaultViewport: {
      width: positiveInteger(viewport.width, DEFAULT_CONFIG.defaultViewport.width, 500),
      height: positiveInteger(viewport.height, DEFAULT_CONFIG.defaultViewport.height, 120),
    },
    maxArtifacts: positiveInteger(merged.maxArtifacts, DEFAULT_CONFIG.maxArtifacts, 10_000),
    maxCanvasLines: positiveInteger(merged.maxCanvasLines, DEFAULT_CONFIG.maxCanvasLines, 500),
    maxLineWidth: positiveInteger(merged.maxLineWidth, DEFAULT_CONFIG.maxLineWidth, 2_000),
  };
}
