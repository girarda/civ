# Workstream Instances

Show all active Claude Code instances and their workstream assignments.

## Description

This command reads the instance registry and displays information about all active Claude Code instances working on this project. It helps coordinate work across multiple instances and identifies stale sessions that may need cleanup.

## Usage

```
/workstream-instances [--include-stale] [--cleanup]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--include-stale` | No | false | Include instances that appear stale (>1 hour) |
| `--cleanup` | No | false | Remove stale instances and release their claims |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registries

```bash
cat .swarm/instances.json
cat .swarm/workstreams.json
```

### Step 2: Determine Current Instance

Identify the current session:
```javascript
const currentInstance = process.env.CLAUDE_SESSION_ID || detectCurrentSession();
```

### Step 3: Classify Instances

For each instance, determine its status:

```javascript
function classifyInstance(instance) {
  const now = Date.now();
  const lastActivity = new Date(instance.lastHeartbeat).getTime();
  const ageMinutes = Math.floor((now - lastActivity) / 60000);

  if (ageMinutes > 60) {
    return { status: 'stale', ageMinutes };
  } else if (ageMinutes > 30) {
    return { status: 'idle', ageMinutes };
  } else {
    return { status: 'active', ageMinutes };
  }
}
```

### Step 4: Format Output

```
Active Instances (N)
====================

<instance-id> <(this session) if current>
  Working on: <workstream-id> - <title>
  State: <workstream-state>
  Since: <claimed-at>
  Last activity: <time-ago>

<instance-id>
  Working on: <workstream-id> - <title>
  State: <workstream-state>
  Since: <claimed-at>
  Last activity: <time-ago>

<If include-stale or cleanup>:

Stale Instances (M)
===================

<instance-id>
  Was working on: <workstream-id>
  Last activity: <time-ago> (STALE)
  <If cleanup>: RELEASED - workstream now available
```

### Step 5: Handle Cleanup

If `--cleanup` flag is set:

```javascript
for (const [id, instance] of Object.entries(instances.instances)) {
  if (isStale(instance.lastHeartbeat)) {
    // Release the workstream claim
    const workstream = registry.workstreams[instance.workstream];
    if (workstream && workstream.implementation?.assignedInstance === id) {
      workstream.implementation.assignedInstance = null;
      workstream.state = 'ready';
      workstream.notes = `Auto-released from stale instance ${id}`;
    }

    // Remove the instance
    delete instances.instances[id];
    cleanedUp.push(id);
  }
}
```

### Step 6: Summary

```
Summary
-------
Active instances: N
Idle instances: M (30-60 min since last activity)
Stale instances: K (>60 min since last activity)

<If cleanup was performed>:
Cleanup performed:
  - Removed K stale instances
  - Released K workstream claims
  - Workstreams now available: <list>
```

## Example Output

### Normal View

```
Active Instances (3)
====================

session-m5x9k-a3b7c (this session)
  Working on: production-queue - Production Queue System
  State: implementing
  Since: 2026-01-18 20:00
  Last activity: 2 minutes ago

session-n7y2p-d8e4f
  Working on: cli-integration-architecture/phase-2 - CLI Integration Phase 2
  State: implementing
  Since: 2026-01-18 18:30
  Last activity: 5 minutes ago

session-q9z3r-g1h5i
  Working on: player-faction-tracking - Player/Faction Tracking
  State: implementing
  Since: 2026-01-18 19:00
  Last activity: 45 minutes ago (approaching stale)

Summary
-------
Active instances: 2
Idle instances: 1 (30-60 min since last activity)
Stale instances: 0
```

### With Stale Instances

```
/workstream-instances --include-stale

Active Instances (2)
====================
...

Stale Instances (1)
===================

session-old123-abc
  Was working on: combat-system - Combat System
  Last activity: 2 hours ago (STALE)

  This instance has not reported activity in over 1 hour.
  The workstream claim may be abandoned.

  To release: /workstream-release combat-system --force
  Or: /workstream-instances --cleanup

Summary
-------
Active instances: 2
Idle instances: 0
Stale instances: 1

Use --cleanup to automatically release stale claims.
```

### After Cleanup

```
/workstream-instances --cleanup

Active Instances (2)
====================
...

Stale Instances Cleaned (1)
===========================

session-old123-abc
  Was working on: combat-system - Combat System
  Last activity: 2 hours ago
  STATUS: RELEASED

Summary
-------
Active instances: 2
Cleanup performed:
  - Removed 1 stale instance
  - Released 1 workstream claim

Workstreams now available:
  - combat-system - Combat System

Use /workstream-ready to see available work.
```

### No Active Instances

```
Active Instances (0)
====================

No active instances found.

You are the first instance working on this project,
or all previous instances have completed their work.

Use /workstream-ready to find work to claim.
Use /workstream-claim <id> to start working.
```

## Instance Staleness

Instances are classified by their last heartbeat:

| Status | Time Since Last Activity | Action |
|--------|-------------------------|--------|
| Active | < 30 minutes | Normal operation |
| Idle | 30-60 minutes | Warning displayed |
| Stale | > 60 minutes | Eligible for cleanup |

The heartbeat is updated by:
- `/workstream-claim` when claiming work
- Activity hooks in `.claude/hooks/` (if configured)
- Manual update via instance registry

## Input

$ARGUMENTS

## Notes

- Instance IDs are generated when claiming workstreams
- Stale detection uses a 1-hour threshold by default
- `--cleanup` only affects stale instances, not active ones
- The current instance is always marked "(this session)"
- Use this command before claiming to see what others are working on
