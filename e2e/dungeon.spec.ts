import { test, expect, type Page } from '@playwright/test';

const CELL = 50;

async function makePng(page: Page, color: string): Promise<Buffer> {
  const b64 = await page.evaluate((c) => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 200, 200);
    return canvas.toDataURL('image/png').split(',')[1];
  }, color);
  return Buffer.from(b64, 'base64');
}

async function camera(page: Page) {
  const canvas = page.getByTestId('map-canvas');
  await expect(canvas).toHaveAttribute('data-camera');
  return JSON.parse((await canvas.getAttribute('data-camera'))!) as { x: number; y: number; zoom: number };
}

async function cellOnScreen(page: Page, col: number, row: number) {
  const cam = await camera(page);
  const box = (await page.getByTestId('map-canvas').boundingBox())!;
  return {
    x: box.x + (col * CELL + CELL / 2 - cam.x) * cam.zoom,
    y: box.y + (row * CELL + CELL / 2 - cam.y) * cam.zoom,
  };
}

async function playerPixel(player: Page, col: number, row: number) {
  const cam = await camera(player);
  return player.evaluate(
    ({ cam, col, row, cell }) => {
      const canvas = document.querySelector('[data-testid=map-canvas]') as HTMLCanvasElement;
      const dpr = window.devicePixelRatio || 1;
      const x = Math.round((col * cell + cell / 2 - cam.x) * cam.zoom * dpr);
      const y = Math.round((row * cell + cell / 2 - cam.y) * cam.zoom * dpr);
      const d = canvas.getContext('2d')!.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    },
    { cam, col, row, cell: CELL },
  );
}

test('import, paint a room, reveal it to the player, and show tokens only in revealed rooms', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('import-input').setInputFiles({
    name: 'map.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#cc3333'),
  });
  await camera(page);

  // Paint a room covering cells (0,0) and (1,1).
  await page.getByRole('button', { name: 'Rooms' }).click();
  await page.getByTestId('add-room').click();
  const from = await cellOnScreen(page, 0, 0);
  const to = await cellOnScreen(page, 1, 1);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();

  // Open the player window from Run mode.
  await page.getByRole('button', { name: 'Run' }).click();
  const playerPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open player window' }).click();
  const player = await playerPromise;
  await camera(player);

  // Everything starts hidden.
  await expect.poll(async () => (await playerPixel(player, 0, 0))[0]).toBe(0);

  // Reveal the room by clicking it on the DM map.
  const cell00 = await cellOnScreen(page, 0, 0);
  await page.mouse.click(cell00.x, cell00.y);
  await expect.poll(async () => (await playerPixel(player, 0, 0))[0]).toBeGreaterThan(150);
  // Unassigned cells stay hidden.
  expect((await playerPixel(player, 3, 3))[0]).toBe(0);

  // Add a blue token; it lands on the revealed room's first cell and is visible to players.
  await page.getByTestId('token-input').setInputFiles({
    name: 'goblin.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#3333cc'),
  });
  await expect
    .poll(async () => {
      const [r, , b] = await playerPixel(player, 0, 0);
      return b > 150 && r < 100;
    })
    .toBe(true);

  // Hiding the room hides the token too. (Clicking cell (0,0) would grab the token, so click another room cell.)
  const cell11 = await cellOnScreen(page, 1, 1);
  await page.mouse.click(cell11.x, cell11.y);
  await expect.poll(async () => (await playerPixel(player, 0, 0)).join(',')).toBe('0,0,0');
});

test('rejects a non-image file on import', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('import-input').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  await expect(page.getByRole('alert')).toContainText(/not an image/i);
});

async function importMap(page: Page) {
  await page.goto('/');
  await page.getByTestId('import-input').setInputFiles({
    name: 'map.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#cc3333'),
  });
  await camera(page);
}

test('cell size input can be typed key by key without clamping mid-edit', async ({ page }) => {
  await importMap(page);
  const input = page.getByTestId('cell-size');
  await input.click();
  await input.selectText();
  await input.pressSequentially('72');
  await input.blur();
  await expect(input).toHaveValue('72');
});

