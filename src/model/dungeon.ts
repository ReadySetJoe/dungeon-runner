import type { Dungeon, Token } from './types';

export const LARGE_IMAGE_PIXELS = 40_000_000;

/** Copy of the dungeon that is safe to send to the player window (no DM-only data). */
export function forPlayer(d: Dungeon): Dungeon {
  return { ...d, rooms: d.rooms.map(({ notes: _notes, ...room }) => room) };
}

export function validateImageType(type: string): string | null {
  return type.startsWith('image/') ? null : 'That file is not an image. Choose a webp, png or jpg.';
}

export function isLargeImage(width: number, height: number): boolean {
  return width * height > LARGE_IMAGE_PIXELS;
}

export function newDungeon(a: { name: string; image: Blob; width: number; height: number }): Dungeon {
  return {
    id: crypto.randomUUID(),
    name: a.name,
    map: { image: a.image, imageId: crypto.randomUUID(), width: a.width, height: a.height },
    grid: { cellSize: 50, offsetX: 0, offsetY: 0 },
    rooms: [],
    tokens: [],
  };
}

export function newToken(a: { name: string; image: Blob; col: number; row: number; size?: number }): Token {
  return {
    id: crypto.randomUUID(),
    name: a.name,
    image: a.image,
    imageId: crypto.randomUUID(),
    col: a.col,
    row: a.row,
    size: a.size ?? 1,
  };
}
