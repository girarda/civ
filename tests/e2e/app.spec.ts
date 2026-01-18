import { test, expect } from '@playwright/test';

test.describe('Application Startup', () => {
  test('should load the game canvas', async ({ page }) => {
    await page.goto('/');

    // Wait for canvas to be present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify canvas has dimensions
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('OpenCiv');
  });

  test('should render without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000); // Wait for map generation

    // Filter out known acceptable errors (e.g., WebGL warnings)
    const criticalErrors = errors.filter(
      (e) => !e.includes('deprecated') && !e.includes('third-party')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should initialize WebGL context', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });

    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return !!gl;
    });

    expect(hasWebGL).toBe(true);
  });
});
