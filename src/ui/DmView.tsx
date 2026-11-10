import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { createSync, type Sync } from '../sync/sync';
import { isStorageAvailable, saveDungeon } from '../storage/storage';
import { EditorScreen } from './EditorScreen';
import { HomeScreen } from './HomeScreen';

export type Update = (fn: (d: Dungeon) => Dungeon) => void;

export function DmView() {
  const [dungeon, setDungeon] = useState<Dungeon | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const syncRef = useRef<Sync | null>(null);
  const dungeonRef = useRef(dungeon);
  dungeonRef.current = dungeon;

  const update: Update = useCallback((fn) => setDungeon((d) => (d ? fn(d) : d)), []);

  useEffect(() => {
    const sync = createSync();
    syncRef.current = sync;
    const unsubscribe = sync.subscribe((msg) => {
      if (msg.type === 'request-state' && dungeonRef.current) {
        sync.send({ type: 'state', dungeon: dungeonRef.current });
      }
    });
    return () => {
      unsubscribe();
      sync.close();
      syncRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (dungeon) syncRef.current?.send({ type: 'state', dungeon });
  }, [dungeon]);

  useEffect(() => {
    if (!dungeon || !isStorageAvailable()) return;
    const timer = setTimeout(() => {
      saveDungeon(dungeon)
        .then(() => setSaveError(null))
        .catch(() => setSaveError('Saving failed — recent changes may be lost.'));
    }, 500);
    return () => clearTimeout(timer);
  }, [dungeon]);

  return (
    <>
      {!isStorageAvailable() && <div className="banner">Storage is unavailable — nothing will be saved.</div>}
      {saveError && <div className="banner">{saveError}</div>}
      {dungeon ? (
        <EditorScreen dungeon={dungeon} update={update} onClose={() => setDungeon(null)} />
      ) : (
        <HomeScreen onOpen={setDungeon} />
      )}
    </>
  );
}
