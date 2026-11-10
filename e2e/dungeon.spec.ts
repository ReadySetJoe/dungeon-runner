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
