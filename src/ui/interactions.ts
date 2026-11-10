import { useCallback, useRef, type MutableRefObject } from 'react';
import type { Dungeon } from '../model/types';
import type { PointerInfo } from '../canvas/MapCanvas';
import { cellKey, cellsBetween, isCellInBounds, pixelToCell } from '../model/grid';
import { eraseCell, paintCell } from '../model/rooms';
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
