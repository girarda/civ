# Plan: Modular Workstream Tracking System

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement a workstream tracking system that replaces `TODOs.txt` with a structured JSON registry supporting hierarchical workstreams, typed dependencies, and multi-instance coordination. The system tracks features through their complete lifecycle (idea to merged) and answers critical questions: "What can I work on?", "What's blocking X?", and "Who's working on what?". Designed for 2-6 concurrent Claude Code instances.

## Research Summary

Key findings from three research documents:

**From workflow-scaling.md**:
- Existing `.swarm/` infrastructure contains 85+ files but lacks centralized tracking
- No instance coordination, todo.txt doesn't scale for multi-instance workflows
- Recommended file-based JSON registries with atomic writes for concurrency

**From full-lifecycle-tracking.md**:
- Seven lifecycle states: `idea` > `research` > `planning` > `sub_planning` > `ready` > `implementing` > `merged`
- Commands (`/research`, `/plan`, `/implement-worktree`, `/merge-worktree`) operate independently without shared state
- Registry should auto-update on command execution, with manual override available

**From modular-workstream-design.md**:
- Hierarchical IDs (e.g., `cli-integration-architecture/phase-2`) enable natural parent/child relationships
- Three dependency types: `blocks` (hard), `informs` (soft), `conflicts` (mutual exclusion)
- DAG-based queries enable "find ready work" and "what becomes unblocked" operations
- Phases can be inline (simple features) or promoted to full workstreams (complex features)

## Phased Implementation

### Phase 1: Core Registry and Status Command

**Goal**: Immediate visibility into all workstreams with a single command.

- [x] Create `.swarm/workstreams.json` with version 2 schema supporting hierarchical IDs
- [x] Create `.swarm/instances.json` for session tracking
- [x] Create `.claude/commands/workstream-status.md` command that displays:
  - All workstreams grouped by state
  - Blocked workstreams with blocker info
  - Active instances and their assignments
- [x] Create `.claude/commands/workstream-add.md` command for registering new ideas/workstreams
- [x] Create `.claude/commands/workstream-update.md` command for manual state/metadata updates
- [x] Seed registry with current workstreams by scanning `.swarm/` artifacts and `TODOs.txt`

**Files to Create**:
| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.swarm/workstreams.json` | Create |
| `/Users/alex/workspace/civ/.swarm/instances.json` | Create |
| `/Users/alex/workspace/civ/.swarm/schemas/workstream.schema.json` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-status.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-add.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-update.md` | Create |

**Success Criteria**:
- [ ] Running `/workstream-status` shows all workstreams grouped by state
- [ ] Running `/workstream-add "Fog of War" --priority 2` creates a new workstream entry
- [ ] Running `/workstream-update fog-of-war --state research` updates the state
- [ ] Registry includes workstreams migrated from existing `.swarm/` artifacts
- [ ] JSON schema validates workstream structure

**Example Usage**:
```
> /workstream-status

Workstream Status (2026-01-18)
==============================

IDEAS (2):
  - fog-of-war: Fog of War [P3]
  - server-client-arch: Server-Client Architecture [P4]

RESEARCH (0):

READY (2):
  - notification-system: Notification System [P2]
  - production-queue: Production Queue [P2]

IMPLEMENTING (2):
  - cli-integration-architecture: CLI Integration Architecture [P1]
    Phase 2/5, assigned to session:abc123
  - player-faction-tracking/phase-3: Victory Tracking Phase 3 [P1]
    assigned to session:def456

MERGED TODAY (1):
  - player-faction-tracking/phase-1

BLOCKED (1):
  - fog-of-war
    Blocked by: player-faction-tracking (state: implementing)
```

**Dependencies**: None (standalone phase)

---

### Phase 2: Dependency Graph and Query Commands

**Goal**: Answer "What can I work on?" and "What's blocking X?" with dependency-aware queries.

- [x] Create `.claude/commands/workstream-ready.md` command that lists unblocked, unassigned workstreams
- [x] Create `.claude/commands/workstream-blocked.md` command that shows blocking analysis for a workstream
- [x] Create `.claude/commands/workstream-unblocks.md` command that shows what completing X would unblock
- [x] Implement dependency resolution algorithms (from research doc):
  - `findReadyWork()`: workstreams where all `blocks` deps are complete and not assigned
  - `findBlockers()`: recursive traversal of blocking dependencies
  - `findUnblockedBy()`: reverse dependency lookup
- [x] Add dependency validation on registry writes (no circular deps, targets exist)

**Files to Create/Modify**:
| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/commands/workstream-ready.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-blocked.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-unblocks.md` | Create |

**Success Criteria**:
- [ ] `/workstream-ready` lists only workstreams with all blocking deps complete
- [ ] `/workstream-ready --priority` sorts by priority
- [ ] `/workstream-blocked fog-of-war` shows full dependency chain
- [ ] `/workstream-unblocks cli-integration-architecture/phase-2` shows what becomes ready
- [ ] Circular dependency detection prevents invalid registry states

**Example Usage**:
```
> /workstream-ready

