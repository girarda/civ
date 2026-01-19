# Workstream Claim

Claim a workstream for the current instance to work on.

## Description

This command assigns a workstream to the current Claude Code instance. It verifies the workstream is claimable (ready state, no active blockers, not already assigned), updates the registry, and registers the instance.

## Usage

```
/workstream-claim <workstream-id> [--force]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<workstream-id>` | Yes | - | ID of workstream to claim |
| `--force` | No | false | Override soft conflicts and warnings |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry

```bash
cat .swarm/workstreams.json
cat .swarm/instances.json
```

Parse JSON and find the target workstream.

### Step 2: Validate Workstream Exists

If not found:
```
Error: Workstream '<id>' not found.

Use /workstream-status to see all workstreams.
```

### Step 3: Check Claimability

A workstream is claimable if:

1. **State is claimable**: `state` is one of `ready`, `idea`, `research`, `planning`
   - If `implementing`: Already being worked on
   - If `merged`: Already complete

2. **Not already assigned**: `implementation.assignedInstance` is null
   - If assigned, check if instance is stale (>1 hour since last heartbeat)

3. **No unmet blocking dependencies**: All `type: "blocks"` dependencies are in `merged` state

```javascript
function isClaimable(workstream, registry, instances) {
  // Check state
  if (workstream.state === 'merged') {
    return { claimable: false, reason: 'Already merged' };
  }
  if (workstream.state === 'implementing') {
    // Check if current assignee is stale
    const assignee = workstream.implementation?.assignedInstance;
    if (assignee) {
      const instance = instances.instances[assignee];
      if (instance && !isStale(instance.lastHeartbeat)) {
        return { claimable: false, reason: `Assigned to ${assignee}` };
      }
      // Instance is stale, allow claim
    }
  }

  // Check blockers
  for (const dep of workstream.dependencies || []) {
    if (dep.type === 'blocks') {
      const target = registry.workstreams[dep.target];
      if (!target || target.state !== 'merged') {
        return { claimable: false, reason: `Blocked by ${dep.target}` };
      }
    }
  }

  return { claimable: true };
}

function isStale(lastHeartbeat) {
  const staleThreshold = 60 * 60 * 1000; // 1 hour
  return Date.now() - new Date(lastHeartbeat).getTime() > staleThreshold;
}
```

### Step 4: Check for Conflicts

Check if the workstream has `type: "conflicts"` dependencies with any workstream that is currently `implementing`:

```javascript
function checkConflicts(workstream, registry) {
  const conflicts = [];

  for (const dep of workstream.dependencies || []) {
    if (dep.type === 'conflicts') {
      const target = registry.workstreams[dep.target];
      if (target && target.state === 'implementing') {
        conflicts.push({
          id: dep.target,
          title: target.title,
          assignee: target.implementation?.assignedInstance
        });
      }
    }
  }

  return conflicts;
}
```

If conflicts exist and `--force` not specified:
```
Warning: Conflict detected!

<workstream-id> conflicts with:
  - <conflicting-id>: Currently being implemented by <assignee>
    Reason: "<conflict-reason>"

Working on conflicting workstreams simultaneously may cause integration issues.

To proceed anyway, use: /workstream-claim <id> --force
```

### Step 5: Generate Instance ID

If no existing session ID is available:
```javascript
const instanceId = `session-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
```

Or use environment variable if available:
```javascript
const instanceId = process.env.CLAUDE_SESSION_ID || generateId();
```

### Step 6: Update Workstream Registry

```javascript
workstream.state = "implementing";
workstream.updated = new Date().toISOString();
workstream.implementation = {
  ...workstream.implementation,
  assignedInstance: instanceId
};
registry.lastUpdated = new Date().toISOString();
```

Write atomically:
```bash
.swarm/scripts/update-registry.sh <workstream-id> --state implementing
.swarm/scripts/update-registry.sh <workstream-id> --assign <instance-id>
```

### Step 7: Update Instance Registry

Add or update the instance in `.swarm/instances.json`:

```javascript
instances.instances[instanceId] = {
  id: instanceId,
  workstream: workstreamId,
  claimedAt: new Date().toISOString(),
  lastHeartbeat: new Date().toISOString()
};
instances.lastUpdated = new Date().toISOString();
```

### Step 8: Report Success

```
Claiming: <workstream-id>
=========================

Status: SUCCESS
Workstream: <title>
Previous State: <old-state>
New State: implementing
Assigned to: <instance-id>
Claimed at: <timestamp>

<If has 'informs' dependencies>:
Note: This workstream has 'informs' relationships with:
  - <related-id>: <reason>
Consider reviewing these for context.

<If conflicts were overridden>:
Warning: Conflict with <conflicting-id> was overridden.
Coordinate with the other instance to avoid integration issues.

Next Steps:
1. Review the plan: <artifacts.plan>
2. Start implementation with /implement-worktree <plan-path>
3. Or work directly and update progress with /workstream-update
```

## Error Handling

### Already Assigned

```
Error: Workstream '<id>' is already assigned.

Currently assigned to: <assignee>
Assigned since: <timestamp>
Last activity: <time-ago>

Options:
1. Wait for the current work to complete
2. Contact the assignee to coordinate
3. If the instance appears stale, wait for auto-release (1 hour)
4. Use /workstream-release <id> --force to forcibly release (admin only)
```

### Blocked by Dependencies

```
Error: Workstream '<id>' is blocked.

Blocked by:
  - <blocker-id> (state: <state>)
    Reason: "<reason>"

Use /workstream-blocked <id> for full blocking analysis.
Use /workstream-ready to find unblocked workstreams.
```

### Already Merged

```
Error: Workstream '<id>' is already merged.

Merged at: <timestamp>

This workstream is complete. Nothing to claim.
Use /workstream-status to see active workstreams.
```

## Example Output

```
Claiming: production-queue
==========================

Status: SUCCESS
Workstream: Production Queue System
Previous State: ready
New State: implementing
Assigned to: session-m5x9k-a3b7c
Claimed at: 2026-01-18T22:00:00Z

Next Steps:
1. Review the plan: .swarm/plans/2026-01-18-production-queue.md
2. Start implementation with /implement-worktree .swarm/plans/2026-01-18-production-queue.md
3. Or work directly and update progress with /workstream-update
```

## Input

$ARGUMENTS

## Notes

- Claiming automatically sets the workstream state to `implementing`
- The instance ID is stored for coordination with other instances
- Stale instances (>1 hour without heartbeat) have their claims auto-released
- Use `/workstream-release` when done or pausing work
- Multiple workstreams can be claimed by the same instance if needed
