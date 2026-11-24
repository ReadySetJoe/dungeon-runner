import { describe, it, expect } from 'vitest';
import { calibrateGrid } from './calibrate';

describe('calibrateGrid', () => {
  it('measures a square from opposite (diagonal) corners', () => {
    const r = calibrateGrid({ x: 130, y: 70 }, { x: 180, y: 120 }, 1);
    expect(r.grid).toEqual({ cellSize: 50, offsetX: 30, offsetY: 20 });
    expect(r.clamped).toBe(false);
  });

  it('measures along a single edge (one axis is ~0)', () => {
    const r = calibrateGrid({ x: 100, y: 200 }, { x: 160, y: 200 }, 1);
    expect(r.grid.cellSize).toBe(60);
    expect(r.grid).toMatchObject({ offsetX: 40, offsetY: 20 });
  });

  it('is independent of the order the corners were clicked', () => {
    const a = calibrateGrid({ x: 180, y: 120 }, { x: 130, y: 70 }, 1);
    const b = calibrateGrid({ x: 130, y: 70 }, { x: 180, y: 120 }, 1);
    expect(a).toEqual(b);
    const c = calibrateGrid({ x: 130, y: 120 }, { x: 180, y: 70 }, 1);
    expect(c).toEqual(b);
  });

  it('divides by the number of squares spanned', () => {
    const r = calibrateGrid({ x: 20, y: 20 }, { x: 170, y: 170 }, 3);
    expect(r.grid).toEqual({ cellSize: 50, offsetX: 20, offsetY: 20 });
  });

  it('rounds a fractional spanned count and treats <1 as 1', () => {
    expect(calibrateGrid({ x: 0, y: 0 }, { x: 100, y: 100 }, 2.4).grid.cellSize).toBe(50);
    expect(calibrateGrid({ x: 0, y: 0 }, { x: 100, y: 100 }, 0).grid.cellSize).toBe(100);
  });

  it('wraps the offset into a single square, using the rounded square size', () => {
    const r = calibrateGrid({ x: 250, y: 410 }, { x: 300, y: 460 }, 1);
    expect(r.grid).toEqual({ cellSize: 50, offsetX: 0, offsetY: 10 });
  });

  it('clamps to the allowed square-size range and reports it', () => {
    const tiny = calibrateGrid({ x: 0, y: 0 }, { x: 3, y: 3 }, 1);
    expect(tiny.grid.cellSize).toBe(10);
    expect(tiny.clamped).toBe(true);
    const huge = calibrateGrid({ x: 0, y: 0 }, { x: 900, y: 900 }, 1);
    expect(huge.grid.cellSize).toBe(200);
    expect(huge.clamped).toBe(true);
    const same = calibrateGrid({ x: 5, y: 5 }, { x: 5, y: 5 }, 1);
    expect(same.clamped).toBe(true);
  });

  it('keeps offsets inside 0..cellSize-1 when the corner has negative coordinates', () => {
    const r = calibrateGrid({ x: -20, y: -10 }, { x: 30, y: 40 }, 1);
    expect(r.grid.cellSize).toBe(50);
    expect(r.grid.offsetX).toBe(30);
    expect(r.grid.offsetY).toBe(40);
  });

  it('keeps fractional square sizes to two decimals', () => {
    // 5 squares spanning 202.5 px -> 40.5 px each
    const r = calibrateGrid({ x: 10, y: 10 }, { x: 212.5, y: 10 }, 5);
    expect(r.grid.cellSize).toBe(40.5);
    expect(r.clamped).toBe(false);
  });
});
