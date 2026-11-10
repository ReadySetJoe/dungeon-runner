# Dungeon Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-side web app where a DM imports a map image, overlays an aligned grid, paints squares into rooms, reveals rooms to a second "player" window, and moves tokens around the map.

**Architecture:** Vite + React + TypeScript single-page app with no backend. Pure model code (grid math, rooms, visibility, camera) is unit-tested. A single canvas renderer draws both the DM view and the player view. The DM window (`/`) broadcasts full dungeon state to the player window (`/player`) over `BroadcastChannel`, and dungeons persist in IndexedDB.

**Tech Stack:** Vite, React 19, TypeScript, `idb`, Vitest, `fake-indexeddb`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-dungeon-runner-design.md`

## Global Constraints

- No backend; all data lives in the browser (IndexedDB via `idb`). Images stored as Blobs.
- Rendering uses an HTML `<canvas>` with pan and zoom.
- DM window at `/`, player window at `/player`, synced via `BroadcastChannel` (same machine and browser).
- A cell belongs to at most one room. Painting a cell into a room removes it from any other room.
- Cells not in any room are always hidden from players. Cells in unrevealed rooms are hidden from players.
- A token is drawn in the player view only if at least one cell it occupies lies in a revealed room.
- The player view shows no grid lines.
- Import rejects non-image files with an inline error; very large images show a warning but are allowed.
- If IndexedDB is unavailable, show a message that nothing will be saved.
- If no DM window has sent state, the player view shows a "waiting for DM" screen.
- Node 20+ is required (`crypto.randomUUID`, global `BroadcastChannel`, `structuredClone` of Blob).
- Out of scope: dynamic line of sight, remote players on other devices, accounts, combat tracking, free-form fog painting.

## File Structure

```
dungeon-runner/
  package.json, tsconfig.json, vite.config.ts, playwright.config.ts, index.html, .gitignore
  src/
    main.tsx                  # React entry
    App.tsx                   # routes "/" -> DmView, "/player" -> PlayerView
    styles.css
    model/
      types.ts                # Dungeon, Room, Token, Grid, CellKey
      grid.ts                 # cell/pixel math, bounds, line-of-cells, grid normalisation
      dungeon.ts              # factories + image validation
      rooms.ts                # paint/erase/reveal/visibility/token visibility
      camera.ts               # pan/zoom/fit math
    storage/storage.ts        # IndexedDB persistence
    sync/sync.ts              # BroadcastChannel wrapper + message types
    canvas/
      renderer.ts             # renderScene(): draws DM and player views
      useBitmaps.ts           # decodes Blobs to ImageBitmaps, cached by id
      MapCanvas.tsx           # canvas component: sizing, camera, pointer input
    ui/
      DmView.tsx              # state owner: autosave + broadcast; Home vs Editor
      HomeScreen.tsx          # dungeon list + import
      EditorScreen.tsx        # mode tabs, sidebar, canvas
      SetupPanel.tsx, RoomsPanel.tsx, RunPanel.tsx, SliderField.tsx
      interactions.ts         # usePaintInteraction, useRunInteraction
      PlayerView.tsx
  e2e/dungeon.spec.ts
