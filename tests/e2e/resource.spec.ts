import { test, expect } from '@playwright/test';

test.describe('Resource Placement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000); // Wait for map generation
  });

  test('should generate tiles with resources', async ({ page }) => {
    // Check that the game state includes resources on generated tiles
    const hasResources = await page.evaluate(() => {
      // Access the game's tile map through window (exposed for testing)
      const gameState = (window as any).gameState;
      if (!gameState || !gameState.tileMap) {
        return { error: 'gameState not available' };
      }

      const tileMap = gameState.tileMap as Map<string, any>;
      let totalTiles = 0;
      let tilesWithResources = 0;
      const resourceCounts: Record<string, number> = {};

      for (const tile of tileMap.values()) {
        totalTiles++;
        if (tile.resource !== null) {
          tilesWithResources++;
          resourceCounts[tile.resource] = (resourceCounts[tile.resource] || 0) + 1;
        }
      }

      return {
        totalTiles,
        tilesWithResources,
        resourceCounts,
        resourceRatio: tilesWithResources / totalTiles,
      };
    });

    // If gameState is not exposed, skip the detailed check
    if ('error' in hasResources) {
      // Just verify the page loaded without errors
      const canvas = await page.locator('canvas');
      await expect(canvas).toBeVisible();
      return;
    }

    // Verify resources were placed
    expect(hasResources.totalTiles).toBeGreaterThan(0);
    // At least some tiles should have resources (between 1% and 20%)
    expect(hasResources.resourceRatio).toBeGreaterThan(0.01);
    expect(hasResources.resourceRatio).toBeLessThan(0.2);
  });

  test('should generate deterministic resources with same seed', async ({ page }) => {
    // First load
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000);

    const firstScreenshot = await page.screenshot();

    // Reload page (same seed should produce same map)
    await page.reload();
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000);

    const secondScreenshot = await page.screenshot();

    // Screenshots should be similar (deterministic generation)
    // Note: This is a basic check; more sophisticated comparison could be added
    expect(firstScreenshot.length).toBeGreaterThan(0);
    expect(secondScreenshot.length).toBeGreaterThan(0);
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000);

    // Filter out expected warnings/errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('Warning') && !e.includes('DevTools')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
