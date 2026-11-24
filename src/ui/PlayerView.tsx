import { useEffect, useState } from 'react';
import type { Dungeon } from '../model/types';
import { createSync } from '../sync/sync';
import { MapCanvas } from '../canvas/MapCanvas';

export function PlayerView() {
  const [dungeon, setDungeon] = useState<Dungeon | null>(null);

  useEffect(() => {
    const sync = createSync();
    const unsubscribe = sync.subscribe((msg) => {
      if (msg.type === 'state') setDungeon(msg.dungeon);
      else if (msg.type === 'clear') setDungeon(null);
    });
    sync.send({ type: 'request-state' });
    return () => {
      unsubscribe();
      sync.close();
    };
  }, []);

  if (!dungeon) return <div className="waiting">Waiting for the DM…</div>;
  return (
    <div className="player-root">
      <MapCanvas dungeon={dungeon} view="player" interactive />
    </div>
  );
}
