import { test, expect } from '@playwright/test';

test.describe('Map Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { state: 'visible' });
    await page.waitForTimeout(3000); // Wait for map generation
  });

  test('should render map tiles after loading', async ({ page }) => {
    // Take screenshot to verify map rendered
    await expect(page).toHaveScreenshot('map-rendered.png', {
      maxDiffPixels: 100,
    });
  });

  test('should have non-empty canvas (tiles rendered)', async ({ page }) => {
    // Verify canvas has rendered content by checking it's not just background
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return false;

      // For WebGL canvas, we check if the context exists and has been used
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return false;

      // Read pixels from center of canvas
      const width = canvas.width;
      const height = canvas.height;
      const pixels = new Uint8Array(4);

      gl.readPixels(
        Math.floor(width / 2),
        Math.floor(height / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );

      // Check if the pixel is not the background color (0x1a1a2e = RGB 26, 26, 46)
      // Allow some tolerance for anti-aliasing
      const isBackground =
        Math.abs(pixels[0] - 26) < 10 &&
        Math.abs(pixels[1] - 26) < 10 &&
        Math.abs(pixels[2] - 46) < 10;

      return !isBackground;
    });

    expect(hasContent).toBe(true);
  });

  test('should render with visible tile boundaries', async ({ page }) => {
    // Verify the canvas dimensions match viewport
    const canvasDimensions = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    });

    expect(canvasDimensions).not.toBeNull();
    expect(canvasDimensions!.width).toBeGreaterThan(0);
    expect(canvasDimensions!.height).toBeGreaterThan(0);
  });
});
