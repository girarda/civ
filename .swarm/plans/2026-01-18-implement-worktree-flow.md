# Plan: Merge-Worktree Command for E2E Artifacts and Main Merge

**Date**: 2026-01-18
**Status**: Implementation Complete

## Overview

Create a new `/merge-worktree` Claude Code command that handles the complete merge-to-main workflow with E2E artifact generation. This keeps `/implement-worktree` focused on implementation while the new command handles: (1) generating and committing E2E visual regression artifacts using full capture mode, (2) synchronizing with main by merging if behind, (3) re-generating artifacts after merging main, (4) merging the feature branch into main while preserving untracked files, and (5) cleaning up the worktree and branch.

## Research Summary

Key findings from research at `.swarm/research/2026-01-18-implement-worktree-flow.md`:

- The `/implement-worktree` skill is defined at `.claude/skills/implement-worktree/SKILL.md` (1999 lines)
- E2E retention is controlled via `PLAYWRIGHT_FULL_CAPTURE=true` environment variable
- Visual regression baselines stored in `tests/e2e/*.spec.ts-snapshots/` (committed to repo)
- HTML reports and videos in `playwright-report/` and `test-results/` (gitignored)
- The `test:e2e:full` npm script exists for full capture mode
- Existing merge option research exists but does not cover E2E artifact generation or automatic cleanup

## Phased Implementation

### Phase 1: Create the Command File Structure

Create the new `/merge-worktree` command file.

- [x] Create `.claude/commands/merge-worktree.md` command file
- [x] Add command metadata header with description
- [x] Document command purpose and prerequisites

**Success Criteria**:
- Command file exists at `.claude/commands/merge-worktree.md`
- Command is discoverable via `/merge-worktree`

### Phase 2: E2E Artifact Generation Step

Document the E2E artifact generation workflow.

- [x] Document Step 1: Verify Worktree Context
  - Check we're in a git worktree (not main repo)
  - Get branch name and worktree directory
- [x] Document Step 2: Generate E2E Artifacts
  - Run `npm run test:e2e:full` for full capture mode
  - Run `npx playwright test --update-snapshots` to update baselines
- [x] Document Step 3: Commit E2E Artifacts
  - Stage snapshot files: `git add tests/e2e/*.spec.ts-snapshots/`
  - Conditional commit if changes exist

**Success Criteria**:
- Instructions clearly specify running E2E with full capture mode
- Snapshot update command is documented
- Commit step handles no-changes case gracefully

### Phase 3: Main Synchronization Logic

Add the synchronization step to check if up-to-date with main and merge if needed.

- [x] Document Step 4: Check Up-to-Date with Main
  - Fetch latest main: `git fetch origin main`
  - Check commits behind: `git rev-list --count HEAD..origin/main`
  - Branch based on behind count (0 = up-to-date, >0 = needs merge)
- [x] Document Step 5: Merge Main and Re-generate Artifacts (conditional)
  - Merge main into feature: `git merge origin/main --no-edit`
  - Handle merge conflicts with error and halt
  - Re-run unit tests: `npm run test`
  - Re-run E2E with full capture: `npm run test:e2e:full`
  - Update snapshots: `npx playwright test --update-snapshots`
  - Commit updated snapshots if any changes

**Success Criteria**:
- Clear conditional logic for behind-main detection
- Merge conflict handling documented with user guidance
- Re-generation of artifacts after main merge is specified

### Phase 4: Merge and Cleanup Steps

Add the final merge-to-main and cleanup steps.

- [x] Document Step 6: Merge to Main (Preserving Untracked Files)
  - Navigate to main repository (not worktree)
  - Checkout and pull main: `git checkout main && git pull origin main`
  - Merge feature branch: `git merge "$branch_name" --no-edit`
  - Handle merge conflicts with error and halt
  - Push to remote: `git push origin main`
- [x] Document Step 7: Cleanup Branch and Worktree
  - Remove worktree: `git worktree remove --force "$worktree_dir"`
  - Delete branch: `git branch -d "$branch_name"`
  - Verify cleanup with `git worktree list` and `git branch --list`
- [x] Add safety checks before merge:
  - Verify all tests pass
  - Verify no uncommitted changes in worktree
  - Verify feature branch is mergeable (dry-run)

**Success Criteria**:
- Merge uses `--no-edit` for non-interactive mode
- Worktree removal uses `--force` to handle edge cases
- Safety checks prevent accidental data loss
- Cleanup verification steps are documented

### Phase 5: Summary Output and Error Handling

Add the completion summary and error handling.

- [x] Add completion summary block
  - Report merged branch and artifacts committed
  - Confirm worktree and branch deletion
  - Report push to remote status
