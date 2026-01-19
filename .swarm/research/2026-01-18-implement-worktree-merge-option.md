# Research: Add Merge-to-Main Option for /implement-worktree

**Date**: 2026-01-18
**Topic**: Adding a "Merge to Main" completion option to the /implement-worktree skill
**Status**: Complete

## Summary

The `/implement-worktree` skill currently presents completion options via `AskUserQuestion`. The user wants to add a 3rd option: "Merge to Main" that directly merges the feature branch to main without creating a PR.

## Findings

### Current Location

The skill definition is at:
- `.claude/skills/implement-worktree/SKILL.md`

### Current Completion Flow (Section 9)

Lines 1282-1427 define the "PR or Manual Completion" step. The documented options are:

1. **Create Pull Request** - Push branch to remote and create PR with `gh pr create`
2. **Manual Completion** - Print locations and instructions for manual handling

However, the screenshot shows a 3rd option "merge" is already being offered, suggesting the actual implementation has diverged from the documentation.

### Required Changes

To add a "Merge to Main" option, modify **Section 9** (lines ~1282-1427) in `SKILL.md`:

#### 1. Update the User Prompt (lines ~1286-1305)

Change from:
```
How would you like to proceed?

1. Create Pull Request (requires gh CLI)
   - Push branch to remote
   - Create PR with review document as body

2. Manual Completion
   - Print worktree location
   - Print review document path
   - Leave for manual handling

Enter choice (1 or 2):
```

To:
```
How would you like to proceed?

1. Create Pull Request
   Push branch to remote and create PR with review document as body

2. Manual Completion
   Print locations and instructions for manual handling

3. Merge to Main
   Merge feature branch directly to main (local only, does not delete worktree)

Enter choice (1, 2, or 3):
```

#### 2. Add New Option 3 Section (after Option 2, ~line 1382)

Add a new section:

```markdown
#### Option 3: Merge to Main

If the user chooses direct merge:

```bash
# Store current directory
original_dir=$(pwd)

# Navigate to main repository (not worktree)
cd /path/to/original/repo

# Ensure main is up to date
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/feature-name --no-edit

# Handle merge conflicts if any
if [[ $? -ne 0 ]]; then
  echo "Merge conflict detected. Please resolve manually."
  exit 1
fi

# Return to original directory
cd "$original_dir"
```

Merge summary:

```
MERGED TO MAIN
--------------
Branch: feature/feature-name merged into main
Worktree: ../civ-feature-name (NOT deleted)

IMPORTANT: Worktree and branch are preserved.
To clean up after verifying the merge:
  git worktree remove ../civ-feature-name
  git branch -d feature/feature-name

To push main to remote:
  git push origin main
```
```

### Key Design Decisions

1. **Do NOT delete files/worktree automatically** - The merge option should be non-destructive. Cleanup is left to the user.

2. **Local-only merge** - Does not push to remote automatically. User must explicitly `git push origin main` after.

3. **Preserve worktree** - The worktree directory and feature branch remain after merge for verification.

4. **Handle merge conflicts** - If merge fails, report and exit without leaving repo in bad state.

### File to Modify

| File | Lines | Change |
|------|-------|--------|
| `.claude/skills/implement-worktree/SKILL.md` | ~1286-1305 | Update user prompt to include option 3 |
| `.claude/skills/implement-worktree/SKILL.md` | ~1382 (after Option 2) | Add new "Option 3: Merge to Main" section |
| `.claude/skills/implement-worktree/SKILL.md` | ~1410-1427 | Update completion summary to handle 3 options |

### Implementation Notes

The skill file is a prompt/instruction document, not executable code. Claude interprets these instructions when the skill is invoked. To add the new option:

1. Add option 3 to the prompt text
2. Add the merge procedure documentation
3. Ensure the merge does NOT delete the worktree
4. Include cleanup instructions in the output

## Recommendations

1. **Modify the User Prompt section** to include a 3rd option
2. **Add Option 3 documentation** with the merge workflow
3. **Emphasize non-destructive behavior** - worktree and branch are preserved
4. **Include cleanup instructions** in the output so user knows how to clean up when ready

## References

- Skill file: `.claude/skills/implement-worktree/SKILL.md`
- Section 9 "PR or Manual Completion": lines 1282-1427
- User Prompt: lines 1286-1305
- Option 1 (PR): lines 1307-1353
- Option 2 (Manual): lines 1355-1382
