# Research: Solo Git Worktree Workflow Improvements

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research analyzes the current `/implement-worktree` skill and identifies gaps between the existing workflow and the desired improvements for per-worktree isolation, smart dependency management, test profiles, validation reports, and concurrent worktree support. The project uses Vite (port 3000) with Playwright e2e tests pointing to the same port, creating potential conflicts when running multiple worktrees concurrently.

## Key Discoveries

- **Current workflow lacks port isolation**: Vite hardcodes port 3000 in `vite.config.ts`, and Playwright hardcodes `localhost:3000` in `playwright.config.ts`
- **No `.env.local` generation**: No environment file system exists; configuration is purely in TypeScript config files
- **No smart npm install**: Dependencies are installed unconditionally in every worktree
- **No test profiles**: Single test command with no fast/full distinction
- **No validation report generation**: Checkpoints exist but no formal merge-gate validation reports
- **No manual test cards**: Human review documents exist but lack structured manual test checklists
- **No concurrent worktree support**: Skill documentation does not address port conflicts or multi-worktree scenarios

## Architecture Overview

### Current Project Structure
```
/Users/alex/workspace/civ/
  .claude/
    skills/
      implement-worktree/SKILL.md  # Main skill definition (1762 lines)
    hooks/                          # Session logging hooks
    settings.local.json             # Permissions config
  .swarm/
    plans/                          # Feature plans
    research/                       # Research docs
    reviews/                        # Human review docs
    validations/                    # Validation reports
    checkpoints/                    # Phase checkpoints
  vite.config.ts                    # Dev server config (port: 3000)
  playwright.config.ts              # E2E test config (baseURL: localhost:3000)
  vitest.config.ts                  # Unit test config
  package.json                      # npm scripts
```

### Current Worktree Creation Flow
1. Parse plan file and derive names
2. Create worktree with `git worktree add -b <branch> <dir> <base>`
3. Run `npm install` unconditionally
4. Implement feature phases
5. Generate e2e tests
6. Run validation (unit, e2e, lint, build)
7. Code review and documentation
8. PR or manual completion

## Patterns Found

### Port Configuration (Current)

**vite.config.ts** (line 11):
```typescript
server: {
  port: 3000,
}
```

**playwright.config.ts** (lines 10, 22-24):
```typescript
use: {
  baseURL: 'http://localhost:3000',
},
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
```

### Dependency Installation (Current)

**SKILL.md** (lines 132-149):
```bash
cd "$worktree_dir"
npm install
# Always runs, no lockfile checking
```

### Test Execution (Current)

**package.json**:
```json
"scripts": {
  "test": "vitest run",
  "test:e2e": "playwright test"
}
```

No fast/full profiles, no tags, no selective test running.

### Validation Flow (Current)

**SKILL.md** (lines 478-533):
```
1. npm run test (unit tests)
2. npm run test:e2e (e2e tests)
3. npm run lint
4. npm run build
```

No formal merge-gate report generation - only checkpoint files.

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Main skill definition (1762 lines) |
| `/Users/alex/workspace/civ/vite.config.ts` | Vite dev server configuration |
| `/Users/alex/workspace/civ/playwright.config.ts` | Playwright e2e test configuration |
| `/Users/alex/workspace/civ/vitest.config.ts` | Vitest unit test configuration |
| `/Users/alex/workspace/civ/package.json` | npm scripts and dependencies |
| `/Users/alex/workspace/civ/.gitignore` | Git ignore (includes `.env.local` pattern implicitly) |

## Gap Analysis

| Desired Feature | Current State | Gap |
|-----------------|---------------|-----|
| Deterministic port from branch name | Hardcoded port 3000 | Need port derivation logic |
| Per-worktree `.env.local` generation | No env files exist | Need env generation step |
| Smart npm install (lockfile check) | Always runs npm install | Need lockfile hash comparison |
| Fast/full test profiles | Single test command | Need tagged tests and profile scripts |
| Merge-gate validation reports | Checkpoint files only | Need structured report format |
| Manual test cards | Review docs have checklist | Need formatted test card output |
| Concurrent worktree support | No isolation | Need full isolation strategy |

## Implementation Recommendations

### 1. Deterministic Port Derivation

**Algorithm**: Hash the branch name to a port in range 3001-3999.

```bash
# Derive port from branch name
branch_name="feature/2026-01-18-my-feature"
port_offset=$(echo -n "$branch_name" | md5sum | cut -c1-4)
port_decimal=$((16#$port_offset % 999 + 3001))
# Result: port between 3001-3999
```