test('a token can be renamed in Run mode', async ({ page }) => {
  await importMap(page);
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByTestId('token-input').setInputFiles({
    name: 'goblin.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#3333cc'),
  });
  const name = page.getByLabel('Token name');
  await name.fill('Goblin King');
  await expect(name).toHaveValue('Goblin King');
});

test('zoom buttons change the zoom around the view centre, and Fit view resets it', async ({ page }) => {
  await importMap(page);
  const canvas = page.getByTestId('map-canvas');
  const box = (await canvas.boundingBox())!;
  const before = await camera(page);
  const centre = (c: { x: number; y: number; zoom: number }) => ({
    x: c.x + box.width / 2 / c.zoom,
    y: c.y + box.height / 2 / c.zoom,
  });

  await page.getByTestId('zoom-in').click();
  await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(before.zoom * 1.25, 5);
  const zoomed = await camera(page);
  expect(centre(zoomed).x).toBeCloseTo(centre(before).x, 3);
  expect(centre(zoomed).y).toBeCloseTo(centre(before).y, 3);

  await page.getByTestId('zoom-out').click();
  await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(before.zoom, 5);

  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  await page.getByRole('button', { name: 'Fit view' }).click();
  await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(before.zoom, 5);
});

async function wheel(page: Page, init: { deltaX?: number; deltaY?: number; ctrlKey?: boolean }) {
  await page.getByTestId('map-canvas').evaluate((el, init) => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: r.left + r.width / 2,
        clientY: r.top + r.height / 2,
        deltaX: 0,
        deltaY: 0,
        ...init,
      }),
    );
  }, init);
}

test('two-finger swipe pans without zooming; pinch (ctrl+wheel) zooms', async ({ page }) => {
  await importMap(page);
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  const start = await camera(page);

  await wheel(page, { deltaX: 40, deltaY: 100 });
  await expect.poll(async () => (await camera(page)).y).toBeCloseTo(start.y + 100 / start.zoom, 3);
  const panned = await camera(page);
  expect(panned.x).toBeCloseTo(start.x + 40 / start.zoom, 3);
  expect(panned.zoom).toBe(start.zoom);

  await wheel(page, { deltaY: -50, ctrlKey: true });
  await expect.poll(async () => (await camera(page)).zoom).toBeGreaterThan(start.zoom);
});

test('Pan tool: dragging pans the map and does not paint a room', async ({ page }) => {
  await importMap(page);
  await page.getByRole('button', { name: 'Rooms' }).click();
  await page.getByTestId('add-room').click();
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('pan-tool').click();
  await expect(page.getByTestId('pan-tool')).toHaveAttribute('aria-pressed', 'true');

  const start = await camera(page);
  const box = (await page.getByTestId('map-canvas').boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y - 80, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => (await camera(page)).x).toBeCloseTo(start.x + 120 / start.zoom, 3);
  expect((await camera(page)).y).toBeCloseTo(start.y + 80 / start.zoom, 3);

  // No cell under the drag was painted: every visited cell still shows the plain map colour.
  const cam = await camera(page);
  const cellsUnderDrag = [0, 1, 2, 3].flatMap((col) => [0, 1, 2, 3].map((row) => [col, row]));
  for (const [col, row] of cellsUnderDrag) {
    const px = await playerPixel(page, col, row);
    // Cells off-screen read transparent/dark; only assert on-screen ones.
    const sx = (col * CELL + CELL / 2 - cam.x) * cam.zoom;
    const sy = (row * CELL + CELL / 2 - cam.y) * cam.zoom;
    if (sx > 0 && sy > 0 && sx < box.width && sy < box.height) expect(px).toEqual([204, 51, 51]);
  }

  // Turning the tool off restores painting.
  await page.getByTestId('pan-tool').click();
  await expect(page.getByTestId('pan-tool')).toHaveAttribute('aria-pressed', 'false');
});

