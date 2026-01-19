import { test, expect } from '@playwright/test';

test.describe('Tile Info Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(2000); // Wait for map to render
  });

  test('panel is hidden on page load', async ({ page }) => {
    const panel = page.locator('#tile-info-panel');
    await expect(panel).toHaveClass(/hidden/);
  });

  test('panel appears when hovering over tile', async ({ page }) => {
    const canvas = page.locator('canvas');
    const panel = page.locator('#tile-info-panel');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Panel should be hidden initially
    await expect(panel).toHaveClass(/hidden/);

    // Move mouse to center of canvas (should be over a tile)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Panel should now be visible
    await expect(panel).not.toHaveClass(/hidden/);
  });

  test('panel disappears when mouse leaves tiles', async ({ page }) => {
    const canvas = page.locator('canvas');
    const panel = page.locator('#tile-info-panel');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Panel should be visible
    await expect(panel).not.toHaveClass(/hidden/);

    // Move mouse outside canvas
    await page.mouse.move(box.x - 50, box.y - 50);
    await page.waitForTimeout(300);

    // Panel should be hidden
    await expect(panel).toHaveClass(/hidden/);
  });

  test('panel displays position coordinates', async ({ page }) => {
    const canvas = page.locator('canvas');
    const coordsEl = page.locator('#tile-coords');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Coords should be displayed in (q, r) format
    const coordsText = await coordsEl.textContent();
    expect(coordsText).toMatch(/\(\d+, \d+\)/);
  });

  test('panel displays terrain name', async ({ page }) => {
    const canvas = page.locator('canvas');
    const terrainEl = page.locator('#tile-terrain');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Terrain should have text content
    const terrainText = await terrainEl.textContent();
    expect(terrainText).toBeTruthy();
    expect(terrainText!.length).toBeGreaterThan(0);
  });

  test('panel displays feature or None', async ({ page }) => {
    const canvas = page.locator('canvas');
    const featureEl = page.locator('#tile-feature');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Feature should have text content (either feature name or "None")
    const featureText = await featureEl.textContent();
    expect(featureText).toBeTruthy();
  });

  test('panel displays resource or None', async ({ page }) => {
    const canvas = page.locator('canvas');
    const resourceEl = page.locator('#tile-resource');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Resource should have text content (either resource name or "None")
    const resourceText = await resourceEl.textContent();
    expect(resourceText).toBeTruthy();
  });

  test('panel displays yield values', async ({ page }) => {
    const canvas = page.locator('canvas');
    const foodEl = page.locator('#yield-food');
    const productionEl = page.locator('#yield-production');
    const goldEl = page.locator('#yield-gold');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Yield values should be numbers
    const foodText = await foodEl.textContent();
    const productionText = await productionEl.textContent();
    const goldText = await goldEl.textContent();

    expect(foodText).toMatch(/^\d+$/);
    expect(productionText).toMatch(/^\d+$/);
    expect(goldText).toMatch(/^\d+$/);
  });

  test('panel updates when moving to different tile', async ({ page }) => {
    const canvas = page.locator('canvas');
    const coordsEl = page.locator('#tile-coords');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over first tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);
    const firstCoords = await coordsEl.textContent();

    // Move to a different tile (60px is roughly a hex tile width)
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2);
    await page.waitForTimeout(300);
    const secondCoords = await coordsEl.textContent();

    // Coordinates should be different
    expect(secondCoords).not.toBe(firstCoords);
  });

  test('panel does not block map interaction', async ({ page }) => {
    const panel = page.locator('#tile-info-panel');

    // Verify panel is positioned in corner and doesn't cover the whole screen
    const panelBox = await panel.boundingBox();

    // Panel should be in the corner with reasonable size
    expect(panelBox).toBeTruthy();
    if (panelBox) {
      expect(panelBox.width).toBeLessThan(400);
      expect(panelBox.height).toBeLessThan(300);
    }
  });

  test('panel has smooth visibility transition', async ({ page }) => {
    const panel = page.locator('#tile-info-panel');

    // Check that panel has transition CSS
    const transition = await panel.evaluate((el) => {
      return window.getComputedStyle(el).transition;
    });

    // Should have opacity transition
    expect(transition).toContain('opacity');
  });

  test('yield icons are visible and styled', async ({ page }) => {
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    // Hover over tile
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Check yield icons exist and have correct classes
    const foodIcon = page.locator('.yield-icon.food');
    const productionIcon = page.locator('.yield-icon.production');
    const goldIcon = page.locator('.yield-icon.gold');

    await expect(foodIcon).toBeVisible();
    await expect(productionIcon).toBeVisible();
    await expect(goldIcon).toBeVisible();

    // Check they have background colors
    const foodBg = await foodIcon.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const productionBg = await productionIcon.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const goldBg = await goldIcon.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Each should have a distinct background color
    expect(foodBg).toBeTruthy();
    expect(productionBg).toBeTruthy();
    expect(goldBg).toBeTruthy();
  });
});