**Implementation locations**:
- Add to SKILL.md Section 1 (Worktree Setup) after line 130
- Port derivation should happen before npm install

### 2. Per-Worktree `.env.local` Generation

**Create file at worktree setup**:

```bash
# Generate .env.local in worktree
cat > "$worktree_dir/.env.local" << EOF
# Auto-generated for worktree: $worktree_dir
# Branch: $branch_name
VITE_PORT=$derived_port
VITE_WORKTREE_NAME=$(basename "$worktree_dir")
VITE_BRANCH_NAME=$branch_name
EOF
```

**Required config changes**:

**vite.config.ts** (modify):
```typescript
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: parseInt(env.VITE_PORT || '3000'),
    },
  };
});
```

**playwright.config.ts** (modify):
```typescript
const PORT = process.env.VITE_PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  use: {
    baseURL: BASE_URL,
  },
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Add to .gitignore**:
```
.env.local
```

### 3. Smart Dependency Management

**Algorithm**: Compare lockfile hash with cached hash.

```bash
# Check if npm install is needed
lockfile_hash=$(md5sum package-lock.json | cut -d' ' -f1)
cached_hash_file="$worktree_dir/.npm-lockfile-hash"

if [[ -f "$cached_hash_file" ]] && [[ "$(cat "$cached_hash_file")" == "$lockfile_hash" ]]; then
  echo "Lockfile unchanged, skipping npm install"
else
  echo "Lockfile changed or first run, running npm install"
  npm install
  echo "$lockfile_hash" > "$cached_hash_file"
fi
```

**Add to .gitignore**:
```
.npm-lockfile-hash
```

**Implementation location**: SKILL.md Section 1, replace lines 132-149.

### 4. Fast/Full Test Profiles

**package.json additions**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:fast": "vitest run --testPathPattern='*.test.ts' --exclude='**/slow/**'",
    "test:e2e": "playwright test",
    "test:e2e:fast": "playwright test --grep @smoke",
    "test:e2e:full": "playwright test",
    "test:all": "npm run test && npm run test:e2e",
    "test:all:fast": "npm run test:fast && npm run test:e2e:fast",
    "validate:fast": "npm run lint && npm run test:all:fast && npm run build",
    "validate:full": "npm run lint && npm run test:all && npm run build"
  }
}
```

**E2E test tagging** (example in tests/e2e/app.spec.ts):
```typescript
test.describe('Application Startup', () => {
  test('should load the game canvas @smoke', async ({ page }) => {
    // Fast smoke test
  });

  test('should render without console errors @full', async ({ page }) => {
    // Slower comprehensive test
  });
});
```

**SKILL.md modifications**:
- Initial validation (Section 4): Use `npm run validate:fast`
- Re-validation (Section 7): Use `npm run validate:full`

### 5. Merge-Gate Validation Reports

**New report format**: `.swarm/merge-gates/YYYY-MM-DD-<feature>.md`

```markdown
# Merge Gate Report: [Feature Name]

**Generated**: YYYY-MM-DD HH:MM:SS
**Branch**: feature/<name>
**Base**: main
**Worktree**: ../civ-<name>

## Validation Summary

| Check | Status | Duration | Details |
|-------|--------|----------|---------|
| Lint | PASS | 2.3s | 0 errors, 0 warnings |
| Unit Tests | PASS | 5.1s | 42 passed, 0 failed |
| E2E Tests | PASS | 18.7s | 12 passed, 0 failed |
| Build | PASS | 8.2s | dist/ created |
| Type Check | PASS | 3.1s | No errors |

## Test Coverage

- Unit test coverage: 78%
- E2E scenarios covered: 12

## Files Changed

| File | +/- | Type |
|------|-----|------|
| src/feature/X.ts | +120/-5 | New feature |
| tests/e2e/feature.spec.ts | +80/-0 | New tests |

## Merge Readiness

**Status**: READY TO MERGE

All automated checks passed. See Human Review document for manual verification items.

## Commands to Merge

```bash
git checkout main
git merge feature/<name> --no-ff
git push origin main
git worktree remove ../civ-<name>
git branch -d feature/<name>
```
```

**Implementation location**: Add new Section 7.5 to SKILL.md between Re-validation and Human Review.

### 6. Manual Test Cards

**New format**: Include in review doc or separate file.

