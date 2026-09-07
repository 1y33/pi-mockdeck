import type { Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import { visibleWidth } from "@earendil-works/pi-tui";
import { TONES, type Tone } from "./types.js";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const TAG = /\[(\/|text|muted|dim|accent|success|warning|error|info)\]/g;
const TONE_SET = new Set<string>(TONES);
const THEME_COLOR: Record<Tone, ThemeColor> = {
  text: "text",
  muted: "muted",
  dim: "dim",
  accent: "accent",
  success: "success",
  warning: "warning",
  error: "error",
  info: "mdLink",
};

export function sanitizeLine(value: string): string {
  return value.replace(/[\r\n\t]/g, " ").replace(CONTROL_CHARACTERS, "");
}

export function stripMarkup(value: string): string {
  return sanitizeLine(value).replace(TAG, "");
}

export function markupWidth(value: string): number {
  return visibleWidth(stripMarkup(value));
}

export function validateMarkup(value: string): void {
  let open: string | undefined;
  for (const match of sanitizeLine(value).matchAll(TAG)) {
    const token = match[1]!;
    if (token === "/") {
      if (!open) throw new Error("closing color tag has no matching opening tag");
      open = undefined;
    } else {
      if (open) throw new Error(`nested color tag [${token}] is not allowed`);
      open = token;
    }
  }
  if (open) throw new Error(`color tag [${open}] is not closed`);
}

export function renderMarkup(value: string, theme: Theme): string {
  const safe = sanitizeLine(value);
  let tone: Tone = "text";
  let cursor = 0;
  let output = "";
  for (const match of safe.matchAll(TAG)) {
    const index = match.index;
    if (index > cursor) output += theme.fg(THEME_COLOR[tone], safe.slice(cursor, index));
    const token = match[1] ?? "/";
    tone = token === "/" || !TONE_SET.has(token) ? "text" : token as Tone;
    cursor = index + match[0].length;
  }
  if (cursor < safe.length) output += theme.fg(THEME_COLOR[tone], safe.slice(cursor));
  return output;
}
