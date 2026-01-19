# Workstream Sync

Reconcile the workstream registry with filesystem artifacts.

## Description

This command checks for consistency between the workstream registry and the actual filesystem state. It detects orphaned workstreams (no matching artifacts), unregistered artifacts, and other discrepancies.

## Usage

```
/workstream-sync [--fix] [--verbose]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--fix` | No | false | Automatically fix issues where possible |
| `--verbose` | No | false | Show detailed information for each check |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry

```bash
cat .swarm/workstreams.json
```

### Step 2: Scan Artifact Directories

```bash
# Collect all artifact files
ls .swarm/research/*.md
ls .swarm/plans/*.md
ls .swarm/validations/*.md
ls .swarm/reviews/*.md
ls .swarm/checkpoints/*.md
```

### Step 3: Check Registry-to-Filesystem

For each workstream in the registry:

```javascript
function checkWorkstreamArtifacts(workstream) {
  const issues = [];

  // Check research artifact
  if (workstream.artifacts.research) {
    if (!fs.existsSync(workstream.artifacts.research)) {
      issues.push({
        type: 'missing_artifact',
        artifact: 'research',
        path: workstream.artifacts.research
      });
    }
  }

  // Check plan artifact
  if (workstream.artifacts.plan) {
    if (!fs.existsSync(workstream.artifacts.plan)) {
      issues.push({
        type: 'missing_artifact',
        artifact: 'plan',
        path: workstream.artifacts.plan
      });
    }
  }

  // Check implementation state consistency
  if (workstream.state === 'implementing') {
    if (workstream.implementation?.worktree) {
      if (!fs.existsSync(workstream.implementation.worktree)) {
        issues.push({
          type: 'missing_worktree',
          path: workstream.implementation.worktree
        });
      }
    }
  }

  return issues;
}
```

### Step 4: Check Filesystem-to-Registry

For each artifact file found:

```javascript
function checkUnregisteredArtifacts(artifactFiles, registry) {
  const unregistered = [];

  for (const file of artifactFiles) {
    const id = extractIdFromFilename(file);
    const linked = Object.values(registry.workstreams).some(ws =>
      ws.artifacts.research === file ||
      ws.artifacts.plan === file ||
      ws.artifacts.validation === file ||
      ws.artifacts.review === file ||
      ws.artifacts.checkpoints?.includes(file)
    );

    if (!linked) {
      unregistered.push({
        type: 'unregistered_artifact',
        path: file,
        suggestedId: id
      });
    }
  }

  return unregistered;
}
```

### Step 5: Check Instance Consistency

```javascript
function checkInstances(instances, registry) {
  const issues = [];

  for (const [id, instance] of Object.entries(instances.instances)) {
    // Check if claimed workstream exists
    if (instance.workstream) {
      const ws = registry.workstreams[instance.workstream];
      if (!ws) {
        issues.push({
          type: 'orphaned_instance',
          instanceId: id,
          workstream: instance.workstream
        });
      } else if (ws.implementation?.assignedInstance !== id) {
        issues.push({
          type: 'assignment_mismatch',
          instanceId: id,
          workstream: instance.workstream
        });
      }
    }

    // Check for stale instances
    if (isStale(instance.lastHeartbeat)) {
      issues.push({
        type: 'stale_instance',
        instanceId: id,
        lastHeartbeat: instance.lastHeartbeat
      });
    }
  }

  return issues;
}
```

### Step 6: Report Findings

```
Workstream Sync Report
======================

Checking registry against filesystem...

Registry Issues:
----------------

1. Missing Artifact
   Workstream: cli-integration-architecture
   Artifact: research
   Expected: .swarm/research/2026-01-18-cli-integration-architecture.md
   Status: FILE NOT FOUND
   <If --fix>: Cleared artifact link

2. Missing Worktree
   Workstream: notification-system
   State: implementing
   Expected: ../civ-2026-01-18-notification-system
   Status: DIRECTORY NOT FOUND
   <If --fix>: State reverted to 'ready', worktree cleared

Filesystem Issues:
------------------

1. Unregistered Artifact
   Path: .swarm/research/2026-01-18-unknown-feature.md
   Suggested ID: unknown-feature
   <If --fix>: Created workstream entry

2. Unregistered Artifact
   Path: .swarm/plans/2026-01-18-orphaned-plan.md
   Suggested ID: orphaned-plan
   <If --fix>: Created workstream entry

Instance Issues:
----------------

1. Stale Instance
   Instance: session-old123-abc
   Last Activity: 3 hours ago
   Workstream: combat-system
   <If --fix>: Released claim, removed instance

2. Assignment Mismatch
   Instance: session-xyz789
   Claims: production-queue
   Registry shows: Not assigned
   <If --fix>: Updated registry to match

Summary:
--------
  Registry issues: 2
  Filesystem issues: 2
  Instance issues: 2
  Total issues: 6

<If --fix>:
  Fixed: 5
  Manual attention needed: 1

<If not --fix>:
  Run with --fix to automatically resolve issues.
```

