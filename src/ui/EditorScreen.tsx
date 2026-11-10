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
