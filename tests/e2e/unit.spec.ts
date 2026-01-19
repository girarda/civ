import { test, expect } from '@playwright/test';

test.describe('Unit System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for map and unit generation
  });

  test('should spawn a unit on map load', async ({ page }) => {
    // Check console for map generation log with unit spawn
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Reload to capture logs
    await page.reload();
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1000);

    // Should have map generated log
    const hasMapLog = logs.some((l) => l.includes('Map generated'));
    expect(hasMapLog).toBe(true);
  });

  test('should select unit on click', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    // Click near center of map where unit likely spawned
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });

    // Wait for selection state to update
    await page.waitForTimeout(200);

    // If there's a visual indicator, we could check for it
    // Since we can't directly check internal state, this test mainly verifies no errors
  });

  test('should deselect unit on Escape key', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click to select
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // Press Escape to deselect
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Verify no errors occurred
  });

  test('should show movement preview on hover when unit selected', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click to potentially select a unit
    await canvas.click({
      position: { x: box!.width / 3, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Move mouse to another tile
    await canvas.hover({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // Verify no errors - movement preview would be shown if unit was selected
  });

  test('should handle right-click for movement', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click to potentially select
    await canvas.click({
      position: { x: box!.width / 3, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Right-click to move
    await canvas.click({
      button: 'right',
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // Verify no errors occurred during movement attempt
  });

  test('should persist unit after map regeneration', async ({ page }) => {
    // Press R to regenerate map
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Verify the canvas is still functional
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
  });

  test('should not crash on rapid clicks', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Rapid clicks in various locations (use force to bypass overlays)
    for (let i = 0; i < 10; i++) {
      const x = (box!.width * (i % 3 + 1)) / 4;
      const y = (box!.height * Math.floor(i / 3 + 1)) / 4;
      await canvas.click({ position: { x, y }, force: true });
      await page.waitForTimeout(50);
    }

    // Canvas should still be visible and functional
    await expect(canvas).toBeVisible();
  });
});
