import { describe, it, expect } from 'vitest';
import {
  createRoom, paintCell, eraseCell, toggleReveal, removeRoom, updateRoom,
  roomAtCell, isCellVisible, occupiedCells, isTokenVisible, defaultTokenCell,
} from './rooms';
import { cellKey } from './grid';
import { newToken } from './dungeon';

const k = cellKey;
const mk = () => [createRoom('A', '#f00', 'a'), createRoom('B', '#0f0', 'b')];

describe('rooms', () => {
  it('creates hidden empty rooms', () => {
    expect(createRoom('A', '#f00', 'a')).toEqual({ id: 'a', name: 'A', color: '#f00', cells: [], revealed: false });
  });
  it('paints a cell into a room, idempotently', () => {
    let rooms = paintCell(mk(), 'a', k(0, 0));
    rooms = paintCell(rooms, 'a', k(0, 0));
    expect(rooms[0].cells).toEqual([k(0, 0)]);
  });
  it('moves a cell between rooms (one room per cell)', () => {
    let rooms = paintCell(mk(), 'a', k(1, 1));
    rooms = paintCell(rooms, 'b', k(1, 1));
    expect(rooms[0].cells).toEqual([]);
    expect(rooms[1].cells).toEqual([k(1, 1)]);
  });
  it('erases a cell from whichever room has it', () => {
    let rooms = paintCell(mk(), 'a', k(1, 1));
    rooms = eraseCell(rooms, k(1, 1));
    expect(rooms[0].cells).toEqual([]);
  });
  it('toggles reveal', () => {
    let rooms = toggleReveal(mk(), 'a');
    expect(rooms[0].revealed).toBe(true);
    expect(rooms[1].revealed).toBe(false);
    rooms = toggleReveal(rooms, 'a');
    expect(rooms[0].revealed).toBe(false);
  });
  it('removes and updates rooms', () => {
    expect(removeRoom(mk(), 'a').map((r) => r.id)).toEqual(['b']);
    const rooms = updateRoom(mk(), 'a', { name: 'Hall', color: '#00f' });
    expect(rooms[0]).toMatchObject({ name: 'Hall', color: '#00f' });
  });
  it('finds the room at a cell', () => {
    const rooms = paintCell(mk(), 'b', k(2, 2));
    expect(roomAtCell(rooms, k(2, 2))?.id).toBe('b');
    expect(roomAtCell(rooms, k(0, 0))).toBeUndefined();
  });
  it('hides unassigned cells and cells in unrevealed rooms', () => {
    let rooms = paintCell(mk(), 'a', k(0, 0));
    expect(isCellVisible(rooms, k(0, 0))).toBe(false);
    expect(isCellVisible(rooms, k(5, 5))).toBe(false);
    rooms = toggleReveal(rooms, 'a');
    expect(isCellVisible(rooms, k(0, 0))).toBe(true);
    expect(isCellVisible(rooms, k(5, 5))).toBe(false);
  });
  it('lists the cells a token occupies', () => {
    const t = newToken({ name: 't', image: new Blob(['x']), col: 1, row: 1, size: 2 });
    expect(occupiedCells(t).sort()).toEqual([k(1, 1), k(1, 2), k(2, 1), k(2, 2)].sort());
  });
  it('shows a token only when an occupied cell is in a revealed room', () => {
    const t = newToken({ name: 't', image: new Blob(['x']), col: 0, row: 0, size: 2 });
    let rooms = paintCell(mk(), 'b', k(1, 1));
    expect(isTokenVisible(rooms, t)).toBe(false);
    rooms = toggleReveal(rooms, 'b');
    expect(isTokenVisible(rooms, t)).toBe(true);
    const away = newToken({ name: 'u', image: new Blob(['x']), col: 5, row: 5 });
    expect(isTokenVisible(rooms, away)).toBe(false);
  });
  it('picks a default token cell', () => {
    expect(defaultTokenCell(mk())).toEqual({ col: 0, row: 0 });
    let rooms = paintCell(mk(), 'b', k(3, 4));
    expect(defaultTokenCell(rooms)).toEqual({ col: 0, row: 0 });
    rooms = toggleReveal(rooms, 'b');
    expect(defaultTokenCell(rooms)).toEqual({ col: 3, row: 4 });
  });
});
