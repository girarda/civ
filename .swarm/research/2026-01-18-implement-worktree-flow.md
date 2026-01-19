# Research: Implement-Worktree Flow

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research documents the complete implement-worktree workflow, with focus on the requirements for: (1) creating E2E artifacts showing new features using the E2E retention feature and committing them, (2) checking that the worktree is up-to-date with main before merging, (3) re-generating E2E artifacts after merging main in, and (4) safely merging back to main while preserving untracked files, then cleaning up the branch and worktree.

## Key Discoveries

- The `/implement-worktree` skill is a comprehensive 2000-line workflow definition at `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md`
- E2E test retention is implemented via `PLAYWRIGHT_FULL_CAPTURE` environment variable in `playwright.config.ts`
- Visual regression screenshots are stored in `tests/e2e/*.spec.ts-snapshots/` directories (committed to repo)
- HTML reports and videos are stored in `playwright-report/` and `test-results/` (gitignored, not committed)
- Current completion options are: (1) Create Pull Request, or (2) Manual Completion - no automated merge-to-main option exists
- Existing research at `.swarm/research/2026-01-18-implement-worktree-merge-option.md` proposes a merge-to-main option but does not address the user's full requirements

## Architecture Overview

### Current Implement-Worktree Workflow

The skill defines a 9-section workflow:

| Section | Purpose | Lines |
|---------|---------|-------|
| 1. Worktree Setup | Create worktree, branch, install deps | 43-165 |
| 2. Feature Implementation | Parse plan, implement tasks | 166-297 |
| 3. E2E Test Generation | Generate Playwright tests | 298-477 |
| 4. Initial Validation | Run tests, lint, build | 478-611 |
| 5. Code Simplification | Reduce complexity, document | 612-769 |
| 6. Parallel Code Review | Plugin + custom agent review | 770-1081 |
| 7. Re-validation | Full test suite, verify criteria | 1082-1257 |
| 8. Human Review Documentation | Create review doc | 1258-1498 |
| 9. PR or Manual Completion | Push, create PR, or manual | 1499-1647 |

### E2E Artifact Retention System

The E2E retention feature is controlled by `PLAYWRIGHT_FULL_CAPTURE` environment variable:

**playwright.config.ts (lines 3-17)**:
```typescript
const fullCapture = process.env.PLAYWRIGHT_FULL_CAPTURE === 'true';

export default defineConfig({
  use: {
    video: fullCapture ? 'on' : 'retain-on-failure',
    trace: fullCapture ? 'on' : 'retain-on-failure',
    screenshot: 'on',  // Always captures screenshots
  },
});
```

**npm scripts**:
- `npm run test:e2e` - Normal mode, retain artifacts only on failure
- `npm run test:e2e:full` - Full capture mode, captures all videos/traces

**Artifact locations**:
| Artifact Type | Location | Git Status |
|---------------|----------|------------|
| Visual regression baselines | `tests/e2e/*.spec.ts-snapshots/` | Committed |
| HTML reports | `playwright-report/` | Gitignored |
| Videos/traces | `test-results/` | Gitignored |

### Current Completion Flow (Section 9)

The current workflow offers two completion options:

**Option 1: Create Pull Request**
```bash
git push -u origin "$branch_name"
gh pr create --title "Feature: $feature_name" --body-file ".swarm/reviews/..."
```

**Option 2: Manual Completion**
- Prints worktree location, review doc path
- Provides manual merge/cleanup instructions

### Missing: Automated Merge-to-Main Flow

The user's requirements describe a third option that does not currently exist in the skill:

1. Create E2E artifacts showing new features (using full capture mode)
2. Commit the artifacts
3. Check if up-to-date with main
4. If not up-to-date: merge main in, re-generate E2E artifacts
5. Merge branch into main, preserving untracked files
6. Delete branch and worktree

## Patterns Found

### Visual Regression Screenshot Commits

The project commits visual regression baselines. Example from `tests/e2e/map.spec.ts`:

```typescript
test('should render map tiles after loading', async ({ page }) => {
  await expect(page).toHaveScreenshot('map-rendered.png', {
    maxDiffPixels: 100,
  });
});
```

This creates/updates files in `tests/e2e/map.spec.ts-snapshots/map-rendered-chromium-darwin.png`.

### Existing Merge Instructions

Merge instructions appear in review documents (e.g., `.swarm/reviews/2026-01-18-combat-system.md`):

```bash
git checkout main
git pull origin main
git merge feature/2026-01-18-combat-system
git push origin main
git worktree remove /path/to/worktree
```

### Safe Merge Strategy

From `.swarm/research/2026-01-18-implement-worktree-merge-option.md`:

```bash
# Navigate to main repository (not worktree)
cd /path/to/original/repo

# Ensure main is up to date
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/feature-name --no-edit
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Main skill definition (1999 lines) |
| `/Users/alex/workspace/civ/playwright.config.ts` | Playwright config with retention modes |
| `/Users/alex/workspace/civ/package.json` | npm scripts including `test:e2e:full` |
| `/Users/alex/workspace/civ/.gitignore` | Excludes playwright-report/, test-results/ |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-implement-worktree-merge-option.md` | Existing merge option research |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-solo-worktree-workflow-improvements.md` | Workflow improvements research |

## Required Implementation Details

### Step 1: Generate E2E Artifacts

Run E2E tests with full capture mode to generate visual artifacts:

```bash
cd "$worktree_dir"

