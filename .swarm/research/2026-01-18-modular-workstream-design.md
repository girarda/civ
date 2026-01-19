# Research: Modular Workstream Design with Dependency Management

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research designs a modular workstream system that handles hierarchical relationships (parent/child workstreams), multi-level dependencies (workstream-to-workstream, phase-to-phase, cross-workstream phase dependencies), and dependency types (blocks, informs, conflicts). The design draws from DAG-based build systems (Make, Bazel), task management patterns, and the existing workflow scaling research. The result is a clean, extensible schema that starts simple but can grow to support complex multi-instance development scenarios.

## Key Discoveries

- **Existing proposals lack cross-cutting dependencies**: The current `dependencies` and `blockedBy` fields only support workstream-level blocking, not "Phase 3 of Feature A depends on Phase 1 of Feature B"
- **Phases are sometimes workstreams in disguise**: Large features like `cli-integration-architecture` have 5 phases that each take hours to implement - these could be treated as sub-workstreams
- **Build system patterns apply directly**: Make/Bazel use target-based DAGs where any target can depend on any other target, regardless of hierarchy
- **Three dependency types cover real scenarios**: `blocks` (must complete first), `informs` (useful input), `conflicts` (cannot run concurrently)
- **Topological sort enables "what's ready" queries**: Given a dependency graph, readily answerable: what has no unmet blocking dependencies?

## Patterns from Build Systems

### Make: Target-Based DAG

Make models dependencies as a graph of targets:

```makefile
# Target depends on prerequisites
app.o: app.c app.h utils.h
    $(CC) -c app.c

# Phony targets can depend on other targets
all: app test docs

# Cross-cutting: test depends on app being built
test: app
    ./run_tests.sh
```

**Key insight**: Any target can depend on any other target. The hierarchy (directories, modules) is orthogonal to the dependency graph.

### Bazel: Explicit Dependency Declaration

Bazel requires explicit `deps` declarations:

```python
cc_library(
    name = "utils",
    srcs = ["utils.cc"],
)

cc_library(
    name = "game_engine",
    srcs = ["engine.cc"],
    deps = [":utils", "//pathfinding:astar"],  # Cross-package dependency
)

cc_test(
    name = "engine_test",
    srcs = ["engine_test.cc"],
    deps = [":game_engine"],
)
```

**Key insight**: Dependencies are explicit, typed (deps, test_deps), and can cross package boundaries.

### Task Management Systems (Jira, Linear)

Task trackers model dependencies as:

- **Blocks/Blocked by**: Hard dependency
- **Relates to**: Soft/informational relationship
- **Parent/Child (Epics/Stories/Tasks)**: Hierarchical containment
- **Depends on/Enables**: Directional relationship

**Key insight**: Separating hierarchy (containment) from dependencies (ordering) allows flexible modeling.

## Proposed Design

### Core Concept: Everything is a Workstream

The key insight is to treat everything (features, phases, sub-features) as workstreams with:

1. **Unique IDs** that support hierarchy via path-like naming
2. **Explicit dependencies** with typed relationships
3. **Optional parent references** for containment/rollup

This allows:
- A phase to be an inline checklist item (simple)
- A phase to be promoted to a full workstream when complex enough
- Cross-cutting dependencies at any granularity

### Schema Design

#### Workstream Entity

```json
{
  "id": "cli-integration-architecture/phase-2",
  "title": "Command Layer",
  "type": "phase",
  "state": "ready",
  "parent": "cli-integration-architecture",
  "priority": 1,
  "created": "2026-01-18",
  "updated": "2026-01-18T22:00:00Z",

  "dependencies": [
    {
      "target": "cli-integration-architecture/phase-1",
      "type": "blocks",
      "reason": "Phase 1 creates GameEngine that Phase 2 extends"
    }
  ],

  "artifacts": {
    "plan": ".swarm/plans/2026-01-18-command-layer-and-renderer-decoupling.md"
  },

  "implementation": {
    "branch": null,
    "worktree": null,
    "assignedInstance": null
  }
}
```

#### Workstream Types

