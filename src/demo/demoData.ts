import type { Dungeon, Grid, Room } from '../model/types';
import { newDungeon } from '../model/dungeon';

export const DEMO_NAME = 'Demo Map';
export const DEMO_IMAGE_URL = '/demo/demo-map.jpg';
export const DEMO_GRID: Grid = { cellSize: 41.13, offsetX: 34.7, offsetY: 19.2 };

/** Rooms shipped with the demo (cells are "col,row" keys). */
export const DEMO_ROOMS: Room[] = [
  {
    "id": "0527c2ab-f715-42e0-85ba-7595a8a3e160",
    "name": "Villain's Lair",
    "color": "#e6194b",
    "cells": [
      "9,8",
      "9,9",
      "9,10",
      "9,11",
      "10,11",
      "11,11",
      "12,11",
      "13,11",
      "14,11",
      "15,11",
      "15,10",
      "15,9",
      "15,8",
      "14,8",
      "13,8",
      "12,8",
      "11,8",
      "10,8",
      "10,9",
      "10,10",
      "11,10",
      "11,9",
      "12,9",
      "12,10",
      "13,10",
      "13,9",
      "14,9",
      "14,10"
    ],
    "revealed": false,
    "notes": "The big bad waits here with two guards. A trapdoor under the rug drops into the cellar. Loot: 300 gp in a locked chest (DC 15 to pick)."
  },
  {
    "id": "a880cb73-5ddf-4be5-bd25-73ef7cd6a673",
    "name": "Closet",
    "color": "#3cb44b",
    "cells": [
      "8,9",
      "8,10",
      "8,11",
      "8,8"
    ],
    "revealed": false,
    "notes": "Cramped storage. A hidden lever behind the coats (DC 14 Investigation) opens the lair's secret door."
  },
  {
    "id": "580bd74b-fb09-41c6-b8d5-f38fe59d898f",
    "name": "Bathroom",
    "color": "#4363d8",
    "cells": [
      "16,8",
      "16,9",
      "16,10",
      "16,11"
    ],
    "revealed": false
  },
  {
    "id": "32be27a9-1f43-4dcf-8de6-70370e19e6ca",
    "name": "Another Bathroom",
    "color": "#f58231",
    "cells": [
      "8,12",
      "9,12",
      "10,12",
      "10,13",
      "9,13",
      "8,13"
    ],
    "revealed": false
  },
  {
    "id": "a1dcdb8e-fd7c-4b5a-8992-f55ebcd8b3f3",
    "name": "Another Closet",
    "color": "#911eb4",
    "cells": [
      "14,12",
      "15,12",
      "16,12",
      "16,13",
      "15,13",
      "14,13"
    ],
    "revealed": false
  },
  {
    "id": "fc551565-6903-41a3-a0f7-e68ff5030415",
    "name": "Barracks",
    "color": "#42d4f4",
    "cells": [
      "8,14",
      "9,14",
      "10,14",
      "10,15",
      "9,15",
      "8,15",
      "11,14",
      "12,14",
      "13,14",
      "13,13",
      "12,13",
      "11,13",
      "12,12",
      "13,12",
      "11,12",
      "14,14",
      "14,15",
      "15,15",
      "16,15",
      "16,14",
      "15,14",
      "13,15",
      "12,15",
      "11,15"
    ],
    "revealed": true,
    "notes": "Six off-duty guards sleeping. Stealth DC 12 to cross without waking them; otherwise roll initiative."
  }
];

export async function loadDemoDungeon(): Promise<Dungeon> {
  const res = await fetch(DEMO_IMAGE_URL);
  if (!res.ok) throw new Error('Could not load the demo map.');
  const image = await res.blob();
  const bitmap = await createImageBitmap(image);
  const { width, height } = bitmap;
  bitmap.close();
  return {
    ...newDungeon({ name: DEMO_NAME, image, width, height }),
    grid: { ...DEMO_GRID },
    rooms: DEMO_ROOMS.map((r) => ({ ...r, cells: [...r.cells] })),
  };
}
