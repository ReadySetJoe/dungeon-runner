export type CellKey = `${number},${number}`;

export interface Grid { cellSize: number; offsetX: number; offsetY: number }

export interface Room { id: string; name: string; color: string; cells: CellKey[]; revealed: boolean }

export interface Token { id: string; name: string; image: Blob; imageId: string; col: number; row: number; size: number }

export interface Dungeon {
  id: string; name: string;
  map: { image: Blob; imageId: string; width: number; height: number };
  grid: Grid; rooms: Room[]; tokens: Token[];
}
