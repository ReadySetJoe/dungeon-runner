import type { Dungeon } from '../model/types';
import type { Camera } from '../model/camera';
import { cellToPixel, gridDimensions, parseCellKey } from '../model/grid';
import { isTokenVisible } from '../model/rooms';
import type { Point } from '../model/calibrate';

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
  /** DM-only crosshair markers in map pixel coordinates (e.g. grid calibration points). */
  markers?: Point[];
}

export function renderScene(o: RenderOptions): void {
  const { ctx, width, height, dungeon, mapImage, tokenImages, camera, view, selectedRoomId, markers } = o;
  const { grid, rooms, tokens, map } = dungeon;
  const cs = grid.cellSize;

  ctx.save();
  ctx.fillStyle = view === 'player' ? '#000' : '#14110f';
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
    // Soft drop shadow so tokens lift off the map.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(p.x + s / 2, p.y + s / 2, s / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
    ctx.lineWidth = 2.5 / camera.zoom;
    ctx.strokeStyle = '#f3d9a4';
    ctx.stroke();
    ctx.restore();
  }

  if (view === 'dm' && markers) {
    const r = 7 / camera.zoom;
    for (const m of markers) {
      ctx.beginPath();
      ctx.moveTo(m.x - 2 * r, m.y);
      ctx.lineTo(m.x + 2 * r, m.y);
      ctx.moveTo(m.x, m.y - 2 * r);
      ctx.lineTo(m.x, m.y + 2 * r);
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.lineWidth = 3 / camera.zoom;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.stroke();
      ctx.lineWidth = 1.5 / camera.zoom;
      ctx.strokeStyle = '#ffe14d';
      ctx.stroke();
    }
  }

  ctx.restore();
}
