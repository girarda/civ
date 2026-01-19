# Research: Workflow System Analysis

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research analyzes the workflow system implemented in `.claude/` and `.swarm/` directories, examining what is enforced via hooks versus left to Claude's discretion, identifying opportunities for increased determinism, and evaluating backend adaptability options. The system represents a sophisticated prompt-engineering-based workflow with minimal enforcement, relying heavily on detailed instructions in markdown files to guide Claude's behavior.

## Key Discoveries

- **Minimal hook enforcement**: Only 3 hooks exist (session logging, summary updates, post-edit linting) - none enforce workflow state
- **Commands are pure documentation**: All 18 `.claude/commands/*.md` files are instructions Claude follows voluntarily
- **Workstream registry is advisory**: The `.swarm/workstreams.json` schema and commands exist but are not enforced by any hook
- **Skills provide reusable patterns**: The `.claude/skills/` directory contains domain-specific prompts for bitECS patterns
- **JSON schema exists but unused programmatically**: `.swarm/schemas/workstream.schema.json` exists but no validation hook
- **Session logging is the only truly enforced behavior**: Hooks capture prompts and summaries automatically

## Architecture Overview

### Directory Structure

```
.claude/
  commands/           # 18 slash commands (documentation for Claude)
    workstream-*.md   # 9 workstream management commands
    rust-bevy-*.md    # 5 Rust/Bevy commands (legacy)
    merge-worktree.md # Git workflow command
  hooks/              # 2 shell scripts (actual enforcement)
    log-prompt.sh     # Logs prompts to JSONL on UserPromptSubmit
    update-summary.sh # Updates session summary on Stop
  logs/               # Session logs (JSONL + metadata + summaries)
  skills/             # Reusable prompt templates
    bitecs/           # 8 ECS pattern skills (component, system, etc.)
    create-skill.md   # Meta-skill for creating new skills
  settings.local.json # Permissions and hook configuration

.swarm/
  workstreams.json    # Central workstream registry (26 entries)
  instances.json      # Active instance tracking (currently empty)
  schemas/            # JSON schema definition
  research/           # 30+ research documents
  plans/              # 15+ plan documents
  checkpoints/        # Phase completion artifacts
  reviews/            # Human review documentation
  validations/        # Test verification artifacts
```

### Workflow State Machine

The system tracks workstreams through 7 states:

```
idea -> research -> planning -> sub_planning -> ready -> implementing -> merged
```

Transitions are documented but NOT enforced:
- State changes happen when commands update `workstreams.json`
- No hook validates that transitions follow the allowed paths
- No hook prevents work on blocked items

## What Is Enforced vs. Discretionary

### Enforced via Hooks (3 behaviors)

| Hook Event | Action | Enforcement Level |
|------------|--------|-------------------|
| `UserPromptSubmit` | Log prompt to session JSONL | Full - always runs |
| `Stop` | Update session summary | Full - always runs |
| `PostToolUse(Edit)` | Run linting | Soft - errors suppressed |

**Code from `/Users/alex/workspace/civ/.claude/settings.local.json`**:
```json
{
  "hooks": {
    "UserPromptSubmit": [{ "command": "log-prompt.sh" }],
    "Stop": [{ "command": "update-summary.sh" }],
    "PostToolUse": [{ "matcher": "Edit", "command": "npm run lint --silent 2>/dev/null || true" }]
  }
}
```

### Discretionary (Claude follows instructions)

| Behavior | Source | Compliance Method |
|----------|--------|-------------------|
| Update workstream registry | `/workstream-update` command | Claude reads instructions |
| Check blocking dependencies | `/workstream-claim` command | Claude reads instructions |
| Create artifacts in correct locations | Command files | Claude reads instructions |
| Follow state machine transitions | Research docs | Claude reads instructions |
| Use hierarchical workstream IDs | Schema documentation | Claude reads instructions |
| Validate JSON before writing | Schema file | Claude reads (no hook) |

### Analysis: Instruction-Based Architecture

The workflow system is essentially a **prompt engineering solution**. Commands like `/workstream-status`, `/workstream-add`, `/workstream-claim` are markdown files containing:

1. **Usage documentation** - How to invoke
2. **Step-by-step instructions** - What Claude should do
3. **Example outputs** - What results should look like
4. **Error handling** - How to respond to edge cases

**Example from `/Users/alex/workspace/civ/.claude/commands/workstream-claim.md`**:
```markdown
### Step 3: Check Claimability

A workstream is claimable if:
1. **State is claimable**: state is one of ready, idea, research, planning
2. **Not already assigned**: implementation.assignedInstance is null
3. **No unmet blocking dependencies**: All type: "blocks" dependencies are in merged state

function isClaimable(workstream, registry, instances) {
  // Check state
  if (workstream.state === 'merged') {
    return { claimable: false, reason: 'Already merged' };
  }
  // ...
}
```

