import type { CellKey, Grid } from './types';

export interface Cell { col: number; row: number }

export const cellKey = (col: number, row: number): CellKey => `${col},${row}`;

export function parseCellKey(key: CellKey): Cell {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

export function pixelToCell(grid: Grid, x: number, y: number): Cell {
  return {
    col: Math.floor((x - grid.offsetX) / grid.cellSize),
    row: Math.floor((y - grid.offsetY) / grid.cellSize),
  };
}

export function cellToPixel(grid: Grid, col: number, row: number) {
  return { x: grid.offsetX + col * grid.cellSize, y: grid.offsetY + row * grid.cellSize };
}

export function gridDimensions(grid: Grid, width: number, height: number) {
  return {
    cols: Math.max(0, Math.ceil((width - grid.offsetX) / grid.cellSize)),
    rows: Math.max(0, Math.ceil((height - grid.offsetY) / grid.cellSize)),
  };
}

export function isCellInBounds(grid: Grid, width: number, height: number, col: number, row: number) {
  const { cols, rows } = gridDimensions(grid, width, height);
  return col >= 0 && row >= 0 && col < cols && row < rows;
}

export function cellsBetween(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let { col, row } = a;
  const dx = Math.abs(b.col - a.col);
  const dy = Math.abs(b.row - a.row);
  const sx = a.col < b.col ? 1 : -1;
  const sy = a.row < b.row ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    out.push({ col, row });
    if (col === b.col && row === b.row) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; col += sx; }
    if (e2 < dx) { err += dx; row += sy; }
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Grid values keep two decimals, so maps whose squares aren't a whole number of pixels line up. */
const round2 = (v: number) => Math.round(v * 100) / 100;

export function normalizeGrid(grid: Grid): Grid {
  const cellSize = clamp(round2(grid.cellSize), 10, 200);
  const maxOffset = round2(cellSize - 0.01);
  return {
    cellSize,
    offsetX: clamp(round2(grid.offsetX), 0, maxOffset),
    offsetY: clamp(round2(grid.offsetY), 0, maxOffset),
  };
}
