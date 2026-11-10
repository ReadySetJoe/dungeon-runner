import { useCallback, useRef, type MutableRefObject } from 'react';
import type { Dungeon } from '../model/types';
import type { PointerInfo } from '../canvas/MapCanvas';
import { cellKey, cellsBetween, gridDimensions, isCellInBounds, pixelToCell } from '../model/grid';
import { eraseCell, occupiedCells, paintCell, roomAtCell, toggleReveal } from '../model/rooms';
import type { Update } from './DmView';

export function usePaintInteraction(
  dungeonRef: MutableRefObject<Dungeon>,
  update: Update,
  roomId: string | null,
  tool: 'paint' | 'erase',
) {
  const last = useRef<{ col: number; row: number } | null>(null);
  return useCallback(
    (info: PointerInfo) => {
      if (info.type === 'up') {
        last.current = null;
        return;
      }
      if (info.type === 'move' && !last.current) return;
      const d = dungeonRef.current;
      const cell = pixelToCell(d.grid, info.world.x, info.world.y);
      const from = last.current ?? cell;
      last.current = cell;
      if (tool === 'paint' && !roomId) return;
      const path = cellsBetween(from, cell).filter((c) =>
        isCellInBounds(d.grid, d.map.width, d.map.height, c.col, c.row),
      );
      if (path.length === 0) return;
      update((dd) => ({
        ...dd,
        rooms: path.reduce(
          (rooms, c) =>
            tool === 'erase'
              ? eraseCell(rooms, cellKey(c.col, c.row))
              : paintCell(rooms, roomId!, cellKey(c.col, c.row)),
          dd.rooms,
        ),
      }));
    },
    [dungeonRef, update, roomId, tool],
  );
}

export function useRunInteraction(dungeonRef: MutableRefObject<Dungeon>, update: Update) {
  const drag = useRef<{ tokenId: string; dc: number; dr: number } | null>(null);
  return useCallback(
    (info: PointerInfo) => {
      const d = dungeonRef.current;
      const cell = pixelToCell(d.grid, info.world.x, info.world.y);
      if (info.type === 'down') {
        const key = cellKey(cell.col, cell.row);
        const token = [...d.tokens].reverse().find((t) => occupiedCells(t).includes(key));
        if (token) {
          drag.current = { tokenId: token.id, dc: cell.col - token.col, dr: cell.row - token.row };
          return;
        }
        const room = roomAtCell(d.rooms, key);
        if (room) update((dd) => ({ ...dd, rooms: toggleReveal(dd.rooms, room.id) }));
        return;
      }
      if (info.type === 'move' && drag.current) {
        const { tokenId, dc, dr } = drag.current;
        update((dd) => {
          const t = dd.tokens.find((x) => x.id === tokenId);
          if (!t) return dd;
          const { cols, rows } = gridDimensions(dd.grid, dd.map.width, dd.map.height);
          const col = Math.min(Math.max(cell.col - dc, 0), Math.max(0, cols - t.size));
          const row = Math.min(Math.max(cell.row - dr, 0), Math.max(0, rows - t.size));
          if (t.col === col && t.row === row) return dd;
          return { ...dd, tokens: dd.tokens.map((x) => (x.id === tokenId ? { ...x, col, row } : x)) };
        });
        return;
      }
      if (info.type === 'up') drag.current = null;
    },
    [dungeonRef, update],
  );
}