```markdown
## Manual Test Card: [Feature Name]

### Prerequisites
- [ ] Worktree dev server running on port XXXX
- [ ] Browser open to http://localhost:XXXX

### Test Scenarios

#### Scenario 1: [Basic functionality]
**Steps**:
1. Navigate to the game
2. Perform action X
3. Observe result Y

**Expected**: [Description]
**Actual**: [ ] Pass / [ ] Fail
**Notes**: _________________

#### Scenario 2: [Edge case]
**Steps**:
1. ...

**Expected**: [Description]
**Actual**: [ ] Pass / [ ] Fail
**Notes**: _________________

### Sign-off
- [ ] All scenarios passed
- [ ] No visual regressions observed
- [ ] Performance acceptable

**Tester**: _________________
**Date**: _________________
```

**Implementation location**: Add to Human Review Documentation section (Section 8) of SKILL.md.

### 7. Concurrent Worktree Support

**Full isolation strategy**:

1. **Port isolation**: Each worktree gets unique port (3001-3999)
2. **Build output isolation**: Already isolated (each worktree has own dist/)
3. **Test artifact isolation**: Already isolated (playwright-report/ per worktree)
4. **Cache isolation**: Add VITE_CACHE_DIR to .env.local
5. **Process identification**: Include branch name in process title

**Enhanced .env.local**:
```bash
# Auto-generated for worktree
VITE_PORT=$derived_port
VITE_WORKTREE_NAME=$(basename "$worktree_dir")
VITE_BRANCH_NAME=$branch_name
VITE_CACHE_DIR=node_modules/.vite-$worktree_name
```

**vite.config.ts enhancement**:
```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const worktreeName = env.VITE_WORKTREE_NAME || 'main';

  return {
    server: {
      port: parseInt(env.VITE_PORT || '3000'),
    },
    cacheDir: env.VITE_CACHE_DIR || 'node_modules/.vite',
    build: {
      outDir: `dist`,  // Already per-worktree
    },
  };
});
```

## Recommended File/Folder Structure Changes

### New Files to Create

```
.swarm/
  merge-gates/           # NEW: Merge gate validation reports
    YYYY-MM-DD-<feature>.md
  test-cards/            # NEW: Manual test card templates
    YYYY-MM-DD-<feature>.md
```

### Files to Modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Add env-based port and cache dir |
| `playwright.config.ts` | Add env-based port/URL |
| `package.json` | Add fast/full test profile scripts |
| `.gitignore` | Add `.env.local`, `.npm-lockfile-hash` |
| `.claude/skills/implement-worktree/SKILL.md` | Add all new workflow steps |

### SKILL.md Modification Summary

| Section | Line Range | Changes |
|---------|------------|---------|
| 1. Worktree Setup | 118-164 | Add port derivation, .env.local generation, smart npm install |
| 4. Initial Validation | 478-533 | Use fast validation profile |
| 7. Re-validation | 921-1065 | Use full validation profile |
| NEW 7.5 | After 1065 | Add merge-gate report generation |
| 8. Human Review | 1067-1280 | Add manual test card generation |

## Integration Points

### Existing Infrastructure
- **Hooks**: Session logging hooks can be extended to log worktree metadata
- **Checkpoints**: Continue using for phase recovery, merge-gates for final validation
- **Reviews**: Add manual test cards as appendix to review documents

### External Dependencies
- No new npm dependencies required
- Uses built-in Vite env loading (`loadEnv`)
- Uses standard bash utilities (md5sum, cut)

## Open Questions

1. **Port collision handling**: What if derived port is already in use? Consider retry with offset.

2. **Lockfile location**: Should smart npm install check main repo lockfile or worktree lockfile? (Recommend: worktree, since it could diverge during development)

3. **Test tag granularity**: How many test profile levels? (Recommend: 2 - fast/full. More adds complexity.)

4. **Merge-gate automation**: Should merge-gate report auto-trigger PR creation? (Recommend: No, keep human in loop)

5. **Worktree cleanup reminder**: Should workflow warn about stale worktrees? (Consider: git worktree list check at start)

## References

- Current skill: `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md`
- Vite config: `/Users/alex/workspace/civ/vite.config.ts`
- Playwright config: `/Users/alex/workspace/civ/playwright.config.ts`
- Package.json: `/Users/alex/workspace/civ/package.json`
- Existing merge option research: `/Users/alex/workspace/civ/.swarm/research/2026-01-18-implement-worktree-merge-option.md`
