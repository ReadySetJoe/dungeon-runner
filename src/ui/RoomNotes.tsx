import type { Dungeon, Room } from '../model/types';
import { updateRoom } from '../model/rooms';
import type { Update } from './DmView';

export function RoomNotes({ room, update, rows = 3 }: { room: Room; update: Update; rows?: number }) {
  return (
    <textarea
      className="room-notes"
      aria-label={`Notes for ${room.name}`}
      placeholder="DM notes (never shown to players)"
      rows={rows}
      value={room.notes ?? ''}
      onChange={(e) =>
        update((d: Dungeon) => ({ ...d, rooms: updateRoom(d.rooms, room.id, { notes: e.target.value }) }))
      }
    />
  );
}
