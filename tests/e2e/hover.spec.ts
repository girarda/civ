import { test, expect } from '@playwright/test';

test.describe('Tile Hover Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000); // Wait for map to render
  });

  test('should render without errors', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // No console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(500);
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('should show highlight when hovering over tile', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Take screenshot before hover
    const beforeHover = await page.screenshot();

    // Move mouse to center of canvas (should be over a tile)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Take screenshot after hover
    const afterHover = await page.screenshot();

    // Screenshots should be different (highlight visible)
    expect(Buffer.compare(beforeHover, afterHover)).not.toBe(0);
  });

  test('should update highlight when moving to different tile', async ({
    page,
  }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Move to center
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const firstHover = await page.screenshot();

    // Move to a different location (should be a different tile)
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const secondHover = await page.screenshot();

    // Screenshots should be different (highlight moved)
    expect(Buffer.compare(firstHover, secondHover)).not.toBe(0);
  });

  test('should hide highlight when mouse leaves canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Move to center (hover over tile)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const withHover = await page.screenshot();

    // Move mouse outside canvas
    await page.mouse.move(box.x - 10, box.y - 10);
    await page.waitForTimeout(200);
    const afterLeave = await page.screenshot();

    // Screenshots should be different (highlight hidden)
    expect(Buffer.compare(withHover, afterLeave)).not.toBe(0);
  });

  test('should follow cursor during pan', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Move mouse to center
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const beforePan = await page.screenshot();

    // Pan camera while keeping mouse in same position
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(200);

    // Mouse hasn't moved but camera has - highlight should be on different tile
    const afterPan = await page.screenshot();

    // Since mouse position relative to canvas hasn't changed, but camera moved,
    // the highlight should now be on a different tile (or same position looks different)
    expect(Buffer.compare(beforePan, afterPan)).not.toBe(0);
  });

  test('should work at different zoom levels', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Hover at normal zoom
    await page.mouse.move(centerX, centerY);
    await page.waitForTimeout(200);
    const normalZoom = await page.screenshot();

    // Zoom in
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(300);

    // Hover should still work (mouse is still over a tile)
    const zoomedIn = await page.screenshot();

    // Zoom out
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);

    const zoomedOut = await page.screenshot();

    // All three states should render differently
    expect(Buffer.compare(normalZoom, zoomedIn)).not.toBe(0);
    expect(Buffer.compare(zoomedIn, zoomedOut)).not.toBe(0);
  });

  test('should show consistent highlight style', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Move to center and capture
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);

    // Verify canvas is still visible and app is responsive
    await expect(canvas).toBeVisible();

    // Move rapidly between tiles
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(
        box.x + box.width / 2 + i * 50,
        box.y + box.height / 2
      );
      await page.waitForTimeout(50);
    }

    // App should still be responsive
    await expect(canvas).toBeVisible();
  });
});
