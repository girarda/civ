# Merge Worktree to Main

Merge the current worktree branch to main with E2E artifact generation and cleanup.

## Description

This command handles the complete merge-to-main workflow for feature branches developed in git worktrees. It generates and commits E2E visual regression artifacts, synchronizes with main (merging if behind), merges the feature branch to main, and cleans up the worktree and branch.

## Prerequisites

- Must be run from within a git worktree (not the main repository)
- All implementation work should be complete
- Unit tests should be passing
- No uncommitted changes in the worktree

## Workflow

### Step 1: Verify Worktree Context

Confirm we are operating within a git worktree and gather necessary information.

```bash
# Check if we're in a worktree (git-common-dir differs from git-dir)
git_common_dir=$(git rev-parse --git-common-dir 2>/dev/null)
git_dir=$(git rev-parse --git-dir 2>/dev/null)

# If they're the same, we're in the main repo, not a worktree
if [ "$git_common_dir" = "$git_dir" ]; then
  echo "ERROR: Not in a worktree. This command must be run from a git worktree."
  exit 1
fi

# Get current branch name
branch_name=$(git rev-parse --abbrev-ref HEAD)

# Get worktree directory
worktree_dir=$(pwd)

# Verify no uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: Uncommitted changes detected. Please commit or stash changes first."
  exit 1
fi
```

**Outputs**:
- `branch_name`: The feature branch name
- `worktree_dir`: The absolute path to the worktree directory
- `git_common_dir`: Path to the main repository's .git directory

### Step 2: Generate E2E Artifacts

Run E2E tests with full capture mode to generate artifacts and update visual regression baselines.

```bash
# Run E2E tests with full capture mode (generates HTML reports, videos, traces)
npm run test:e2e:full

# Update visual regression baselines if any screenshots changed
npx playwright test --update-snapshots
```

**On failure**: If E2E tests fail, HALT and report the failures. Do not proceed until tests pass.

### Step 3: Commit E2E Artifacts

Stage and commit visual regression baseline snapshots if any changed.

```bash
# Stage snapshot files
git add tests/e2e/*.spec.ts-snapshots/ 2>/dev/null || true

# Check if there are staged changes
if git diff --cached --quiet; then
  echo "No E2E snapshot changes to commit."
else
  git commit -m "chore: update E2E visual regression baselines"
fi
```

### Step 4: Check Main Synchronization

Fetch the latest main branch and determine if we need to merge.

```bash
# Fetch latest main
git fetch origin main

# Count commits we're behind
commits_behind=$(git rev-list --count HEAD..origin/main)

if [ "$commits_behind" -eq 0 ]; then
  echo "Branch is up-to-date with main."
else
  echo "Branch is $commits_behind commit(s) behind main. Merge required."
fi
```

### Step 5: Merge Main (if behind)

If the feature branch is behind main, merge main into the feature branch and re-run tests.

```bash
# Only execute if commits_behind > 0
if [ "$commits_behind" -gt 0 ]; then
  # Merge main into feature branch
  if ! git merge origin/main --no-edit; then
    echo "ERROR: Merge conflict detected!"
    echo "Please resolve conflicts manually, then run this command again."
    exit 1
  fi

  # Re-run unit tests after merge
  npm run test
  if [ $? -ne 0 ]; then
    echo "ERROR: Unit tests failed after merging main."
    exit 1
  fi

  # Re-run E2E tests with full capture
  npm run test:e2e:full
  if [ $? -ne 0 ]; then
    echo "ERROR: E2E tests failed after merging main."
    exit 1
  fi

  # Update snapshots after merge
  npx playwright test --update-snapshots

  # Commit updated snapshots if any changed
  git add tests/e2e/*.spec.ts-snapshots/ 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m "chore: update E2E baselines after main merge"
  fi
fi
```

**On merge conflict**: HALT and instruct the user to resolve conflicts manually. After resolution, the user should run this command again.

**On test failure**: HALT and report which tests failed. Do not proceed until all tests pass.

### Step 6: Merge to Main

Navigate to the main repository, merge the feature branch, and push to remote.