Ready to Start (3):
  1. [P1] production-queue - Production Queue
     No blockers, no conflicts
  2. [P2] notification-system - Notification System
     No blockers, informs: cli-integration-architecture/phase-3
  3. [P3] hover-highlight-bug-fix - Hover Highlight Bug Fix
     No blockers

> /workstream-blocked fog-of-war

Blocking Analysis: fog-of-war
=============================
State: idea
Direct Blockers:
  - player-faction-tracking (implementing) - "Requires per-player visibility tracking"

Transitive Blockers:
  player-faction-tracking
    +-- player-faction-tracking/phase-3 (implementing)
    +-- player-faction-tracking/phase-4 (blocked)

Estimated unblock: When player-faction-tracking reaches merged state
```

**Dependencies**: Phase 1 (requires registry and basic commands)

---

### Phase 3: Command Integration Hooks

**Goal**: Automatically update registry when `/research`, `/plan`, `/implement-worktree`, `/merge-worktree` execute.

- [x] Add pre/post sections to `/research` command (user-level or workspace):
  - Pre: Check if workstream exists, create if not
  - Post: Update state to `research`, link artifact
  - Note: Documented as manual integration point; `/research` command not yet created
- [x] Add pre/post sections to `/plan` command:
  - Pre: Check for existing workstream (may come from research)
  - Post: Update state to `planning` or `ready`, link artifact
  - Note: Documented as manual integration point; `/plan` command not yet created
- [x] Add registry integration to `/implement-worktree` skill:
  - On start: Set state to `implementing`, set `assignedInstance`
  - On phase complete: Update `currentPhase`
  - Create checkpoint: Link artifact
- [x] Add registry integration to `/merge-worktree` command:
  - On complete: Set state to `merged`, clear `assignedInstance`, set `mergedAt`
- [x] Create helper script `.swarm/scripts/update-registry.sh` for atomic JSON updates

**Files to Create/Modify**:
| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Modify |
| `/Users/alex/workspace/civ/.claude/commands/merge-worktree.md` | Modify |
| `/Users/alex/workspace/civ/.swarm/scripts/update-registry.sh` | Create |

**Note**: The `/research` and `/plan` commands may need to be created as workspace commands if they don't exist, or documented as manual integration points.

**Success Criteria**:
- [ ] Running `/implement-worktree .swarm/plans/2026-01-18-foo.md` updates `foo` workstream to `implementing`
- [ ] Running `/merge-worktree` updates workstream to `merged` and clears assignment
- [ ] Workstream artifacts (research, plan, validation, review) auto-linked on creation
- [ ] Instance ID correctly recorded in `assignedInstance` field
- [ ] Phase progress updates in real-time during implementation

**Example Behavior**:
```
# Before /implement-worktree
{
  "id": "notification-system",
  "state": "ready",
  "implementation": { "assignedInstance": null }
}

# After /implement-worktree starts
{
  "id": "notification-system",
  "state": "implementing",
  "implementation": {
    "branch": "feature/2026-01-18-notification-system",
    "worktree": "../civ-2026-01-18-notification-system",
    "assignedInstance": "session-abc123",
    "currentPhase": 1,
    "totalPhases": 4
  }
}
```

**Dependencies**: Phase 1 (requires registry), Phase 2 helpful but not required

---

### Phase 4: Instance Coordination

**Goal**: Support 2-6 concurrent instances with claim/release semantics and conflict detection.

- [x] Create `.claude/commands/workstream-claim.md` command:
  - Verify workstream is claimable (ready state, all blockers complete)
  - Check for conflicts with in-progress work
  - Set `assignedInstance`, update state if needed
  - Register instance in `instances.json`
- [x] Create `.claude/commands/workstream-release.md` command:
  - Clear `assignedInstance`
  - Optionally add notes about pause reason
  - Remove from `instances.json`
- [x] Add heartbeat mechanism via `.claude/hooks/`:
  - Update `lastHeartbeat` on each prompt
  - Detect stale instances (>1 hour without heartbeat)
- [x] Add conflict detection:
  - Check `conflicts` dependency type when claiming
  - Warn but allow override for soft conflicts
- [x] Create `.claude/commands/workstream-instances.md` to show active instances

**Files to Create/Modify**:
| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/commands/workstream-claim.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-release.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-instances.md` | Create |
| `/Users/alex/workspace/civ/.claude/hooks/update-heartbeat.sh` | Create |

