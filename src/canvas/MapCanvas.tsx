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
    const blur = () => {
      spaceHeld.current = false;
    };
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [interactive]);

  const toWorld = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return screenToWorld(cameraRef.current!, e.clientX - r.left, e.clientY - r.top);
  };

  const endPointer = (e: React.PointerEvent) => {
    if (!interactive || !cameraRef.current) return;
    if (panning.current) {
      panning.current = null;
      return;
    }
    onPointerRef.current?.({ type: 'up', world: toWorld(e) });
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
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
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