async function clickWorld(page: Page, wx: number, wy: number) {
  const cam = await camera(page);
  const box = (await page.getByTestId('map-canvas').boundingBox())!;
  await page.mouse.click(box.x + (wx - cam.x) * cam.zoom, box.y + (wy - cam.y) * cam.zoom);
}

const near = (actual: string, expected: number, tol = 1) =>
  Math.abs(Number(actual) - expected) <= tol;

test('measure a square on the map to set the grid, including multi-square spans', async ({ page }) => {
  await importMap(page);
  await expect(page.getByTestId('cell-size')).toHaveValue('50');

  // Opposite corners of one 72px square whose top-left corner is at (20, 30).
  await page.getByTestId('measure-start').click();
  await expect(page.getByRole('status')).toContainText(/click one corner/i);
  await clickWorld(page, 20, 30);
  await expect(page.getByRole('status')).toContainText(/opposite corner/i);
  await clickWorld(page, 92, 102);
  await expect(page.getByRole('status')).toContainText(/square size set/i);
  await expect.poll(async () => near(await page.getByTestId('cell-size').inputValue(), 72)).toBe(true);
  expect(near(await page.getByTestId('offset-x').inputValue(), 20)).toBe(true);
  expect(near(await page.getByTestId('offset-y').inputValue(), 30)).toBe(true);

  // A 3x3 block measured corner to corner: 150px / 3 = 50px squares starting at (10, 10).
  await page.getByTestId('squares-spanned').fill('3');
  await page.getByTestId('measure-start').click();
  await clickWorld(page, 10, 10);
  await clickWorld(page, 160, 160);
  await expect.poll(async () => near(await page.getByTestId('cell-size').inputValue(), 50)).toBe(true);
  expect(near(await page.getByTestId('offset-x').inputValue(), 10)).toBe(true);
  expect(near(await page.getByTestId('offset-y').inputValue(), 10)).toBe(true);
});

test('Esc cancels measuring and leaves the grid unchanged', async ({ page }) => {
  await importMap(page);
  await page.getByTestId('measure-start').click();
  await clickWorld(page, 20, 30);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('measure-start')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByTestId('cell-size')).toHaveValue('50');
  await expect(page.getByTestId('offset-x')).toHaveValue('0');
});

test('player window waits for the DM, follows the open dungeon, and returns to waiting', async ({ page, context }) => {
  await page.goto('/');
  const player = await context.newPage();
  await player.goto('/player');
  await expect(player.getByText('Waiting for the DM')).toBeVisible();

  await page.getByTestId('import-input').setInputFiles({
    name: 'map.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#cc3333'),
  });
  await expect(player.getByTestId('map-canvas')).toBeVisible();
  await expect(player.getByText('Waiting for the DM')).toHaveCount(0);

  await page.getByRole('button', { name: '← Back' }).click();
  await expect(player.getByText('Waiting for the DM')).toBeVisible();
});

