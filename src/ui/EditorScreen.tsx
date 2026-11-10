import { useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { MapCanvas } from '../canvas/MapCanvas';
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
        onPointer={mode === 'rooms' ? paint : mode === 'run' ? run : undefined}
      />
    </div>
  );
}
