# Research: E2E Test Reporting Runtime Cost Analysis

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research analyzes the runtime and storage costs of implementing enhanced e2e test reporting as proposed in the existing research document (`.swarm/research/2026-01-18-e2e-test-reporting.md`). The project currently has 12 e2e test files with approximately 70+ test cases. Enabling always-on video recording, traces, and screenshots will add approximately 15-30% overhead to test execution time, while storage requirements will grow from near-zero to 100-500MB per test run depending on configuration choices.

## Key Discoveries

- **Current test count**: 12 spec files with ~70+ individual tests
- **Estimated baseline execution time**: 2-4 minutes for single browser (Chromium only)
- **Video recording overhead**: 10-20% increase in execution time, 2-5MB per test
- **Trace recording overhead**: 5-15% increase in execution time, 5-20MB per test
- **Screenshot overhead**: Negligible (<1% execution time), 50-200KB per screenshot
- **Allure reporting**: Not currently in use; would add 5-10% overhead plus Java dependency
- **GitHub Actions storage**: Free tier includes 500MB artifacts, 90-day retention
- **HTML report generation**: Near-instantaneous (<1 second), 1-5MB output

## Current Test Suite Analysis

### Test File Inventory

| File | Test Count | Estimated Duration | Heavy Operations |
|------|------------|-------------------|------------------|
| `/Users/alex/workspace/civ/tests/e2e/app.spec.ts` | 4 | ~6-10s | WebGL init, 3s wait |
| `/Users/alex/workspace/civ/tests/e2e/map.spec.ts` | 3 | ~10-15s | 3s wait, visual snapshot |
| `/Users/alex/workspace/civ/tests/e2e/camera.spec.ts` | 6 | ~10-15s | Multiple screenshot captures |
| `/Users/alex/workspace/civ/tests/e2e/hover.spec.ts` | 8 | ~15-20s | 2s wait, screenshot comparisons |
| `/Users/alex/workspace/civ/tests/e2e/resource.spec.ts` | 3 | ~10-15s | 3s wait per test |
| `/Users/alex/workspace/civ/tests/e2e/map-controls.spec.ts` | 11 | ~10-15s | 1s wait, UI interactions |
| `/Users/alex/workspace/civ/tests/e2e/unit.spec.ts` | 7 | ~8-12s | 1s wait, click handling |
| `/Users/alex/workspace/civ/tests/e2e/turn-system.spec.ts` | 13 | ~12-18s | 1s wait, rapid clicks |
| `/Users/alex/workspace/civ/tests/e2e/unit-movement-turns.spec.ts` | 6 | ~10-15s | Multiple movements |
| `/Users/alex/workspace/civ/tests/e2e/city.spec.ts` | 13 | ~15-20s | City founding, turn cycles |
| `/Users/alex/workspace/civ/tests/e2e/tile-info-panel.spec.ts` | 12 | ~15-20s | 2s wait, hover testing |
| `/Users/alex/workspace/civ/tests/e2e/combat.spec.ts` | 6 | ~10-15s | Unit interactions |

**Total**: ~92 tests across 12 files

### Current Configuration Analysis