test('player window has its own zoom/pan, keeps it on resize, and never reveals hidden squares', async ({ page, context }) => {
  await importMap(page);
  // Paint and reveal a single room cell at (0,0).
  await page.getByRole('button', { name: 'Rooms' }).click();
  await page.getByTestId('add-room').click();
  const c00 = await cellOnScreen(page, 0, 0);
  await page.mouse.click(c00.x, c00.y);
  await page.getByRole('button', { name: 'Run' }).click();
  await page.mouse.click(c00.x, c00.y);
  const dmCamera = await camera(page);

  const playerPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open player window' }).click();
  const player = await playerPromise;
  await expect.poll(async () => (await playerPixel(player, 0, 0))[0]).toBeGreaterThan(150);
  const fitted = await camera(player);

  // The player window offers zoom + fit controls but no Pan tool (left-drag already pans there).
  await expect(player.getByTestId('pan-tool')).toHaveCount(0);

  // Zoom in with the button.
  await player.getByTestId('zoom-in').click();
  await expect.poll(async () => (await camera(player)).zoom).toBeCloseTo(fitted.zoom * 1.25, 5);

  // Left-drag pans.
  const box = (await player.getByTestId('map-canvas').boundingBox())!;
  const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const beforeDrag = await camera(player);
  await player.mouse.move(mid.x, mid.y);
  await player.mouse.down();
  await player.mouse.move(mid.x - 60, mid.y - 40, { steps: 5 });
  await player.mouse.up();
  await expect.poll(async () => (await camera(player)).x).toBeCloseTo(beforeDrag.x + 60 / beforeDrag.zoom, 3);
  expect((await camera(player)).y).toBeCloseTo(beforeDrag.y + 40 / beforeDrag.zoom, 3);

  // Two-finger swipe pans; pinch zooms.
  const beforeSwipe = await camera(player);
  await player.getByTestId('map-canvas').evaluate((el) => {
    el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 20, deltaY: 30 }));
  });
  await expect.poll(async () => (await camera(player)).y).toBeCloseTo(beforeSwipe.y + 30 / beforeSwipe.zoom, 3);
  expect((await camera(player)).zoom).toBe(beforeSwipe.zoom);

  // Resizing the window keeps the player's zoom (it used to snap back to fit).
  const beforeResize = await camera(player);
  await player.setViewportSize({ width: 700, height: 500 });
  await player.waitForTimeout(200);
  expect(await camera(player)).toEqual(beforeResize);

  // Hidden squares stay black however the player zooms/pans; the revealed one stays visible.
  await player.getByTestId('zoom-out').click();
  const cam = await camera(player);
  const cvs = (await player.getByTestId('map-canvas').boundingBox())!;
  const onScreen = (col: number, row: number) => {
    const sx = (col * CELL + CELL / 2 - cam.x) * cam.zoom;
    const sy = (row * CELL + CELL / 2 - cam.y) * cam.zoom;
    return sx > 0 && sy > 0 && sx < cvs.width && sy < cvs.height;
  };
  for (const [col, row] of [[1, 0], [2, 2], [3, 3], [0, 3]]) {
    if (onScreen(col, row)) expect((await playerPixel(player, col, row))[0]).toBe(0);
  }

  // Fit view resets; the DM window's own camera was never touched.
  await player.getByRole('button', { name: 'Fit view' }).click();
  await expect.poll(async () => (await camera(player)).zoom).toBeCloseTo(
    Math.min((700 - 32) / 200, (500 - 32) / 200),
    3,
  );
  expect(await camera(page)).toEqual(dmCamera);
});

test('room notes are editable in Rooms and Run mode and never reach the player window', async ({ page, context }) => {
  await page.goto('/');
  await page.getByTestId('import-input').setInputFiles({
    name: 'map.png',
    mimeType: 'image/png',
    buffer: await makePng(page, '#cc3333'),
  });
  await page.getByRole('button', { name: 'Rooms' }).click();
  await page.getByTestId('add-room').click();

  // Open the player window and record every state message it receives.
  await page.getByRole('button', { name: 'Run' }).click();
  const playerPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open player window' }).click();
  const player = await playerPromise;
  await player.evaluate(() => {
    (window as any).__msgs = [];
    new BroadcastChannel('dungeon-runner-sync').addEventListener('message', (e) =>
      (window as any).__msgs.push(JSON.stringify(e.data)),
    );
  });

  await page.getByRole('button', { name: 'Rooms' }).click();
  await page.getByRole('button', { name: 'Notes and options for Room 1' }).click();
  await page.getByLabel('Notes for Room 1').fill('The altar hides a poison needle');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByText('Notes', { exact: true }).click();
  await expect(page.getByLabel('Notes for Room 1')).toHaveValue('The altar hides a poison needle');
  await page.getByLabel('Notes for Room 1').fill('The altar hides a poison needle. DC 15.');

  await expect.poll(() => player.evaluate(() => (window as any).__msgs.length)).toBeGreaterThan(0);
  const msgs: string[] = await player.evaluate(() => (window as any).__msgs);
  expect(msgs.join('')).not.toContain('poison');
});
