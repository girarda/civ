# Research: Workflow Scaling for Multi-Instance Development

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research explores scaling challenges when managing 2-6 concurrent Claude Code instances with the current todo.txt-based workflow. The existing infrastructure (.swarm/, .claude/skills/, hooks) provides solid foundations but lacks explicit multi-instance coordination, feature lifecycle tracking, and centralized workstream visibility. Key recommendations include introducing a structured workstream registry, session-to-feature binding, and shared state files that multiple instances can read/write safely.

## Key Discoveries

- **Extensive existing infrastructure**: The `.swarm/` directory contains 85+ files across research, plans, checkpoints, reviews, and validations
- **Rich skill system**: The `/implement-worktree` skill (1999 lines) provides comprehensive feature implementation workflow with phased execution
- **Session logging exists**: Hooks in `.claude/hooks/` log prompts and session metadata to `.claude/logs/`
- **No centralized workstream tracking**: Features are tracked implicitly through file naming conventions (YYYY-MM-DD-feature-name.md)
- **Worktree isolation solved**: Port derivation and `.env.local` generation documented in `.swarm/research/2026-01-18-solo-worktree-workflow-improvements.md`
- **Missing pieces**: No todo.txt found, no instance coordination, no feature lifecycle state machine

## Current Workflow Analysis

### The Research -> Plan -> Implement Pipeline

The user's workflow follows a clear pattern:

```
Think of something
     |
     v
Research (.swarm/research/YYYY-MM-DD-topic.md)
     |
     v
Plan (.swarm/plans/YYYY-MM-DD-feature.md)
     |
     v
[Optional] Phase-specific planning
     |
     v
Implement in worktree (/implement-worktree command)
     |
     v
Merge back to main (/merge-worktree command)
```

### Existing Infrastructure Inventory

| Component | Location | Purpose |
|-----------|----------|---------|
| Research docs | `.swarm/research/*.md` | Problem exploration, design decisions |
| Plans | `.swarm/plans/*.md` | Phased implementation specifications |
| Checkpoints | `.swarm/checkpoints/*.md` | Phase completion snapshots |
| Reviews | `.swarm/reviews/*.md` | Human review documentation |
| Validations | `.swarm/validations/*.md` | Test and criteria verification |
| Skills | `.claude/skills/` | Reusable command definitions |
| Commands | `.claude/commands/` | Project-specific commands |
| Hooks | `.claude/hooks/` | Session logging automation |
| Session logs | `.claude/logs/` | Per-session JSONL + metadata |

### File Naming Convention

All `.swarm/` files follow: `YYYY-MM-DD-<kebab-case-topic>.md`

This provides:
- Chronological sorting
- Date-based filtering
- Clear topic identification

But lacks:
- Status indicators
- Priority levels
- Instance ownership
- Dependencies between items

## Pain Points Analysis

### 1. No Single Source of Truth for Active Work

**Problem**: With 2-6 instances running, there's no way to see:
- What features are currently being worked on
- Which instance is working on what
- What's blocked vs. in-progress vs. ready-for-review

**Evidence**: The git history shows merges from multiple feature branches, but discovering active work requires scanning the entire `.swarm/` directory.

### 2. Instance Coordination is Manual

**Problem**: Instances don't know about each other. Risk of:
- Duplicate research on same topic
- Conflicting plan modifications
- Race conditions on shared files

**Evidence**: No lock files, no instance registry, no coordination protocol in existing infrastructure.

### 3. Feature Lifecycle Not Explicit

**Problem**: A feature's state (idea -> research -> plan -> implement -> review -> merged) is implicit in which files exist.

**Evidence**: To know if "player-faction-tracking" is complete, you must check:
1. Does `.swarm/research/2026-01-18-player-faction-tracking.md` exist? (researched)
2. Does `.swarm/plans/2026-01-18-player-faction-tracking.md` exist? (planned)
3. Does `.swarm/validations/2026-01-18-player-faction-tracking.md` exist? (validated)
4. Is the branch merged? (requires git check)

### 4. Todo.txt Doesn't Scale

**Problem**: A simple todo.txt works for 1 instance but fails when:
- Multiple instances need to claim work items
- Items have dependencies
- Items span multiple phases
- Status needs sub-states (researching, planning, implementing phase 2, etc.)

**Evidence**: User explicitly mentioned this pain point.

### 5. Session-to-Feature Binding Missing

**Problem**: Session logs exist but don't link to feature context. Can't answer:
- "Which sessions worked on the combat system?"
- "What was the outcome of session X?"

**Evidence**: Session metadata only tracks prompt count and timestamps, not feature/workstream association.

