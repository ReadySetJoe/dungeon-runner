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