| Type | Description | Typical Scale |
|------|-------------|---------------|
| `idea` | Not yet researched | Minutes to define |
| `research` | Actively being explored | Hours |
| `feature` | A coherent deliverable unit | Days to weeks |
| `phase` | A step within a feature | Hours to 1 day |
| `epic` | Collection of related features | Weeks to months |
| `bugfix` | Isolated fix | Hours |
| `chore` | Non-feature work (refactoring, docs) | Variable |

#### Dependency Types

| Type | Meaning | Effect |
|------|---------|--------|
| `blocks` | Target must complete before this can start | Hard scheduling constraint |
| `informs` | Target provides useful context | Soft relationship, no scheduling impact |
| `conflicts` | Cannot run concurrently with target | Mutual exclusion (e.g., touch same files) |

#### ID Naming Convention

IDs use path-like naming for natural hierarchy:

```
feature-name                    # Top-level workstream
feature-name/phase-1            # Phase within feature
feature-name/phase-1/task-a     # Task within phase (if needed)
epic-name                       # Epic container
epic-name/feature-a             # Feature within epic
epic-name/feature-a/phase-1     # Phase within feature within epic
```

Benefits:
- Natural grouping with glob patterns (`cli-*`, `*/phase-1`)
- Parent derivable from ID by stripping last segment
- Human-readable while machine-parseable

### Full Registry Schema

```json
{
  "version": 2,
  "lastUpdated": "2026-01-18T23:30:00Z",

  "workstreams": [
    {
      "id": "cli-integration-architecture",
      "title": "CLI Integration Architecture",
      "type": "feature",
      "state": "implementing",
      "parent": null,
      "priority": 1,
      "created": "2026-01-18",
      "updated": "2026-01-18T22:00:00Z",

      "description": "Decouple game engine for CLI control",

      "dependencies": [],

      "artifacts": {
        "research": ".swarm/research/2026-01-18-cli-integration-architecture.md",
        "plan": ".swarm/plans/2026-01-18-cli-integration-architecture.md"
      },

      "implementation": {
        "branch": "feature/2026-01-18-cli-integration-architecture",
        "worktree": "../civ-2026-01-18-cli-integration-architecture",
        "assignedInstance": "session-abc123"
      },

      "children": [
        "cli-integration-architecture/phase-1",
        "cli-integration-architecture/phase-2",
        "cli-integration-architecture/phase-3",
        "cli-integration-architecture/phase-4",
        "cli-integration-architecture/phase-5"
      ],

      "tags": ["architecture", "cli"],
      "notes": "Phase 1 complete, Phase 2 in progress"
    },

    {
      "id": "cli-integration-architecture/phase-1",
      "title": "Extract Engine Core",
      "type": "phase",
      "state": "merged",
      "parent": "cli-integration-architecture",
      "priority": 1,
      "created": "2026-01-18",
      "updated": "2026-01-18T20:00:00Z",

      "dependencies": [],

      "artifacts": {},

      "implementation": {},

      "completedAt": "2026-01-18T20:00:00Z"
    },

    {
      "id": "cli-integration-architecture/phase-2",
      "title": "Command Layer",
      "type": "phase",
      "state": "implementing",
      "parent": "cli-integration-architecture",
      "priority": 1,
      "created": "2026-01-18",
      "updated": "2026-01-18T22:00:00Z",

      "dependencies": [
        {
          "target": "cli-integration-architecture/phase-1",
          "type": "blocks",
          "reason": "Requires GameEngine from Phase 1"
        }
      ],

      "artifacts": {
        "plan": ".swarm/plans/2026-01-18-command-layer-and-renderer-decoupling.md"
      },

      "implementation": {
        "assignedInstance": "session-abc123"
      }
    },

    {
      "id": "notification-system",
      "title": "Notification System",
      "type": "feature",
      "state": "ready",
      "parent": null,
      "priority": 2,
      "created": "2026-01-18",
      "updated": "2026-01-18T21:00:00Z",

      "dependencies": [
        {
          "target": "cli-integration-architecture/phase-3",
          "type": "informs",
          "reason": "May want to emit notifications through EventBus"
        }
      ],

      "artifacts": {
        "plan": ".swarm/plans/2026-01-18-notification-system.md"
      },

      "implementation": {},

      "tags": ["ui", "developer-tools"]
    },

    {
      "id": "fog-of-war",
      "title": "Fog of War",
      "type": "feature",
      "state": "idea",
      "parent": null,
      "priority": 3,
      "created": "2026-01-18",
      "updated": "2026-01-18T19:00:00Z",

      "dependencies": [
        {
          "target": "player-faction-tracking",
          "type": "blocks",
          "reason": "Requires per-player visibility tracking"
        }
      ],

      "artifacts": {},
      "implementation": {}
    }
  ]
}
```

