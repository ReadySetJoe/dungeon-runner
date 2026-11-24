import { describe, it, expect } from 'vitest';
import {
  cellKey, parseCellKey, pixelToCell, cellToPixel,
  gridDimensions, isCellInBounds, cellsBetween, normalizeGrid,
} from './grid';

const grid = { cellSize: 50, offsetX: 10, offsetY: 20 };

describe('grid math', () => {
  it('round-trips cell keys', () => {
    expect(parseCellKey(cellKey(3, 7))).toEqual({ col: 3, row: 7 });
  });
  it('maps pixels to cells with offset', () => {
    expect(pixelToCell(grid, 10, 20)).toEqual({ col: 0, row: 0 });
    expect(pixelToCell(grid, 59.9, 69.9)).toEqual({ col: 0, row: 0 });
    expect(pixelToCell(grid, 60, 70)).toEqual({ col: 1, row: 1 });
  });
  it('returns negative cells left of / above the offset', () => {
    expect(pixelToCell(grid, 5, 5)).toEqual({ col: -1, row: -1 });
  });
  it('maps cells to their top-left pixel', () => {
    expect(cellToPixel(grid, 2, 1)).toEqual({ x: 110, y: 70 });
  });
  it('computes grid dimensions', () => {
    expect(gridDimensions({ cellSize: 50, offsetX: 0, offsetY: 0 }, 200, 200)).toEqual({ cols: 4, rows: 4 });
    expect(gridDimensions({ cellSize: 50, offsetX: 25, offsetY: 0 }, 200, 200)).toEqual({ cols: 4, rows: 4 });
    expect(gridDimensions({ cellSize: 50, offsetX: 0, offsetY: 0 }, 210, 200)).toEqual({ cols: 5, rows: 4 });
  });
  it('checks bounds', () => {
    const g = { cellSize: 50, offsetX: 0, offsetY: 0 };
    expect(isCellInBounds(g, 200, 200, 0, 0)).toBe(true);
    expect(isCellInBounds(g, 200, 200, 3, 3)).toBe(true);
    expect(isCellInBounds(g, 200, 200, 4, 0)).toBe(false);
    expect(isCellInBounds(g, 200, 200, -1, 0)).toBe(false);
  });
  it('lists cells along a line, inclusive', () => {
    expect(cellsBetween({ col: 0, row: 0 }, { col: 3, row: 0 })).toHaveLength(4);
    expect(cellsBetween({ col: 0, row: 0 }, { col: 2, row: 2 })).toEqual([
      { col: 0, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 2 },
    ]);
    expect(cellsBetween({ col: 2, row: 2 }, { col: 2, row: 2 })).toEqual([{ col: 2, row: 2 }]);
    expect(cellsBetween({ col: 3, row: 0 }, { col: 0, row: 0 })).toHaveLength(4);
  });
  it('normalises grids', () => {
    expect(normalizeGrid({ cellSize: 5, offsetX: 0, offsetY: 0 }).cellSize).toBe(10);
    expect(normalizeGrid({ cellSize: 500, offsetX: 0, offsetY: 0 }).cellSize).toBe(200);
    expect(normalizeGrid({ cellSize: 40.6, offsetX: 100, offsetY: -5 })).toEqual({ cellSize: 40.6, offsetX: 40.59, offsetY: 0 });
    expect(normalizeGrid({ cellSize: 40.456, offsetX: 1.234, offsetY: 0 })).toEqual({ cellSize: 40.46, offsetX: 1.23, offsetY: 0 });
  });
});
