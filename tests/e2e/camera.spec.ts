import { test, expect } from '@playwright/test';

test.describe('Camera Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000); // Wait for map to render
  });

  test('should pan camera with WASD keys', async ({ page }) => {
    // Take initial screenshot
    const initialScreenshot = await page.screenshot();

    // Press D to pan right
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(200);

    // Take screenshot after panning
    const afterPanScreenshot = await page.screenshot();

    // Screenshots should be different (camera moved)
    expect(Buffer.compare(initialScreenshot, afterPanScreenshot)).not.toBe(0);
  });

  test('should pan camera with arrow keys', async ({ page }) => {
    const initialScreenshot = await page.screenshot();

    // Press Right arrow to pan
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    const afterPanScreenshot = await page.screenshot();
    expect(Buffer.compare(initialScreenshot, afterPanScreenshot)).not.toBe(0);
  });

  test('should zoom with mouse wheel', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (box) {
      // Take initial screenshot
      const initialScreenshot = await page.screenshot();

      // Scroll to zoom in
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -100); // Scroll up = zoom in
      await page.waitForTimeout(500);

      // Take screenshot after zooming
      const afterZoomScreenshot = await page.screenshot();

      // Screenshots should be different (zoom changed)
      expect(Buffer.compare(initialScreenshot, afterZoomScreenshot)).not.toBe(0);
    }
  });

  test('should pan in all four directions with WASD', async ({ page }) => {
    const screenshots: Buffer[] = [];

    // Take screenshot at initial position
    screenshots.push(await page.screenshot());

    // Test each direction
    const directions = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];

    for (const key of directions) {
      await page.keyboard.down(key);
      await page.waitForTimeout(200);
      await page.keyboard.up(key);
      await page.waitForTimeout(100);
      screenshots.push(await page.screenshot());
    }

    // Each screenshot should differ from the initial
    for (let i = 1; i < screenshots.length; i++) {
      expect(Buffer.compare(screenshots[i], screenshots[0])).not.toBe(0);
    }
  });

  test('should support continuous key hold for smooth panning', async ({ page }) => {
    const screenshots: Buffer[] = [];

    // Hold W key for continuous upward pan
    await page.keyboard.down('KeyW');

    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(150);
      screenshots.push(await page.screenshot());
    }

    await page.keyboard.up('KeyW');

    // Each frame should show progressive camera movement
    for (let i = 1; i < screenshots.length; i++) {
      const diff = Buffer.compare(screenshots[i], screenshots[i - 1]);
      expect(diff).not.toBe(0);
    }
  });

  test('should zoom out with mouse wheel scroll down', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      const beforeZoom = await page.screenshot();

      await page.mouse.wheel(0, 100); // Scroll down = zoom out
      await page.waitForTimeout(300);

      const afterZoom = await page.screenshot();

      expect(Buffer.compare(beforeZoom, afterZoom)).not.toBe(0);
    }
  });
});