### Inline vs Promoted Phases

The design supports two modes for phases:

#### Inline Phases (Simple)

For small features, phases remain as checklist items in the plan document:

```json
{
  "id": "hover-highlight-bug-fix",
  "type": "bugfix",
  "state": "ready",
  "inlinePhases": [
    { "name": "Create container hierarchy", "complete": false },
    { "name": "Verify no side effects", "complete": false },
    { "name": "Add unit tests", "complete": false }
  ]
}
```

#### Promoted Phases (Complex)

For large features, phases become full workstreams:

```json
{
  "id": "cli-integration-architecture",
  "type": "feature",
  "children": [
    "cli-integration-architecture/phase-1",
    "cli-integration-architecture/phase-2",
    "cli-integration-architecture/phase-3",
    "cli-integration-architecture/phase-4",
    "cli-integration-architecture/phase-5"
  ]
}
```

**Promotion criteria**:
- Phase takes more than 2 hours to implement
- Phase has its own external dependencies
- Phase can be worked on by a different instance
- Phase has its own research/plan artifacts

## Dependency Resolution Algorithms

### Finding Ready Work

"What can I work on right now?" requires finding workstreams with no unmet blocking dependencies:

```typescript
function findReadyWork(registry: WorkstreamRegistry): Workstream[] {
  const completed = new Set(
    registry.workstreams
      .filter(w => w.state === 'merged' || w.state === 'complete')
      .map(w => w.id)
  );

  return registry.workstreams.filter(workstream => {
    // Must be in a startable state
    if (!['ready', 'idea', 'research', 'planning'].includes(workstream.state)) {
      return false;
    }

    // Must not be assigned to another instance
    if (workstream.implementation?.assignedInstance) {
      return false;
    }

    // All blocking dependencies must be complete
    const blockingDeps = (workstream.dependencies || [])
      .filter(d => d.type === 'blocks');

    return blockingDeps.every(dep => completed.has(dep.target));
  });
}
```

### Finding What's Blocking

"What's blocking feature X?" traverses the dependency graph:

```typescript
function findBlockers(registry: WorkstreamRegistry, targetId: string): BlockerInfo[] {
  const workstream = registry.workstreams.find(w => w.id === targetId);
  if (!workstream) return [];

  const blockers: BlockerInfo[] = [];
  const visited = new Set<string>();

  function traverse(ws: Workstream, depth: number) {
    const blockingDeps = (ws.dependencies || []).filter(d => d.type === 'blocks');

    for (const dep of blockingDeps) {
      if (visited.has(dep.target)) continue;
      visited.add(dep.target);

      const target = registry.workstreams.find(w => w.id === dep.target);
      if (!target) continue;

      if (target.state !== 'merged' && target.state !== 'complete') {
        blockers.push({
          id: dep.target,
          title: target.title,
          state: target.state,
          depth,
          reason: dep.reason
        });

        // Recursively find what's blocking the blocker
        traverse(target, depth + 1);
      }
    }
  }

  traverse(workstream, 0);
  return blockers;
}
```

### Finding What Becomes Unblocked

"If I complete phase Y, what becomes unblocked?"

```typescript
function findUnblockedBy(registry: WorkstreamRegistry, completedId: string): Workstream[] {
  // Find all workstreams that have a blocking dependency on completedId
  return registry.workstreams.filter(workstream => {
    const blockingDeps = (workstream.dependencies || []).filter(d => d.type === 'blocks');

    // Must have completedId as a blocker
    if (!blockingDeps.some(d => d.target === completedId)) {
      return false;
    }

    // After removing completedId, check if all other blockers are done
    const completed = new Set(
      registry.workstreams
        .filter(w => w.state === 'merged' || w.state === 'complete' || w.id === completedId)
        .map(w => w.id)
    );

    return blockingDeps.every(dep => completed.has(dep.target));
  });
}
```

### Conflict Detection