## Architecture Overview

### Current File Flow

```
User Request
     |
     v
+----------------+     +------------------+     +-------------------+
| Claude Session | --> | Session Logs     | --> | .claude/logs/     |
+----------------+     | (via hooks)      |     | session_*.jsonl   |
     |                 +------------------+     +-------------------+
     |
     v (research)
+------------------+
| Research Doc     | --> .swarm/research/YYYY-MM-DD-topic.md
+------------------+
     |
     v (planning)
+------------------+
| Plan Doc         | --> .swarm/plans/YYYY-MM-DD-feature.md
+------------------+
     |
     v (implementation)
+------------------+     +------------------+     +------------------+
| Worktree Created | --> | Checkpoints      | --> | Review Doc       |
| (git worktree)   |     | (per phase)      |     | (for humans)     |
+------------------+     +------------------+     +------------------+
     |
     v (merge)
+------------------+
| Merge to Main    | --> Worktree + branch deleted
+------------------+
```

### Missing Components

```
                    +---------------------+
                    | Workstream Registry | <-- MISSING
                    | (active features)   |
                    +---------------------+
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
+---------------+   +---------------+   +---------------+
| Instance 1    |   | Instance 2    |   | Instance 3    |
| (session A)   |   | (session B)   |   | (session C)   |
+---------------+   +---------------+   +---------------+
        |                   |                   |
        v                   v                   v
+-------------------------------------------------------------+
| Shared State (.swarm/state/)                                | <-- MISSING
| - workstreams.json: all features and their states           |
| - instances.json: active instances and their assignments    |
| - queue.json: pending work items with priorities            |
+-------------------------------------------------------------+
```

## Patterns Found

### Successful Patterns in Current Workflow

1. **Date-prefixed naming**: Provides natural ordering and prevents name collisions
2. **Separation of concerns**: Research, plans, and checkpoints are clearly separated
3. **Checkpoint recovery**: Phases can be resumed from checkpoints
4. **Human review gate**: Reviews require explicit human approval before merge

### Patterns from E2E Roadmap Research

The `.swarm/research/2026-01-18-e2e-game-roadmap.md` demonstrates effective parallel workstream thinking:

| Stream | Can Start | Blocks | Parallel With |
|--------|-----------|--------|---------------|
| A: Units | Now | B, D, F | C, (early E) |
| B: Cities | After A1 | E, (some F) | C, D |
| C: Turns | Now | - | A, B, D, E |

This pattern could be generalized into a workstream coordination system.

### Worktree Isolation Pattern

From `.swarm/research/2026-01-18-solo-worktree-workflow-improvements.md`:

```bash
# Derive port from branch name for isolation
branch_name="feature/2026-01-18-my-feature"
port_offset=$(echo -n "$branch_name" | md5sum | cut -c1-4)
port_decimal=$((16#$port_offset % 999 + 3001))
```

This deterministic port derivation prevents conflicts when running multiple worktrees.

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Primary implementation workflow (1999 lines) |
| `/Users/alex/workspace/civ/.claude/commands/merge-worktree.md` | Merge-to-main workflow with E2E artifacts |
| `/Users/alex/workspace/civ/.claude/hooks/log-prompt.sh` | Session prompt logging |
| `/Users/alex/workspace/civ/.claude/hooks/update-summary.sh` | Session summary generation |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-e2e-game-roadmap.md` | Example of parallel workstream analysis |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-solo-worktree-workflow-improvements.md` | Worktree isolation patterns |
| `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-implement-worktree-flow.md` | Recent workflow enhancement plan |

## Recommendations

### 1. Introduce Workstream Registry (Priority: High)

Create `.swarm/workstreams.json` as single source of truth:

```json
{
  "workstreams": [
    {
      "id": "player-faction-tracking",
      "title": "Player/Faction Tracking System",
      "status": "merged",
      "priority": 1,
      "created": "2026-01-18",
      "updated": "2026-01-18T23:24:00Z",
      "phase": "complete",
      "assignedInstance": null,
      "dependencies": ["turn-system"],
      "artifacts": {
        "research": ".swarm/research/2026-01-18-player-faction-tracking.md",
        "plan": ".swarm/plans/2026-01-18-player-faction-tracking.md",
        "validation": ".swarm/validations/2026-01-18-player-faction-tracking.md",
        "review": ".swarm/reviews/2026-01-18-player-faction-tracking.md"
      },
      "branch": "feature/2026-01-18-player-faction-tracking",
      "mergedAt": "2026-01-18T22:00:00Z"
    }
  ]
}
```

