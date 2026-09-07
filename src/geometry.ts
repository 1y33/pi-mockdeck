import { stripMarkup } from "./markup.js";

type Direction = "north" | "south";
const NORTH = new Set("│┃║└┘├┤┴┼╰╯╚╝╠╣╩╬");
const SOUTH = new Set("│┃║┌┐├┤┬┼╭╮╔╗╠╣╦╬");

export interface GeometryIssue {
  row: number;
  column: number;
  direction: Direction;
  glyph: string;
}

/** Finds vertically disconnected box-drawing edges after semantic markup is removed. */
export function inspectBoxGeometry(lines: readonly string[]): GeometryIssue[] {
  const rows = lines.map((line) => Array.from(stripMarkup(line)));
  const issues: GeometryIssue[] = [];
  for (let row = 0; row < rows.length; row++) {
    const cells = rows[row]!;
    for (let column = 0; column < cells.length; column++) {
      const glyph = cells[column]!;
      if (NORTH.has(glyph) && (row === 0 || !SOUTH.has(rows[row - 1]?.[column] ?? ""))) {
        issues.push({ row: row + 1, column: column + 1, direction: "north", glyph });
      }
      if (SOUTH.has(glyph) && (row === rows.length - 1 || !NORTH.has(rows[row + 1]?.[column] ?? ""))) {
        issues.push({ row: row + 1, column: column + 1, direction: "south", glyph });
      }
    }
  }
  return issues;
}

export function assertBoxGeometry(lines: readonly string[]): void {
  const issues = inspectBoxGeometry(lines);
  if (!issues.length) return;
  const first = issues[0]!;
  throw new Error(`disconnected box edge ${first.direction} at canvas row ${first.row}, column ${first.column} (${first.glyph}); fix spacing so vertical borders stay in one column`);
}
