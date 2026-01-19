# Workstream Blocked

Show detailed blocking analysis for a specific workstream.

## Description

This command analyzes why a workstream cannot proceed by showing its complete dependency chain. It identifies both direct blockers (immediate dependencies) and transitive blockers (dependencies of dependencies).

## Usage

```
/workstream-blocked <workstream-id> [--depth <N>] [--show-all]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<workstream-id>` | Yes | - | ID of workstream to analyze |
| `--depth` | No | 5 | Maximum depth for transitive blocker traversal |
| `--show-all` | No | false | Show complete dependency tree including merged deps |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry and Locate Workstream

```bash
cat .swarm/workstreams.json
```

Parse JSON and find the target workstream. If not found:
```
Error: Workstream '<id>' not found.

Did you mean one of these?
  - <similar-id-1>
  - <similar-id-2>
```

### Step 2: Identify Direct Blockers

Find all dependencies with `type: "blocks"` that are not in `merged` state:

```javascript
function findDirectBlockers(workstream, registry) {
  const blockers = [];

  for (const dep of workstream.dependencies || []) {
    if (dep.type === 'blocks') {
      const target = registry.workstreams[dep.target];
      if (!target) {
        blockers.push({
          id: dep.target,
          state: 'not found',
          reason: dep.reason,
          type: 'missing'
        });
      } else if (target.state !== 'merged') {
        blockers.push({
          id: dep.target,
          state: target.state,
          reason: dep.reason,
          type: 'incomplete'
        });
      }
    }
  }

  return blockers;
}
```

### Step 3: Find Transitive Blockers

Recursively traverse the dependency graph to find what's blocking the blockers:

```javascript
function findTransitiveBlockers(blockerId, registry, visited = new Set(), depth = 0, maxDepth = 5) {
  if (depth >= maxDepth) return { id: blockerId, truncated: true };
  if (visited.has(blockerId)) return { id: blockerId, circular: true };

  visited.add(blockerId);

  const blocker = registry.workstreams[blockerId];
  if (!blocker) return { id: blockerId, notFound: true };

  const children = [];
  for (const dep of blocker.dependencies || []) {
    if (dep.type === 'blocks') {
      const target = registry.workstreams[dep.target];
      if (!target || target.state !== 'merged') {
        children.push(findTransitiveBlockers(dep.target, registry, visited, depth + 1, maxDepth));
      }
    }
  }

  return {
    id: blockerId,
    state: blocker.state,
    title: blocker.title,
    children
  };
}
```

### Step 4: Estimate Unblock Time

Based on the blocking chain, estimate when the workstream might become unblocked:

- If blocker is `implementing`: "When <blocker-id> is merged"
- If blocker is `ready`: "When <blocker-id> is implemented and merged"
- If blocker is `planning`: "When <blocker-id> completes planning and implementation"
- If blocker has its own blockers: "When <transitive-blocker-chain> is resolved"

### Step 5: Format Output

```
Blocking Analysis: <id>
=============================

Current State: <state>
Title: <title>

Direct Blockers:
----------------
1. <blocker-id> (state: <state>)
   Reason: "<reason>"

2. <blocker-id> (state: <state>)
   Reason: "<reason>"

Transitive Blockers:
--------------------
<blocker-id> (<state>)
  +-- <child-blocker-id> (<state>)
  |     +-- <grandchild-blocker-id> (<state>)
  +-- <another-child> (<state>)

Estimated Unblock:
------------------
<blocker-id> must reach 'merged' state.
<child-blocker> is blocking <blocker-id>.

Critical Path:
--------------
1. <deepest-blocker> -> 2. <mid-blocker> -> 3. <direct-blocker> -> 4. <this-workstream>
```

### Step 6: Not Blocked Case

If the workstream has no blockers:

```
Blocking Analysis: <id>
=============================

Current State: <state>
Title: <title>

Status: NOT BLOCKED

This workstream has no blocking dependencies preventing progress.

<If state is 'ready'>:
  Ready to claim: /workstream-claim <id>

<If state is 'implementing'>:
  Currently being implemented.

<If state is 'merged'>:
  Already completed.
```

## Example Output

```
Blocking Analysis: victory-conditions
=====================================

Current State: idea
Title: Victory Conditions System

Direct Blockers:
----------------
1. player-faction-tracking (state: implementing)
   Reason: "Requires player tracking for victory condition checks"

Transitive Blockers:
--------------------
player-faction-tracking (implementing)
  +-- (no sub-blockers, actively being worked on)

Estimated Unblock:
------------------
When player-faction-tracking is merged.
player-faction-tracking is at phase 3/3, likely to complete soon.

Critical Path:
--------------
1. player-faction-tracking (implementing) -> 2. victory-conditions (idea)

Recommendation:
---------------
Wait for player-faction-tracking to complete, or:
- Check /workstream-status for other available work
- Use /workstream-ready to see unblocked workstreams
```

## Complex Example

```
Blocking Analysis: foo-feature
==============================

Current State: ready
Title: Foo Feature

Direct Blockers:
----------------
1. bar-feature (state: ready)
   Reason: "Needs bar's API"

2. baz-feature (state: planning)
   Reason: "Shares data structures"

Transitive Blockers:
--------------------
bar-feature (ready)
  +-- qux-feature (implementing)
        +-- (no sub-blockers)

baz-feature (planning)
  +-- (no sub-blockers, in planning phase)

Estimated Unblock:
------------------
Earliest: When qux-feature merges AND bar-feature implements AND baz-feature reaches ready.
Estimated phases: 3+ (qux -> bar -> foo)

Critical Path:
--------------
1. qux-feature (implementing)
2. bar-feature (ready, blocked by qux)
3. foo-feature (ready, blocked by bar + baz)
   [parallel: baz-feature (planning)]
```

## Circular Dependency Detection

If a circular dependency is detected:

```
Warning: Circular dependency detected!

Cycle: foo -> bar -> baz -> foo

This indicates a design issue. Consider:
1. Breaking the cycle by removing one dependency
2. Merging the workstreams if they're truly interdependent
3. Using 'informs' instead of 'blocks' for softer relationships
```

## Input

$ARGUMENTS

## Notes

- Only `blocks` dependencies are considered for blocking analysis
- `informs` and `conflicts` dependencies are not shown (use `--show-all` to include)
- Circular dependencies are detected and reported as warnings
- Depth is limited to prevent infinite recursion (default 5 levels)
