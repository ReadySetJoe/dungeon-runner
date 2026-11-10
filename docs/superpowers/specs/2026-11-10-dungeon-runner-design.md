# Dungeon Runner — Design

## Purpose
A client-side web app for running D&D dungeons. The DM imports a map image, overlays an aligned square grid, groups squares into rooms, reveals rooms to players as they progress, and moves tokens around the map. Players see a separate window that shows only revealed content.

## Decisions
- **Stack:** Vite + React + TypeScript. No backend.
- **Rendering:** HTML `<canvas>` for map, grid, rooms, fog and tokens, with pan and zoom.
- **Storage:** IndexedDB (via `idb`), with images stored as blobs. Export/import of a dungeon file is a backup feature, not required for v1.
- **Player view:** a second browser window at `/player`, synced live from the DM window at `/dm` using `BroadcastChannel`. Both windows run on the same machine and browser.
- **Unassigned squares:** always hidden from players. Corridors are modeled as their own room.

## Data model
```
Dungeon {
  id, name,
  map: { imageBlob, width, height },
  grid: { cellSize, offsetX, offsetY },
  rooms: Room[],
  tokens: Token[]
}
Room  { id, name, color, cells: "col,row"[], revealed: boolean }
Token { id, name, imageBlob, col, row, size (cells, default 1) }
```
A cell belongs to at most one room. Painting a cell into a room removes it from any other room.

## Modes (DM window)
1. **Setup:** import an image (webp, png, jpg). Adjust `cellSize` and `offsetX/Y` with sliders over a live grid overlay.
2. **Rooms:** create, rename, recolor and delete rooms. Click or drag to paint cells into the selected room. An erase toggle removes cells from it.
3. **Run:**
   - Hidden rooms are shown dimmed for the DM.
   - Clicking a room toggles `revealed`.
   - Tokens drag and snap to cells.
   - The DM can add tokens by uploading an image (cropped to a circle), set their name and size, and remove them.

## Player view
- Renders the map, with every cell that is not in a revealed room covered in solid black.
- Tokens are drawn only if their cell lies in a revealed room.
- It is read-only and receives state from the DM window over `BroadcastChannel`. When opened, it requests the current state. Images are sent as blobs.
- No grid lines are shown unless the DM later adds an option for them.

## Structure
- `src/model/` has the types and pure functions: grid math (pixel↔cell), room membership, visibility. These are unit-tested.
- `src/storage/` has IndexedDB persistence.
- `src/sync/` has the BroadcastChannel protocol shared by both windows.
- `src/canvas/` has the renderer, taking state plus a view (`dm` or `player`) and drawing it.
- `src/ui/` has the setup, rooms and run panels, plus the dungeon list.

## Error handling
- Reject non-image files and show an inline error.
- Warn when an image is very large, but allow it.
- If IndexedDB is unavailable, show a message that nothing will be saved.
- If the player window has no DM window to sync with, show a "waiting for DM" screen.

## Testing
- **Vitest:** grid math, offset and cell conversion, one-room-per-cell rule, visibility rules (unassigned hidden, unrevealed hidden, tokens hidden with their room).
- **Playwright:** import an image, set up the grid, paint a room, reveal it, and assert the player window's canvas changes.

## Out of scope for v1
Dynamic line-of-sight lighting, remote players on separate devices, multi-user accounts, initiative and combat tracking, and fog painting that ignores the room grid.
