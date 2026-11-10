import { describe, it, expect } from 'vitest';
import { validateImageType, isLargeImage, newDungeon, newToken } from './dungeon';

describe('dungeon factories', () => {
  it('accepts image types and rejects others', () => {
    expect(validateImageType('image/webp')).toBeNull();
    expect(validateImageType('image/png')).toBeNull();
    expect(validateImageType('application/pdf')).toMatch(/not an image/i);
    expect(validateImageType('')).toMatch(/not an image/i);
  });
  it('flags very large images', () => {
    expect(isLargeImage(2000, 2000)).toBe(false);
    expect(isLargeImage(8000, 8000)).toBe(true);
  });
  it('creates a dungeon with defaults and unique ids', () => {
    const image = new Blob(['x']);
    const d = newDungeon({ name: 'Crypt', image, width: 200, height: 100 });
    expect(d.name).toBe('Crypt');
    expect(d.map).toMatchObject({ width: 200, height: 100 });
    expect(d.map.image).toBe(image);
    expect(d.grid).toEqual({ cellSize: 50, offsetX: 0, offsetY: 0 });
    expect(d.rooms).toEqual([]);
    expect(d.tokens).toEqual([]);
    expect(newDungeon({ name: 'x', image, width: 1, height: 1 }).id).not.toBe(d.id);
  });
  it('creates a token defaulting to size 1', () => {
    const t = newToken({ name: 'Goblin', image: new Blob(['x']), col: 2, row: 3 });
    expect(t).toMatchObject({ name: 'Goblin', col: 2, row: 3, size: 1 });
    expect(t.id).toBeTruthy();
    expect(t.imageId).toBeTruthy();
  });
});