# Generate E2E artifacts with full capture
npm run test:e2e:full

# Update visual regression baselines if tests pass with new screenshots
npx playwright test --update-snapshots
```

### Step 2: Commit E2E Artifacts

Commit the visual regression snapshots (the only committed artifacts):

```bash
# Stage snapshot files
git add tests/e2e/*.spec.ts-snapshots/

# Commit if there are changes
if git diff --cached --quiet; then
  echo "No new E2E artifacts to commit"
else
  git commit -m "chore: update E2E visual regression baselines"
fi
```

### Step 3: Check Up-to-Date with Main

Check if the feature branch is up-to-date with main:

```bash
# Fetch latest main
git fetch origin main

# Check if main has commits not in feature branch
behind_count=$(git rev-list --count HEAD..origin/main)

if [[ "$behind_count" -gt 0 ]]; then
  echo "Branch is $behind_count commits behind main"
  # Need to merge main in
else
  echo "Branch is up to date with main"
fi
```

### Step 4: Merge Main and Re-generate Artifacts

If behind main, merge and re-generate:

```bash
# Merge main into feature branch
git merge origin/main --no-edit

# Handle merge conflicts if any
if [[ $? -ne 0 ]]; then
  echo "Merge conflict detected. Please resolve manually."
  exit 1
fi

# Re-run tests to ensure merge didn't break anything
npm run test
npm run test:e2e:full

# Update snapshots if tests pass
npx playwright test --update-snapshots

# Commit any new/changed snapshots
git add tests/e2e/*.spec.ts-snapshots/
if ! git diff --cached --quiet; then
  git commit -m "chore: update E2E baselines after merging main"
fi
```

### Step 5: Merge to Main (Preserving Untracked Files)

Merge feature branch to main while preserving untracked files:

```bash
# Store current location
original_dir=$(pwd)

# Navigate to main repository (from worktree, go to parent)
main_repo=$(git rev-parse --git-common-dir | sed 's|/.git||')
cd "$main_repo"

# Ensure main is up to date
git checkout main
git pull origin main

# Merge the feature branch (--no-edit for non-interactive)
# This preserves untracked files by default
git merge "$branch_name" --no-edit

if [[ $? -ne 0 ]]; then
  echo "Merge conflict. Please resolve manually."
  cd "$original_dir"
  exit 1
fi

echo "Successfully merged $branch_name into main"
```

### Step 6: Cleanup Branch and Worktree

After successful merge, clean up:

```bash
# Delete the worktree (force to handle any lingering changes)
git worktree remove --force "$worktree_dir"

# Delete the feature branch (already merged)
git branch -d "$branch_name"

# Verify cleanup
git worktree list
git branch --list "$branch_name"

echo "Cleanup complete"
```

## Recommendations

### 1. Add Option 3 to Section 9

Modify Section 9 "PR or Manual Completion" to add a third option:

```markdown
3. Merge to Main (with E2E artifacts)
   - Generate E2E artifacts with full capture
   - Commit visual regression baselines
   - Ensure up-to-date with main (merge if needed)
   - Re-generate artifacts after merge
   - Merge feature branch to main
   - Clean up worktree and branch
```

### 2. Create Dedicated Merge Flow Section

Add a new subsection under Option 3 with the complete flow:

```markdown
#### Option 3: Merge to Main

If the user chooses direct merge with E2E artifacts:

##### Step 1: Generate E2E Artifacts
[Run test:e2e:full and update snapshots]

##### Step 2: Commit Artifacts
[Stage and commit snapshot files]

##### Step 3: Synchronize with Main
[Check if behind main, merge if needed, re-run tests]

##### Step 4: Merge to Main
[Navigate to main repo, pull main, merge feature]

##### Step 5: Cleanup
[Remove worktree, delete branch]
```

### 3. Handle Edge Cases

Document handling for:
- Merge conflicts during main sync
- Test failures after merging main
- Untracked files in worktree (preserved by default with git merge)
- Failed cleanup (worktree has uncommitted changes)

### 4. Add Safety Checks

Before merge:
- Verify all tests pass
- Verify no uncommitted changes in worktree
- Verify feature branch is mergeable (no conflicts)

## Open Questions

1. **Should HTML reports be committed?** Currently gitignored, but could be useful for PR review. Consider adding a `--with-reports` flag.

2. **What if main has breaking changes?** Should the flow automatically re-run the full validation suite after merging main, or just E2E tests?

3. **Should the push to remote happen automatically?** Current research suggests local-only merge. User may want `git push origin main` included.

4. **Handling multiple worktrees?** If user has multiple worktrees for same branch, which one is canonical? Should detect and warn.

5. **Rollback strategy?** If merge succeeds but something is wrong, how to rollback? Consider keeping branch/worktree until user confirms.

## References

- Skill file: `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md`
- Playwright config: `/Users/alex/workspace/civ/playwright.config.ts`
- E2E retention plan: `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-tiered-test-retention.md`
- Merge option research: `/Users/alex/workspace/civ/.swarm/research/2026-01-18-implement-worktree-merge-option.md`
- Workflow improvements research: `/Users/alex/workspace/civ/.swarm/research/2026-01-18-solo-worktree-workflow-improvements.md`
- Package.json: `/Users/alex/workspace/civ/package.json` (test:e2e:full script)
