import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { saveDungeon, loadDungeon, listDungeons, deleteDungeon, isStorageAvailable } from './storage';
import { newDungeon } from '../model/dungeon';
import { createRoom, paintCell } from '../model/rooms';

describe('storage', () => {
  it('reports availability', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('saves, loads, lists and deletes dungeons', async () => {
    const d = newDungeon({ name: 'Crypt', image: new Blob(['abc']), width: 200, height: 100 });
    const room = createRoom('Hall', '#f00', 'r1');
    d.rooms = paintCell([room], 'r1', '0,0');

    await saveDungeon(d);
    const loaded = await loadDungeon(d.id);
    expect(loaded?.name).toBe('Crypt');
    expect(loaded?.rooms[0].cells).toEqual(['0,0']);
    expect(loaded?.map.image.size).toBe(3);
    expect(loaded?.map.imageId).toBe(d.map.imageId);

    expect(await listDungeons()).toEqual([{ id: d.id, name: 'Crypt' }]);

    await deleteDungeon(d.id);
    expect(await loadDungeon(d.id)).toBeUndefined();
    expect(await listDungeons()).toEqual([]);
  });
});