```typescript
// playwright.config.ts - Current state
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,          // Parallel execution (helps speed)
  forbidOnly: !!process.env.CI, // CI safety
  retries: process.env.CI ? 2 : 0, // 2 retries in CI
  workers: process.env.CI ? 1 : undefined, // Single worker in CI (slower)
  reporter: 'html',             // HTML reporter enabled
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',    // Minimal trace capture
    screenshot: 'only-on-failure', // Minimal screenshot capture
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

### Baseline Execution Time Estimate

**Local development** (parallel execution):
- Dev server startup: ~2-5 seconds
- Test execution: ~30-60 seconds (parallel)
- Total: ~35-65 seconds

**CI environment** (single worker):
- Dev server startup: ~5-10 seconds
- Test execution: ~2-4 minutes (sequential)
- Total: ~2.5-4.5 minutes

## Runtime Cost Analysis

### 1. Video Recording

**Overhead mechanism**: Playwright uses ffmpeg to encode screen frames during test execution.

| Mode | Execution Overhead | Storage Per Test | Total for 92 Tests |
|------|-------------------|------------------|-------------------|
| `'off'` | 0% | 0 | 0 |
| `'on'` | 10-20% | 2-5MB | 180-460MB |
| `'retain-on-failure'` | 10-20% during run, deletes passing | Variable | Variable |
| `'on-first-retry'` | Only on retry | Only retried tests | Minimal |

**Storage note**: Videos are WebM format, ~1-3 seconds per short test. Longer tests (like those with 3-second waits) produce larger files.

**Estimated additional time in CI**: 30-60 seconds (for video encoding overhead)

### 2. Trace Recording

**Overhead mechanism**: Playwright captures DOM snapshots, network requests, console logs at each action.

| Mode | Execution Overhead | Storage Per Test | Total for 92 Tests |
|------|-------------------|------------------|-------------------|
| `'off'` | 0% | 0 | 0 |
| `'on'` | 5-15% | 5-20MB | 460MB-1.8GB |
| `'retain-on-failure'` | 5-15% during run, deletes passing | Variable | Variable |
| `'on-first-retry'` | Only on retry | Only retried tests | Minimal |

**Storage concern**: Traces are zip files containing multiple snapshots. Tests with many actions (like rapid click tests in `map-controls.spec.ts` and `unit.spec.ts`) create larger traces.

**Estimated additional time in CI**: 20-45 seconds (for trace capture overhead)

### 3. Screenshot Capture

**Overhead mechanism**: Captures PNG of page state.

| Mode | Execution Overhead | Storage Per Screenshot | Notes |
|------|-------------------|----------------------|-------|
| `'off'` | 0% | 0 | - |
| `'on'` | <1% per test | 50-200KB | One screenshot at end of each test |
| `'only-on-failure'` | <1% (only on fail) | 50-200KB per failure | Current setting |

**Total for 92 tests with `'on'`**: ~5-20MB
**Execution impact**: Negligible (<5 seconds total)

### 4. HTML Report Generation

**Overhead mechanism**: Post-test aggregation of results into HTML bundle.

| Aspect | Cost |
|--------|------|
| Generation time | <1 second |
| Base report size | 500KB-2MB |
| With attachments | Depends on artifacts (videos, traces, screenshots) |

**Note**: HTML generation happens after tests complete, not during execution.

### 5. Allure Reporting (Not Currently Used)

**Overview**: Allure is a separate test reporting framework that provides rich visualizations.

**Implementation requirements**:
- `allure-playwright` npm package (~50KB)
- Allure CLI for report generation (Java-based)
- Java Runtime Environment (JRE) on CI

**Overhead estimate**:

| Aspect | Cost |
|--------|------|
| Test execution overhead | 5-10% (writing Allure metadata) |
| Report generation time | 2-5 seconds |
| Storage per test | ~10-50KB metadata |
| Total for 92 tests | ~1-5MB metadata |

**CI considerations**:
- Requires Java installation step (adds 30-60 seconds to CI)
- Allure report generation (2-5 seconds)
- Upload to Allure server or GitHub Pages (variable)

### 6. GitHub Actions Artifact Upload/Download

**Upload costs**:

| Artifact Size | Estimated Upload Time | Notes |
|---------------|----------------------|-------|
| 10MB | 2-5 seconds | Small HTML report |
| 100MB | 15-30 seconds | HTML + screenshots |
| 500MB | 60-120 seconds | Full videos + traces |

**Storage limits**:
- GitHub Free: 500MB per artifact
- GitHub Pro/Team: 2GB per artifact
- Retention: Default 90 days (configurable 1-90 days)

**Download costs**: Similar to upload, primarily affects subsequent workflow jobs.

## Combined Overhead Scenarios

### Scenario A: Minimal Enhancement (Recommended for CI)

```typescript
use: {
  trace: 'on-first-retry',     // Current
  screenshot: 'on',            // Change: capture all
  video: 'retain-on-failure',  // Change: record but keep only failures
}
```

| Metric | Current | With Changes | Delta |
|--------|---------|--------------|-------|
| CI execution time | ~3 min | ~3.5 min | +30 sec |
| Storage per passing run | ~2MB | ~10-15MB | +10MB |
| Storage per failing run | ~2MB | ~50-100MB | +50-100MB |

### Scenario B: Full Documentation Mode (Development)

```typescript
use: {
  trace: 'on',
  screenshot: 'on',
  video: 'on',
}
```

| Metric | Current | With Changes | Delta |
|--------|---------|--------------|-------|
| CI execution time | ~3 min | ~4-5 min | +1-2 min |
| Storage per run | ~2MB | ~300-600MB | +300-600MB |
| Report viewing time | Instant | 2-3 sec load | +2-3 sec |

### Scenario C: With Allure Integration

```typescript
// Additional reporter
reporter: [
  ['html'],
  ['allure-playwright'],
]
```

| Metric | Scenario B | With Allure | Delta |
|--------|------------|-------------|-------|
| CI execution time | ~4-5 min | ~5-6 min | +30-60 sec |
| Storage per run | ~300-600MB | ~350-650MB | +50MB |
| CI setup time | ~30 sec | ~90 sec | +60 sec (Java) |

## Storage Cost Analysis

### GitHub Actions Artifact Retention

| Retention Period | Storage for 10 Runs (Scenario B) | Monthly Cost* |
|------------------|----------------------------------|---------------|
| 90 days (default) | 3-6GB | Free (under 500MB free tier) |
| 30 days | 3-6GB | Free |
| 7 days | 3-6GB | Free |

*GitHub Free tier includes 500MB storage per artifact, with 2GB total for the repository. Exceeding this may require paid plans.

### Report Hosting Alternatives

| Option | Setup Complexity | Storage Cost | Access Speed |
|--------|-----------------|--------------|--------------|
| GitHub Actions artifacts | None | Free (with limits) | 1-5 sec download |
| GitHub Pages | Low (deploy step) | Free | Instant |
| S3 static hosting | Medium | ~$0.023/GB/month | Instant |
| Allure TestOps | Medium | $$ (commercial) | Instant |

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/playwright.config.ts` | Main configuration - modify for reporting changes |
| `/Users/alex/workspace/civ/package.json` | Dependencies and scripts |
| `/Users/alex/workspace/civ/.gitignore` | Excludes `playwright-report/` and `test-results/` |
| `/Users/alex/workspace/civ/tests/e2e/*.spec.ts` | 12 test files with ~92 tests |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-e2e-test-reporting.md` | Original research on reporting options |

## Recommendations

### 1. Tiered Configuration (High Priority)

Implement different settings for local vs CI:

```typescript
// playwright.config.ts
const isCI = !!process.env.CI;

