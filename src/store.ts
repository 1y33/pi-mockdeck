import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeCanvas } from "./canvas.js";
import { stripMarkup } from "./markup.js";
import type { ArtifactSummary, MockupArtifact } from "./types.js";

interface ArtifactIndex { schemaVersion: 1; artifacts: ArtifactSummary[] }
const EMPTY_INDEX: ArtifactIndex = { schemaVersion: 1, artifacts: [] };

export class ArtifactStore {
  private readonly artifactsDir: string;
  private readonly indexPath: string;
  private readonly artifacts = new Map<string, MockupArtifact>();
  private readonly summaryIds = new Set<string>();
  private summaries: ArtifactSummary[] = [];

  constructor(private readonly root: string, private readonly maxArtifacts: number) {
    this.artifactsDir = join(root, "artifacts");
    this.indexPath = join(root, "index.json");
  }

  async init(): Promise<void> {
    await mkdir(this.artifactsDir, { recursive: true });
    try {
      const parsed = JSON.parse(await readFile(this.indexPath, "utf8")) as ArtifactIndex;
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.artifacts)) throw new Error("unsupported index");
      this.summaries = parsed.artifacts.slice(0, this.maxArtifacts);
      this.rebuildSummaryIds();
    } catch {
      await this.rebuildIndex();
    }
  }

  list(): ArtifactSummary[] { return [...this.summaries]; }

  async get(id: string): Promise<MockupArtifact | undefined> {
    const cached = this.artifacts.get(id);
    if (cached) return cached;
    if (!this.summaryIds.has(id)) return undefined;
    try {
      const artifact = JSON.parse(await readFile(join(this.artifactsDir, `${id}.json`), "utf8")) as MockupArtifact;
      this.artifacts.set(id, artifact);
      return artifact;
    } catch { return undefined; }
  }

  async all(): Promise<MockupArtifact[]> {
    return (await Promise.all(this.summaries.map((item) => this.get(item.id)))).filter((item): item is MockupArtifact => Boolean(item));
  }

  async save(artifact: MockupArtifact): Promise<void> {
    const exists = this.summaryIds.has(artifact.id);
    if (!exists && this.summaries.length >= this.maxArtifacts) throw new Error(`artifact limit reached (${this.maxArtifacts})`);
    await this.atomicWrite(join(this.artifactsDir, `${artifact.id}.json`), artifact);
    this.artifacts.set(artifact.id, artifact);
    const summary = this.toSummary(artifact);
    this.summaries = [summary, ...this.summaries.filter((item) => item.id !== artifact.id)];
    this.summaryIds.add(artifact.id);
    await this.writeIndex();
  }

  async delete(id: string): Promise<boolean> {
    const before = this.summaries.length;
    this.summaries = this.summaries.filter((item) => item.id !== id);
    if (before === this.summaries.length) return false;
    this.artifacts.delete(id);
    this.summaryIds.delete(id);
    await rm(join(this.artifactsDir, `${id}.json`), { force: true });
    await this.writeIndex();
    return true;
  }

  async exportText(artifact: MockupArtifact): Promise<string> {
    const exportsDir = join(this.root, "exports");
    await mkdir(exportsDir, { recursive: true });
    const slug = artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mockup";
    const path = join(exportsDir, `${slug}-${artifact.id.slice(0, 8)}.md`);
    const body = [`# ${artifact.title}`, "", `Variant: ${artifact.variant}`, `Viewport: ${artifact.viewport.width}×${artifact.viewport.height}`, "", "```text", ...normalizeCanvas(artifact.canvas).map(stripMarkup), "```", "", ...artifact.notes.map((note) => `- ${note}`), ""].join("\n");
    await writeFile(path, body, "utf8");
    return path;
  }

  private toSummary(artifact: MockupArtifact): ArtifactSummary {
    return { id: artifact.id, title: artifact.title, variant: artifact.variant, tags: artifact.tags, createdAt: artifact.createdAt };
  }

  private async rebuildIndex(): Promise<void> {
    const names = (await readdir(this.artifactsDir)).filter((name) => name.endsWith(".json")).sort();
    const loaded: MockupArtifact[] = [];
    for (const name of names) {
      try { loaded.push(JSON.parse(await readFile(join(this.artifactsDir, name), "utf8")) as MockupArtifact); } catch { /* Ignore invalid artifacts during recovery. */ }
    }
    loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.summaries = loaded.slice(0, this.maxArtifacts).map((artifact) => this.toSummary(artifact));
    this.rebuildSummaryIds();
    for (const artifact of loaded) this.artifacts.set(artifact.id, artifact);
    await this.writeIndex();
  }

  private rebuildSummaryIds(): void {
    this.summaryIds.clear();
    for (const summary of this.summaries) this.summaryIds.add(summary.id);
  }

  private async writeIndex(): Promise<void> { await this.atomicWrite(this.indexPath, { ...EMPTY_INDEX, artifacts: this.summaries }); }

  private async atomicWrite(path: string, value: unknown): Promise<void> {
    const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  }
}
