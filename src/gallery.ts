import type { Theme } from "@earendil-works/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { renderMarkup } from "./markup.js";
import type { MockupArtifact } from "./types.js";

export type GalleryAction =
  | { type: "close" }
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
  private viewIndex = 0;
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  constructor(
    private readonly artifacts: MockupArtifact[],
    private readonly theme: Theme,
    private readonly requestRender: () => void,
    private readonly done: (action: GalleryAction) => void,
  ) {}

  handleInput(data: string): void {
    if (matchesKey(data, "escape") || data === "q") return this.done({ type: "close" });
    if (matchesKey(data, "tab")) this.viewIndex = (this.viewIndex + 1) % VIEWS.length;
    else if (matchesKey(data, "shift+tab")) this.viewIndex = (this.viewIndex + VIEWS.length - 1) % VIEWS.length;
    else if (matchesKey(data, "up") || data === "k") this.move(-1);
    else if (matchesKey(data, "down") || data === "j") this.move(1);
    else if (matchesKey(data, "left") || data === "h") this.move(-1);
    else if (matchesKey(data, "right") || data === "l") this.move(1);
    else if (/^[1-9]$/.test(data)) this.selected = Math.min(Number(data) - 1, Math.max(0, this.artifacts.length - 1));
    else if (data === "g") {
      const artifact = this.current();
      return this.done(artifact ? { type: "generate", artifact } : { type: "generate" });
    }
    else {
      const artifact = this.current();
      if (!artifact) return;
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
    const lines = [this.theme.fg("border", `╭${"─".repeat(bodyWidth)}╮`), `${this.theme.fg("border", "│")}${fit(header, bodyWidth)}${this.theme.fg("border", "│")}`, this.theme.fg("border", `├${"─".repeat(bodyWidth)}┤`)];
    if (!selected) lines.push(...this.empty(bodyWidth));
    else if (VIEWS[this.viewIndex] === "gallery") lines.push(...this.gallery(selected, bodyWidth));
    else if (VIEWS[this.viewIndex] === "preview") lines.push(...this.preview(selected, bodyWidth));
    else lines.push(...this.notes(selected, bodyWidth));
    lines.push(this.theme.fg("border", `├${"─".repeat(bodyWidth)}┤`));
    lines.push(`${this.theme.fg("border", "│")}${fit(` ${this.theme.fg("dim", "↑↓ select  Tab view  G generate  U use  C copy  E export  D delete  Esc close")}`, bodyWidth)}${this.theme.fg("border", "│")}`);
    lines.push(this.theme.fg("border", `╰${"─".repeat(bodyWidth)}╯`));
    this.cachedWidth = width;
    this.cachedLines = lines;
    return lines;
  }

  invalidate(): void { this.cachedWidth = undefined; this.cachedLines = undefined; }

  private current(): MockupArtifact | undefined { return this.artifacts[this.selected]; }
  private move(delta: number): void {
    if (!this.artifacts.length) return;
    this.selected = (this.selected + delta + this.artifacts.length) % this.artifacts.length;
  }
  private label(view: View): string { return view[0]!.toUpperCase() + view.slice(1); }
  private row(content: string, width: number): string { return `${this.theme.fg("border", "│")}${fit(content, width)}${this.theme.fg("border", "│")}`; }
  private empty(width: number): string[] {
    return [this.row("", width), this.row(`  ${this.theme.fg("muted", "No mockups yet. Press G or run /mockup <brief>.")}`, width), this.row("", width)];
  }
  private gallery(selected: MockupArtifact, width: number): string[] {
    if (width < 78) return this.preview(selected, width);
    const sidebarWidth = Math.min(30, Math.max(22, Math.floor(width * 0.26)));
    const previewWidth = width - sidebarWidth - 1;
    const list = this.artifacts.map((artifact, index) => {
      const prefix = index === this.selected ? this.theme.fg("accent", " ▶ ") : "   ";
      const label = index === this.selected ? this.theme.fg("accent", artifact.title) : artifact.title;
      return fit(`${prefix}${label}`, sidebarWidth);
    });
    const canvas = [this.theme.fg("accent", this.theme.bold(` ${selected.title}`)), this.theme.fg("dim", ` ${selected.variant} · ${selected.viewport.width}×${selected.viewport.height}`), "", ...selected.canvas.map((line) => renderMarkup(line, this.theme))];
    const count = Math.max(list.length, canvas.length, 4);
    return Array.from({ length: count }, (_, index) => this.row(`${list[index] ?? " ".repeat(sidebarWidth)}${this.theme.fg("borderMuted", "│")}${fit(canvas[index] ?? "", previewWidth)}`, width));
  }
  private preview(selected: MockupArtifact, width: number): string[] {
    return [this.row(` ${this.theme.fg("accent", this.theme.bold(selected.title))}`, width), this.row(` ${this.theme.fg("dim", `${selected.variant} · target ${selected.viewport.width}×${selected.viewport.height}`)}`, width), this.row("", width), ...selected.canvas.map((line) => this.row(` ${renderMarkup(line, this.theme)}`, width))];
  }
  private notes(selected: MockupArtifact, width: number): string[] {
    const tags = selected.tags.length ? selected.tags.map((tag) => this.theme.fg("accent", `#${tag}`)).join(" ") : this.theme.fg("dim", "No tags");
    const notes = selected.notes.length ? selected.notes.map((note) => this.row(` • ${note}`, width)) : [this.row(` ${this.theme.fg("dim", "No design notes")}`, width)];
    return [this.row(` ${this.theme.fg("accent", this.theme.bold(selected.title))}`, width), this.row(` ${tags}`, width), this.row("", width), ...notes];
  }
}