This is pseudo-code documentation that Claude interprets, not executable validation.

## Patterns Found

### 1. Date-Prefixed Artifact Naming

All artifacts use `YYYY-MM-DD-<topic>.md` format:
- Provides chronological sorting
- Prevents name collisions
- Enables date-based queries

### 2. Hierarchical Workstream IDs

IDs use path-like naming:
```
feature-name                 # Top-level
feature-name/phase-1         # Child phase
epic-name/feature-a/phase-1  # Nested hierarchy
```

### 3. Dependency Types

Three relationship types:
- `blocks` - Hard constraint, must complete first
- `informs` - Soft relationship, useful context
- `conflicts` - Mutual exclusion, cannot run concurrently

### 4. Artifact Linking

Workstreams reference artifacts:
```json
"artifacts": {
  "research": ".swarm/research/2026-01-18-topic.md",
  "plan": ".swarm/plans/2026-01-18-feature.md",
  "validation": null,
  "review": null,
  "checkpoints": []
}
```

### 5. Instance Tracking (Designed but Unused)

`instances.json` schema exists but is empty:
```json
{
  "version": 1,
  "lastUpdated": "2026-01-18T23:00:00Z",
  "instances": {}
}
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/.claude/settings.local.json` | Hook configuration, permissions |
| `/Users/alex/workspace/civ/.claude/hooks/log-prompt.sh` | Session prompt logging |
| `/Users/alex/workspace/civ/.claude/hooks/update-summary.sh` | Session summary generation |
| `/Users/alex/workspace/civ/.swarm/workstreams.json` | Central workstream registry |
| `/Users/alex/workspace/civ/.swarm/instances.json` | Instance coordination (empty) |
| `/Users/alex/workspace/civ/.swarm/schemas/workstream.schema.json` | Schema definition |
| `/Users/alex/workspace/civ/.claude/commands/workstream-*.md` | 9 workstream management commands |
| `/Users/alex/workspace/civ/.claude/commands/merge-worktree.md` | Git merge workflow |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-modular-workstream-design.md` | Dependency system design |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-full-lifecycle-tracking.md` | Lifecycle state machine |

## Recommendations: Making Things More Deterministic

### Priority 1: Add Validation Hook (High Impact)

**Current Problem**: JSON schema exists but is never validated

**Solution**: Create a `PostToolUse(Write)` hook that validates `.swarm/*.json` files:

```bash
#!/bin/bash
# .claude/hooks/validate-swarm-json.sh
file_path=$1
if [[ "$file_path" == *".swarm/"*".json" ]]; then
  # Validate against schema
  npx ajv validate -s .swarm/schemas/workstream.schema.json -d "$file_path"
  if [ $? -ne 0 ]; then
    echo "ERROR: Invalid JSON structure"
    exit 1  # Block the write
  fi
fi
exit 0
```

**Benefit**: Prevents malformed workstream entries, enforces schema compliance

### Priority 2: Pre-Claim Validation Hook (Medium Impact)

**Current Problem**: Dependencies and blocking are advisory only

**Solution**: Hook that validates before state changes to `implementing`:

```bash
#!/bin/bash
# Triggered on workstreams.json write
# Check if any workstream changed to "implementing"
# If so, verify all blocking deps are "merged"
```

**Benefit**: Prevents working on blocked items

### Priority 3: Enforce Workstream Registration (Medium Impact)

**Current Problem**: Claude can create worktrees without registering in workstreams.json

**Solution**: Hook on git worktree creation that:
1. Extracts workstream ID from branch name
2. Verifies workstream exists in registry
3. Blocks if not registered

**Benefit**: Ensures all work is tracked

### Priority 4: Heartbeat Enforcement (Low Impact)

**Current Problem**: Instance staleness detection is documented but no heartbeat is written

**Solution**: Update `log-prompt.sh` to also update instance heartbeat:

```bash
# Add to log-prompt.sh
if [ -f ".swarm/instances.json" ]; then
  jq --arg sid "$session_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '(.instances[$sid] // {}).lastHeartbeat = $ts' \
    .swarm/instances.json > .swarm/instances.json.tmp
  mv .swarm/instances.json.tmp .swarm/instances.json
fi
```

**Benefit**: Enables stale instance detection

### Trade-offs

| Approach | Determinism | Complexity | Flexibility |
|----------|-------------|------------|-------------|
| Current (all advisory) | Low | Low | High |
| Validation hooks | Medium | Medium | Medium |
| Full enforcement | High | High | Low |

**Recommendation**: Add validation hooks (Priority 1-2) while keeping commands advisory. This provides guardrails without removing Claude's ability to handle edge cases.

