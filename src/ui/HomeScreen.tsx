import { useCallback, useEffect, useState } from 'react';
import type { Dungeon } from '../model/types';
import { isLargeImage, newDungeon, validateImageType } from '../model/dungeon';
import { deleteDungeon, isStorageAvailable, listDungeons, loadDungeon } from '../storage/storage';

export function HomeScreen({ onOpen }: { onOpen: (d: Dungeon) => void }) {
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!isStorageAvailable()) return;
    listDungeons().then(setItems).catch(() => setError('Could not read saved dungeons.'));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onFile(file: File) {
    setError(null);
    const typeError = validateImageType(file.type);
    if (typeError) {
      setError(typeError);
      return;
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setError('Could not read that image.');
      return;
    }
    const { width, height } = bitmap;
    bitmap.close();
    if (isLargeImage(width, height) && !window.confirm('This image is very large and may be slow. Continue?')) return;
    onOpen(newDungeon({ name: file.name.replace(/\.[^.]+$/, ''), image: file, width, height }));
  }

  return (
    <div className="home">
      <h1>Dungeon Runner</h1>
      <label>
        Import a map image (webp, png, jpg):{' '}
        <input
          type="file"
          accept="image/*"
          data-testid="import-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void onFile(file);
          }}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items.length > 0 && <h2>Saved dungeons</h2>}
      {items.map((it) => (
        <div key={it.id} className="room-row">
          <button
            onClick={() =>
              loadDungeon(it.id)
                .then((d) => d && onOpen(d))
                .catch(() => setError('Could not open that dungeon.'))
            }
          >
            {it.name}
          </button>
          <button
            onClick={() => {
              if (!window.confirm(`Delete "${it.name}"? This cannot be undone.`)) return;
              deleteDungeon(it.id)
                .then(refresh)
                .catch(() => setError('Could not delete that dungeon.'));
            }}
            aria-label={`Delete ${it.name}`}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
