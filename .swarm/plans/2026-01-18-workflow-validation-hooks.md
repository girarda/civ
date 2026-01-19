# Plan: Workflow Validation Hooks

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement validation hooks for the workflow system to enforce constraints that are currently only documented in command files. This plan adds three validation mechanisms: JSON schema validation for `.swarm/*.json` files, pre-claim validation for blocking dependencies, and workstream registration enforcement for worktree creation. These hooks will increase determinism while maintaining the flexibility of the existing prompt-engineering approach.

## Research Summary

Key findings from `.swarm/research/2026-01-18-workflow-system-analysis.md`:

- **Minimal hook enforcement today**: Only 3 hooks exist (session logging, summary updates, post-edit linting) - none enforce workflow state
- **JSON schema exists but is unused programmatically**: `.swarm/schemas/workstream.schema.json` defines structure but no validation hook validates it
- **Commands are pure documentation**: All 18 `.claude/commands/*.md` files are instructions Claude follows voluntarily
- **Workstream registry is advisory**: Dependencies and blocking are documented but not enforced by any hook
- **Hook infrastructure is ready**: `settings.local.json` supports `PostToolUse`, `UserPromptSubmit`, and `Stop` events with matchers

Existing hooks in `/Users/alex/workspace/civ/.claude/hooks/`:
- `log-prompt.sh` - Logs prompts to JSONL on UserPromptSubmit
- `update-summary.sh` - Updates session summary on Stop
- `update-heartbeat.sh` - Updates instance heartbeat (created but not wired)

## Phased Implementation

### Phase 1: JSON Schema Validation Hook (High Impact)

**Goal**: Prevent malformed JSON from being written to `.swarm/*.json` files.

**Problem**: The schema at `.swarm/schemas/workstream.schema.json` exists but is never validated programmatically. Claude can write invalid JSON structures that break the registry.

**Solution**: Create a `PostToolUse(Write)` hook that validates any writes to `.swarm/*.json` files against the appropriate schema.

- [x] Install `ajv-cli` as a dev dependency for JSON schema validation
- [x] Create `/Users/alex/workspace/civ/.claude/hooks/validate-swarm-json.sh`:
  - Parse file path from hook input
  - Check if file matches `.swarm/*.json` pattern
  - Select appropriate schema based on filename:
    - `workstreams.json` -> `workstream.schema.json`
    - `instances.json` -> `instances.schema.json` (to be created)
  - Run validation with `npx ajv validate`
  - Exit with non-zero status on validation failure (blocks the write)
  - Exit 0 on success or non-matching files
- [x] Create `/Users/alex/workspace/civ/.swarm/schemas/instances.schema.json` for instance registry validation
- [x] Update `/Users/alex/workspace/civ/.claude/settings.local.json` to register the hook:
  ```json
  "PostToolUse": [
    {
      "matcher": "Write",
      "hooks": [
        {
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-swarm-json.sh"
        }
      ]
    }
  ]
  ```

**Files to Create/Modify**:

| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/hooks/validate-swarm-json.sh` | Create |
| `/Users/alex/workspace/civ/.swarm/schemas/instances.schema.json` | Create |
| `/Users/alex/workspace/civ/.claude/settings.local.json` | Modify |
| `/Users/alex/workspace/civ/package.json` | Modify (add ajv-cli) |

**Hook Trigger**: `PostToolUse` with matcher `Write`

**Validation Logic**:
```bash
#!/bin/bash
# Claude Code Hook: Validate .swarm/*.json files against schemas
# Triggered on: PostToolUse(Write)

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Only validate .swarm/*.json files
if [[ ! "$file_path" =~ \.swarm/.*\.json$ ]]; then
  exit 0
fi

# Select schema based on filename
case "$(basename "$file_path")" in
  workstreams.json)
    schema="$CLAUDE_PROJECT_DIR/.swarm/schemas/workstream.schema.json"
    ;;
  instances.json)
    schema="$CLAUDE_PROJECT_DIR/.swarm/schemas/instances.schema.json"
    ;;
  *)
    # Unknown file, skip validation
    exit 0
    ;;
esac

# Validate against schema
if ! npx ajv validate -s "$schema" -d "$file_path" --strict=false 2>&1; then
  echo "ERROR: JSON validation failed for $file_path"
  exit 1
fi

exit 0
```

**Success Criteria**:
- [ ] Writing valid JSON to `workstreams.json` succeeds
- [ ] Writing invalid JSON (missing required fields, wrong types) to `workstreams.json` fails with clear error
- [ ] Writing to non-.swarm files is unaffected
- [ ] Hook runs in under 1 second (no noticeable delay)
- [ ] Error messages include specific validation failures

---

### Phase 2: Pre-Claim Validation Hook (Medium Impact)

**Goal**: Prevent claiming workstreams that have unmet blocking dependencies.

**Problem**: The `/workstream-claim` command documents dependency checking but relies on Claude to interpret the instructions. A hook can enforce this constraint programmatically.

**Solution**: Extend the JSON validation hook (or create a separate hook) to validate state transitions, specifically checking that workstreams transitioning to `implementing` have all blocking dependencies in `merged` state.

- [x] Create `/Users/alex/workspace/civ/.claude/hooks/validate-workstream-state.sh`:
  - Compare previous and new versions of `workstreams.json`
  - Detect any workstreams that changed to `implementing` state
  - For each such workstream, verify all `type: "blocks"` dependencies are `merged`
  - Exit with non-zero status if any blocker is not merged
- [x] Wire hook into `PostToolUse(Write)` chain for `workstreams.json`
- [x] Add helper function to detect state transitions:
  ```bash
  # Compare old and new JSON, find workstreams that changed to implementing
  old_json=$(git show HEAD:.swarm/workstreams.json 2>/dev/null || echo '{"workstreams":{}}')
  new_json=$(cat .swarm/workstreams.json)

  # Find workstreams where state changed to implementing
  changed=$(jq -s '
    .[0].workstreams as $old |
    .[1].workstreams | to_entries[] |
    select(.value.state == "implementing" and
           ($old[.key].state // "none") != "implementing") |
    .key
  ' <(echo "$old_json") <(echo "$new_json"))
  ```

**Files to Create/Modify**:

| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/hooks/validate-workstream-state.sh` | Create |
| `/Users/alex/workspace/civ/.claude/settings.local.json` | Modify (add to hook chain) |

**Hook Trigger**: `PostToolUse` with matcher `Write` (chained after schema validation)

**Validation Logic**:
```bash
#!/bin/bash
# Claude Code Hook: Validate workstream state transitions
# Triggered on: PostToolUse(Write) for workstreams.json

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Only validate workstreams.json
if [[ "$(basename "$file_path")" != "workstreams.json" ]]; then
  exit 0
fi

# Get old version from git (or empty if new file)
old_json=$(git show HEAD:"$file_path" 2>/dev/null || echo '{"workstreams":{}}')
new_json=$(cat "$file_path")

# Find workstreams transitioning to implementing
transitioning=$(echo "$old_json" "$new_json" | jq -s '
  .[0].workstreams as $old |
  .[1].workstreams | to_entries[] |
  select(.value.state == "implementing") |
  select(($old[.key].state // "none") != "implementing") |
  .key
' | tr -d '"')

# Check each transitioning workstream for unmet blockers
for ws_id in $transitioning; do
  blockers=$(echo "$new_json" | jq -r --arg id "$ws_id" '
    .workstreams[$id].dependencies[]? |
    select(.type == "blocks") |
    .target as $target |
    .workstreams[$target] |
    select(.state != "merged") |
    $target
  ')

  if [ -n "$blockers" ]; then
    echo "ERROR: Cannot transition '$ws_id' to implementing."
    echo "Unmet blocking dependencies:"
    for blocker in $blockers; do
      state=$(echo "$new_json" | jq -r --arg id "$blocker" '.workstreams[$id].state // "not found"')
      echo "  - $blocker (state: $state)"
    done
    exit 1
  fi
done

exit 0
```

**Success Criteria**:
- [ ] Claiming a workstream with all blockers merged succeeds
- [ ] Claiming a workstream with unmet blockers fails with clear error listing blockers
- [ ] Error message shows blocker IDs and their current states
- [ ] Manual `--force` override is still possible via Claude's judgment (hook warns but Claude can explain override)

---

### Phase 3: Enforce Workstream Registration (Medium Impact)

**Goal**: Require workstreams to be registered before worktree creation.

**Problem**: Claude can create worktrees without registering the workstream, leading to untracked work. The current approach relies on Claude following instructions in `/implement-worktree`.

**Solution**: Add a validation hook or modify existing workflow to check workstream registration when a git worktree is created with a branch name matching the `feature/YYYY-MM-DD-*` pattern.

**Approach Options**:

1. **Hook on Bash(git worktree)** - Not directly possible with current hook system
2. **Modify /implement-worktree skill** - Add explicit check before worktree creation
3. **PostToolUse(Bash) hook with pattern match** - Check after git commands

We will use approach 2 (modify skill) combined with a lightweight Bash hook for defense-in-depth:

- [x] Modify `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md`:
  - Add explicit "Verify workstream exists" step before worktree creation
  - If workstream not found, prompt to register via `/workstream-add`
  - Include registry check in skill prerequisites
- [x] Create `/Users/alex/workspace/civ/.claude/hooks/verify-worktree-registration.sh`:
  - Triggered on `PostToolUse(Bash)` when command contains `git worktree add`
  - Extract branch name from command
  - Check if matching workstream exists in registry
  - Warn (but don't block) if unregistered - this allows emergency overrides
- [x] Update `/Users/alex/workspace/civ/.claude/settings.local.json` to add Bash hook

**Files to Create/Modify**:

| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Modify |
| `/Users/alex/workspace/civ/.claude/hooks/verify-worktree-registration.sh` | Create |
| `/Users/alex/workspace/civ/.claude/settings.local.json` | Modify |

**Hook Trigger**: `PostToolUse` with matcher `Bash` (for git worktree commands)

**Validation Logic**:
```bash
#!/bin/bash
# Claude Code Hook: Verify worktree has registered workstream
# Triggered on: PostToolUse(Bash) for git worktree commands

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only check git worktree add commands
if [[ ! "$command" =~ git\ worktree\ add ]]; then
  exit 0
fi

# Extract branch name from command
# Pattern: git worktree add <path> -b <branch> or git worktree add <path> <branch>
branch=$(echo "$command" | grep -oE 'feature/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+' || true)

if [ -z "$branch" ]; then
  # Not a feature branch, skip
  exit 0
fi

# Extract workstream ID from branch name (remove feature/ prefix and date)
ws_id=$(echo "$branch" | sed 's/feature\/[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')

# Check if workstream exists in registry
registry="$CLAUDE_PROJECT_DIR/.swarm/workstreams.json"
if [ ! -f "$registry" ]; then
  echo "WARNING: Workstream registry not found. Consider creating with /workstream-add"
  exit 0  # Warn but don't block
fi

exists=$(jq -r --arg id "$ws_id" '.workstreams[$id] // empty' "$registry")
if [ -z "$exists" ]; then
  echo "WARNING: Workstream '$ws_id' not found in registry."
  echo "Consider registering with: /workstream-add \"$ws_id\" --title \"...\""
  echo ""
  echo "Worktree was created but work may not be tracked properly."
  # Exit 0 to not block - this is a warning, not an error
fi

exit 0
```

**Success Criteria**:
- [ ] Creating worktree for registered workstream shows no warning
- [ ] Creating worktree for unregistered workstream shows warning with registration command
- [ ] Warning is informative but does not block the operation
- [ ] `/implement-worktree` skill checks registration before proceeding

## Files to Create/Modify Summary

| File | Action | Phase |
|------|--------|-------|
| `/Users/alex/workspace/civ/.claude/hooks/validate-swarm-json.sh` | Create | 1 |
| `/Users/alex/workspace/civ/.swarm/schemas/instances.schema.json` | Create | 1 |
| `/Users/alex/workspace/civ/.claude/settings.local.json` | Modify | 1, 2, 3 |
| `/Users/alex/workspace/civ/package.json` | Modify | 1 |
| `/Users/alex/workspace/civ/.claude/hooks/validate-workstream-state.sh` | Create | 2 |
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Modify | 3 |
| `/Users/alex/workspace/civ/.claude/hooks/verify-worktree-registration.sh` | Create | 3 |

## Success Criteria (Overall)

- [ ] JSON schema validation prevents malformed registry writes
- [ ] State transition validation prevents claiming blocked workstreams
- [ ] Worktree creation warns when workstream is unregistered
- [ ] All hooks run quickly (< 1 second each)
- [ ] Hooks integrate cleanly with existing `log-prompt.sh` and `update-summary.sh`
- [ ] Error messages are actionable and include remediation steps
- [ ] System degrades gracefully if `jq` or `ajv` are unavailable

## Dependencies & Integration

- **Depends on**:
  - Existing `.swarm/schemas/workstream.schema.json` schema definition
  - Existing `.swarm/workstreams.json` registry structure
  - `jq` command-line tool (typically pre-installed on macOS/Linux)
  - Node.js (for `npx ajv`)

- **Consumed by**:
  - All Claude Code instances writing to `.swarm/*.json` files
  - `/workstream-claim` command (validation will be enforced at write time)
  - `/implement-worktree` skill (registration check before worktree creation)

- **Integration points**:
  - `settings.local.json` hook configuration
  - Existing hooks in `.claude/hooks/`
  - Git worktree workflow

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Hook performance impact on every write | Cache schema compilation; only validate matching files |
| `ajv-cli` not installed | Graceful degradation - skip validation with warning |
| Complex jq queries fail on edge cases | Comprehensive testing; fallback to allowing write on parse errors |
| Hook blocks legitimate emergency operations | Phase 2 warns but allows override; Phase 3 only warns |
| Git comparison fails for new files | Handle `git show` failures gracefully |
| Multiple hooks create confusion | Clear error messages identify which hook failed |

## Hook Configuration Reference

Final `settings.local.json` hook configuration after all phases:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/log-prompt.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/update-summary.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint --silent 2>/dev/null || true"
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-swarm-json.sh"
          },
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-workstream-state.sh"
          }
        ]
      },
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/verify-worktree-registration.sh"
          }
        ]
      }
    ]
  }
}
```

## Testing Strategy

For each phase, manual testing should verify:

**Phase 1 Testing**:
```bash
# Valid write should succeed
echo '{"version":2,"lastUpdated":"2026-01-18T00:00:00Z","workstreams":{}}' > .swarm/workstreams.json

# Invalid write should fail (missing required field)
echo '{"version":2,"workstreams":{}}' > .swarm/workstreams.json
# Expected: ERROR with missing lastUpdated message

# Non-.swarm write should be unaffected
echo '{}' > /tmp/test.json
```

**Phase 2 Testing**:
```bash
# Create test workstream blocked by non-merged dependency
# Attempt to change state to implementing
# Expected: ERROR with blocker list

# Create test workstream with all blockers merged
# Attempt to change state to implementing
# Expected: Success
```

**Phase 3 Testing**:
```bash
# Create worktree for registered workstream
git worktree add ../civ-test -b feature/2026-01-18-registered-ws
# Expected: No warning

# Create worktree for unregistered workstream
git worktree add ../civ-test2 -b feature/2026-01-18-unregistered-ws
# Expected: Warning about missing registration
```
