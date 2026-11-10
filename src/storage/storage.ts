import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Dungeon } from '../model/types';

interface Schema extends DBSchema {
  dungeons: { key: string; value: Dungeon };
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  dbPromise ??= openDB<Schema>('dungeon-runner', 1, {
    upgrade(database) {
      database.createObjectStore('dungeons', { keyPath: 'id' });
    },
  });
  return dbPromise;
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function saveDungeon(d: Dungeon): Promise<void> {
  await (await db()).put('dungeons', d);
}

export async function loadDungeon(id: string): Promise<Dungeon | undefined> {
  return (await db()).get('dungeons', id);
}

export async function listDungeons(): Promise<{ id: string; name: string }[]> {
  const all = await (await db()).getAll('dungeons');
  return all.map((d) => ({ id: d.id, name: d.name }));
}

export async function deleteDungeon(id: string): Promise<void> {
  await (await db()).delete('dungeons', id);
}