**Success Criteria**:
- [ ] `/workstream-claim notification-system` assigns current session and updates state
- [ ] `/workstream-claim` fails gracefully if workstream already assigned to active instance
- [ ] `/workstream-release` clears assignment and allows re-claim
- [ ] Stale instances (>1 hour) have their claims automatically released
- [ ] `/workstream-instances` shows all active sessions and their assignments
- [ ] Conflict detection warns when claiming work that conflicts with in-progress work

**Example Usage**:
```
> /workstream-claim notification-system

Claiming: notification-system
-----------------------------
Status: Success
State: ready -> implementing
Assigned to: session-abc123

Note: This workstream has an 'informs' relationship with:
  - cli-integration-architecture/phase-3
  Consider coordinating with that work.

> /workstream-instances

Active Instances (3)
====================
session-abc123 (this session)
  Working on: notification-system
  Since: 2026-01-18 20:00
  Last activity: 2 minutes ago

session-def456
  Working on: cli-integration-architecture/phase-2
  Since: 2026-01-18 18:30
  Last activity: 5 minutes ago

session-ghi789
  Working on: player-faction-tracking/phase-3
  Since: 2026-01-18 19:00
  Last activity: 45 minutes ago (approaching stale)
```

**Dependencies**: Phase 1 (requires registry), Phase 3 (requires integration hooks)

---

### Phase 5: Migration and Sync

**Goal**: Import existing artifacts, deprecate `TODOs.txt`, provide recovery mechanisms.

- [x] Create `.claude/commands/workstream-import.md` command:
  - Parse `TODOs.txt` structure into workstream entries
  - Scan `.swarm/research/`, `.swarm/plans/` for orphaned artifacts
  - Link artifacts to existing or new workstreams
  - Report migration summary
- [x] Create `.claude/commands/workstream-sync.md` command:
  - Reconcile registry with filesystem artifacts
  - Detect orphaned workstreams (no matching artifacts)
  - Detect unregistered artifacts
  - Auto-fix or report discrepancies
- [x] Create `.claude/commands/workstream-export.md` command:
  - Generate `TODOs.txt` format from registry (for backward compatibility)
  - Generate Mermaid dependency graph
  - Generate JSON and Markdown formats
- [x] Update `TODOs.txt` to note deprecation and point to `/workstream-status`
- [x] Add validation warnings for common issues:
  - Workstream in `implementing` but no worktree exists
  - Artifact files missing for registered workstreams
  - Stale instances still listed as active

**Files to Create/Modify**:
| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/.claude/commands/workstream-import.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-sync.md` | Create |
| `/Users/alex/workspace/civ/.claude/commands/workstream-export.md` | Create |
| `/Users/alex/workspace/civ/TODOs.txt` | Modify (add deprecation notice) |

**Success Criteria**:
- [ ] `/workstream-import` successfully migrates `TODOs.txt` entries to registry
- [ ] `/workstream-sync` detects and reports registry/filesystem discrepancies
- [ ] `/workstream-export --todos` generates `TODOs.txt` compatible format
- [ ] `/workstream-export --mermaid` generates dependency graph visualization
- [ ] `TODOs.txt` contains deprecation notice pointing to `/workstream-status`
- [ ] No data loss during migration (all `TODOs.txt` items preserved)

**Example Usage**:
```
> /workstream-import

Importing from TODOs.txt and .swarm/ artifacts...
=================================================

From TODOs.txt:
  - resources-visible-bug: Created as idea
  - solo-worktree-improvements: Created as ready (has plan)
  - server-client-arch: Created as idea
  - victory: Created as epic with 4 children

From .swarm/research/:
  - notification-system: Linked research artifact
  - cli-integration-architecture: Linked research artifact

From .swarm/plans/:
  - notification-system: State updated to ready
  - 15 plan artifacts linked

Summary:
  - Workstreams created: 8
  - Artifacts linked: 23
  - Skipped (already exists): 12

