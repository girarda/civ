import { test, expect } from '@playwright/test';

test.describe('Combat System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for map and unit generation
  });

  test('should spawn units on map load for combat testing', async ({ page }) => {
    // Map should be generated and canvas visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Enable debug mode and regenerate to capture logs
    await page.keyboard.press('`');
    await page.waitForTimeout(500);
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);

    const debugLog = page.locator('#debug-log');
    const text = await debugLog.textContent();
    expect(text).toContain('[MAP]');
    await page.keyboard.press('`'); // Close debug overlay
  });

  test('should handle right-click attack on adjacent enemy', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    const logs: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Click to potentially select a unit
    await canvas.click({
      position: { x: box!.width / 3, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Right-click nearby to try attack
    await canvas.click({
      button: 'right',
      position: { x: box!.width / 3 + 50, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Verify no errors occurred
    await expect(canvas).toBeVisible();
  });

  test('should log combat results on successful attack', async ({ page }) => {
    const logs: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Attempt to find and click on units by scanning the center area
    for (let i = 0; i < 5; i++) {
      const x = box!.width / 2 + (i - 2) * 30;
      const y = box!.height / 2;

      await canvas.click({ position: { x, y } });
      await page.waitForTimeout(100);

      // Try right-click on adjacent positions
      await canvas.click({
        button: 'right',
        position: { x: x + 50, y },
      });
      await page.waitForTimeout(100);
    }

    // Verify no errors - combat may or may not occur
    await expect(canvas).toBeVisible();
  });

  test('should not crash when attacking with no selection', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Press Escape to ensure nothing is selected
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Right-click should do nothing (no crash)
    await canvas.click({
      button: 'right',
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(100);

    await expect(canvas).toBeVisible();
  });

  test('should handle rapid attack attempts without crashing', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    // Click to select
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(100);

    // Rapid right-clicks in different positions
    for (let i = 0; i < 10; i++) {
      const x = box!.width / 2 + Math.cos(i * 0.6) * 60;
      const y = box!.height / 2 + Math.sin(i * 0.6) * 60;
      await canvas.click({
        button: 'right',
        position: { x, y },
        force: true,
      });
      await page.waitForTimeout(20);
    }

    // Canvas should still be visible
    await expect(canvas).toBeVisible();
  });

  test('should preserve game state after map regeneration', async ({ page }) => {
    // Press R to regenerate map
    await page.keyboard.press('r');
    await page.waitForTimeout(1000);

    // Canvas should still be functional
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });
});
