# Workstream Unblocks

Show what completing a workstream would unblock.

## Description

This command performs a reverse dependency lookup to identify which workstreams are waiting on the specified workstream. It helps prioritize work by showing the downstream impact of completing a feature.

## Usage

```
/workstream-unblocks <workstream-id> [--recursive] [--depth <N>]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<workstream-id>` | Yes | - | ID of workstream to analyze |
| `--recursive` | No | false | Show transitive unblocks (what completing those would unblock) |
| `--depth` | No | 3 | Maximum depth for recursive analysis |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry and Locate Workstream

```bash
cat .swarm/workstreams.json
```

Parse JSON and find the target workstream.

### Step 2: Find Direct Dependents

Search all workstreams for those that have a `blocks` dependency on the target:

```javascript
function findDirectDependents(targetId, registry) {
  const dependents = [];

  for (const [id, workstream] of Object.entries(registry.workstreams)) {
    for (const dep of workstream.dependencies || []) {
      if (dep.type === 'blocks' && dep.target === targetId) {
        dependents.push({
          id,
          workstream,
          reason: dep.reason
        });
      }
    }
  }

  return dependents;
}
```

### Step 3: Determine Which Would Become Ready

For each dependent, check if completing the target would make it ready:

```javascript
function wouldBecomeReady(workstream, completingId, registry) {
  // Must be in ready or earlier state
  if (!['idea', 'research', 'planning', 'sub_planning', 'ready'].includes(workstream.state)) {
    return false;
  }

  // Check if all OTHER blocking deps are already merged
  for (const dep of workstream.dependencies || []) {
    if (dep.type === 'blocks' && dep.target !== completingId) {
      const target = registry.workstreams[dep.target];
      if (!target || target.state !== 'merged') {
        return false; // Still blocked by something else
      }
    }
  }

  return true;
}
```

### Step 4: Recursive Analysis (if --recursive)

If `--recursive` flag is set, also show what completing the newly unblocked items would further unblock:

```javascript
function findRecursiveUnblocks(targetId, registry, depth = 0, maxDepth = 3, visited = new Set()) {
  if (depth >= maxDepth) return [];
  if (visited.has(targetId)) return [];

  visited.add(targetId);

  const directDependents = findDirectDependents(targetId, registry);
  const results = [];

  for (const { id, workstream, reason } of directDependents) {
    const becomesReady = wouldBecomeReady(workstream, targetId, registry);
    const furtherUnblocks = findRecursiveUnblocks(id, registry, depth + 1, maxDepth, visited);

    results.push({
      id,
      title: workstream.title,
      state: workstream.state,
      becomesReady,
      reason,
      furtherUnblocks
    });
  }

  return results;
}
```

### Step 5: Calculate Impact Score

Calculate how many workstreams would be (transitively) unblocked:

```javascript
function calculateImpactScore(unblockTree) {
  let count = 0;

  function traverse(items) {
    for (const item of items) {
      count++;
      if (item.furtherUnblocks) {
        traverse(item.furtherUnblocks);
      }
    }
  }

  traverse(unblockTree);
  return count;
}
```

### Step 6: Format Output

```
Completing: <id>
=================

Current State: <state>
Title: <title>

Would Unblock (N):
------------------

1. <dependent-id> - <title>
   State: <state> -> ready (would become ready)
   Reason: "<dependency-reason>"

2. <dependent-id> - <title>
   State: <state> (still blocked by: <other-blocker>)
   Reason: "<dependency-reason>"

<If --recursive>:

Transitive Unblocks:
--------------------
Completing <id>
  +-- <dependent-1> (would become ready)
  |     +-- <transitive-1> (would become ready)
  |     +-- <transitive-2> (still blocked)
  +-- <dependent-2> (still blocked by X)

Impact Summary:
---------------
  Direct unblocks: N workstreams
  Transitive unblocks: M additional workstreams
  Total impact: N+M workstreams

Priority Recommendation:
------------------------
Completing this workstream has HIGH/MEDIUM/LOW impact.
<Recommendation based on impact score>
```

## Example Output

```
Completing: player-faction-tracking
===================================

Current State: implementing
Title: Player/Faction Tracking System

Would Unblock (1):
------------------

1. victory-conditions - Victory Conditions System
   State: idea -> would need research/planning first
   Reason: "Requires player tracking for victory condition checks"

   Note: This workstream is still in 'idea' state and needs
   research before it can be implemented.

Impact Summary:
---------------
  Direct unblocks: 1 workstream
  Total impact: 1 workstream

Priority Recommendation:
------------------------
Completing this workstream has MEDIUM impact.
Consider prioritizing if victory-conditions is on the roadmap.
```

## Recursive Example

```
Completing: qux-feature
=======================

Current State: implementing
Title: Qux Feature

Would Unblock (2):
------------------

1. bar-feature - Bar Feature
   State: ready -> ready (would become ready, no other blockers)
   Reason: "Needs qux's infrastructure"

2. baz-feature - Baz Feature
   State: ready (still blocked by: alpha-feature)
   Reason: "Uses qux utilities"

Transitive Unblocks:
--------------------
Completing qux-feature
  +-- bar-feature (ready -> would become claimable)
  |     +-- foo-feature (ready -> would become claimable)
  |           +-- mega-feature (planning)
  +-- baz-feature (still blocked by alpha-feature)

Impact Summary:
---------------
  Direct unblocks: 2 workstreams
  Would become claimable: 2 workstreams
  Transitive unblocks: 1 additional workstream
  Total impact: 3 workstreams

Priority Recommendation:
------------------------
Completing this workstream has HIGH impact.
It unblocks a chain of 3 dependent features.
Prioritize this to maximize team velocity.
```

## No Dependents Case

```
Completing: isolated-feature
============================

Current State: implementing
Title: Isolated Feature

Would Unblock (0):
------------------

No workstreams are blocked by this one.

Impact Summary:
---------------
  This workstream has no downstream dependencies.

Note: This is fine for leaf features that don't block other work.
      Consider this when prioritizing - it can be worked on
      without impacting other workstreams.
```

## Input

$ARGUMENTS

## Notes

- Only `blocks` dependencies are considered (the workstream must be blocking others)
- `informs` relationships are not shown (they don't block)
- Impact score helps prioritize which blockers to complete first
- Use with `/workstream-ready` to identify high-impact work to claim