TODOs.txt has been marked as deprecated.
Run /workstream-status to see all workstreams.
```

**Dependencies**: Phase 1 (requires registry), Phase 3 (for artifact linking)

## Files to Create/Modify Summary

| File | Action | Phase |
|------|--------|-------|
| `.swarm/workstreams.json` | Create | 1 |
| `.swarm/instances.json` | Create | 1 |
| `.swarm/schemas/workstream.schema.json` | Create | 1 |
| `.claude/commands/workstream-status.md` | Create | 1 |
| `.claude/commands/workstream-add.md` | Create | 1 |
| `.claude/commands/workstream-update.md` | Create | 1 |
| `.claude/commands/workstream-ready.md` | Create | 2 |
| `.claude/commands/workstream-blocked.md` | Create | 2 |
| `.claude/commands/workstream-unblocks.md` | Create | 2 |
| `.claude/skills/implement-worktree/SKILL.md` | Modify | 3 |
| `.claude/commands/merge-worktree.md` | Modify | 3 |
| `.swarm/scripts/update-registry.sh` | Create | 3 |
| `.claude/commands/workstream-claim.md` | Create | 4 |
| `.claude/commands/workstream-release.md` | Create | 4 |
| `.claude/commands/workstream-instances.md` | Create | 4 |
| `.claude/hooks/update-heartbeat.sh` | Create | 4 |
| `.claude/commands/workstream-import.md` | Create | 5 |
| `.claude/commands/workstream-sync.md` | Create | 5 |
| `.claude/commands/workstream-export.md` | Create | 5 |
| `TODOs.txt` | Modify | 5 |

## Success Criteria (Overall)

- [ ] `TODOs.txt` successfully replaced by workstream registry
- [ ] All existing workstreams migrated with no data loss
- [ ] 2-6 concurrent instances can coordinate without conflicts
- [ ] Any instance can run `/workstream-status` and see complete project state
- [ ] Any instance can run `/workstream-ready` to find available work
- [ ] Dependency blocking correctly prevents premature work starts
- [ ] Command hooks automatically maintain registry state
- [ ] Stale instances detected and their claims released
- [ ] Recovery mechanism exists for registry/filesystem drift

## Dependencies & Integration

- **Depends on**: Existing `.swarm/` directory structure, `.claude/` command/skill infrastructure
- **Consumed by**: All Claude Code instances working on this project
- **Integration points**:
  - `/implement-worktree` skill (Section 1 and completion hooks)
  - `/merge-worktree` command (completion section)
  - Session hooks (`.claude/hooks/`)
  - Future `/research` and `/plan` commands

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Race conditions with multiple instances writing to registry | Atomic writes via temp file + mv; add flock if issues observed |
| Registry gets out of sync with actual filesystem state | `/workstream-sync` command for reconciliation; validation warnings |
| Migration loses data from TODOs.txt | Backup TODOs.txt before migration; preserve original as `.bak` |
| Heartbeat mechanism too noisy | Only update on significant actions, not every prompt |
| Complex dependency graphs become hard to understand | `/workstream-export --mermaid` for visualization |
| Phase promotion (inline to full workstream) is confusing | Document clear criteria; keep simple by default |

## Schema Reference

### Workstream Entity (version 2)

```json
{
  "id": "feature-name/phase-1",
  "title": "Phase 1: Core Implementation",
  "type": "phase",
  "state": "ready",
  "parent": "feature-name",
  "priority": 2,
  "created": "2026-01-18",
  "updated": "2026-01-18T22:00:00Z",
  "description": "Optional longer description",

  "dependencies": [
    {
      "target": "other-feature",
      "type": "blocks",
      "reason": "Requires X from other-feature"
    },
    {
      "target": "related-feature",
      "type": "informs",
      "reason": "May use patterns from related-feature"
    }
  ],

  "artifacts": {
    "research": ".swarm/research/2026-01-18-feature.md",
    "plan": ".swarm/plans/2026-01-18-feature.md",
    "validation": null,
    "review": null,
    "checkpoints": []
  },

  "implementation": {
    "branch": "feature/2026-01-18-feature-name",
    "worktree": "../civ-2026-01-18-feature-name",
    "assignedInstance": "session-abc123",
    "currentPhase": 1,
    "totalPhases": 4
  },

  "children": [],
  "tags": ["architecture", "cli"],
  "notes": "Any additional context"
}
```

### State Definitions

| State | Description | Entry Trigger | Exit Trigger |
|-------|-------------|---------------|--------------|
| `idea` | Just a thought, not explored | Manual add | Start research |
| `research` | Actively exploring | `/research` command | Complete research doc |
| `planning` | Creating plan | `/plan` command | Complete plan doc |
| `sub_planning` | Breaking into phases | Large scope detected | All sub-plans ready |
| `ready` | Waiting for implementation | Plan marked ready | Start implement |
| `implementing` | Active work in progress | `/implement-worktree` | `/merge-worktree` |
| `merged` | Complete | `/merge-worktree` | (terminal) |

### Dependency Types

| Type | Meaning | Effect |
|------|---------|--------|
| `blocks` | Must complete first | Hard scheduling constraint |
| `informs` | Provides useful context | Soft relationship, no block |
| `conflicts` | Cannot run concurrently | Mutual exclusion warning |

## Meta: Self-Tracking

This workstream tracking system will track its own implementation. After Phase 1 is complete:

1. Register this plan as workstream `workstream-tracking-system`
2. Register phases 2-5 as child workstreams:
   - `workstream-tracking-system/phase-2`
   - `workstream-tracking-system/phase-3`
   - `workstream-tracking-system/phase-4`
   - `workstream-tracking-system/phase-5`
3. Mark phase 1 as `merged` after completion
4. Use the system to track remaining phases

This provides immediate dogfooding and validates the design with real usage.