**Benefits**:
- Single query to see all workstreams and their states
- Explicit dependency tracking
- Instance assignment tracking
- Artifact paths centralized

### 2. Create Instance Registry (Priority: High)

Create `.swarm/instances.json` for instance coordination:

```json
{
  "instances": [
    {
      "sessionId": "d4fdf0da-7bc1-4891-a72e-82bf8da599da",
      "startedAt": "2026-01-18T20:00:00Z",
      "lastHeartbeat": "2026-01-18T23:24:00Z",
      "workingOn": "combat-system",
      "worktree": "../civ-2026-01-18-combat-system",
      "phase": "implementing",
      "currentTask": "D2. Combat Calculation"
    }
  ],
  "lastUpdated": "2026-01-18T23:24:00Z"
}
```

**Coordination protocol**:
1. Instance starts: Register in instances.json
2. Instance claims work: Update workstream assignedInstance
3. Instance completes: Clear assignment, update workstream status
4. Instance crashes: Heartbeat timeout -> work becomes unassigned

### 3. Implement Work Queue (Priority: Medium)

Create `.swarm/queue.json` to replace todo.txt:

```json
{
  "queue": [
    {
      "id": "q-001",
      "type": "feature",
      "title": "Fog of War",
      "priority": 2,
      "status": "pending",
      "dependencies": ["unit-system", "vision-system"],
      "blockedBy": ["vision-system"],
      "estimatedPhases": 3,
      "notes": "Depends on unit vision radius implementation"
    },
    {
      "id": "q-002",
      "type": "bugfix",
      "title": "Hover highlight offset bug",
      "priority": 1,
      "status": "in-progress",
      "assignedTo": "session-abc123",
      "workstream": "hover-highlight-bug"
    }
  ]
}
```

**Benefits over todo.txt**:
- Structured data enables queries
- Dependencies are explicit
- Status is machine-readable
- Priority levels supported

### 4. Add Status Commands (Priority: Medium)

Create new slash commands for workflow management:

**`/workstream-status`**: Show all active workstreams
```
Active Workstreams:
1. [implementing] combat-system (session d4fd...) - Phase 2/4
2. [researching] fog-of-war (session abc1...) - Research
3. [ready] notification-system - Waiting for assignment

Merged Today: 3
Blocked: 1 (fog-of-war blocked by vision-system)
```

**`/claim-work <workstream-id>`**: Assign current instance to workstream

**`/release-work`**: Unassign current instance from workstream

**`/queue-add <title> --priority <1-5>`**: Add item to work queue

### 5. Enhance Session Logging (Priority: Low)

Modify hooks to include workstream context:

```bash
# In log-prompt.sh, add workstream context
workstream=$(cat .swarm/instances.json | jq -r ".instances[] | select(.sessionId == \"$session_id\") | .workingOn // \"unassigned\"")

# Include in log entry
echo "{...existing..., \"workstream\": \"$workstream\"}" >> "$session_log"
```

### 6. Create Workflow Dashboard Skill (Priority: Low)

Create `.claude/skills/workflow-dashboard/SKILL.md`:

```markdown
---
name: workflow-dashboard
description: Displays current workflow status including active workstreams, instance assignments, and work queue. Use when needing overview of project progress or checking what to work on next.
user-invocable: true
---

# Workflow Dashboard

## When to Use
- Starting a new session and need to pick up work
- Checking what other instances are working on
- Finding unblocked work items
- Reviewing overall project progress

## Actions
1. Read .swarm/workstreams.json for feature states
2. Read .swarm/instances.json for active instances
3. Read .swarm/queue.json for pending work
4. Generate summary report
```

## Implementation Phases

### Phase 1: Foundation (Effort: Small)

- [ ] Create `.swarm/workstreams.json` with current workstreams migrated from file scan
- [ ] Create `.swarm/instances.json` (empty initially)
- [ ] Create `.swarm/queue.json` (migrate from any existing todo.txt)
- [ ] Document JSON schemas in `.swarm/schemas/`

### Phase 2: Commands (Effort: Medium)

- [ ] Create `/workstream-status` command
- [ ] Create `/claim-work` command
- [ ] Create `/release-work` command
- [ ] Create `/queue-add` command
- [ ] Update `/implement-worktree` to register instance and claim workstream

### Phase 3: Integration (Effort: Medium)

- [ ] Modify session hooks to include workstream context
- [ ] Add heartbeat mechanism (update lastHeartbeat on each prompt)
- [ ] Add stale instance detection (heartbeat > 1 hour old)
- [ ] Create `/workflow-dashboard` skill

### Phase 4: Automation (Effort: Large)