export default defineConfig({
  // ... existing config
  use: {
    trace: isCI ? 'retain-on-failure' : 'on',
    screenshot: 'on',
    video: isCI ? 'retain-on-failure' : 'on',
  },
});
```

**Impact**: Keeps CI fast while providing full documentation locally.

### 2. Skip Allure for Now (Medium Priority)

Allure adds complexity (Java dependency) without significant benefit for a small test suite. The built-in HTML reporter is sufficient.

**Revisit when**: Test suite exceeds 200 tests or multiple team members need to review reports.

### 3. Artifact Retention Strategy (Medium Priority)

Configure GitHub Actions to:
- Upload HTML report + screenshots: Always
- Upload videos: Only on failure
- Retention period: 7-14 days (reduce storage)

```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 14
```

### 4. Parallel Execution in CI (Low Priority)

Current config uses `workers: 1` in CI. Consider increasing to 2-4 workers if CI environment supports it:

```typescript
workers: process.env.CI ? 2 : undefined,
```

**Impact**: Could reduce execution time by 30-50%, but may increase flakiness.

### 5. Consider Sharding for Growth (Future)

When test suite grows beyond 150 tests, consider Playwright sharding:

```yaml
jobs:
  test:
    strategy:
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]
    steps:
      - run: npx playwright test --shard=${{ matrix.shard }}
```

## Performance Optimization Opportunities

1. **Reduce `waitForTimeout` calls**: Many tests use 2-3 second waits. Consider using proper assertions (`waitForSelector`, `toBeVisible`) instead.

2. **Share browser context**: Tests currently reload for each spec. Using `test.describe.configure({ mode: 'serial' })` could reuse browser state.

3. **Conditional video**: Only record video for visual-heavy tests (camera, hover, map tests):

```typescript
test.describe('Camera Controls', () => {
  test.use({ video: 'on' });
  // ... tests
});
```

4. **Compress artifacts**: Add compression step before upload:

```yaml
- run: tar -czf reports.tar.gz playwright-report test-results
- uses: actions/upload-artifact@v4
  with:
    name: test-artifacts
    path: reports.tar.gz
```

## Open Questions

1. **CI environment**: What GitHub Actions runner is being used (ubuntu-latest, macos-latest)? This affects baseline performance.

2. **Flakiness tolerance**: Are the current 2 retries sufficient, or should video be captured on all runs to debug failures?

3. **Report audience**: Are reports primarily for developers (who can run locally) or stakeholders (who need hosted reports)?

4. **Budget constraints**: Is there budget for Allure TestOps or similar commercial solutions if the team grows?

5. **Multi-browser testing**: Should reports cover Firefox/WebKit as well? This would multiply all costs by 2-3x.
