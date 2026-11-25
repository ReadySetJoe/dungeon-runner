import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dungeon } from '../model/types';
import { loadDemoDungeon } from '../demo/demoData';
import { forPlayer } from '../model/dungeon';
import { createSync, type Sync } from '../sync/sync';
import { isStorageAvailable, saveDungeon } from '../storage/storage';
import { EditorScreen } from './EditorScreen';
import { HomeScreen } from './HomeScreen';

export type Update = (fn: (d: Dungeon) => Dungeon) => void;

export function DmView({ demo = false }: { demo?: boolean }) {
  const [dungeon, setDungeon] = useState<Dungeon | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
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
        sync.send({ type: 'state', dungeon: forPlayer(dungeonRef.current) });
      }
    });
    return () => {
      unsubscribe();
      sync.close();
      syncRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncRef.current?.send(dungeon ? { type: 'state', dungeon: forPlayer(dungeon) } : { type: 'clear' });
  }, [dungeon]);

  useEffect(() => {
    if (!demo) return;
    loadDemoDungeon().then(setDungeon).catch((e: Error) => setDemoError(e.message));
  }, [demo]);

  const canSave = !demo && isStorageAvailable();

  const flushSave = useCallback(() => {
    const d = dungeonRef.current;
    if (!d || !canSave) return;
    saveDungeon(d)
      .then(() => setSaveError(null))
      .catch(() => setSaveError('Saving failed — recent changes may be lost.'));
  }, [canSave]);

  useEffect(() => {
    window.addEventListener('pagehide', flushSave);
    return () => window.removeEventListener('pagehide', flushSave);
  }, [flushSave]);

  useEffect(() => {
    if (!dungeon || !canSave) return;
    const timer = setTimeout(() => {
      saveDungeon(dungeon)
        .then(() => setSaveError(null))
        .catch(() => setSaveError('Saving failed — recent changes may be lost.'));
    }, 500);
    return () => clearTimeout(timer);
  }, [dungeon, canSave]);

  if (demo) {
    return (
      <>
        {demoError && <div className="banner">{demoError}</div>}
        {dungeon ? (
          <>
            <EditorScreen dungeon={dungeon} update={update} onClose={() => window.location.assign('/')} />
            {showHint && (
              <div className="demo-hint" role="note">
                <span>Demo: open the player window from Run, then click a room to reveal it. Changes aren't saved — reload to reset.</span>
                <button onClick={() => setShowHint(false)} aria-label="Dismiss hint">✕</button>
              </div>
            )}
          </>
        ) : (
          !demoError && <div className="waiting">Loading demo…</div>
        )}
      </>
    );
  }

  return (
    <>
      {!isStorageAvailable() && <div className="banner">Storage is unavailable — nothing will be saved.</div>}
      {saveError && <div className="banner">{saveError}</div>}
      {dungeon ? (
        <EditorScreen dungeon={dungeon} update={update} onClose={() => {
            flushSave();
            setDungeon(null);
          }} />
      ) : (
        <HomeScreen onOpen={setDungeon} />
      )}
    </>
  );
}
