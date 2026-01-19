# Plan: Tiered E2E Test Retention

**Date**: 2026-01-18
**Status**: Implementation Complete

## Overview

Add the ability to toggle between retain-on-failure (faster) and full capture (debugging) modes for Playwright tests in local development.

## Implementation

### Phase 1: Update Playwright Configuration

Modify `playwright.config.ts` to check for `PLAYWRIGHT_FULL_CAPTURE` environment variable:

```typescript
const fullCapture = process.env.PLAYWRIGHT_FULL_CAPTURE === 'true';

export default defineConfig({
  use: {
    video: fullCapture ? 'on' : 'retain-on-failure',
    trace: fullCapture ? 'on' : 'retain-on-failure',
    screenshot: 'on',
  },
});
```

### Phase 2: Add NPM Script

Add to `package.json`:

```json
{
  "test:e2e:full": "PLAYWRIGHT_FULL_CAPTURE=true playwright test"
}
```

## Files to Modify

| File | Change |
|------|--------|
| `playwright.config.ts` | Add environment variable detection |
| `package.json` | Add `test:e2e:full` script |

## Success Criteria

- [x] `npm run test:e2e` uses retain-on-failure (keeps artifacts only for failed tests)
- [x] `npm run test:e2e:full` captures all videos and traces
- [x] HTML reports always generated
