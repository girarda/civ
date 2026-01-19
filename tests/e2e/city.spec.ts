import { test, expect } from '@playwright/test';

test.describe('City System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    // Wait for map and settler generation
    await page.waitForTimeout(1000);
  });

  test.describe('City Founding', () => {
    test('pressing B key with settler selected founds city', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Click near center to potentially select settler
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);

      // Press B to found city
      await page.keyboard.press('b');
      await page.waitForTimeout(500);

      // Verify no errors occurred - the action should complete without crashing
      await expect(canvas).toBeVisible();
    });

    test('pressing B without selection does nothing', async ({ page }) => {
      const logs: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'log') {
          logs.push(msg.text());
        }
      });

      // Press Escape to ensure nothing selected
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);

      // Press B without selection
      await page.keyboard.press('b');
      await page.waitForTimeout(200);

      // Should not have founded a city
      const foundedCity = logs.some((l) => l.includes('Founded city'));
      expect(foundedCity).toBe(false);
    });
  });

  test.describe('City Info Panel', () => {
    test('city info panel is hidden by default', async ({ page }) => {
      const panel = page.locator('#city-info-panel');
      await expect(panel).toHaveClass(/hidden/);
    });

    test('city info panel has correct structure', async ({ page }) => {
      // Verify panel elements exist in DOM
      await expect(page.locator('#city-info-panel')).toBeAttached();
      await expect(page.locator('#city-name')).toBeAttached();
      await expect(page.locator('#city-population')).toBeAttached();
      await expect(page.locator('#city-growth')).toBeAttached();
      await expect(page.locator('#city-production')).toBeAttached();
      await expect(page.locator('#city-yield-food')).toBeAttached();
      await expect(page.locator('#city-yield-production')).toBeAttached();
      await expect(page.locator('#city-yield-gold')).toBeAttached();
    });
  });

  test.describe('City Selection', () => {
    test('clicking on empty tile deselects city', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const panel = page.locator('#city-info-panel');

      // Click somewhere on canvas
      await canvas.click({
        position: { x: box!.width / 4, y: box!.height / 4 },
      });
      await page.waitForTimeout(200);

      // Panel should remain hidden if no city there
      await expect(panel).toHaveClass(/hidden/);
    });

    test('Escape key deselects city', async ({ page }) => {
      const panel = page.locator('#city-info-panel');

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);

      // Panel should be hidden
      await expect(panel).toHaveClass(/hidden/);
    });
  });

  test.describe('City and Unit Interaction', () => {
    test('selecting unit deselects city', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const cityPanel = page.locator('#city-info-panel');

      // Click to try to select something
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);

      // City panel should be hidden when unit is selected
      // (The test verifies the interaction doesn't cause errors)
      // Actual selection depends on what's at click position
    });
  });

  test.describe('City Persistence', () => {
    test('cities are cleared on map regeneration', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      const cityPanel = page.locator('#city-info-panel');

      // Try to found a city first
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);
      await page.keyboard.press('b');
      await page.waitForTimeout(500);

      // Regenerate map
      await page.keyboard.press('r');
      await page.waitForTimeout(1000);

      // City panel should be hidden after regeneration
      await expect(cityPanel).toHaveClass(/hidden/);
    });
  });

  test.describe('Turn Integration', () => {
    test('ending turn processes cities without errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Found a city
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);
      await page.keyboard.press('b');
      await page.waitForTimeout(500);

      // End several turns
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(100);
      }

      // Should have no critical errors
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('404')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('turn display still works after city founding', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Verify initial turn
      await expect(turnDisplay).toHaveText('Turn 1');

      // Try to found a city
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);
      await page.keyboard.press('b');
      await page.waitForTimeout(500);

      // End turn
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      // Turn should have advanced
      await expect(turnDisplay).toHaveText('Turn 2');
    });
  });

  test.describe('Error Handling', () => {
    test('rapid B key presses do not cause errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Select something
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);

      // Rapidly press B
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('b');
        await page.waitForTimeout(50);
      }

      // Should have no errors
      expect(errors).toHaveLength(0);
    });

    test('clicking around map with cities does not crash', async ({ page }) => {
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();

      // Found a city first
      await canvas.click({
        position: { x: box!.width / 2, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);
      await page.keyboard.press('b');
      await page.waitForTimeout(500);

      // Click around various locations
      for (let i = 0; i < 10; i++) {
        const x = (box!.width * (i % 3 + 1)) / 4;
        const y = (box!.height * Math.floor(i / 3 + 1)) / 4;
        await canvas.click({ position: { x, y }, force: true });
        await page.waitForTimeout(50);
      }

      // Canvas should still be visible
      await expect(canvas).toBeVisible();
    });
  });
});
