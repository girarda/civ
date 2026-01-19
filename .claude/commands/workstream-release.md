# Workstream Release

Release a workstream claim, allowing others to work on it.

## Description

This command releases the assignment of a workstream from the current (or specified) instance. It clears the `assignedInstance` field and optionally reverts the state to `ready` if work wasn't completed.

## Usage

```
/workstream-release <workstream-id> [--state <state>] [--notes "<reason>"] [--force]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<workstream-id>` | Yes | - | ID of workstream to release |
| `--state` | No | ready | State to set (ready, planning, research) |
| `--notes` | No | null | Reason for releasing |
| `--force` | No | false | Release even if assigned to different instance |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry

```bash
cat .swarm/workstreams.json
cat .swarm/instances.json
```

### Step 2: Validate Workstream

If not found:
```
Error: Workstream '<id>' not found.
```

If not assigned:
```
Warning: Workstream '<id>' is not currently assigned.

Current state: <state>

No action needed. Use /workstream-claim to assign it.
```

### Step 3: Verify Ownership

Check if the workstream is assigned to the current instance:

```javascript
const currentInstance = getCurrentInstanceId();
const assignedInstance = workstream.implementation?.assignedInstance;

if (assignedInstance !== currentInstance && !forceFlag) {
  // Not our claim
  return {
    success: false,
    reason: `Assigned to ${assignedInstance}, not current instance`
  };
}
```

If `--force` is specified, allow release regardless of assignee.

### Step 4: Update Workstream Registry

```javascript
// Clear assignment
workstream.implementation.assignedInstance = null;

// Update state if specified
if (newState) {
  workstream.state = newState;
}

// Add notes if provided
if (notes) {
  workstream.notes = notes;
}

workstream.updated = new Date().toISOString();
registry.lastUpdated = new Date().toISOString();
```

Using helper script:
```bash
.swarm/scripts/update-registry.sh <workstream-id> --unassign
.swarm/scripts/update-registry.sh <workstream-id> --state ready
```

### Step 5: Update Instance Registry

Remove the instance entry or update its workstream:

```javascript
if (instances.instances[instanceId]) {
  delete instances.instances[instanceId];
  // Or if instance has multiple claims:
  // instances.instances[instanceId].workstream = null;
}
instances.lastUpdated = new Date().toISOString();
```

### Step 6: Report Success

```
Releasing: <workstream-id>
==========================

Status: SUCCESS
Workstream: <title>
Previous State: implementing
New State: <new-state>
Previous Assignee: <instance-id>

<If notes provided>:
Release Notes: "<notes>"

The workstream is now available for others to claim.

Use /workstream-ready to see available work.
Use /workstream-status to see all workstreams.
```

## Use Cases

### Pausing Work

When you need to pause work temporarily:

```
/workstream-release production-queue --notes "Pausing for lunch, will resume later"
```

### Handoff to Another Instance

When transferring work:

```
/workstream-release production-queue --state ready --notes "Phase 1 complete, handing off Phase 2"
```

### Abandoning Work

When work can't continue:

```
/workstream-release production-queue --state ready --notes "Blocked by unclear requirements"
```

### Force Release (Admin)

When an instance appears stuck:

```
/workstream-release production-queue --force --notes "Instance appears stale, releasing for reassignment"
```

## Error Handling

### Not Assigned

```
Warning: Workstream '<id>' is not currently assigned.

Current state: <state>
Last assignee: <previous-assignee> (released at <timestamp>)

No action needed. The workstream is already available.
```

### Assigned to Different Instance

```
Error: Workstream '<id>' is assigned to a different instance.

Current assignee: <other-instance>
Your instance: <your-instance>

Options:
1. Contact the assignee to coordinate
2. Wait for them to release
3. Use --force to override (admin only)

Use /workstream-instances to see active instances.
```

### Cannot Release Merged

```
Error: Cannot release workstream '<id>'.

Current state: merged (terminal state)

Merged workstreams cannot be released or reassigned.
```

## Example Output

```
Releasing: production-queue
===========================

Status: SUCCESS
Workstream: Production Queue System
Previous State: implementing
New State: ready
Previous Assignee: session-m5x9k-a3b7c
Release Notes: "Completed Phase 1, releasing for team coordination"

The workstream is now available for others to claim.

Progress preserved:
  - Phase: 1/4 complete
  - Checkpoint: .swarm/checkpoints/2026-01-18-production-queue-phase-1.md

Use /workstream-ready to see available work.
Use /workstream-status to see all workstreams.
```

## Input

$ARGUMENTS

## Notes

- Releasing does NOT change the state to `merged` (use `/merge-worktree` for that)
- Progress (currentPhase, checkpoints) is preserved across releases
- Use `--notes` to document why work was paused or transferred
- Force release should be used sparingly (intended for admin/recovery)
- The released workstream immediately appears in `/workstream-ready` output
