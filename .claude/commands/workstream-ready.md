# Workstream Ready

List all workstreams that are ready to be worked on.

## Description

This command reads the workstream registry and identifies workstreams that are:
1. In `ready` state
2. Have all blocking dependencies (`type: "blocks"`) in `merged` state
3. Are not currently assigned to an instance

This answers the question: "What can I work on right now?"

## Usage

```
/workstream-ready [--priority] [--include-blocked] [--type <type>] [--tag <tag>]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--priority` | No | false | Sort results by priority (P1 first) |
| `--include-blocked` | No | false | Also show blocked workstreams with blockers |
| `--type` | No | all | Filter by type (epic, feature, phase, task, bug) |
| `--tag` | No | none | Filter by tag |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry

```bash
cat .swarm/workstreams.json
```

Parse JSON and extract all workstreams.

### Step 2: Identify Ready Workstreams

A workstream is "ready to work on" if ALL of the following are true:

1. **State is `ready`**: `workstream.state === "ready"`

2. **All blocking deps are complete**: For each dependency where `type === "blocks"`:
   - Look up the target workstream
   - Check if target's state is `merged`
   - If ANY blocking dep is not merged, the workstream is blocked

3. **Not assigned**: `workstream.implementation.assignedInstance === null`

Pseudocode:
```javascript
function isReadyToWork(workstream, registry) {
  // Must be in ready state
  if (workstream.state !== 'ready') return false;

  // Must not be assigned
  if (workstream.implementation?.assignedInstance) return false;

  // All blocking deps must be merged
  for (const dep of workstream.dependencies || []) {
    if (dep.type === 'blocks') {
      const target = registry.workstreams[dep.target];
      if (!target || target.state !== 'merged') {
        return false;
      }
    }
  }

  return true;
}
```

### Step 3: Collect Related Information

For each ready workstream, also note:
- `informs` dependencies (soft relationships)
- `conflicts` dependencies (mutual exclusion warnings)

### Step 4: Sort Results

If `--priority` flag is set:
- Sort by priority ascending (P1 first, P5 last)
- Within same priority, sort alphabetically by ID

Otherwise:
- Sort alphabetically by ID

### Step 5: Format Output

```
Ready to Start (N):
===============================

1. [P<priority>] <id> - <title>
   No blockers
   <tags if any>

2. [P<priority>] <id> - <title>
   No blockers, informs: <related-id>
   <tags if any>

3. [P<priority>] <id> - <title>
   No blockers, conflicts with: <conflicting-id> (if in progress, warn)
   <tags if any>
```

If `--include-blocked`:
```
Blocked (N):
============

1. [P<priority>] <id> - <title>
   Blocked by: <blocker-id> (state: <state>)
```

### Step 6: Summary

```
Summary:
  Ready: N workstreams available to claim
  Blocked: M workstreams waiting on dependencies

Use /workstream-claim <id> to start working on a workstream.
```

## Example Output

```
Ready to Start (4):
===============================

1. [P2] production-queue - Production Queue System
   No blockers
   Tags: game-mechanics, city, production

2. [P2] city-system - City System
   No blockers
   Tags: game-mechanics, city

3. [P2] combat-system - Combat System
   No blockers
   Tags: game-mechanics, combat

4. [P3] hover-highlight-bug-fix - Hover Highlight Bug Fix
   No blockers
   Tags: bug, ui

Summary:
  Ready: 4 workstreams available to claim
  Blocked: 1 workstream waiting on dependencies

Use /workstream-claim <id> to start working on a workstream.
```

With `--include-blocked`:

```
Ready to Start (4):
===============================
...

Blocked (1):
============

1. [P2] victory-conditions - Victory Conditions System
   Blocked by: player-faction-tracking (state: implementing)
   Reason: Requires player tracking for victory condition checks
```

## Dependency Resolution Algorithm

### findReadyWork()

```javascript
function findReadyWork(registry) {
  const ready = [];

  for (const [id, workstream] of Object.entries(registry.workstreams)) {
    if (workstream.state !== 'ready') continue;
    if (workstream.implementation?.assignedInstance) continue;

    let isBlocked = false;
    const blockers = [];

    for (const dep of workstream.dependencies || []) {
      if (dep.type === 'blocks') {
        const target = registry.workstreams[dep.target];
        if (!target || target.state !== 'merged') {
          isBlocked = true;
          blockers.push({
            id: dep.target,
            state: target?.state || 'not found',
            reason: dep.reason
          });
        }
      }
    }

    if (!isBlocked) {
      ready.push({
        workstream,
        informs: (workstream.dependencies || [])
          .filter(d => d.type === 'informs')
          .map(d => d.target),
        conflicts: (workstream.dependencies || [])
          .filter(d => d.type === 'conflicts')
          .map(d => d.target)
      });
    }
  }

  return ready;
}
```

## Conflict Warnings

If a ready workstream has a `conflicts` dependency with a workstream that is currently `implementing`:

```
Warning: <id> conflicts with <conflicting-id> which is currently being implemented.
Consider waiting or coordinating with the other instance.
```

## Input

$ARGUMENTS

## Notes

- Only `blocks` dependencies prevent a workstream from being ready
- `informs` dependencies are informational only
- `conflicts` dependencies generate warnings but don't block
- Workstreams in states other than `ready` are not shown
- Use `/workstream-status` to see all workstreams regardless of state
