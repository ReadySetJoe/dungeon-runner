import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { MapCanvas, type PointerInfo } from '../canvas/MapCanvas';
import { calibrateGrid, type Point } from '../model/calibrate';
import type { Update } from './DmView';
import { SetupPanel } from './SetupPanel';
import { RoomsPanel } from './RoomsPanel';
import { RunPanel } from './RunPanel';
import { usePaintInteraction, useRunInteraction } from './interactions';

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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [tool, setTool] = useState<'paint' | 'erase'>('paint');
  const paint = usePaintInteraction(dungeonRef, update, selectedRoomId, tool);
  const run = useRunInteraction(dungeonRef, update);

  // Grid calibration: click two opposite corners of a block of squares.
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]);
  const [spanned, setSpanned] = useState(1);
  const spannedRef = useRef(spanned);
  spannedRef.current = spanned;
  const [notice, setNotice] = useState<string | null>(null);

  const cancelMeasure = useCallback(() => {
    setMeasuring(false);
    pointsRef.current = [];
    setPoints([]);
  }, []);
  const startMeasure = () => {
    setNotice(null);
    pointsRef.current = [];
    setPoints([]);
    setMeasuring(true);
  };
  const measure = useCallback(
    (info: PointerInfo) => {
      if (info.type !== 'down') return;
      const next = [...pointsRef.current, info.world];
      if (next.length < 2) {
        pointsRef.current = next;
        setPoints(next);
        return;
      }
      const { grid, clamped } = calibrateGrid(next[0], next[1], spannedRef.current);
      update((d) => ({ ...d, grid }));
      setNotice(
        clamped
          ? `The measured size was outside 10–200 px, so it was limited to ${grid.cellSize} px.`
          : `Square size set to ${grid.cellSize} px.`,
      );
      cancelMeasure();
    },
    [update, cancelMeasure],
  );

  useEffect(() => {
    if (!measuring) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelMeasure();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [measuring, cancelMeasure]);

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
            <button
              key={m.id}
              aria-pressed={mode === m.id}
              onClick={() => {
                setMode(m.id);
                if (m.id !== 'setup') cancelMeasure();
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'setup' && (
          <SetupPanel
            dungeon={dungeon}
            update={update}
            measuring={measuring}
            pointCount={points.length}
            spanned={spanned}
            onSpannedChange={setSpanned}
            onStartMeasure={startMeasure}
            onCancelMeasure={cancelMeasure}
            notice={notice}
          />
        )}
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
        {mode === 'run' && <RunPanel dungeon={dungeon} update={update} />}
      </aside>
      <MapCanvas
        dungeon={dungeon}
        view="dm"
        interactive
        selectedRoomId={mode === 'rooms' ? selectedRoomId : null}
        markers={measuring ? points : undefined}
        cursor={measuring ? 'crosshair' : undefined}
        onPointer={measuring ? measure : mode === 'rooms' ? paint : mode === 'run' ? run : undefined}
      />
    </div>
  );
}