- [ ] Auto-update workstream status based on file existence
- [ ] Auto-suggest next work item based on dependencies
- [ ] Detect and warn about potential conflicts
- [ ] Generate daily/weekly progress reports

## Integration with Existing Commands

### `/implement-worktree` Integration

Add to Section 1 (Worktree Setup):

```bash
# After worktree creation, register instance and claim workstream
workstream_id=$(basename "$plan_file_path" .md)

# Update instances.json
cat .swarm/instances.json | jq \
  --arg sid "$session_id" \
  --arg ws "$workstream_id" \
  --arg wt "$worktree_dir" \
  '.instances += [{sessionId: $sid, workingOn: $ws, worktree: $wt, startedAt: now}]' \
  > .swarm/instances.json.tmp && mv .swarm/instances.json.tmp .swarm/instances.json

# Update workstreams.json
cat .swarm/workstreams.json | jq \
  --arg ws "$workstream_id" \
  --arg sid "$session_id" \
  '(.workstreams[] | select(.id == $ws)).assignedInstance = $sid | (.workstreams[] | select(.id == $ws)).status = "implementing"' \
  > .swarm/workstreams.json.tmp && mv .swarm/workstreams.json.tmp .swarm/workstreams.json
```

### `/merge-worktree` Integration

Add to completion section:

```bash
# After successful merge, update workstream status
workstream_id=$(basename "$branch_name" | sed 's/feature\///')

cat .swarm/workstreams.json | jq \
  --arg ws "$workstream_id" \
  '(.workstreams[] | select(.id == $ws)).status = "merged" | (.workstreams[] | select(.id == $ws)).assignedInstance = null | (.workstreams[] | select(.id == $ws)).mergedAt = now' \
  > .swarm/workstreams.json.tmp && mv .swarm/workstreams.json.tmp .swarm/workstreams.json

# Remove instance registration
cat .swarm/instances.json | jq \
  --arg sid "$session_id" \
  '.instances = [.instances[] | select(.sessionId != $sid)]' \
  > .swarm/instances.json.tmp && mv .swarm/instances.json.tmp .swarm/instances.json
```

## File Locking Considerations

When multiple instances write to shared JSON files, race conditions are possible. Mitigation strategies:

1. **Advisory locking**: Use `flock` before writing
   ```bash
   (
     flock -x 200
     # Write to file
   ) 200>.swarm/workstreams.lock
   ```

2. **Atomic writes**: Write to temp file, then `mv` (as shown above)

3. **Optimistic concurrency**: Read version, write with version check
   ```json
   {
     "version": 42,
     "workstreams": [...]
   }
   ```

4. **Conflict detection**: If write fails due to version mismatch, re-read and retry

Recommendation: Start with atomic writes (simplest), add flock if conflicts observed.

## Open Questions

1. **Heartbeat frequency**: How often should instances update lastHeartbeat? Every prompt seems reasonable but could be noisy.

2. **Stale timeout**: How long before an instance is considered crashed? 1 hour? 4 hours? Configurable?

3. **Dependency resolution**: Should the system automatically suggest which blocked items become unblocked when a dependency completes?

4. **Historical tracking**: Should completed workstreams remain in workstreams.json forever, or archive to a separate file?

5. **Cross-project coordination**: If user has multiple projects with multiple instances each, should there be a global registry in `~/.claude/`?

6. **Notification mechanism**: When work becomes unblocked or a workstream needs attention, how to notify? Terminal notification? File watcher?

## Alternative Approaches Considered

### SQLite Instead of JSON

**Pros**: Better concurrent access, query capability
**Cons**: Adds dependency, harder to inspect manually, overkill for 2-6 instances
**Decision**: JSON is sufficient; simpler and human-readable

### Git-Based Coordination

**Pros**: Natural versioning, conflict detection via merge
**Cons**: Requires commits for every state change, slow for high-frequency updates
**Decision**: JSON files are simpler; git is for code, not coordination state

### External Service (Redis, etc.)

**Pros**: Built for concurrent access, pub/sub capability
**Cons**: External dependency, deployment complexity
**Decision**: File-based is sufficient and self-contained

## Conclusion

The current workflow infrastructure is solid for single-instance development but lacks explicit multi-instance coordination. The recommended approach introduces:

1. **Workstream registry** for feature lifecycle tracking
2. **Instance registry** for coordination between concurrent sessions
3. **Work queue** to replace unstructured todo.txt
4. **Commands** for status visibility and work claiming
5. **Integration** with existing /implement-worktree and /merge-worktree flows

This can be implemented incrementally, starting with the JSON registries and adding commands as needed. The file-based approach keeps everything self-contained within the repository without external dependencies.
