import type { Grid } from './types';
import { normalizeGrid } from './grid';

export interface Point { x: number; y: number }

const MIN_CELL = 10;
const MAX_CELL = 200;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Derive a grid from two clicked points on the map image.
 *
 * The points are opposite corners of a block of `squares` x `squares` grid squares (clicking
 * the two ends of a single edge also works, because the longer axis is used). The square
 * size is that distance divided by `squares`; the offsets place the grid lines through the
 * block's top-left corner. `clamped` is true when the measured size had to be forced into
 * the allowed 10-200 px range.
 */
export function calibrateGrid(a: Point, b: Point, squares: number): { grid: Grid; clamped: boolean } {
  const n = Math.max(1, Math.round(squares));
  const measured = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) / n;
  const cellSize = clamp(Math.round(measured), MIN_CELL, MAX_CELL);
  const wrap = (v: number) => ((v % cellSize) + cellSize) % cellSize;
  return {
    grid: normalizeGrid({
      cellSize,
      offsetX: wrap(Math.min(a.x, b.x)),
      offsetY: wrap(Math.min(a.y, b.y)),
    }),
    clamped: cellSize !== Math.round(measured),
  };
}
