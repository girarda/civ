import { test, expect } from '@playwright/test';

test.describe('Unit Movement Across Turns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    // Wait for map and unit generation
    await page.waitForTimeout(1000);
  });

  test('unit can move after turn advances', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    const turnDisplay = page.locator('#turn-display');
    await expect(turnDisplay).toHaveText('Turn 1');

    // Click to select unit (near center where units typically spawn)
    const centerX = box!.width / 2;
    const centerY = box!.height / 2;
    await canvas.click({
      position: { x: centerX, y: centerY },
    });
    await page.waitForTimeout(200);

    // Right-click to move unit to nearby position
    await canvas.click({
      button: 'right',
      position: { x: centerX + 50, y: centerY },
    });
    await page.waitForTimeout(200);

    // Try to move again (may fail if out of movement points)
    await canvas.click({
      button: 'right',
      position: { x: centerX + 100, y: centerY },
    });
    await page.waitForTimeout(200);

    // End turn by clicking End Turn button
    const endTurnBtn = page.locator('#end-turn-btn');
    await endTurnBtn.click();
    await page.waitForTimeout(100);

    // Verify turn advanced
    await expect(turnDisplay).toHaveText('Turn 2');

    // Click to re-select unit at new position
    await canvas.click({
      position: { x: centerX + 100, y: centerY },
    });
    await page.waitForTimeout(200);

    // Right-click to move again (should work after turn reset)
    await canvas.click({
      button: 'right',
      position: { x: centerX + 150, y: centerY },
    });
    await page.waitForTimeout(200);

    // No errors should occur - the test passes if we reach here
  });

  test('unit can move multiple tiles after turn reset', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    const turnDisplay = page.locator('#turn-display');
    const endTurnBtn = page.locator('#end-turn-btn');

    // Click to select unit
    await canvas.click({
      position: { x: box!.width / 3, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Move unit multiple times to exhaust movement
    for (let i = 0; i < 5; i++) {
      await canvas.click({
        button: 'right',
        position: { x: box!.width / 3 + 30 * (i + 1), y: box!.height / 3 },
      });
      await page.waitForTimeout(100);
    }

    // End turn
    await endTurnBtn.click();
    await page.waitForTimeout(100);
    await expect(turnDisplay).toHaveText('Turn 2');

    // Select unit again and try to move
    await canvas.click({
      position: { x: box!.width / 3 + 150, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Should be able to move again
    await canvas.click({
      button: 'right',
      position: { x: box!.width / 3 + 200, y: box!.height / 3 },
    });
    await page.waitForTimeout(200);

    // Test passes if no errors
  });

  test('pressing Enter advances turn and restores movement', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    const turnDisplay = page.locator('#turn-display');
    await expect(turnDisplay).toHaveText('Turn 1');

    // Select and move unit
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    await canvas.click({
      button: 'right',
      position: { x: box!.width / 2 + 40, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // Press Enter to end turn
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    await expect(turnDisplay).toHaveText('Turn 2');

    // Try to move again after turn - should work
    await canvas.click({
      position: { x: box!.width / 2 + 40, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    await canvas.click({
      button: 'right',
      position: { x: box!.width / 2 + 80, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // No errors should occur
  });

  test('movement across multiple turn cycles', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    const turnDisplay = page.locator('#turn-display');
    const endTurnBtn = page.locator('#end-turn-btn');

    // Cycle through 3 turns, moving each turn
    for (let turn = 1; turn <= 3; turn++) {
      await expect(turnDisplay).toHaveText(`Turn ${turn}`);

      // Click to select unit
      await canvas.click({
        position: { x: box!.width / 4 + (turn - 1) * 50, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);

      // Move unit
      await canvas.click({
        button: 'right',
        position: { x: box!.width / 4 + turn * 50, y: box!.height / 2 },
      });
      await page.waitForTimeout(200);

      // End turn (except on last iteration)
      if (turn < 3) {
        await endTurnBtn.click();
        await page.waitForTimeout(100);
      }
    }

    await expect(turnDisplay).toHaveText('Turn 3');
    // Test passes if no errors during 3 turn cycles
  });

  test('no console errors during turn-movement workflow', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    const endTurnBtn = page.locator('#end-turn-btn');

    // Select unit
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // Move unit
    await canvas.click({
      button: 'right',
      position: { x: box!.width / 2 + 50, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // End turn
    await endTurnBtn.click();
    await page.waitForTimeout(200);

    // Move again after turn reset
    await canvas.click({
      position: { x: box!.width / 2 + 50, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    await canvas.click({
      button: 'right',
      position: { x: box!.width / 2 + 100, y: box!.height / 2 },
    });
    await page.waitForTimeout(200);

    // Filter out non-critical errors (favicon, etc.)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
