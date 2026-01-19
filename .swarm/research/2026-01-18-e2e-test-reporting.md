# Research: E2E Test Reporting for Human Consumption

**Date**: 2026-01-18
**Status**: Complete

## Summary

The OpenCiv project has a working Playwright e2e test setup with 4 test files covering application startup, map rendering, camera controls, and tile hover detection. The current configuration uses HTML reports and only captures screenshots/traces on failure or retry. To improve human-readable reporting showing features work as expected, Playwright offers built-in capabilities for always-on screenshots, video recording, and trace viewing that require minimal configuration changes.

## Key Discoveries

- **Current setup is functional but minimal**: HTML reporter enabled, screenshots only on failure, traces only on first retry
- **4 test files cover core features**: app.spec.ts (4 tests), map.spec.ts (3 tests), camera.spec.ts (6 tests), hover.spec.ts (8 tests)
- **Tests already use screenshots internally**: Many tests capture screenshots for comparison but don't persist them for humans
- **Playwright supports video recording natively**: `video: 'on'` in config records each test as a webm file
- **HTML reporter aggregates all artifacts**: Screenshots, videos, and traces appear in the same report
- **Visual snapshot test exists**: `map.spec.ts` uses `toHaveScreenshot()` which creates baseline images

## Architecture Overview

### Current Test Structure

```
tests/e2e/
  app.spec.ts          # Application startup tests
  map.spec.ts          # Map rendering verification
  camera.spec.ts       # Camera pan/zoom controls
  hover.spec.ts        # Tile hover detection
  map.spec.ts-snapshots/  # Visual regression baseline images
```

### Current Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',      // Only on retry
    screenshot: 'only-on-failure', // Only on failure
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Features Being Tested

| Test File | Feature | Test Count | Current Evidence |
|-----------|---------|------------|------------------|
| app.spec.ts | Canvas loads, title correct, no errors, WebGL init | 4 | Pass/fail only |
| map.spec.ts | Map renders, tiles visible, canvas dimensions | 3 | Visual snapshot |
| camera.spec.ts | WASD pan, arrow keys, mouse zoom, continuous pan | 6 | Screenshot comparison (internal) |
| hover.spec.ts | Highlight on hover, follows cursor, zoom levels | 8 | Screenshot comparison (internal) |

## Patterns Found

### 1. Screenshot Comparison Pattern (Currently Used)

Tests capture screenshots internally to verify visual changes but don't persist them:

```typescript
// camera.spec.ts pattern
const initialScreenshot = await page.screenshot();
await page.keyboard.down('KeyD');
await page.waitForTimeout(300);
const afterPanScreenshot = await page.screenshot();
expect(Buffer.compare(initialScreenshot, afterPanScreenshot)).not.toBe(0);
```

This proves the feature works but produces no human-visible evidence.

### 2. Visual Snapshot Pattern (One Test Uses)

```typescript
// map.spec.ts
await expect(page).toHaveScreenshot('map-rendered.png', {
  maxDiffPixels: 100,
});
```

Creates baseline images in `tests/e2e/map.spec.ts-snapshots/` that can be reviewed.

### 3. Test Artifacts Configuration

Playwright supports three capture modes:
- `'off'` - Never capture
- `'on'` - Always capture
- `'only-on-failure'` - Capture only when test fails
- `'retain-on-failure'` - Keep only if test fails (for video/trace)
- `'on-first-retry'` - Capture on retry (for trace)

## Playwright Reporting Capabilities

### Screenshot Options

```typescript
use: {
  screenshot: 'on',  // Capture screenshot after each test
  // or
  screenshot: {
    mode: 'on',
    fullPage: true,  // Capture entire scrollable area
  },
}
```

**In-test manual screenshots:**
```typescript
await page.screenshot({ path: 'screenshots/feature-name.png' });
// These are attached to the HTML report automatically
```

### Video Recording Options

```typescript
use: {
  video: 'on',  // Record video of every test
  // or
  video: {
    mode: 'on',
    size: { width: 1280, height: 720 },
  },
}
```

Videos are saved as `.webm` files in `test-results/` and linked from HTML report.

**Mode options:**
- `'off'` - No recording
- `'on'` - Record all tests
- `'retain-on-failure'` - Record but keep only failing tests
- `'on-first-retry'` - Record on retry only

### Trace Viewer Options

```typescript
use: {
  trace: 'on',  // Record trace for every test
}
```

Traces include:
- DOM snapshots at each action
- Network requests
- Console logs
- Source code locations
- Timeline of actions

**View traces:**
```bash
npx playwright show-trace test-results/path-to-trace.zip
```

### HTML Reporter Options

```typescript
reporter: [
  ['html', {
    open: 'never',      // Don't auto-open (for CI)
    outputFolder: 'playwright-report',
  }],
  ['list'],  // Also output to console
],
```

**Multi-reporter setup for different audiences:**
```typescript
reporter: [
  ['html', { outputFolder: 'reports/html' }],  // Human-readable
  ['json', { outputFile: 'reports/results.json' }],  // CI/parsing
  ['junit', { outputFile: 'reports/junit.xml' }],  // CI systems
],
```

