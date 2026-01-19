# Human Review: Workflow Validation Hooks

**Date**: 2026-01-18
**Branch**: feature/2026-01-18-workflow-validation-hooks
**Worktree**: ../civ-2026-01-18-workflow-validation-hooks
**Plan**: .swarm/plans/2026-01-18-workflow-validation-hooks.md

## Summary

This implementation adds three validation hooks to the workflow system to enforce constraints that were previously only documented in command files. The hooks increase determinism by:

1. **JSON Schema Validation** - Prevents malformed JSON from being written to `.swarm/*.json` files by validating against JSON Schema
2. **Pre-Claim Validation** - Blocks workstream state transitions to `implementing` when blocking dependencies haven't been merged
3. **Workstream Registration Check** - Warns when creating worktrees for unregistered workstreams

The approach balances enforcement with flexibility: Phase 1 and 2 hooks block invalid operations, while Phase 3 warns but allows emergency overrides.

## Changes Overview

| File | Lines Added | Lines Removed | Description |
|------|-------------|---------------|-------------|
| `.claude/hooks/validate-swarm-json.sh` | +71 | 0 | JSON schema validation hook |
| `.claude/hooks/validate-workstream-state.sh` | +80 | 0 | Pre-claim blocking dependency validation |
| `.claude/hooks/verify-worktree-registration.sh` | +68 | 0 | Worktree registration warning hook |
| `.swarm/schemas/instances.schema.json` | +78 | 0 | New schema for instances.json |
| `.claude/settings.local.json` | +16 | 0 | Hook configuration |
| `.claude/skills/implement-worktree/SKILL.md` | +20 | +2 | Registration check in skill |
| `package.json` | +1 | 0 | Added ajv-cli dependency |

**Total**: 7 files changed, ~335 insertions(+), ~2 deletions(-)

## Key Decisions

### Decision 1: Hook Enforcement Levels
**Context**: How strictly should each validation enforce its constraints?
**Options Considered**:
- All hooks block on failure
- All hooks warn only
- Mixed approach based on impact
**Chosen**: Mixed approach
**Rationale**:
- JSON validation blocks (invalid JSON breaks the registry)
- State transition blocks (premature claims cause workflow conflicts)
- Worktree registration warns (allows emergency work while encouraging registration)

### Decision 2: Schema Validation Tool
**Context**: How to validate JSON against schemas
**Options Considered**:
- Custom jq-based validation
- ajv-cli (npm package)
- Python jsonschema
**Chosen**: ajv-cli
**Rationale**: Standard tool, already using npm, supports draft-07, good error messages

### Decision 3: Git Comparison for State Transitions
**Context**: How to detect state changes in workstreams.json
**Options Considered**:
- Cache previous state in temp file
- Use git to compare with HEAD
- Parse file twice (before/after)
**Chosen**: Git comparison with HEAD
**Rationale**: Reliable, no additional state to maintain, works with worktrees

## Trade-offs

| Trade-off | Benefit | Cost | Decision |
|-----------|---------|------|----------|
| Hook on every Write | Catches all invalid writes | Slight latency on writes | Accepted - ajv runs in <1s |
| Warn vs Block for worktree | Allows emergency work | May miss tracking | Warn only - skill enforces blocking |
| ajv-cli dependency | Reliable validation | Another dev dependency | Accepted - minimal overhead |

## Testing Coverage

### Manual Testing Performed
- JSON validation hook with valid workstreams.json: **PASS**
- JSON validation hook skips non-.swarm files: **PASS**
- Worktree registration warning for unregistered workstream: **PASS**

### Validation Results
- Unit Tests: 730 passed
- Lint: PASSED
- Build: PASSED

## Items for Human Review

### Hook Behavior
- [ ] Verify JSON validation error messages are clear enough
- [ ] Confirm blocking behavior for state transitions is appropriate
- [ ] Review warning message wording for worktree registration

### Edge Cases to Consider
- [ ] What happens when `.swarm/workstreams.json` doesn't exist yet?
- [ ] What happens when git repo is in detached HEAD state?
- [ ] How do hooks behave in CI environment without ajv-cli?

## Review Checklist for Humans

### Business Logic
- [x] Hooks enforce documented workflow constraints
- [x] Error messages provide clear remediation steps
- [x] Graceful degradation when tools (jq, ajv) are unavailable

### Code Quality
- [x] Shell scripts follow best practices
- [x] Comments explain purpose and trigger conditions
- [x] Consistent error handling across all hooks

### Security
- [x] Hooks don't expose sensitive data
- [x] Input is properly validated before use
- [x] No command injection vulnerabilities

## How to Test Locally

```bash
# Navigate to worktree
cd ../civ-2026-01-18-workflow-validation-hooks

# Test JSON validation hook
echo '{"tool_input":{"file_path":".swarm/workstreams.json"}}' | \
  CLAUDE_PROJECT_DIR=$(pwd) ./.claude/hooks/validate-swarm-json.sh

# Test worktree registration hook
echo '{"tool_input":{"command":"git worktree add ../test -b feature/2026-01-18-test main"}}' | \
  CLAUDE_PROJECT_DIR=$(pwd) ./.claude/hooks/verify-worktree-registration.sh

# Run tests
npm run test
npm run lint
npm run build
```

## Merge Instructions

After review approval:

```bash
# From main repository
cd /Users/alex/workspace/civ

# Ensure main is up to date
git checkout main
git pull origin main

# Merge the feature branch
git merge feature/2026-01-18-workflow-validation-hooks

# Push to remote
git push origin main

# Clean up worktree (manual)
git worktree remove ../civ-2026-01-18-workflow-validation-hooks

# Delete branch if no longer needed
git branch -d feature/2026-01-18-workflow-validation-hooks
```

## Related Documents

- Plan: `.swarm/plans/2026-01-18-workflow-validation-hooks.md`
- Research: `.swarm/research/2026-01-18-workflow-system-analysis.md`