```bash
# Get main repo path (remove /.git from git-common-dir)
main_repo_path=$(echo "$git_common_dir" | sed 's|/\.git$||')

# Navigate to main repo
cd "$main_repo_path"

# Checkout and update main
git checkout main
git pull origin main

# Merge feature branch (use --no-edit for non-interactive)
if ! git merge "$branch_name" --no-edit; then
  echo "ERROR: Merge conflict when merging to main!"
  echo "Please resolve conflicts manually in the main repository."
  exit 1
fi

# Push to remote
if ! git push origin main; then
  echo "WARNING: Push to remote failed. Local merge is complete."
  echo "Please push manually: git push origin main"
  exit 1
fi
```

**Safety checks before merge**:
1. Verify all tests pass (completed in previous steps)
2. Verify no uncommitted changes (checked in Step 1)
3. Feature branch is mergeable - use dry-run: `git merge --no-commit --no-ff "$branch_name" && git merge --abort` to verify before actual merge

### Step 7: Cleanup

Remove the worktree and delete the feature branch.

```bash
# Remove the worktree (use --force to handle edge cases)
if ! git worktree remove --force "$worktree_dir"; then
  echo "WARNING: Failed to remove worktree at $worktree_dir"
  echo "You may need to remove it manually."
fi

# Delete the feature branch (use -d to fail if not fully merged)
if ! git branch -d "$branch_name"; then
  echo "WARNING: Failed to delete branch $branch_name"
  echo "You may need to delete it manually: git branch -D $branch_name"
fi

# Verify cleanup
echo "Remaining worktrees:"
git worktree list

echo "Remaining branches:"
git branch --list
```

### Step 8: Registry Integration

After successful merge, update the workstream registry:

1. **Derive workstream ID** from branch name:
   ```bash
   # feature/2026-01-18-my-feature -> my-feature
   workstream_id=$(echo "$branch_name" | sed 's|^feature/||' | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
   ```

2. **Update workstream state**:
   ```javascript
   workstream.state = "merged";
   workstream.updated = new Date().toISOString();
   workstream.mergedAt = new Date().toISOString();
   workstream.implementation.assignedInstance = null;
   workstream.implementation.worktree = null;
   ```

3. **Write registry** (in main repository):
   ```bash
   # Update .swarm/workstreams.json atomically
   # This should be done in the main repo after checkout
   ```

4. **Report registry update**:
   ```
   Registry Updated: .swarm/workstreams.json
     Workstream: my-feature
     State: implementing -> merged
     Merged at: <timestamp>
   ```

## Completion Summary

On successful completion, report:

```
=== Merge Complete ===

Branch merged: $branch_name
E2E artifacts committed: Yes/No
Main sync required: Yes/No
Push to remote: Success

Cleanup:
- Worktree removed: $worktree_dir
- Branch deleted: $branch_name

Registry:
- Workstream: <workstream-id>
- State: merged
- Merged at: <timestamp>

The feature has been successfully merged to main.
```

## Error Handling

### E2E Test Failures

If E2E tests fail at any point:
- HALT execution immediately
- Report which tests failed with error details
- Do NOT proceed to merge
- User must fix failing tests and re-run the command

### Merge Conflicts

If merge conflicts occur (either merging main into feature or feature into main):
- HALT execution immediately
- Report the conflict clearly
- Instruct user to resolve conflicts manually
- After resolution, user should re-run this command

### Worktree Removal Failures

If worktree removal fails:
- WARN but continue with branch deletion
- Report the worktree path for manual cleanup
- Provide manual removal command: `git worktree remove --force <path>`

### Push Failures

If push to remote fails:
- WARN but keep local merge intact
- Report that local merge succeeded
- Provide manual push command: `git push origin main`

### Branch Deletion Failures

If branch deletion fails:
- WARN and report
- Branch may already be deleted or may need force deletion
- Provide manual deletion command if needed

## Input

$ARGUMENTS

Optional arguments:
- `--dry-run`: Show what would be done without making changes
- `--skip-e2e`: Skip E2E artifact generation (not recommended)

## Output

Execute the merge workflow step by step, reporting progress and any issues encountered.
