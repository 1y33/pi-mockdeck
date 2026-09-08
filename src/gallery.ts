import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { normalizeCanvas } from "./canvas.js";
import { inspectBoxGeometry } from "./geometry.js";
import { renderMarkup } from "./markup.js";
import type { MockupArtifact } from "./types.js";

export type GalleryAction =
  | { type: "close" }
  | { type: "move"; artifact: MockupArtifact }
  | { type: "copy"; artifact: MockupArtifact }
  | { type: "delete"; artifact: MockupArtifact }
  | { type: "export"; artifact: MockupArtifact }
  | { type: "generate"; artifact?: MockupArtifact }
  | { type: "use"; artifact: MockupArtifact };

type View = "gallery" | "preview" | "notes";
const VIEWS: View[] = ["gallery", "preview", "notes"];

function fit(value: string, width: number): string {
  if (width <= 0) return "";
  const truncated = truncateToWidth(value, width, "");
  return truncated + " ".repeat(Math.max(0, width - visibleWidth(truncated)));
}

export class GalleryComponent {
  private selected = 0;
  private readonly collapsed = new Set<string>();
  private viewIndex = 0;
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(
    private readonly artifacts: MockupArtifact[],
    private readonly theme: Theme,
    private readonly requestRender: () => void,
    private readonly done: (action: GalleryAction) => void,
    private readonly solidBackground = true,
  ) {}

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || data === "q") return this.done({ type: "close" });
    if (matchesKey(data, "tab")) this.viewIndex = (this.viewIndex + 1) % VIEWS.length;
    else if (matchesKey(data, "shift+tab")) this.viewIndex = (this.viewIndex + VIEWS.length - 1) % VIEWS.length;
    else if (matchesKey(data, "up") || data === "k") this.move(-1);
    else if (matchesKey(data, "down") || data === "j") this.move(1);
    else if (matchesKey(data, "left") || data === "h") this.branch(false);
    else if (matchesKey(data, "right") || data === "l") this.branch(true);
    else if (/^[1-9]$/.test(data)) this.selected = Math.min(Number(data) - 1, Math.max(0, this.entries().length - 1));
    else if (data === "g") {
      const artifact = this.current();
      return this.done(artifact ? { type: "generate", artifact } : { type: "generate" });
    }
    else {
      const artifact = this.current();
      if (!artifact) {
        if (matchesKey(data, "return")) { this.branch(this.collapsed.has(this.entries()[this.selected]?.path ?? "")); this.invalidate(); this.requestRender(); }
        return;
      }
      if (data === "m") return this.done({ type: "move", artifact });
      if (data === "c") return this.done({ type: "copy", artifact });
      if (data === "d") return this.done({ type: "delete", artifact });
      if (data === "e") return this.done({ type: "export", artifact });
      if (data === "u" || matchesKey(data, "return")) return this.done({ type: "use", artifact });
      return;
    }
    this.invalidate();
    this.requestRender();
  }

  render(width: number): string[] {
    if (this.cachedWidth === width && this.cachedLines) return this.cachedLines;
    const w = Math.max(20, width);
    const bodyWidth = Math.max(1, w - 2);
    const selected = this.current();
    const tabs = VIEWS.map((view, index) => index === this.viewIndex
      ? this.theme.fg("accent", this.theme.bold(`[${this.label(view)}]`))
      : this.theme.fg("muted", ` ${this.label(view)} `)).join("  ");
    const count = this.theme.fg("dim", `${this.artifacts.length} concept${this.artifacts.length === 1 ? "" : "s"}`);
    const header = fit(` ${this.theme.fg("accent", this.theme.bold("MOCKDECK"))}  ${tabs}`, Math.max(1, bodyWidth - visibleWidth(count) - 1)) + count;
    const lines = [this.frame(`╭${"─".repeat(bodyWidth)}╮`), this.row(header, bodyWidth), this.frame(`├${"─".repeat(bodyWidth)}┤`)];
    if (!this.artifacts.length) lines.push(...this.empty(bodyWidth));
    else if (VIEWS[this.viewIndex] === "gallery" || !selected) lines.push(...this.gallery(selected, bodyWidth));
    else if (VIEWS[this.viewIndex] === "preview") lines.push(...this.preview(selected, bodyWidth));
    else lines.push(...this.notes(selected, bodyWidth));
    lines.push(this.frame(`├${"─".repeat(bodyWidth)}┤`));
    lines.push(this.row(` ${this.theme.fg("dim", "↑↓ select  ←→ folders  Tab view  M move  G generate  U use  C copy  E export  D delete  Esc close")}`, bodyWidth));
    lines.push(this.frame(`╰${"─".repeat(bodyWidth)}╯`));
    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void { this.cachedWidth = undefined; this.cachedLines = undefined; }

  private entries(): { path: string; label: string; depth: number; artifact?: MockupArtifact }[] {
    type Folder = { folders: Map<string, Folder>; artifacts: MockupArtifact[] };
    const root: Folder = { folders: new Map(), artifacts: [] };
    for (const artifact of this.artifacts) {
      let node = root;
      for (const part of (artifact.folder || "").split("/").filter(Boolean)) {
        if (!node.folders.has(part)) node.folders.set(part, { folders: new Map(), artifacts: [] });
        node = node.folders.get(part)!;
      }
      node.artifacts.push(artifact);
    }
    const rows: { path: string; label: string; depth: number; artifact?: MockupArtifact }[] = [];
    const walk = (node: Folder, parent: string, depth: number): void => {
      for (const [label, child] of node.folders) {
        const path = parent ? `${parent}/${label}` : label;
        rows.push({ path, label, depth });
        if (!this.collapsed.has(path)) walk(child, path, depth + 1);
      }
      for (const artifact of node.artifacts) rows.push({ path: parent, label: artifact.title, depth, artifact });
    };
    walk(root, "", 0);
    return rows;
  }
  private current(): MockupArtifact | undefined { return this.entries()[this.selected]?.artifact; }
  private move(delta: number): void {
    const length = this.entries().length;
    if (length) this.selected = (this.selected + delta + length) % length;
  }
  private branch(expand: boolean): void {
    const rows = this.entries();
    const entry = rows[this.selected];
    if (!entry) return;
    if (!entry.artifact && (expand || !this.collapsed.has(entry.path))) {
      if (expand) {
        if (this.collapsed.has(entry.path)) this.collapsed.delete(entry.path);
        else if (rows[this.selected + 1]?.depth === entry.depth + 1) this.selected++;
      } else this.collapsed.add(entry.path);
    } else if (!expand) {
      for (let i = this.selected - 1; i >= 0; i--) {
        if (rows[i]!.depth < entry.depth) { this.selected = i; break; }
      }
    }
  }
  private label(view: View): string { return view[0]!.toUpperCase() + view.slice(1); }
  private surface(content: string): string { return this.solidBackground ? this.theme.bg("customMessageBg", content) : content; }
  private frame(content: string): string { return this.surface(this.theme.fg("border", content)); }
  private row(content: string, width: number): string { return this.surface(`${this.theme.fg("border", "│")}${fit(content, width)}${this.theme.fg("border", "│")}`); }
  private empty(width: number): string[] {
    return [this.row("", width), this.row(`  ${this.theme.fg("muted", "No mockups yet. Press G or run /mockup <brief>.")}`, width), this.row("", width)];
  }
  private gallery(selected: MockupArtifact | undefined, width: number): string[] {
    const sidebarWidth = Math.min(30, Math.max(22, Math.floor(width * 0.26)));
    const previewWidth = width - sidebarWidth - 1;
    const list = this.entries().map((entry, index) => {
      const title = `${"  ".repeat(entry.depth)}${entry.artifact ? "· " : this.collapsed.has(entry.path) ? "▸ " : "▾ "}${entry.label}${entry.artifact ? "" : "/"}`;
      const prefix = index === this.selected ? this.theme.fg("accent", " ▶ ") : "   ";
      const label = index === this.selected ? this.theme.fg("accent", title) : title;
      const content = fit(`${prefix}${label}`, width < 78 ? width : sidebarWidth);
      return index === this.selected ? this.theme.bg("selectedBg", content) : content;
    });
    if (width < 78) return [...list.map((line) => this.row(line, width)), this.row("", width), ...(selected ? this.preview(selected, width) : [])];
    const canvas = selected ? [this.theme.fg("accent", this.theme.bold(` ${selected.title}`)), this.theme.fg("dim", ` ${selected.variant} · ${selected.viewport.width}×${selected.viewport.height}`), "", ...this.canvasLines(selected)] : [this.theme.fg("accent", ` ${this.entries()[this.selected]?.path ?? ""}/`), "", " Select a mockup or expand a folder."];
    const count = Math.max(list.length, canvas.length, 4);
    return Array.from({ length: count }, (_, index) => this.row(`${list[index] ?? " ".repeat(sidebarWidth)}${this.theme.fg("borderMuted", "│")}${fit(canvas[index] ?? "", previewWidth)}`, width));
  }
  private preview(selected: MockupArtifact, width: number): string[] {
    return [this.row(` ${this.theme.fg("accent", this.theme.bold(selected.title))}`, width), this.row(` ${this.theme.fg("dim", `${selected.variant} · target ${selected.viewport.width}×${selected.viewport.height}`)}`, width), this.row("", width), ...this.canvasLines(selected).map((line) => this.row(` ${line}`, width))];
  }
  private canvasLines(selected: MockupArtifact): string[] {
    const normalized = normalizeCanvas(selected.canvas);
    const issues = inspectBoxGeometry(normalized);
    if (!issues.length) return normalized.map((line) => renderMarkup(line, this.theme));
    const first = issues[0]!;
    return [
      this.theme.fg("warning", "⚠ Invalid box geometry in this legacy mockup"),
      this.theme.fg("muted", `Disconnected ${first.direction} edge at row ${first.row}, column ${first.column}.`),
      this.theme.fg("dim", "Press G to regenerate it; new malformed mockups are rejected automatically."),
    ];
  }

  private notes(selected: MockupArtifact, width: number): string[] {
    const tags = selected.tags.length ? selected.tags.map((tag) => this.theme.fg("accent", `#${tag}`)).join(" ") : this.theme.fg("dim", "No tags");
    const notes = selected.notes.length ? selected.notes.map((note) => this.row(` • ${note}`, width)) : [this.row(` ${this.theme.fg("dim", "No design notes")}`, width)];
    return [this.row(` ${this.theme.fg("accent", this.theme.bold(selected.title))}`, width), this.row(` ${tags}`, width), this.row("", width), ...notes];
  }
}