- [x] Add error handling sections:
  - E2E test failures: halt and report
  - Merge conflicts: halt with guidance
  - Worktree removal failures: warn but continue

**Success Criteria**:
- Clear success message on completion
- Error messages provide actionable guidance

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `.claude/commands/merge-worktree.md` | Create | New command file for merge-to-main workflow |

## Success Criteria

- [x] `/merge-worktree` command is available and discoverable
- [x] Command verifies it's running in a worktree context
- [x] Command generates E2E artifacts using `npm run test:e2e:full`
- [x] Command commits visual regression baselines from `tests/e2e/*.spec.ts-snapshots/`
- [x] Command checks if behind main and merges if necessary
- [x] Command re-generates E2E artifacts after merging main
- [x] Command merges feature branch to main without deleting untracked files
- [x] Command pushes main to remote
- [x] Command deletes the worktree and feature branch
- [x] Error handling covers test failures, merge conflicts, and cleanup failures

## Dependencies & Integration

- **Depends on**:
  - `npm run test:e2e:full` script (confirmed in `package.json` line 12)
  - `PLAYWRIGHT_FULL_CAPTURE` environment variable support (confirmed in `playwright.config.ts` line 3)
  - Git worktree commands available in environment
  - Active git worktree (command must be run from within a worktree)

- **Consumed by**:
  - Users who have completed implementation in a worktree via `/implement-worktree`
  - Users who want automated merge workflow after manual worktree work

- **Integration points**:
  - Playwright E2E test framework
  - Git worktree system
  - Git remote (origin)
  - Visual regression baseline storage in `tests/e2e/*.spec.ts-snapshots/`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Merge conflicts during main sync | Document clear error message and halt; user must resolve manually |
| E2E test failures after merging main | Halt workflow before merge-to-main; require passing tests |
| Worktree has uncommitted changes | Add pre-merge check for clean worktree state |
| User loses work due to premature cleanup | Add verification step before deletion; consider --dry-run flag |
| Remote push fails | Handle push failure gracefully; leave local merge intact |
| Untracked files deleted | Git merge preserves untracked files by default; explicitly avoid `git clean` |
| Branch already merged | Use `git branch -d` (not `-D`) to fail if not fully merged |

## Implementation Notes

### Command File Structure

Create `.claude/commands/merge-worktree.md` with the following structure:

```markdown
# Merge Worktree to Main

Merge the current worktree branch to main with E2E artifact generation.

## Prerequisites

- Must be run from within a git worktree (not the main repository)
- All implementation work should be complete
- Unit tests should be passing

## Workflow

### Step 1: Verify Worktree Context
- Confirm we're in a worktree using `git rev-parse --git-common-dir`
- Extract branch name and worktree directory path
- Verify no uncommitted changes exist

### Step 2: Generate E2E Artifacts
- Run `npm run test:e2e:full` for full capture mode
- Run `npx playwright test --update-snapshots` to update visual baselines

### Step 3: Commit E2E Artifacts
- Stage snapshot files: `git add tests/e2e/*.spec.ts-snapshots/`
- Commit if changes exist: `git commit -m "chore: update E2E visual regression baselines"`

### Step 4: Check Main Synchronization
- Fetch latest: `git fetch origin main`
- Check if behind: `git rev-list --count HEAD..origin/main`

### Step 5: Merge Main (if behind)
- Merge: `git merge origin/main --no-edit`
- If conflicts: HALT and report to user
- Re-run tests: `npm run test`
- Re-run E2E: `npm run test:e2e:full`
- Update snapshots: `npx playwright test --update-snapshots`
- Commit updated snapshots if changed

### Step 6: Merge to Main
- Navigate to main repo: `cd $(git rev-parse --git-common-dir | sed 's|/.git||')`
- Checkout main: `git checkout main && git pull origin main`
- Merge feature: `git merge "$branch_name" --no-edit`
- Push: `git push origin main`

### Step 7: Cleanup
- Remove worktree: `git worktree remove --force "$worktree_dir"`
- Delete branch: `git branch -d "$branch_name"`
- Verify: `git worktree list && git branch --list`

## Error Handling

- **E2E failures**: Halt and report failing tests
- **Merge conflicts**: Halt and instruct user to resolve manually
- **Worktree removal fails**: Warn but continue with branch deletion
```

## References

- Research: `/Users/alex/workspace/civ/.swarm/research/2026-01-18-implement-worktree-flow.md`
- Implement-worktree skill: `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md`
- Playwright config: `/Users/alex/workspace/civ/playwright.config.ts`
- Package.json: `/Users/alex/workspace/civ/package.json`
- Prior merge research: `/Users/alex/workspace/civ/.swarm/research/2026-01-18-implement-worktree-merge-option.md`
