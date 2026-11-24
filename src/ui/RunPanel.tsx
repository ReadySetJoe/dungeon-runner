import type { Dungeon } from '../model/types';
import { newToken, validateImageType } from '../model/dungeon';
import { defaultTokenCell, toggleReveal } from '../model/rooms';
import type { Update } from './DmView';
import { useState } from 'react';
import { RoomNotes } from './RoomNotes';

export function RunPanel({ dungeon, update }: { dungeon: Dungeon; update: Update }) {
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

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
        <div key={room.id} className="room-block">
        <div className="room-row">
          <span className="swatch" style={{ background: room.color }} />
          <span style={{ flex: 1 }}>{room.name}</span>
          <button
            data-testid={`toggle-room-${room.id}`}
            onClick={() => update((d) => ({ ...d, rooms: toggleReveal(d.rooms, room.id) }))}
          >
            {room.revealed ? 'Hide' : 'Reveal'}
          </button>
          <button
            className={`chevron${room.notes?.trim() ? ' has-notes' : ''}`}
            aria-label={`Show or hide ${room.name} notes`}
            aria-expanded={open.has(room.id)}
            title={room.notes?.trim() ? 'Notes (has notes)' : 'Notes'}
            onClick={() => toggleOpen(room.id)}
          >
            {open.has(room.id) ? '▴' : '▾'}
          </button>
        </div>
        {open.has(room.id) && (
          <div className="room-details">
            <RoomNotes room={room} update={update} rows={5} />
          </div>
        )}
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
          <input
            type="text"
            aria-label="Token name"
            style={{ flex: 1, minWidth: 0 }}
            value={t.name}
            onChange={(e) =>
              update((d) => ({
                ...d,
                tokens: d.tokens.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)),
              }))
            }
          />
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
