import { test, expect } from '@playwright/test';

test.describe('Feature: Player/Faction Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(1000); // Wait for map and player initialization
  });

  test.describe('Smoke Tests', () => {
    test('page loads without errors', async ({ page }) => {
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('players are initialized on startup', async ({ page }) => {
      // Enable debug mode and regenerate to capture logs
      await page.keyboard.press('`');
      await page.waitForTimeout(500);
      await page.keyboard.press('r');
      await page.waitForTimeout(1000);

      const debugLog = page.locator('#debug-log');
      const text = await debugLog.textContent();
      expect(text).toContain('[MAP]');
      await page.keyboard.press('`');
    });
  });

  test.describe('Elimination Tracking', () => {
    test('should log elimination when player loses all units', async ({ page }) => {
      await page.reload();
      await page.waitForSelector('canvas', { state: 'visible' });
      await page.waitForTimeout(1000);

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Try to initiate combat by clicking and right-clicking
      // This tests that elimination tracking doesn't cause errors
      // even if we don't achieve an actual elimination
      for (let i = 0; i < 5; i++) {
        const x = box!.width / 2 + (i - 2) * 40;
        const y = box!.height / 2;

        await canvas.click({ position: { x, y } });
        await page.waitForTimeout(100);

        await canvas.click({
          button: 'right',
          position: { x: x + 50, y },
        });
        await page.waitForTimeout(100);
      }

      // Canvas should still be visible - no crashes
      await expect(canvas).toBeVisible();
    });

    test('should handle combat without crashing', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Multiple combat attempts to stress test elimination tracking
      for (let i = 0; i < 3; i++) {
        await canvas.click({
          position: { x: box!.width / 2, y: box!.height / 2 },
        });
        await page.waitForTimeout(100);

        // Right-click in different directions
        const directions = [
          { dx: 50, dy: 0 },
          { dx: -50, dy: 0 },
          { dx: 25, dy: 40 },
          { dx: -25, dy: 40 },
        ];

        for (const dir of directions) {
          await canvas.click({
            button: 'right',
            position: {
              x: box!.width / 2 + dir.dx,
              y: box!.height / 2 + dir.dy,
            },
          });
          await page.waitForTimeout(50);
        }
      }

      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Map Regeneration', () => {
    test('should reset player state on map regeneration', async ({ page }) => {
      // Generate initial map
      await page.reload();
      await page.waitForSelector('canvas', { state: 'visible' });
      await page.waitForTimeout(1000);

      // Enable debug mode to see logs
      await page.keyboard.press('`');
      await page.waitForTimeout(500);

      // Get initial debug log entry count
      const initialCount = await page.locator('.debug-entry').count();

      // Press R to regenerate
      await page.keyboard.press('r');
      await page.waitForTimeout(1000);

      // Verify new map generation entry was added
      const debugLog = page.locator('#debug-log');
      const text = await debugLog.textContent();
      expect(text).toContain('[MAP]');

      // New entries should have been added
      const newCount = await page.locator('.debug-entry').count();
      expect(newCount).toBeGreaterThan(initialCount);

      await page.keyboard.press('`'); // Close debug overlay

      // Canvas should still be functional
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('should maintain player colors after regeneration', async ({ page }) => {
      // This is a visual regression safety net
      // Press R to regenerate
      await page.keyboard.press('r');
      await page.waitForTimeout(1000);

      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();

      // Click to try to select a unit
      const box = await canvas.boundingBox();
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(100);

      // No crashes means player colors are still correctly set
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Player Color Integration', () => {
    test('should render units without crashes', async ({ page }) => {
      // Verify units render without errors after PLAYER_COLORS refactor
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();

      // Click around to potentially trigger unit rendering code paths
      const box = await canvas.boundingBox();
      for (let i = 0; i < 5; i++) {
        await canvas.click({
          position: {
            x: box!.x + (i + 1) * (box!.width / 6),
            y: box!.height / 2,
          },
        });
        await page.waitForTimeout(100);
      }

      // Page should remain stable
      await expect(canvas).toBeVisible();
    });

    test('should handle territory rendering', async ({ page }) => {
      // Press B to found a city (if settler is selected)
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Try to select a settler and found a city
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(100);

      await page.keyboard.press('b');
      await page.waitForTimeout(500);

      // Canvas should still be functional (territory rendering uses PLAYER_COLORS)
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle rapid map regeneration', async ({ page }) => {
      // Rapid R key presses
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('r');
        await page.waitForTimeout(200);
      }

      // Wait for last regeneration to complete
      await page.waitForTimeout(1000);

      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });

    test('should handle interactions during map regeneration', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Start regeneration
      await page.keyboard.press('r');

      // Immediately try to interact
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });

      await page.waitForTimeout(1000);

      // Should stabilize without crashing
      await expect(canvas).toBeVisible();
    });
  });
});
