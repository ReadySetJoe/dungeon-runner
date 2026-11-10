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
