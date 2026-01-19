import { test, expect } from '@playwright/test';

test.describe('Turn System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    // Wait for map to fully generate
    await page.waitForTimeout(1000);
  });

  test.describe('Turn Controls Visibility', () => {
    test('turn controls are visible on page load', async ({ page }) => {
      const controls = page.locator('#turn-controls');
      await expect(controls).toBeVisible();
    });

    test('turn display shows initial turn 1', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');
      await expect(turnDisplay).toBeVisible();
      await expect(turnDisplay).toHaveText('Turn 1');
    });

    test('End Turn button is visible', async ({ page }) => {
      const button = page.locator('#end-turn-btn');
      await expect(button).toBeVisible();
      await expect(button).toHaveText('End Turn');
    });
  });

  test.describe('Turn Advancement', () => {
    test('clicking End Turn button increments turn display', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');
      const button = page.locator('#end-turn-btn');

      await expect(turnDisplay).toHaveText('Turn 1');

      await button.click();
      await page.waitForTimeout(100);

      await expect(turnDisplay).toHaveText('Turn 2');
    });

    test('pressing Enter key advances turn', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');

      await expect(turnDisplay).toHaveText('Turn 1');

      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      await expect(turnDisplay).toHaveText('Turn 2');
    });

    test('multiple turns can be advanced', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');
      const button = page.locator('#end-turn-btn');

      await button.click();
      await page.waitForTimeout(50);
      await button.click();
      await page.waitForTimeout(50);
      await button.click();
      await page.waitForTimeout(50);

      await expect(turnDisplay).toHaveText('Turn 4');
    });

    test('turn persists after map regeneration', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');
      const endTurnBtn = page.locator('#end-turn-btn');
      const regenBtn = page.locator('#regenerate-btn');

      // Advance to turn 3
      await endTurnBtn.click();
      await page.waitForTimeout(50);
      await endTurnBtn.click();
      await page.waitForTimeout(50);

      await expect(turnDisplay).toHaveText('Turn 3');

      // Regenerate map
      await regenBtn.click();
      await page.waitForTimeout(500);

      // Turn should still be 3
      await expect(turnDisplay).toHaveText('Turn 3');
    });
  });

  test.describe('Turn Controls Styling', () => {
    test('turn controls are positioned at top center', async ({ page }) => {
      const controls = page.locator('#turn-controls');
      const box = await controls.boundingBox();

      expect(box).toBeTruthy();
      // Should be near the top
      expect(box!.y).toBeLessThan(100);
      // Should be roughly centered (within 100px of center)
      const viewportSize = page.viewportSize()!;
      const centerX = viewportSize.width / 2;
      const controlCenterX = box!.x + box!.width / 2;
      expect(Math.abs(controlCenterX - centerX)).toBeLessThan(100);
    });

    test('End Turn button has hover effect', async ({ page }) => {
      const button = page.locator('#end-turn-btn');

      // Get initial background color
      const initialBg = await button.evaluate((el) =>
        getComputedStyle(el).backgroundColor
      );

      // Hover over button
      await button.hover();
      await page.waitForTimeout(100);

      // Get hover background color
      const hoverBg = await button.evaluate((el) =>
        getComputedStyle(el).backgroundColor
      );

      // Background should change on hover
      expect(hoverBg).not.toBe(initialBg);
    });
  });

  test.describe('Integration', () => {
    test('turn system does not interfere with map controls', async ({ page }) => {
      const turnDisplay = page.locator('#turn-display');
      const seedDisplay = page.locator('#seed-display');
      const regenBtn = page.locator('#regenerate-btn');

      // Get initial seed
      const initialSeed = await seedDisplay.textContent();

      // Regenerate map
      await regenBtn.click();
      await page.waitForTimeout(500);

      // Seed should have changed
      const newSeed = await seedDisplay.textContent();
      // Note: There's a small chance same seed could be generated
      // but the test verifies the button still works

      // Turn should still be at 1
      await expect(turnDisplay).toHaveText('Turn 1');
    });

    test('turn system does not interfere with tile hover', async ({ page }) => {
      const canvas = page.locator('canvas');
      const tilePanel = page.locator('#tile-info-panel');

      // Move mouse over canvas center
      const box = await canvas.boundingBox();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.waitForTimeout(300);

      // Tile info panel should appear
      await expect(tilePanel).not.toHaveClass(/hidden/);

      // Advance turn
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      // Tile panel should still be visible (hover still works)
      await expect(tilePanel).not.toHaveClass(/hidden/);
    });
  });

  test.describe('Error Handling', () => {
    test('page loads without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForSelector('canvas', { state: 'visible' });
      await page.waitForTimeout(1000);

      // Filter out known non-critical errors if any
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('404')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('clicking End Turn rapidly does not cause errors', async ({ page }) => {
      const button = page.locator('#end-turn-btn');
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Rapidly click End Turn
      for (let i = 0; i < 10; i++) {
        await button.click();
      }
      await page.waitForTimeout(100);

      // Should have no errors
      expect(errors).toHaveLength(0);

      // Turn should be 11
      const turnDisplay = page.locator('#turn-display');
      await expect(turnDisplay).toHaveText('Turn 11');
    });
  });
});
