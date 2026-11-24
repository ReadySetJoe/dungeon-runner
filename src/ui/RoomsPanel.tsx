import { useState } from 'react';
import type { Dungeon } from '../model/types';
import { createRoom, removeRoom, updateRoom } from '../model/rooms';
import type { Update } from './DmView';
import { RoomNotes } from './RoomNotes';

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
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const addRoom = () => {
    const n = dungeon.rooms.length;
    const room = createRoom(`Room ${n + 1}`, ROOM_COLORS[n % ROOM_COLORS.length]);
    update((d) => ({ ...d, rooms: [...d.rooms, room] }));
    onSelect(room.id);
  };

  return (
    <section className="rooms-panel">
      <h3>Rooms</h3>
      <button data-testid="add-room" onClick={addRoom}>
        Add room
      </button>
      <div role="radiogroup" aria-label="Tool" className="tool-radios">
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
        <div key={room.id} className="room-block">
        <div className="room-row">
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
            className={`chevron${room.notes?.trim() ? ' has-notes' : ''}`}
            aria-label={`Notes and options for ${room.name}`}
            aria-expanded={open.has(room.id)}
            title={room.notes?.trim() ? 'Notes & options (has notes)' : 'Notes & options'}
            onClick={() => toggleOpen(room.id)}
          >
            {open.has(room.id) ? '▴' : '▾'}
          </button>
        </div>
        {open.has(room.id) && (
        <div className="room-details">
          <RoomNotes room={room} update={update} />
          <button
            className="danger"
            onClick={() => {
              update((d) => ({ ...d, rooms: removeRoom(d.rooms, room.id) }));
              if (room.id === selectedRoomId) onSelect(null);
            }}
          >
            Delete room
          </button>
        </div>
        )}
        </div>
      ))}
    </section>
  );
}