```

Pure model, storage and sync units use TDD (Vitest). Canvas and React UI tasks are verified with `npx tsc --noEmit`, `npm run build`, and finally the Playwright test in Task 11.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: working `npm run dev`, `npm run build`, `npm run test`, `npm run test:e2e` scripts.

Work in `/Users/joepowers/Documents/code/dungeon-runner` (the `docs/` folder already exists).

- [ ] **Step 1: Initialise git and write config files**

```bash
cd /Users/joepowers/Documents/code/dungeon-runner
git init
```

`package.json`:
```json
{
  "name": "dungeon-runner",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

`.gitignore`:
```
node_modules
dist
test-results
playwright-report
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { include: ['src/**/*.test.ts'] },
});
```

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dungeon Runner</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (placeholder, replaced in Task 8):
```tsx
export default function App() {
  return <div>Dungeon Runner</div>;
}
```

`src/styles.css`:
```css
html, body, #root { height: 100%; margin: 0; font-family: system-ui, sans-serif; background: #1a1a1a; color: #eee; }
button, input, select { font: inherit; }
.editor { display: grid; grid-template-columns: 300px 1fr; height: 100%; }
.sidebar { padding: 12px; overflow: auto; background: #242424; display: flex; flex-direction: column; gap: 12px; }
.canvas-wrap { position: relative; min-width: 0; min-height: 0; height: 100%; }
.fit { position: absolute; top: 8px; right: 8px; }
.waiting { display: flex; height: 100%; align-items: center; justify-content: center; font-size: 1.5rem; }
.player-root { height: 100%; }
.tabs { display: flex; gap: 4px; }
.tabs button[aria-pressed='true'] { background: #4a6; color: #fff; }
.room-row, .token-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.room-row input[type='text'] { flex: 1; min-width: 0; }
.swatch { width: 16px; height: 16px; border-radius: 3px; display: inline-block; flex: none; }
.error { color: #f88; }
.banner { position: fixed; bottom: 8px; left: 8px; background: #600; padding: 6px 10px; border-radius: 4px; z-index: 10; }
.home { max-width: 600px; margin: 40px auto; padding: 0 16px; }
.field { display: grid; grid-template-columns: 90px 1fr 70px; gap: 6px; align-items: center; margin-bottom: 6px; }
```

- [ ] **Step 2: Install dependencies**

```bash
npm install react react-dom idb
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vitest fake-indexeddb @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Verify the scaffold builds**

Run: `npm run build`
Expected: exits 0 (`tsc` reports no errors, Vite prints a built `dist/`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript app with spec and plan"
```

---

### Task 2: Model types, grid math, dungeon factories

**Files:**
- Create: `src/model/types.ts`, `src/model/grid.ts`, `src/model/dungeon.ts`
- Test: `src/model/grid.test.ts`, `src/model/dungeon.test.ts`

**Interfaces:**
- Produces (`types.ts`):
```ts
export type CellKey = `${number},${number}`;
export interface Grid { cellSize: number; offsetX: number; offsetY: number }
export interface Room { id: string; name: string; color: string; cells: CellKey[]; revealed: boolean }
export interface Token { id: string; name: string; image: Blob; imageId: string; col: number; row: number; size: number }
export interface Dungeon {
  id: string; name: string;
  map: { image: Blob; imageId: string; width: number; height: number };
  grid: Grid; rooms: Room[]; tokens: Token[];
}
```
- Produces (`grid.ts`): `cellKey(col,row): CellKey`, `parseCellKey(key): {col,row}`, `pixelToCell(grid,x,y): {col,row}`, `cellToPixel(grid,col,row): {x,y}`, `gridDimensions(grid,width,height): {cols,rows}`, `isCellInBounds(grid,width,height,col,row): boolean`, `cellsBetween(a,b): {col,row}[]` (inclusive Bresenham line), `normalizeGrid(grid): Grid` (cellSize rounded and clamped to 10–200, offsets rounded and clamped to 0..cellSize-1).
- Produces (`dungeon.ts`): `validateImageType(type: string): string | null`, `isLargeImage(w,h): boolean`, `newDungeon({name,image,width,height}): Dungeon` (grid defaults `{cellSize:50,offsetX:0,offsetY:0}`), `newToken({name,image,col,row,size?}): Token` (size defaults to 1).

- [ ] **Step 1: Write the types**

`src/model/types.ts`: exactly the interfaces above.

- [ ] **Step 2: Write the failing grid tests**

`src/model/grid.test.ts`:
```ts
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
    expect(normalizeGrid({ cellSize: 40.6, offsetX: 100, offsetY: -5 })).toEqual({ cellSize: 41, offsetX: 40, offsetY: 0 });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/model/grid.test.ts`
Expected: FAIL (cannot resolve `./grid`).

- [ ] **Step 4: Implement `grid.ts`**

```ts
import type { CellKey, Grid } from './types';

export interface Cell { col: number; row: number }

export const cellKey = (col: number, row: number): CellKey => `${col},${row}`;

export function parseCellKey(key: CellKey): Cell {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

export function pixelToCell(grid: Grid, x: number, y: number): Cell {
  return {
    col: Math.floor((x - grid.offsetX) / grid.cellSize),
    row: Math.floor((y - grid.offsetY) / grid.cellSize),
  };
}

export function cellToPixel(grid: Grid, col: number, row: number) {
  return { x: grid.offsetX + col * grid.cellSize, y: grid.offsetY + row * grid.cellSize };
}

export function gridDimensions(grid: Grid, width: number, height: number) {
  return {
    cols: Math.max(0, Math.ceil((width - grid.offsetX) / grid.cellSize)),
    rows: Math.max(0, Math.ceil((height - grid.offsetY) / grid.cellSize)),
  };
}

export function isCellInBounds(grid: Grid, width: number, height: number, col: number, row: number) {
  const { cols, rows } = gridDimensions(grid, width, height);
  return col >= 0 && row >= 0 && col < cols && row < rows;
}

export function cellsBetween(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let { col, row } = a;
  const dx = Math.abs(b.col - a.col);
  const dy = Math.abs(b.row - a.row);
  const sx = a.col < b.col ? 1 : -1;
  const sy = a.row < b.row ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    out.push({ col, row });
    if (col === b.col && row === b.row) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; col += sx; }
    if (e2 < dx) { err += dx; row += sy; }
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function normalizeGrid(grid: Grid): Grid {
  const cellSize = clamp(Math.round(grid.cellSize), 10, 200);
  return {
    cellSize,
    offsetX: clamp(Math.round(grid.offsetX), 0, cellSize - 1),
    offsetY: clamp(Math.round(grid.offsetY), 0, cellSize - 1),
  };
}
```

- [ ] **Step 5: Run grid tests to verify they pass**

Run: `npx vitest run src/model/grid.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Write the failing dungeon tests**

`src/model/dungeon.test.ts`:
```ts
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
```

- [ ] **Step 7: Run to verify failure**

Run: `npx vitest run src/model/dungeon.test.ts`
Expected: FAIL (cannot resolve `./dungeon`).

- [ ] **Step 8: Implement `dungeon.ts`**

```ts
import type { Dungeon, Token } from './types';

export const LARGE_IMAGE_PIXELS = 40_000_000;

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
```

- [ ] **Step 9: Run all tests**

Run: `npm run test`
Expected: PASS (11 tests).

- [ ] **Step 10: Commit**

```bash
git add src/model
git commit -m "feat: add model types, grid math and dungeon factories"
```

---

### Task 3: Room logic and visibility

**Files:**
- Create: `src/model/rooms.ts`
- Test: `src/model/rooms.test.ts`

**Interfaces:**
- Consumes: `Room`, `Token`, `CellKey` from `types.ts`; `cellKey`, `parseCellKey` from `grid.ts`.
- Produces (all pure and immutable):
  - `createRoom(name: string, color: string, id?: string): Room`
  - `paintCell(rooms: Room[], roomId: string, key: CellKey): Room[]`
  - `eraseCell(rooms: Room[], key: CellKey): Room[]`
  - `toggleReveal(rooms: Room[], roomId: string): Room[]`
  - `removeRoom(rooms: Room[], roomId: string): Room[]`
  - `updateRoom(rooms: Room[], roomId: string, patch: Partial<Pick<Room, 'name' | 'color'>>): Room[]`
  - `roomAtCell(rooms: Room[], key: CellKey): Room | undefined`
  - `isCellVisible(rooms: Room[], key: CellKey): boolean`
  - `occupiedCells(token: Token): CellKey[]`
  - `isTokenVisible(rooms: Room[], token: Token): boolean`
  - `defaultTokenCell(rooms: Room[]): { col: number; row: number }` (first cell of the first revealed room that has cells, otherwise 0,0)

- [ ] **Step 1: Write the failing tests**

`src/model/rooms.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/model/rooms.test.ts`
Expected: FAIL (cannot resolve `./rooms`).

- [ ] **Step 3: Implement `rooms.ts`**

```ts
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
  patch: Partial<Pick<Room, 'name' | 'color'>>,
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
```

- [ ] **Step 4: Run all tests**

Run: `npm run test`
Expected: PASS (all tests, including 11 from Task 2).

- [ ] **Step 5: Commit**

```bash
git add src/model/rooms.ts src/model/rooms.test.ts
git commit -m "feat: add room painting, reveal and visibility logic"
```

---

### Task 4: IndexedDB storage

**Files:**
- Create: `src/storage/storage.ts`
- Test: `src/storage/storage.test.ts`

**Interfaces:**
- Consumes: `Dungeon` from `types.ts`.
- Produces: `isStorageAvailable(): boolean`, `saveDungeon(d: Dungeon): Promise<void>`, `loadDungeon(id: string): Promise<Dungeon | undefined>`, `listDungeons(): Promise<{ id: string; name: string }[]>`, `deleteDungeon(id: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

`src/storage/storage.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { saveDungeon, loadDungeon, listDungeons, deleteDungeon, isStorageAvailable } from './storage';
import { newDungeon } from '../model/dungeon';
import { createRoom, paintCell } from '../model/rooms';

describe('storage', () => {
  it('reports availability', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('saves, loads, lists and deletes dungeons', async () => {
    const d = newDungeon({ name: 'Crypt', image: new Blob(['abc']), width: 200, height: 100 });
    const room = createRoom('Hall', '#f00', 'r1');
    d.rooms = paintCell([room], 'r1', '0,0');

    await saveDungeon(d);
    const loaded = await loadDungeon(d.id);
    expect(loaded?.name).toBe('Crypt');
    expect(loaded?.rooms[0].cells).toEqual(['0,0']);
    expect(loaded?.map.image.size).toBe(3);
    expect(loaded?.map.imageId).toBe(d.map.imageId);

    expect(await listDungeons()).toEqual([{ id: d.id, name: 'Crypt' }]);

    await deleteDungeon(d.id);
    expect(await loadDungeon(d.id)).toBeUndefined();
    expect(await listDungeons()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/storage/storage.test.ts`
Expected: FAIL (cannot resolve `./storage`).

- [ ] **Step 3: Implement `storage.ts`**

```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Dungeon } from '../model/types';

interface Schema extends DBSchema {
  dungeons: { key: string; value: Dungeon };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  dbPromise ??= openDB<Schema>('dungeon-runner', 1, {
    upgrade(database) {
      database.createObjectStore('dungeons', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function saveDungeon(d: Dungeon): Promise<void> {
  await (await db()).put('dungeons', d);
}

export async function loadDungeon(id: string): Promise<Dungeon | undefined> {
  return (await db()).get('dungeons', id);
}

export async function listDungeons(): Promise<{ id: string; name: string }[]> {
  const all = await (await db()).getAll('dungeons');
  return all.map((d) => ({ id: d.id, name: d.name }));
}

export async function deleteDungeon(id: string): Promise<void> {
  await (await db()).delete('dungeons', id);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/storage/storage.test.ts`
Expected: PASS. If it fails with a `DataCloneError` on the Blob (Node's `structuredClone` not cloning Blob in your Node version), upgrade to Node 20+ as stated in Global Constraints rather than changing the production code.

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat: add IndexedDB dungeon persistence"
```

---

### Task 5: BroadcastChannel sync

**Files:**
- Create: `src/sync/sync.ts`
- Test: `src/sync/sync.test.ts`

**Interfaces:**
- Consumes: `Dungeon` from `types.ts`.
- Produces:
```ts
export type SyncMessage = { type: 'request-state' } | { type: 'state'; dungeon: Dungeon };
export interface Sync {
  send(msg: SyncMessage): void;
  subscribe(fn: (msg: SyncMessage) => void): () => void;
  close(): void;
}
export const CHANNEL_NAME: string;
export function createSync(name?: string): Sync;
```

- [ ] **Step 1: Write the failing test**

`src/sync/sync.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createSync, type SyncMessage } from './sync';

describe('sync', () => {
  it('delivers messages to other channel instances, not the sender', async () => {
    const a = createSync('test-channel');
    const b = createSync('test-channel');
    const selfGot: SyncMessage[] = [];
    a.subscribe((m) => selfGot.push(m));
    const got = new Promise<SyncMessage>((resolve) => b.subscribe(resolve));

    a.send({ type: 'request-state' });

    expect(await got).toEqual({ type: 'request-state' });
    expect(selfGot).toEqual([]);
    a.close();
    b.close();
  });

  it('stops delivering after unsubscribe', async () => {
    const a = createSync('test-channel-2');
    const b = createSync('test-channel-2');
    const calls: SyncMessage[] = [];
    const unsubscribe = b.subscribe((m) => calls.push(m));
    unsubscribe();
    const marker = new Promise<SyncMessage>((resolve) => b.subscribe(resolve));
    a.send({ type: 'request-state' });
    await marker;
    expect(calls).toEqual([]);
    a.close();
    b.close();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/sync/sync.test.ts`
Expected: FAIL (cannot resolve `./sync`).

- [ ] **Step 3: Implement `sync.ts`**

```ts
import type { Dungeon } from '../model/types';

export type SyncMessage = { type: 'request-state' } | { type: 'state'; dungeon: Dungeon };

export interface Sync {
  send(msg: SyncMessage): void;
  subscribe(fn: (msg: SyncMessage) => void): () => void;
  close(): void;
}

export const CHANNEL_NAME = 'dungeon-runner-sync';

export function createSync(name: string = CHANNEL_NAME): Sync {
  const channel = new BroadcastChannel(name);
  const listeners = new Set<(msg: SyncMessage) => void>();
  channel.onmessage = (e: MessageEvent) => {
    listeners.forEach((fn) => fn(e.data as SyncMessage));
  };
  return {
    send: (msg) => channel.postMessage(msg),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    close: () => channel.close(),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/sync/sync.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sync
git commit -m "feat: add BroadcastChannel sync wrapper"
```

---

### Task 6: Camera math

**Files:**
- Create: `src/model/camera.ts`
- Test: `src/model/camera.test.ts`

**Interfaces:**
- Produces: `Camera { x: number; y: number; zoom: number }` where `x,y` are the world coordinates at the screen's top-left; `screenToWorld(c, sx, sy): {x,y}`, `worldToScreen(c, wx, wy): {x,y}`, `fitCamera(mapW, mapH, viewW, viewH, padding?: number): Camera` (padding default 16), `zoomAt(c, sx, sy, factor, min?: number, max?: number): Camera` (min 0.05, max 8), `panBy(c, dxScreen, dyScreen): Camera`.

- [ ] **Step 1: Write the failing test**

`src/model/camera.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/model/camera.test.ts`
Expected: FAIL (cannot resolve `./camera`).

- [ ] **Step 3: Implement `camera.ts`**

```ts
export interface Camera { x: number; y: number; zoom: number }

export function screenToWorld(c: Camera, sx: number, sy: number) {
  return { x: c.x + sx / c.zoom, y: c.y + sy / c.zoom };
}

export function worldToScreen(c: Camera, wx: number, wy: number) {
  return { x: (wx - c.x) * c.zoom, y: (wy - c.y) * c.zoom };
}

export function fitCamera(mapW: number, mapH: number, viewW: number, viewH: number, padding = 16): Camera {
  const zoom = Math.max(0.01, Math.min((viewW - 2 * padding) / mapW, (viewH - 2 * padding) / mapH));
  return { zoom, x: (mapW - viewW / zoom) / 2, y: (mapH - viewH / zoom) / 2 };
}

export function zoomAt(c: Camera, sx: number, sy: number, factor: number, min = 0.05, max = 8): Camera {
  const before = screenToWorld(c, sx, sy);
  const zoom = Math.min(max, Math.max(min, c.zoom * factor));
  return { zoom, x: before.x - sx / zoom, y: before.y - sy / zoom };
}

export function panBy(c: Camera, dxScreen: number, dyScreen: number): Camera {
  return { ...c, x: c.x - dxScreen / c.zoom, y: c.y - dyScreen / c.zoom };
}
```

- [ ] **Step 4: Run all tests**

Run: `npm run test`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/camera.ts src/model/camera.test.ts
git commit -m "feat: add camera pan/zoom/fit math"
```

---

### Task 7: Canvas renderer, MapCanvas and PlayerView

**Files:**
- Create: `src/canvas/renderer.ts`, `src/canvas/useBitmaps.ts`, `src/canvas/MapCanvas.tsx`, `src/ui/PlayerView.tsx`

**Interfaces:**
- Consumes: `Dungeon` (types); `cellToPixel`, `gridDimensions`, `parseCellKey` (grid); `isTokenVisible` (rooms); `Camera`, `screenToWorld`, `fitCamera`, `zoomAt`, `panBy` (camera); `createSync` (sync).
- Produces:
  - `renderScene(o: RenderOptions): void` where `RenderOptions = { ctx: CanvasRenderingContext2D; width: number; height: number; dungeon: Dungeon; mapImage?: ImageBitmap; tokenImages: Map<string, ImageBitmap>; camera: Camera; view: 'dm' | 'player'; selectedRoomId?: string | null }`. `width`/`height` are CSS pixels; the caller has already applied the device-pixel-ratio transform. `tokenImages` is keyed by `Token.imageId`.
  - `useBitmaps(items: { id: string; blob: Blob }[]): { bitmaps: Map<string, ImageBitmap>; version: number }`.
  - `MapCanvas` props: `{ dungeon: Dungeon; view: 'dm' | 'player'; selectedRoomId?: string | null; interactive?: boolean; onPointer?: (info: PointerInfo) => void }` with exported `PointerInfo = { type: 'down' | 'move' | 'up'; world: { x: number; y: number } }`. The `<canvas>` carries `data-testid="map-canvas"` and, once the camera is fitted, `data-camera` (JSON of the camera). Interactive canvases: wheel zooms at the cursor; middle button, right button, or Space+left-drag pans; other pointer input goes to `onPointer`. A "Fit view" button resets the camera. Player canvases auto-fit on every resize.
  - `PlayerView`: shows "Waiting for the DM…" until a `state` message arrives; sends `request-state` on mount.

- [ ] **Step 1: Write `renderer.ts`**

```ts
import type { Dungeon } from '../model/types';
import type { Camera } from '../model/camera';
import { cellToPixel, gridDimensions, parseCellKey } from '../model/grid';
import { isTokenVisible } from '../model/rooms';

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dungeon: Dungeon;
  mapImage?: ImageBitmap;
  tokenImages: Map<string, ImageBitmap>;
  camera: Camera;
  view: 'dm' | 'player';
  selectedRoomId?: string | null;
}

export function renderScene(o: RenderOptions): void {
  const { ctx, width, height, dungeon, mapImage, tokenImages, camera, view, selectedRoomId } = o;
  const { grid, rooms, tokens, map } = dungeon;
  const cs = grid.cellSize;

  ctx.save();
  ctx.fillStyle = view === 'player' ? '#000' : '#1a1a1a';
  ctx.fillRect(0, 0, width, height);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  if (mapImage) {
    if (view === 'player') {
      // Only revealed cells show the map; everything else stays black.
      ctx.save();
      ctx.beginPath();
      for (const room of rooms) {
        if (!room.revealed) continue;
        for (const key of room.cells) {
          const { col, row } = parseCellKey(key);
          const p = cellToPixel(grid, col, row);
          ctx.rect(p.x, p.y, cs, cs);
        }
      }
      ctx.clip();
      ctx.drawImage(mapImage, 0, 0, map.width, map.height);
      ctx.restore();
    } else {
      ctx.drawImage(mapImage, 0, 0, map.width, map.height);
    }
  }

  if (view === 'dm') {
    for (const room of rooms) {
      for (const key of room.cells) {
        const { col, row } = parseCellKey(key);
        const p = cellToPixel(grid, col, row);
        if (!room.revealed) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(p.x, p.y, cs, cs);
        }
        ctx.globalAlpha = room.id === selectedRoomId ? 0.5 : 0.3;
        ctx.fillStyle = room.color;
        ctx.fillRect(p.x, p.y, cs, cs);
        ctx.globalAlpha = 1;
      }
    }

    const { cols, rows } = gridDimensions(grid, map.width, map.height);
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = Math.min(grid.offsetX + c * cs, map.width);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
    }
    for (let r = 0; r <= rows; r++) {
      const y = Math.min(grid.offsetY + r * cs, map.height);
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
    }
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();
    ctx.lineWidth = 1 / camera.zoom;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
  }

  for (const token of tokens) {
    const visible = isTokenVisible(rooms, token);
    if (view === 'player' && !visible) continue;
    const p = cellToPixel(grid, token.col, token.row);
    const s = token.size * cs;
    const img = tokenImages.get(token.imageId);
    ctx.save();
    ctx.globalAlpha = visible ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(p.x + s / 2, p.y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.save();
    ctx.clip();
    if (img) {
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, p.x, p.y, s, s);
    } else {
      ctx.fillStyle = '#888';
      ctx.fillRect(p.x, p.y, s, s);
    }
    ctx.restore();
    ctx.lineWidth = 2 / camera.zoom;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
```

- [ ] **Step 2: Write `useBitmaps.ts`**

```ts
import { useEffect, useRef, useState } from 'react';

export function useBitmaps(items: { id: string; blob: Blob }[]) {
  const cache = useRef(new Map<string, ImageBitmap>());
  const pending = useRef(new Set<string>());
  const wanted = useRef(new Set<string>());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    wanted.current = new Set(items.map((i) => i.id));
    for (const [id, bmp] of cache.current) {
      if (!wanted.current.has(id)) {
        bmp.close();
        cache.current.delete(id);
      }
    }
    for (const item of items) {
      if (cache.current.has(item.id) || pending.current.has(item.id)) continue;
      pending.current.add(item.id);
      createImageBitmap(item.blob)
        .then((bmp) => {
          pending.current.delete(item.id);
          if (!wanted.current.has(item.id)) {
            bmp.close();
            return;
          }
          cache.current.set(item.id, bmp);
          setVersion((v) => v + 1);
        })
        .catch(() => {
          pending.current.delete(item.id);
        });
    }
  }, [items]);

  return { bitmaps: cache.current, version };
}
```

- [ ] **Step 3: Write `MapCanvas.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { fitCamera, panBy, screenToWorld, zoomAt, type Camera } from '../model/camera';
import { renderScene } from './renderer';
import { useBitmaps } from './useBitmaps';

export interface PointerInfo {
  type: 'down' | 'move' | 'up';
  world: { x: number; y: number };
}

interface Props {
  dungeon: Dungeon;
  view: 'dm' | 'player';
  selectedRoomId?: string | null;
  interactive?: boolean;
  onPointer?: (info: PointerInfo) => void;
}

export function MapCanvas({ dungeon, view, selectedRoomId, interactive = false, onPointer }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [camera, setCamera] = useState<Camera | null>(null);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const onPointerRef = useRef(onPointer);
  onPointerRef.current = onPointer;
  const spaceHeld = useRef(false);
  const panning = useRef<{ x: number; y: number } | null>(null);

  const items = useMemo(
    () => [
      { id: dungeon.map.imageId, blob: dungeon.map.image },
      ...dungeon.tokens.map((t) => ({ id: t.imageId, blob: t.image })),
    ],
    [dungeon.map.imageId, dungeon.map.image, dungeon.tokens],
  );
  const { bitmaps, version } = useBitmaps(items);

  useEffect(() => {
    const el = containerRef.current!;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const autoFit = view === 'player';
  const hasSize = size.w > 0 && size.h > 0;
  const fitKey = autoFit
    ? `${dungeon.map.imageId}:${size.w}x${size.h}`
    : `${dungeon.map.imageId}:${hasSize}`;
  useEffect(() => {
    if (!hasSize) return;
    setCamera(fitCamera(dungeon.map.width, dungeon.map.height, size.w, size.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera || !hasSize) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderScene({
      ctx,
      width: size.w,
      height: size.h,
      dungeon,
      mapImage: bitmaps.get(dungeon.map.imageId),
      tokenImages: bitmaps,
      camera,
      view,
      selectedRoomId,
    });
  }, [camera, size, hasSize, dungeon, bitmaps, version, view, selectedRoomId]);

  useEffect(() => {
    if (!interactive) return;
    const el = canvasRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setCamera((c) => (c ? zoomAt(c, e.clientX - r.left, e.clientY - r.top, factor) : c));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [interactive]);

  useEffect(() => {
    if (!interactive) return;
    const isTyping = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e)) {
        spaceHeld.current = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [interactive]);

  const toWorld = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return screenToWorld(cameraRef.current!, e.clientX - r.left, e.clientY - r.top);
  };

  return (
    <div ref={containerRef} className="canvas-wrap">
      <canvas
        ref={canvasRef}
        data-testid="map-canvas"
        data-camera={camera ? JSON.stringify(camera) : undefined}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (!interactive || !cameraRef.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (e.button === 1 || e.button === 2 || (e.button === 0 && spaceHeld.current)) {
            panning.current = { x: e.clientX, y: e.clientY };
            return;
          }
          onPointerRef.current?.({ type: 'down', world: toWorld(e) });
        }}
        onPointerMove={(e) => {
          if (!interactive || !cameraRef.current) return;
          if (panning.current) {
            const dx = e.clientX - panning.current.x;
            const dy = e.clientY - panning.current.y;
            panning.current = { x: e.clientX, y: e.clientY };
            setCamera((c) => (c ? panBy(c, dx, dy) : c));
            return;
          }
          onPointerRef.current?.({ type: 'move', world: toWorld(e) });
        }}
        onPointerUp={(e) => {
          if (!interactive || !cameraRef.current) return;
          if (panning.current) {
            panning.current = null;
            return;
          }
          onPointerRef.current?.({ type: 'up', world: toWorld(e) });
        }}
      />
      {interactive && (
        <button
          className="fit"
          onClick={() =>
            hasSize && setCamera(fitCamera(dungeon.map.width, dungeon.map.height, size.w, size.h))
          }
        >
          Fit view
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `PlayerView.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { Dungeon } from '../model/types';
import { createSync } from '../sync/sync';
import { MapCanvas } from '../canvas/MapCanvas';

export function PlayerView() {
  const [dungeon, setDungeon] = useState<Dungeon | null>(null);

  useEffect(() => {
    const sync = createSync();
    const unsubscribe = sync.subscribe((msg) => {
      if (msg.type === 'state') setDungeon(msg.dungeon);
    });
    sync.send({ type: 'request-state' });
    return () => {
      unsubscribe();
      sync.close();
    };
  }, []);

  if (!dungeon) return <div className="waiting">Waiting for the DM…</div>;
  return (
    <div className="player-root">
      <MapCanvas dungeon={dungeon} view="player" />
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/canvas src/ui/PlayerView.tsx
git commit -m "feat: add canvas renderer, MapCanvas and player view"
```

---

### Task 8: DM shell — home screen, editor, setup mode

**Files:**
- Create: `src/ui/SliderField.tsx`, `src/ui/SetupPanel.tsx`, `src/ui/HomeScreen.tsx`, `src/ui/EditorScreen.tsx`, `src/ui/DmView.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–7.
- Produces:
  - `type Update = (fn: (d: Dungeon) => Dungeon) => void` (exported from `DmView.tsx`). It applies the function to the current dungeon.
  - `HomeScreen({ onOpen: (d: Dungeon) => void })`. The file input has `data-testid="import-input"`.
  - `EditorScreen({ dungeon, update, onClose })`. It renders mode tabs, which are buttons named "Setup", "Rooms" and "Run" with `aria-pressed`. Tasks 9 and 10 add the Rooms and Run behavior; for now those tabs show a placeholder paragraph.
  - `SetupPanel({ dungeon, update })` with number inputs `data-testid="cell-size"`, `"offset-x"`, `"offset-y"`.
  - `DmView`: owns dungeon state, debounced autosave (500 ms), and broadcasts `state` on every change. It answers `request-state` with the current dungeon.

- [ ] **Step 1: Write `SliderField.tsx`**

```tsx
interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  testId: string;
}

export function SliderField({ label, value, min, max, step = 1, onChange, testId }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input
        type="number"
        data-testid={testId}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}
```

- [ ] **Step 2: Write `SetupPanel.tsx`**

```tsx
import type { Dungeon, Grid } from '../model/types';
import { gridDimensions, normalizeGrid } from '../model/grid';
import type { Update } from './DmView';
import { SliderField } from './SliderField';

export function SetupPanel({ dungeon, update }: { dungeon: Dungeon; update: Update }) {
  const { grid, map } = dungeon;
  const set = (patch: Partial<Grid>) =>
    update((d) => ({ ...d, grid: normalizeGrid({ ...d.grid, ...patch }) }));
  const { cols, rows } = gridDimensions(grid, map.width, map.height);
  return (
    <section>
      <h3>Grid</h3>
      <SliderField label="Square size" value={grid.cellSize} min={10} max={200} onChange={(v) => set({ cellSize: v })} testId="cell-size" />
      <SliderField label="Offset X" value={grid.offsetX} min={0} max={grid.cellSize - 1} onChange={(v) => set({ offsetX: v })} testId="offset-x" />
      <SliderField label="Offset Y" value={grid.offsetY} min={0} max={grid.cellSize - 1} onChange={(v) => set({ offsetY: v })} testId="offset-y" />
      <p>
        {cols} × {rows} squares ({map.width} × {map.height} px)
      </p>
      <p>Tip: scroll to zoom, right-drag or Space+drag to pan.</p>
    </section>
  );
}
```

- [ ] **Step 3: Write `HomeScreen.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import type { Dungeon } from '../model/types';
import { isLargeImage, newDungeon, validateImageType } from '../model/dungeon';
import { deleteDungeon, isStorageAvailable, listDungeons, loadDungeon } from '../storage/storage';

export function HomeScreen({ onOpen }: { onOpen: (d: Dungeon) => void }) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!isStorageAvailable()) return;
    listDungeons().then(setItems).catch(() => setError('Could not read saved dungeons.'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onFile(file: File) {
    setError(null);
    const typeError = validateImageType(file.type);
    if (typeError) {
      setError(typeError);
      return;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setError('Could not read that image.');
      return;
    }
    const { width, height } = bitmap;
    bitmap.close();
    if (isLargeImage(width, height) && !window.confirm('This image is very large and may be slow. Continue?')) return;
    onOpen(newDungeon({ name: file.name.replace(/\.[^.]+$/, ''), image: file, width, height }));
  }

  return (
    <div className="home">
      <h1>Dungeon Runner</h1>
      <label>
        Import a map image (webp, png, jpg):{' '}
        <input
          type="file"
          accept="image/*"
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void onFile(file);
          }}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items.length > 0 && <h2>Saved dungeons</h2>}
      {items.map((it) => (
        <div key={it.id} className="room-row">
          <button onClick={() => loadDungeon(it.id).then((d) => d && onOpen(d))}>{it.name}</button>
          <button onClick={() => deleteDungeon(it.id).then(refresh)} aria-label={`Delete ${it.name}`}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Write `EditorScreen.tsx`**

```tsx
import { useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { MapCanvas } from '../canvas/MapCanvas';
import type { Update } from './DmView';
import { SetupPanel } from './SetupPanel';

type Mode = 'setup' | 'rooms' | 'run';
const MODES: { id: Mode; label: string }[] = [
  { id: 'setup', label: 'Setup' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'run', label: 'Run' },
];

interface Props {
  dungeon: Dungeon;
  update: Update;
  onClose: () => void;
}

export function EditorScreen({ dungeon, update, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('setup');
  const dungeonRef = useRef(dungeon);
  dungeonRef.current = dungeon;

  return (
    <div className="editor">
      <aside className="sidebar">
        <div>
          <button onClick={onClose}>← Back</button>
          <input
            aria-label="Dungeon name"
            value={dungeon.name}
            onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
          />
        </div>
        <div className="tabs">
          {MODES.map((m) => (
            <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'setup' && <SetupPanel dungeon={dungeon} update={update} />}
        {mode === 'rooms' && <p>Rooms mode coming in the next task.</p>}
        {mode === 'run' && <p>Run mode coming in a later task.</p>}
      </aside>
      <MapCanvas dungeon={dungeon} view="dm" interactive />
    </div>
  );
}
```

- [ ] **Step 5: Write `DmView.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { createSync, type Sync } from '../sync/sync';
import { isStorageAvailable, saveDungeon } from '../storage/storage';
import { EditorScreen } from './EditorScreen';
import { HomeScreen } from './HomeScreen';

export type Update = (fn: (d: Dungeon) => Dungeon) => void;

export function DmView() {
  const [dungeon, setDungeon] = useState<Dungeon | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const syncRef = useRef<Sync | null>(null);
  const dungeonRef = useRef(dungeon);
  dungeonRef.current = dungeon;

  const update: Update = useCallback((fn) => setDungeon((d) => (d ? fn(d) : d)), []);

  useEffect(() => {
    const sync = createSync();
    syncRef.current = sync;
    const unsubscribe = sync.subscribe((msg) => {
      if (msg.type === 'request-state' && dungeonRef.current) {
        sync.send({ type: 'state', dungeon: dungeonRef.current });
      }
    });
    return () => {
      unsubscribe();
      sync.close();
      syncRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (dungeon) syncRef.current?.send({ type: 'state', dungeon });
  }, [dungeon]);

  useEffect(() => {
    if (!dungeon || !isStorageAvailable()) return;
    const timer = setTimeout(() => {
      saveDungeon(dungeon)
        .then(() => setSaveError(null))
        .catch(() => setSaveError('Saving failed — recent changes may be lost.'));
    }, 500);
    return () => clearTimeout(timer);
  }, [dungeon]);

  return (
    <>
      {!isStorageAvailable() && <div className="banner">Storage is unavailable — nothing will be saved.</div>}
      {saveError && <div className="banner">{saveError}</div>}
      {dungeon ? (
        <EditorScreen dungeon={dungeon} update={update} onClose={() => setDungeon(null)} />
      ) : (
        <HomeScreen onOpen={setDungeon} />
      )}
    </>
  );
}
```

- [ ] **Step 6: Wire up `App.tsx`**

```tsx
import { DmView } from './ui/DmView';
import { PlayerView } from './ui/PlayerView';

export default function App() {
  return window.location.pathname.startsWith('/player') ? <PlayerView /> : <DmView />;
}
```

- [ ] **Step 7: Type-check and manually verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`, open `http://localhost:5173`, import a webp or png map. Expected: the map appears with a grid overlay; changing "Square size" and the offsets moves the grid live; scroll zooms; right-drag pans; "Fit view" resets. Reloading the page and clicking the saved dungeon reopens it with the same grid. Importing a non-image (for example a `.txt`) shows an inline error.

- [ ] **Step 8: Commit**

```bash
git add src/ui src/App.tsx
git commit -m "feat: add DM home screen, editor shell and grid setup mode"
```

---

### Task 9: Rooms mode (painting)

**Files:**
- Create: `src/ui/interactions.ts`, `src/ui/RoomsPanel.tsx`
- Modify: `src/ui/EditorScreen.tsx`

**Interfaces:**
- Consumes: `Update` (DmView), `PointerInfo` (MapCanvas), grid and room functions.
- Produces:
  - `usePaintInteraction(dungeonRef: MutableRefObject<Dungeon>, update: Update, roomId: string | null, tool: 'paint' | 'erase'): (info: PointerInfo) => void`. It paints or erases the cells along the dragged line, ignoring out-of-bounds cells.
  - `RoomsPanel({ dungeon, update, selectedRoomId, onSelect, tool, onToolChange })`. Elements: a button "Add room" (`data-testid="add-room"`), radio inputs `data-testid="tool-paint"` / `"tool-erase"`, and per-room rows with a select button, a name text input, a color input and a Delete button.
  - `ROOM_COLORS: string[]` exported from `RoomsPanel.tsx`.

- [ ] **Step 1: Write `interactions.ts` (paint hook only; Task 10 adds the run hook)**

```ts
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
```

- [ ] **Step 2: Write `RoomsPanel.tsx`**

```tsx
import type { Dungeon } from '../model/types';
import { createRoom, removeRoom, updateRoom } from '../model/rooms';
import type { Update } from './DmView';

export const ROOM_COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45'];

interface Props {
  dungeon: Dungeon;
  update: Update;
  selectedRoomId: string | null;
  onSelect: (id: string | null) => void;
  tool: 'paint' | 'erase';
  onToolChange: (t: 'paint' | 'erase') => void;
}

export function RoomsPanel({ dungeon, update, selectedRoomId, onSelect, tool, onToolChange }: Props) {
  const addRoom = () => {
    const n = dungeon.rooms.length;
    const room = createRoom(`Room ${n + 1}`, ROOM_COLORS[n % ROOM_COLORS.length]);
    update((d) => ({ ...d, rooms: [...d.rooms, room] }));
    onSelect(room.id);
  };

  return (
    <section>
      <h3>Rooms</h3>
      <button data-testid="add-room" onClick={addRoom}>
        Add room
      </button>
      <div role="radiogroup" aria-label="Tool">
        <label>
          <input type="radio" name="tool" data-testid="tool-paint" checked={tool === 'paint'} onChange={() => onToolChange('paint')} />
          Paint
        </label>
        <label>
          <input type="radio" name="tool" data-testid="tool-erase" checked={tool === 'erase'} onChange={() => onToolChange('erase')} />
          Erase
        </label>
      </div>
      <p>Select a room, then click or drag on the map to paint squares into it.</p>
      {dungeon.rooms.map((room) => (
        <div key={room.id} className="room-row">
          <button aria-pressed={room.id === selectedRoomId} onClick={() => onSelect(room.id)}>
            <span className="swatch" style={{ background: room.color }} /> {room.id === selectedRoomId ? '●' : '○'}
          </button>
          <input
            type="text"
            aria-label="Room name"
            value={room.name}
            onChange={(e) => update((d) => ({ ...d, rooms: updateRoom(d.rooms, room.id, { name: e.target.value }) }))}
          />
          <input
            type="color"
            aria-label="Room color"
            value={room.color}
            onChange={(e) => update((d) => ({ ...d, rooms: updateRoom(d.rooms, room.id, { color: e.target.value }) }))}
          />
          <button
            onClick={() => {
              update((d) => ({ ...d, rooms: removeRoom(d.rooms, room.id) }));
              if (room.id === selectedRoomId) onSelect(null);
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Wire rooms mode into `EditorScreen.tsx`**

Add imports:
```tsx
import { RoomsPanel } from './RoomsPanel';
import { usePaintInteraction } from './interactions';
```
Inside the component, after `dungeonRef`:
```tsx
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [tool, setTool] = useState<'paint' | 'erase'>('paint');
  const paint = usePaintInteraction(dungeonRef, update, selectedRoomId, tool);
```
Replace the rooms placeholder line with:
```tsx
        {mode === 'rooms' && (
          <RoomsPanel
            dungeon={dungeon}
            update={update}
            selectedRoomId={selectedRoomId}
            onSelect={setSelectedRoomId}
            tool={tool}
            onToolChange={setTool}
          />
        )}
```
Replace the `MapCanvas` line with:
```tsx
      <MapCanvas
        dungeon={dungeon}
        view="dm"
        interactive
        selectedRoomId={mode === 'rooms' ? selectedRoomId : null}
        onPointer={mode === 'rooms' ? paint : undefined}
      />
```

- [ ] **Step 4: Type-check and manually verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run dev`. Import a map, go to Rooms, click "Add room", and drag across several squares. Expected:
- Painted squares are tinted with the room color.
- Erase removes squares.
- A second room painted over the first takes those squares from it.
- Renaming, recoloring and deleting a room work.
- Painting outside the image does nothing.

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat: add rooms mode with click-drag painting"
```

---

### Task 10: Run mode — reveal rooms, tokens, player window

**Files:**
- Modify: `src/ui/interactions.ts`, `src/ui/EditorScreen.tsx`
- Create: `src/ui/RunPanel.tsx`

**Interfaces:**
- Consumes: `PointerInfo`, `Update`, room helpers, `newToken`, `validateImageType`, `defaultTokenCell`, `gridDimensions`.
- Produces:
  - `useRunInteraction(dungeonRef: MutableRefObject<Dungeon>, update: Update): (info: PointerInfo) => void`. On pointer down, a token under the pointer starts a drag. Otherwise, if the cell is in a room, that room's `revealed` is toggled. Dragging a token snaps it to cells and clamps it inside the map.
  - `RunPanel({ dungeon, update })`:
    - A room list with reveal/hide buttons, `data-testid="toggle-room-<roomId>"`, labeled "Reveal" or "Hide".
    - A token file input, `data-testid="token-input"`.
    - Token rows with a size select (1–4) and a Remove button.
    - An "Open player window" button that calls `window.open('/player', 'dungeon-player')`.

- [ ] **Step 1: Add `useRunInteraction` to `interactions.ts`**

Add imports at the top: `gridDimensions` to the grid import list, and `occupiedCells, roomAtCell, toggleReveal` to the rooms import. Then append:
```ts
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
```

- [ ] **Step 2: Write `RunPanel.tsx`**

```tsx
import type { Dungeon } from '../model/types';
import { newToken, validateImageType } from '../model/dungeon';
import { defaultTokenCell, toggleReveal } from '../model/rooms';
import type { Update } from './DmView';
import { useState } from 'react';

export function RunPanel({ dungeon, update }: { dungeon: Dungeon; update: Update }) {
  const [error, setError] = useState<string | null>(null);

  function addToken(file: File) {
    const typeError = validateImageType(file.type);
    if (typeError) {
      setError(typeError);
      return;
    }
    setError(null);
    update((d) => {
      const { col, row } = defaultTokenCell(d.rooms);
      const token = newToken({ name: file.name.replace(/\.[^.]+$/, ''), image: file, col, row });
      return { ...d, tokens: [...d.tokens, token] };
    });
  }

  return (
    <section>
      <button onClick={() => window.open('/player', 'dungeon-player')}>Open player window</button>

      <h3>Rooms</h3>
      <p>Click a room on the map, or use the buttons, to reveal or hide it.</p>
      {dungeon.rooms.length === 0 && <p>No rooms yet. Create some in Rooms mode.</p>}
      {dungeon.rooms.map((room) => (
        <div key={room.id} className="room-row">
          <span className="swatch" style={{ background: room.color }} />
          <span style={{ flex: 1 }}>{room.name}</span>
          <button
            data-testid={`toggle-room-${room.id}`}
            onClick={() => update((d) => ({ ...d, rooms: toggleReveal(d.rooms, room.id) }))}
          >
            {room.revealed ? 'Hide' : 'Reveal'}
          </button>
        </div>
      ))}

      <h3>Tokens</h3>
      <label>
        Add token image:{' '}
        <input
          type="file"
          accept="image/*"
          data-testid="token-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) addToken(file);
          }}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {dungeon.tokens.map((t) => (
        <div key={t.id} className="token-row">
          <span style={{ flex: 1 }}>{t.name}</span>
          <select
            aria-label={`Size of ${t.name}`}
            value={t.size}
            onChange={(e) =>
              update((d) => ({
                ...d,
                tokens: d.tokens.map((x) => (x.id === t.id ? { ...x, size: Number(e.target.value) } : x)),
              }))
            }
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
          <button onClick={() => update((d) => ({ ...d, tokens: d.tokens.filter((x) => x.id !== t.id) }))}>
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Wire run mode into `EditorScreen.tsx`**

Add imports:
```tsx
import { RunPanel } from './RunPanel';
import { usePaintInteraction, useRunInteraction } from './interactions';
```
(replace the existing `usePaintInteraction` import). After the `paint` hook line add:
```tsx
  const run = useRunInteraction(dungeonRef, update);
```
Replace the run placeholder line with:
```tsx
        {mode === 'run' && <RunPanel dungeon={dungeon} update={update} />}
```
Update the `onPointer` prop on `MapCanvas`:
```tsx
        onPointer={mode === 'rooms' ? paint : mode === 'run' ? run : undefined}
```

- [ ] **Step 4: Type-check, run unit tests and manually verify**

Run: `npx tsc --noEmit && npm run test`
Expected: no type errors, all unit tests pass.

Run: `npm run dev`. Import a map, paint two rooms, go to Run, click "Open player window". Expected:
- The player window shows solid black.
- Clicking a room on the DM map (or its Reveal button) shows that room in the player window right away. Clicking again hides it.
- Upload a token image. It appears at the first revealed room's first square. Dragging it snaps it to squares and it can't leave the map.
- A token in an unrevealed room is hidden in the player window but dimmed on the DM map.
- Closing and reopening the player window still shows the current state.

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat: add run mode with room reveal, tokens and player window"
```

---

### Task 11: End-to-end test

**Files:**
- Create: `e2e/dungeon.spec.ts`

**Interfaces:**
- Consumes: the `data-testid` hooks `import-input`, `map-canvas` (+ `data-camera`), `add-room`, `token-input`; the "Rooms" and "Run" tab buttons; the "Open player window" button.

- [ ] **Step 1: Write the test**

`e2e/dungeon.spec.ts`:
```ts
import { test, expect, type Page } from '@playwright/test';

const CELL = 50;

async function makePng(page: Page, color: string): Promise<Buffer> {
  const b64 = await page.evaluate((c) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 200, 200);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color);
  return Buffer.from(b64, 'base64');
}

async function camera(page: Page) {
  const canvas = page.getByTestId('map-canvas');
  await expect(canvas).toHaveAttribute('data-camera');
  return JSON.parse((await canvas.getAttribute('data-camera'))!) as { x: number; y: number; zoom: number };
}

async function cellOnScreen(page: Page, col: number, row: number) {
  const cam = await camera(page);
  const box = (await page.getByTestId('map-canvas').boundingBox())!;
  return {
    x: box.x + (col * CELL + CELL / 2 - cam.x) * cam.zoom,
    y: box.y + (row * CELL + CELL / 2 - cam.y) * cam.zoom,
  };
}

async function playerPixel(player: Page, col: number, row: number) {
  const cam = await camera(player);
  return player.evaluate(
    ({ cam, col, row, cell }) => {
      const canvas = document.querySelector('[data-testid=map-canvas]') as HTMLCanvasElement;
      const dpr = window.devicePixelRatio || 1;
      const x = Math.round((col * cell + cell / 2 - cam.x) * cam.zoom * dpr);
      const y = Math.round((row * cell + cell / 2 - cam.y) * cam.zoom * dpr);
      const d = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    },
    { cam, col, row, cell: CELL },
  );
}

test('import, paint a room, reveal it to the player, and show tokens only in revealed rooms', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('import-input').setInputFiles({
    name: 'map.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#cc3333'),
  });
  await camera(page);

  // Paint a room covering cells (0,0) and (1,1).
  await page.getByRole('button', { name: 'Rooms' }).click();
  await page.getByTestId('add-room').click();
  const from = await cellOnScreen(page, 0, 0);
  const to = await cellOnScreen(page, 1, 1);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();

  // Open the player window from Run mode.
  await page.getByRole('button', { name: 'Run' }).click();
  const playerPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open player window' }).click();
  const player = await playerPromise;
  await camera(player);

  // Everything starts hidden.
  await expect.poll(async () => (await playerPixel(player, 0, 0))[0]).toBe(0);

  // Reveal the room by clicking it on the DM map.
  const cell00 = await cellOnScreen(page, 0, 0);
  await page.mouse.click(cell00.x, cell00.y);
  await expect.poll(async () => (await playerPixel(player, 0, 0))[0]).toBeGreaterThan(150);
  // Unassigned cells stay hidden.
  expect((await playerPixel(player, 3, 3))[0]).toBe(0);

  // Add a blue token; it lands on the revealed room's first cell and is visible to players.
  await page.getByTestId('token-input').setInputFiles({
    name: 'goblin.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#3333cc'),
  });
  await expect
    .poll(async () => {
      const [r, , b] = await playerPixel(player, 0, 0);
      return b > 150 && r < 100;
    })
    .toBe(true);

  // Hiding the room hides the token too.
  await page.mouse.click(cell00.x, cell00.y);
  await expect.poll(async () => (await playerPixel(player, 0, 0)).join(',')).toBe('0,0,0');
});

test('rejects a non-image file on import', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('import-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  await expect(page.getByRole('alert')).toContainText(/not an image/i);
});
```

- [ ] **Step 2: Run the e2e tests**

Run: `npm run test:e2e`
Expected: 2 tests PASS. The Playwright config starts the dev server automatically.

If the token assertion flakes because the token image is still decoding, the `expect.poll` retries for up to its default timeout. Don't replace it with a fixed sleep.

- [ ] **Step 3: Run the whole suite and the production build**

Run: `npm run test && npm run build && npm run test:e2e`
Expected: all unit tests pass, build succeeds, both e2e tests pass.

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "test: add end-to-end test for import, rooms, reveal and tokens"
```
