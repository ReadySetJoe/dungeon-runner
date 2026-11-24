import type { CellKey, Room, Token } from './types';
import { cellKey, parseCellKey } from './grid';

export function createRoom(name: string, color: string, id: string = crypto.randomUUID()): Room {
  return { id, name, color, cells: [], revealed: false };
}

export function paintCell(rooms: Room[], roomId: string, key: CellKey): Room[] {
  return rooms.map((r) => {
    if (r.id === roomId) return r.cells.includes(key) ? r : { ...r, cells: [...r.cells, key] };
    return r.cells.includes(key) ? { ...r, cells: r.cells.filter((c) => c !== key) } : r;
  });
}

export function eraseCell(rooms: Room[], key: CellKey): Room[] {
  return rooms.map((r) => (r.cells.includes(key) ? { ...r, cells: r.cells.filter((c) => c !== key) } : r));
}

export function toggleReveal(rooms: Room[], roomId: string): Room[] {
  return rooms.map((r) => (r.id === roomId ? { ...r, revealed: !r.revealed } : r));
}

export function removeRoom(rooms: Room[], roomId: string): Room[] {
  return rooms.filter((r) => r.id !== roomId);
}

export function updateRoom(
  rooms: Room[],
  roomId: string,
  patch: Partial<Pick<Room, 'name' | 'color' | 'notes'>>,
): Room[] {
  return rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r));
}

export function roomAtCell(rooms: Room[], key: CellKey): Room | undefined {
  return rooms.find((r) => r.cells.includes(key));
}

export function isCellVisible(rooms: Room[], key: CellKey): boolean {
  return roomAtCell(rooms, key)?.revealed ?? false;
}

export function occupiedCells(token: Token): CellKey[] {
  const out: CellKey[] = [];
  for (let dc = 0; dc < token.size; dc++) {
    for (let dr = 0; dr < token.size; dr++) out.push(cellKey(token.col + dc, token.row + dr));
  }
  return out;
}

export function isTokenVisible(rooms: Room[], token: Token): boolean {
  return occupiedCells(token).some((key) => isCellVisible(rooms, key));
}

export function defaultTokenCell(rooms: Room[]): { col: number; row: number } {
  const room = rooms.find((r) => r.revealed && r.cells.length > 0);
  return room ? parseCellKey(room.cells[0]) : { col: 0, row: 0 };
}
