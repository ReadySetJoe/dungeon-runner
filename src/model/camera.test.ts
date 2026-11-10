import { describe, it, expect } from 'vitest';
import { screenToWorld, worldToScreen, fitCamera, zoomAt, panBy } from './camera';

describe('camera', () => {
  it('round-trips screen and world coordinates', () => {
    const c = { x: 30, y: -10, zoom: 2 };
    const w = screenToWorld(c, 100, 50);
    expect(worldToScreen(c, w.x, w.y)).toEqual({ x: 100, y: 50 });
  });

  it('fits and centres the map', () => {
    const c = fitCamera(200, 100, 400, 400, 0);
    expect(c.zoom).toBe(2);
    expect(worldToScreen(c, 100, 50)).toEqual({ x: 200, y: 200 });
  });

  it('keeps the point under the cursor fixed when zooming', () => {
    const c = { x: 10, y: 20, zoom: 1 };
    const before = screenToWorld(c, 150, 90);
    const z = zoomAt(c, 150, 90, 2);
    expect(z.zoom).toBe(2);
    const after = screenToWorld(z, 150, 90);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('clamps zoom', () => {
    expect(zoomAt({ x: 0, y: 0, zoom: 7 }, 0, 0, 10).zoom).toBe(8);
    expect(zoomAt({ x: 0, y: 0, zoom: 0.06 }, 0, 0, 0.01).zoom).toBe(0.05);
  });

  it('pans by screen deltas', () => {
    const c = panBy({ x: 0, y: 0, zoom: 2 }, 100, 40);
    expect(c).toEqual({ x: -50, y: -20, zoom: 2 });
  });
});