### Step 7: Apply Fixes (if --fix)

```javascript
function applyFix(issue, registry, instances) {
  switch (issue.type) {
    case 'missing_artifact':
      // Clear the invalid artifact link
      const ws = registry.workstreams[issue.workstreamId];
      ws.artifacts[issue.artifact] = null;
      return { fixed: true };

    case 'missing_worktree':
      // Revert state and clear worktree
      const ws2 = registry.workstreams[issue.workstreamId];
      ws2.state = 'ready';
      ws2.implementation.worktree = null;
      ws2.implementation.assignedInstance = null;
      return { fixed: true };

    case 'unregistered_artifact':
      // Create workstream entry
      const newWs = createWorkstreamFromArtifact(issue);
      registry.workstreams[newWs.id] = newWs;
      return { fixed: true };

    case 'stale_instance':
      // Release claim and remove instance
      releaseInstanceClaim(issue.instanceId, registry, instances);
      delete instances.instances[issue.instanceId];
      return { fixed: true };

    case 'assignment_mismatch':
      // Update registry to match instance claim
      const ws3 = registry.workstreams[issue.workstream];
      ws3.implementation.assignedInstance = issue.instanceId;
      return { fixed: true };

    case 'orphaned_instance':
      // Remove instance with invalid workstream reference
      delete instances.instances[issue.instanceId];
      return { fixed: true };

    default:
      return { fixed: false, reason: 'Unknown issue type' };
  }
}
```

## Issue Types

| Issue Type | Severity | Auto-fixable | Description |
|------------|----------|--------------|-------------|
| `missing_artifact` | Warning | Yes | Linked artifact file doesn't exist |
| `missing_worktree` | Warning | Yes | Worktree directory doesn't exist |
| `unregistered_artifact` | Info | Yes | Artifact exists but not in registry |
| `stale_instance` | Warning | Yes | Instance hasn't reported activity |
| `assignment_mismatch` | Error | Yes | Instance claim doesn't match registry |
| `orphaned_instance` | Warning | Yes | Instance references missing workstream |

## Example Output (Verbose)

```
/workstream-sync --verbose

Workstream Sync Report
======================

Checking 14 workstreams...

  cli-integration-architecture: OK
    - Research: .swarm/research/2026-01-18-cli-integration-architecture.md (exists)
    - Plan: .swarm/plans/2026-01-18-cli-integration-architecture.md (exists)
    - State: implementing (valid)

  notification-system: 1 issue
    - Research: .swarm/research/2026-01-18-notification-system.md (exists)
    - Plan: .swarm/plans/2026-01-18-notification-system.md (exists)
    - State: implementing
    - ISSUE: Worktree not found (expected: ../civ-2026-01-18-notification-system)

  ...

Checking artifact directories...

  .swarm/research/: 25 files
    - 23 linked to workstreams
    - 2 unregistered

  .swarm/plans/: 18 files
    - 18 linked to workstreams
    - 0 unregistered

Checking instances...

  3 active instances
  1 stale instance (session-old123-abc, 3 hours ago)

Summary:
--------
  Workstreams checked: 14
  Artifacts checked: 43
  Instances checked: 4
  Issues found: 4

Run with --fix to resolve issues.
```

## Input

$ARGUMENTS

## Notes

- Sync is non-destructive without `--fix` flag
- Use `--verbose` to see detailed status of each item
- Missing artifacts are common after branch switches
- Stale instances are cleaned up to prevent blocking
- Run periodically to maintain registry health