"Can I work on X while Y is in progress?"

```typescript
function hasConflict(registry: WorkstreamRegistry, aId: string, bId: string): ConflictInfo | null {
  const a = registry.workstreams.find(w => w.id === aId);
  const b = registry.workstreams.find(w => w.id === bId);

  if (!a || !b) return null;

  // Check if A conflicts with B
  const aConflictsB = (a.dependencies || [])
    .find(d => d.type === 'conflicts' && d.target === bId);

  if (aConflictsB) {
    return { workstreamA: aId, workstreamB: bId, reason: aConflictsB.reason };
  }

  // Check if B conflicts with A (conflicts are not automatically bidirectional)
  const bConflictsA = (b.dependencies || [])
    .find(d => d.type === 'conflicts' && d.target === aId);

  if (bConflictsA) {
    return { workstreamA: bId, workstreamB: aId, reason: bConflictsA.reason };
  }

  return null;
}
```

## Practical Scenarios

### Scenario 1: Feature A Phase 3 depends on Feature B Phase 1

```json
{
  "id": "feature-a/phase-3",
  "dependencies": [
    {
      "target": "feature-b/phase-1",
      "type": "blocks",
      "reason": "Requires EventBus infrastructure from Feature B Phase 1"
    }
  ]
}
```

**Query**: "Is Feature A Phase 3 ready?"
**Answer**: Check if `feature-b/phase-1` state is `merged` or `complete`.

### Scenario 2: Feature C is 3 Independent Sub-Features

```json
[
  {
    "id": "feature-c",
    "type": "epic",
    "children": ["feature-c/sub-a", "feature-c/sub-b", "feature-c/sub-c"]
  },
  {
    "id": "feature-c/sub-a",
    "type": "feature",
    "parent": "feature-c",
    "dependencies": []
  },
  {
    "id": "feature-c/sub-b",
    "type": "feature",
    "parent": "feature-c",
    "dependencies": []
  },
  {
    "id": "feature-c/sub-c",
    "type": "feature",
    "parent": "feature-c",
    "dependencies": []
  }
]
```

**Query**: "Can 3 instances work on Feature C in parallel?"
**Answer**: Yes, sub-a, sub-b, and sub-c have no blocking dependencies on each other.

### Scenario 3: Feature D Blocks All Work on Feature E

```json
{
  "id": "feature-e",
  "dependencies": [
    {
      "target": "feature-d",
      "type": "blocks",
      "reason": "Feature E refactors code that Feature D introduces"
    }
  ]
}
```

**Query**: "What's blocking Feature E?"
**Answer**: Feature D must complete first.

### Scenario 4: Multiple Ideas to Research Together

```json
[
  {
    "id": "research-batch-2026-01-18",
    "type": "epic",
    "title": "Research batch for architecture decisions",
    "children": ["research-caching", "research-persistence", "research-multi-player"]
  },
  {
    "id": "research-caching",
    "type": "research",
    "parent": "research-batch-2026-01-18",
    "dependencies": [
      { "target": "research-persistence", "type": "informs" }
    ]
  }
]
```

These can be assigned to different instances but share results via `informs` relationships.

### Scenario 5: Concurrent Work Conflict

```json
{
  "id": "main-ts-refactor",
  "type": "chore",
  "dependencies": [
    {
      "target": "cli-integration-architecture/phase-3",
      "type": "conflicts",
      "reason": "Both heavily modify main.ts"
    }
  ]
}
```

**Query**: "Can I start main-ts-refactor while Phase 3 is in progress?"
**Answer**: No, they conflict. Wait for Phase 3 to complete.

## Queries the System Should Answer

### Work Discovery

| Query | Algorithm |
|-------|-----------|
| "What can I work on right now?" | Find workstreams with state in {ready, idea} and all blocking deps complete |
| "What high-priority work is available?" | Above, filtered by priority and sorted |
| "What research should be done next?" | Find type=research with state=idea and no blockers |

### Blocking Analysis

| Query | Algorithm |
|-------|-----------|
| "What's blocking feature X?" | Traverse blocking dependencies recursively |
| "Why can't I start on Y?" | Find incomplete blocking dependencies |
| "What's the critical path to feature Z?" | Topological sort of transitive blockers |

### Impact Analysis