## Backend Adaptability Analysis

### Current Backend

- **Storage**: Local JSON files in `.swarm/`
- **Pros**: No dependencies, version controlled, human readable
- **Cons**: No concurrent access handling, no indexing, local only

### Potential Backend Options

| Backend | Use Case | Implementation Effort | Benefits |
|---------|----------|----------------------|----------|
| Local files (current) | Solo developer | Already done | Simple, portable |
| SQLite | Multi-instance | Medium | Concurrent access, queries |
| GitHub Issues | Team collaboration | Medium | External visibility, API |
| Linear | Team project management | Medium | Rich UI, integrations |
| Custom API | Full customization | High | Complete control |

### Adaptability Assessment

**Can the system be adapted? Yes, with moderate effort.**

The workstream system has clear abstractions:

1. **Data Model** - Well-defined in `workstream.schema.json`
2. **Commands** - Read/write operations on workstream entities
3. **Queries** - "What's ready?", "What's blocked?", "Who's working on what?"

**Adapter Interface** (conceptual):

```typescript
interface WorkstreamBackend {
  // Read operations
  getWorkstream(id: string): Promise<Workstream | null>;
  listWorkstreams(filter?: WorkstreamFilter): Promise<Workstream[]>;

  // Write operations
  createWorkstream(data: CreateWorkstreamInput): Promise<Workstream>;
  updateWorkstream(id: string, updates: Partial<Workstream>): Promise<Workstream>;

  // Instance coordination
  claimWorkstream(workstreamId: string, instanceId: string): Promise<boolean>;
  releaseWorkstream(workstreamId: string): Promise<void>;

  // Sync
  sync(direction: 'push' | 'pull' | 'both'): Promise<SyncResult>;
}
```

### Implementation Strategy

**Phase 1: Abstract current implementation**
- Create `LocalFileBackend` implementing the interface
- Refactor commands to use backend interface

**Phase 2: Add alternative backends**
- `SQLiteBackend` for local multi-instance
- `GitHubBackend` for issue-based tracking
- `LinearBackend` for team workflow

**Phase 3: Configuration**
```json
// .swarm/config.json
{
  "backend": {
    "type": "github",
    "repo": "owner/repo",
    "labelPrefix": "workstream:"
  }
}
```

### Is It Worth Doing?

**Analysis by use case**:

| Scenario | Worth It? | Reason |
|----------|-----------|--------|
| Solo developer | No | Current JSON is sufficient |
| 2-6 local instances | Maybe | SQLite would help with locking |
| Remote team | Yes | GitHub/Linear provides visibility |
| CI/CD integration | Yes | API access enables automation |

**Recommendation**:
- **Short term**: No - current file-based approach is working
- **Medium term**: Yes for SQLite - enables proper multi-instance coordination
- **Long term**: Consider GitHub/Linear if team collaboration needed

The abstraction effort is worthwhile because:
1. It clarifies the data model
2. It enables testing with mock backends
3. It prepares for future scaling without rewriting commands

## Open Questions

1. **Hook execution context**: Can hooks reliably access session ID to update instance tracking?

2. **Atomic writes across instances**: Current JSON approach uses temp file + mv. Is this sufficient for 2-6 concurrent instances?

3. **Schema evolution**: How to handle workstream schema changes without breaking existing data?

4. **Offline support**: If using remote backend (GitHub/Linear), how to handle offline scenarios?

5. **Migration path**: For each backend option, what's the data migration strategy?

6. **Cost/benefit of enforcement**: Does adding hooks for enforcement reduce flexibility too much? Would validation warnings (instead of blocks) be better?

## Conclusion

The workflow system is a sophisticated **prompt-engineering solution** where behavior is guided by detailed markdown instructions rather than enforced by code. This design provides flexibility but relies on Claude correctly interpreting and following instructions.

**Key findings**:

1. **Only session logging is enforced** - Everything else is advisory
2. **Rich documentation exists** - Commands, schemas, and research provide comprehensive guidance
3. **Infrastructure for enforcement exists** - Hook system could support more validation
4. **Backend is easily abstractable** - Clear data model enables adapter pattern

**Recommendations**:

1. Add JSON validation hook (Priority 1) - Prevents malformed data
2. Add blocking dependency check (Priority 2) - Prevents working on blocked items
3. Keep commands advisory - Maintains flexibility for edge cases
4. Consider SQLite for multi-instance (Medium term) - Solves concurrent access
5. Defer remote backends (Long term) - Only needed for team scenarios

The system represents a pragmatic balance between structure and flexibility, using Claude's instruction-following capabilities as the primary coordination mechanism. Incremental additions of validation hooks can increase determinism without sacrificing the benefits of the current approach.