### Additional Attachment API

Tests can attach arbitrary files to the report:

```typescript
import { test } from '@playwright/test';

test('feature demo', async ({ page }, testInfo) => {
  // Attach screenshot with label
  await testInfo.attach('initial-state', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // ... perform actions ...

  await testInfo.attach('after-action', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/playwright.config.ts` | Playwright configuration - modify for enhanced reporting |
| `/Users/alex/workspace/civ/tests/e2e/app.spec.ts` | Application startup tests (4 tests) |
| `/Users/alex/workspace/civ/tests/e2e/map.spec.ts` | Map rendering tests with visual snapshot (3 tests) |
| `/Users/alex/workspace/civ/tests/e2e/camera.spec.ts` | Camera control tests (6 tests) |
| `/Users/alex/workspace/civ/tests/e2e/hover.spec.ts` | Tile hover tests (8 tests) |
| `/Users/alex/workspace/civ/package.json` | npm scripts - `test:e2e` runs Playwright |
| `/Users/alex/workspace/civ/.gitignore` | Already ignores `playwright-report/` and `test-results/` |

## Recommendations

### 1. Enable Always-On Video Recording (High Impact)

Update `playwright.config.ts`:

```typescript
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on',         // Always capture traces
  screenshot: 'on',    // Always capture end screenshot
  video: 'on',         // Always record video
},
```

This single change provides:
- Video proof of every feature test
- DOM snapshots via trace viewer
- Final screenshot for quick review

### 2. Add Feature Showcase Screenshots (Medium Impact)

Modify tests to capture labeled screenshots at key moments:

```typescript
// Example for camera.spec.ts
test('should pan camera with WASD keys', async ({ page }, testInfo) => {
  await testInfo.attach('1-initial-position', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyD');

  await testInfo.attach('2-after-pan-right', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // Existing comparison logic...
});
```

### 3. Add npm Script for Report Viewing

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:report": "playwright show-report",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### 4. Configure Report Output Location (Optional)

Keep reports organized and easy to find:

```typescript
reporter: [
  ['html', {
    outputFolder: 'reports/e2e-html',
    open: 'on-failure',  // Auto-open browser if tests fail
  }],
  ['list'],  // Console output during run
],
```

### 5. Consider Trace Mode Tradeoffs

| Mode | Disk Usage | Best For |
|------|------------|----------|
| `'off'` | None | Fast local runs |
| `'on'` | ~5-20MB per test | Feature documentation |
| `'retain-on-failure'` | Variable | CI with limited storage |
| `'on-first-retry'` | Low | Debugging flaky tests |

For human-readable feature documentation, `'on'` is recommended despite storage costs.

### 6. Visual Regression Expansion

Extend the visual snapshot pattern from `map.spec.ts` to other tests:

```typescript
// Example additions
test('camera zoomed in state', async ({ page }) => {
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);
  await expect(page).toHaveScreenshot('camera-zoomed-in.png', {
    maxDiffPixels: 100,
  });
});
```

## Implementation Steps

### Phase 1: Enable Always-On Artifacts (5 minutes)

1. Edit `/Users/alex/workspace/civ/playwright.config.ts`:
   ```typescript
   use: {
     baseURL: 'http://localhost:3000',
     trace: 'on',
     screenshot: 'on',
     video: 'on',
   },
   ```

2. Run tests: `npm run test:e2e`

3. View report: `npx playwright show-report`

### Phase 2: Add Labeled Screenshots to Tests (30 minutes)

1. Import `testInfo` in each test that should document a feature
2. Add `await testInfo.attach()` calls at key visual moments
3. Run tests and verify attachments appear in HTML report

### Phase 3: Add Convenience Scripts (5 minutes)

1. Add report viewing scripts to `package.json`
2. Document usage in README or CONTRIBUTING.md

### Phase 4: Visual Regression Baselines (15 minutes)

1. Add `toHaveScreenshot()` assertions to key tests
2. Run once to generate baseline images
3. Commit baseline images to repository

## Disk Space Considerations

With video recording enabled for all 21 tests:
- Estimated video size: ~2-5MB per test (short tests)
- Total per run: ~40-100MB
- Trace files: ~5-20MB per test

`.gitignore` already excludes these artifacts, so they won't bloat the repository.

For CI, consider:
```typescript
video: process.env.CI ? 'retain-on-failure' : 'on',
trace: process.env.CI ? 'on-first-retry' : 'on',
```

## Open Questions

1. **Report hosting**: Should HTML reports be published somewhere (GitHub Pages, S3) for stakeholder review?

2. **Baseline image management**: How to handle visual regression baselines across different platforms (darwin vs linux)?

3. **Test duration**: With video/trace enabled, how much slower are test runs? Worth measuring before committing.

4. **Artifact retention in CI**: If using GitHub Actions, how long to keep artifacts? Default is 90 days.

5. **Feature showcase organization**: Should there be a dedicated "showcase" test file that explicitly documents features for humans, separate from functional tests?
