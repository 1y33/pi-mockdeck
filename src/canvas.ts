import { markupWidth, stripMarkup } from "./markup.js";

const RIGHT_EDGE = /([│┃║╮╯┐┘┤┥┫┨╗╝╣])((?:\[(?:\/|text|muted|dim|accent|success|warning|error|info)\])*\s*)$/u;
const HORIZONTAL_FRAME = /^[╭╰├┌└╔╚╠].*[╮╯┤┐┘╗╝╣]$/u;

/** Aligns generated outer frame edges without changing visible content or color tags. */
export function normalizeCanvas(lines: readonly string[]): string[] {
  const targetWidth = lines.reduce((maximum, line) => Math.max(maximum, markupWidth(line)), 0);
  return lines.map((line) => {
    const missing = targetWidth - markupWidth(line);
    if (missing <= 0) return line;
    const edge = line.match(RIGHT_EDGE);
    if (!edge || edge.index === undefined) return line + " ".repeat(missing);
    const plain = stripMarkup(line).trim();
    const filler = HORIZONTAL_FRAME.test(plain) ? "─" : " ";
    return line.slice(0, edge.index) + filler.repeat(missing) + line.slice(edge.index);
  });
}