| Query | Algorithm |
|-------|-----------|
| "If I complete X, what becomes unblocked?" | Find workstreams whose only remaining blocker is X |
| "What depends on feature Y (directly)?" | Find workstreams with Y in dependencies |
| "What depends on feature Y (transitively)?" | Recursive search of dependents |

### Conflict Detection

| Query | Algorithm |
|-------|-----------|
| "Can I work on X while Y is in progress?" | Check for conflicts dependencies in both directions |
| "What can't run concurrently with X?" | Find all conflict relationships |

### Hierarchy Queries

| Query | Algorithm |
|-------|-----------|
| "What phases are in feature X?" | Find workstreams where parent = X |
| "What's the parent of phase Y?" | Read parent field |
| "What's the overall progress of epic Z?" | Aggregate child states |

## Visualization: Dependency Graph

For a feature like `cli-integration-architecture`:

```
cli-integration-architecture (implementing)
|
+-- phase-1 (complete) --------+
|                              |
+-- phase-2 (implementing) <---+
|       |
|       +-- [blocks] phase-1
|
+-- phase-3 (ready) <----------+
|       |                      |
|       +-- [blocks] phase-2 --+
|
+-- phase-4 (blocked)
|       |
|       +-- [blocks] phase-2
|       +-- [blocks] phase-3
|
+-- phase-5 (blocked)
        |
        +-- [blocks] phase-4

notification-system (ready)
        |
        +-- [informs] cli-integration-architecture/phase-3
```

## Integration with 2-6 Concurrent Instance Workflow

### Instance Assignment Rules

1. **Respect blocking constraints**: Instance can only claim workstreams where all `blocks` dependencies are complete
2. **Warn on conflicts**: If claiming X while Y is in progress and they conflict, warn but allow manual override
3. **Prefer hierarchical locality**: When possible, assign phases of the same feature to the same instance (reduces context switching)

### Claiming and Releasing

```typescript
function claimWorkstream(
  registry: WorkstreamRegistry,
  workstreamId: string,
  instanceId: string
): ClaimResult {
  const workstream = registry.workstreams.find(w => w.id === workstreamId);

  // Check if ready to start
  if (!findReadyWork(registry).some(w => w.id === workstreamId)) {
    return { success: false, error: "Workstream has unmet blocking dependencies" };
  }

  // Check for conflicts with in-progress work
  const inProgress = registry.workstreams.filter(
    w => w.state === 'implementing' && w.implementation?.assignedInstance
  );

  for (const active of inProgress) {
    const conflict = hasConflict(registry, workstreamId, active.id);
    if (conflict) {
      return {
        success: false,
        error: `Conflicts with ${active.id}: ${conflict.reason}`,
        canOverride: true
      };
    }
  }

  // Assign
  workstream.state = 'implementing';
  workstream.implementation = { assignedInstance: instanceId };
  workstream.updated = new Date().toISOString();

  return { success: true };
}
```

### Status Dashboard

For 2-6 instances, the dashboard shows:

```
Instance Status (3 active)
==========================

Instance 1 (session-abc):
  Working on: cli-integration-architecture/phase-2
  Time in task: 45 minutes
  Blocked by: nothing

Instance 2 (session-def):
  Working on: notification-system
  Time in task: 20 minutes
  Blocked by: nothing

Instance 3 (session-ghi):
  Working on: player-faction-tracking/phase-3
  Time in task: 1 hour
  Blocked by: nothing

Ready to Start (2):
  - production-queue (priority 2)
  - hover-highlight-bug-fix (priority 3)

Blocked (3):
  - cli-integration-architecture/phase-4
    Blocked by: phase-2, phase-3
  - fog-of-war
    Blocked by: player-faction-tracking
  - victory-conditions
    Blocked by: player-faction-tracking
```

## Migration from Current System

### Step 1: Create Initial Registry

Scan existing artifacts and populate `workstreams.json`:

```bash
# Research docs -> workstreams with state based on content
# Plans -> workstreams with state "ready" or "implementing"
# TODOs.txt -> ideas and progress notes
```

### Step 2: Infer Dependencies

From plan documents, extract explicit "Depends On" sections:

```
From .swarm/plans/2026-01-18-combat-system.md:
### Depends On
- Unit System (A1-A2): Unit data model, unit rendering
- Turn System (C): Turn processing hooks
- Selection System: Click-to-select for attack target
```

Convert to:

```json
{
  "id": "combat-system",
  "dependencies": [
    { "target": "unit-spawning-movement/phase-1", "type": "blocks" },
    { "target": "unit-spawning-movement/phase-2", "type": "blocks" },
    { "target": "turn-system", "type": "blocks" },
    { "target": "unit-spawning-movement/phase-3", "type": "blocks" }
  ]
}
```

### Step 3: Promote Large Phases

For features with 5+ phases or phases taking 2+ hours, create child workstreams:

```bash
# cli-integration-architecture has 5 phases, each 1-2 hours
# Create cli-integration-architecture/phase-1 through phase-5
```

### Step 4: Deprecate TODOs.txt

Replace with registry queries:

| TODOs.txt Usage | Registry Equivalent |
|-----------------|---------------------|
| `- [ ] feature` | workstream with state "idea" or "ready" |
| `- [X] feature` | workstream with state "merged" |
| Nested items | parent/child workstreams |
| Notes | workstream.notes field |

## Recommendations

### 1. Start with Simple Dependencies

Initially, only use `blocks` type. Add `informs` and `conflicts` when specific use cases arise.

### 2. Keep Phase Promotion Manual

Don't auto-promote phases. Let users decide when a phase is "big enough" to warrant its own workstream entry.

### 3. Validate on Write

When updating the registry, validate:
- No circular dependencies
- Referenced targets exist
- Parent/child consistency

### 4. Generate Visualization

Create a command that outputs a dependency graph in Mermaid or DOT format for visualization.

### 5. Integrate with Existing Commands

| Command | Integration |
|---------|-------------|
| `/research` | Create workstream if not exists, update state |
| `/plan` | Link plan artifact, optionally create child phases |
| `/implement-worktree` | Set state to implementing, assign instance |
| `/merge-worktree` | Set state to merged, update completedAt |
| `/workstream-status` | Query ready work, show blockers |

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/.swarm/workstreams.json` | Central registry (to create) |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-workflow-scaling.md` | Prior workstream registry design |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-full-lifecycle-tracking.md` | Lifecycle state machine |
| `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-cli-integration-architecture.md` | Example large feature with phases |
| `/Users/alex/workspace/civ/TODOs.txt` | Current informal tracking (to migrate) |

## Open Questions

1. **Bidirectional conflicts**: Should `A conflicts B` automatically imply `B conflicts A`? Recommendation: No, keep explicit for flexibility, but provide a warning if asymmetric.

2. **Soft vs hard blocking**: Should there be a "soft blocks" that warns but doesn't prevent claiming? Recommendation: Add `warnIfIncomplete` boolean to dependency if needed, but start without it.

3. **Historical data**: How long to keep completed workstreams? Recommendation: Keep forever in main file, archive to yearly files if registry grows too large (>500 entries).

4. **Cross-repository dependencies**: Support `repo:civ-server/feature-x` as dependency target? Recommendation: Defer to future. Per-repo registries are sufficient for now.

5. **Dependency versioning**: If Feature A v1 is complete but Feature A v2 is planned, how to model? Recommendation: Use different IDs (`feature-a`, `feature-a-v2`) or don't version at workstream level.

## Conclusion

The modular workstream design extends the existing lifecycle tracking proposals by introducing:

1. **Hierarchical IDs** for natural parent/child relationships
2. **Typed dependencies** (blocks, informs, conflicts) for expressive relationships
3. **Cross-workstream phase dependencies** for fine-grained ordering
4. **Query algorithms** for answering practical questions about work readiness

The design starts simple (most workstreams will only use `blocks` dependencies) but can grow to support complex scenarios. The key insight is treating everything as a workstream with optional containment, rather than having a fixed hierarchy of "features contain phases."

Total estimated effort to implement:
- Registry schema and basic CRUD: 2 hours
- Dependency resolution algorithms: 2 hours
- Migration from TODOs.txt: 1 hour
- Integration with existing commands: 4 hours
- Dashboard visualization: 2 hours

**Total: ~11 hours for full implementation**, but value can be delivered incrementally starting with the registry and basic `blocks` dependencies.
