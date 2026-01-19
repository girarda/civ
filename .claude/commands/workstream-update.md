# Workstream Update

Update an existing workstream's metadata in the registry.

## Description

This command modifies an existing workstream in `.swarm/workstreams.json`. It can update state, priority, description, tags, notes, dependencies, and implementation details.

## Usage

```
/workstream-update <workstream-id> [--state <state>] [--priority <1-5>] [--description "<text>"] [--tags <tag1,tag2>] [--notes "<text>"] [--add-dep <target>:<type>] [--remove-dep <target>] [--phase <current>/<total>] [--branch <name>] [--assign <instance-id>] [--unassign]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<workstream-id>` | Yes | - | ID of workstream to update |
| `--state` | No | unchanged | New state |
| `--priority` | No | unchanged | New priority (1-5) |
| `--description` | No | unchanged | New description |
| `--tags` | No | unchanged | Replace tags (comma-separated) |
| `--notes` | No | unchanged | Update notes |
| `--add-dep` | No | - | Add dependency as `target:type[:reason]` |
| `--remove-dep` | No | - | Remove dependency by target ID |
| `--phase` | No | unchanged | Set current/total phases (e.g., "2/5") |
| `--branch` | No | unchanged | Set implementation branch name |
| `--assign` | No | unchanged | Assign to instance ID |
| `--unassign` | No | false | Clear instance assignment |
| `--artifact` | No | - | Link artifact as `type:path` (research, plan, validation, review) |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry

```bash
cat .swarm/workstreams.json
```

Parse JSON and locate the target workstream.

### Step 2: Validate Workstream Exists

If workstream ID not found:
```
Error: Workstream 'invalid-id' not found.

Did you mean one of these?
  - cli-integration-architecture
  - cli-integration-architecture/phase-2
```

### Step 3: Validate State Transitions

If `--state` is provided, validate the transition is allowed:

| From State | Allowed Transitions |
|------------|---------------------|
| idea | research, planning, ready |
| research | planning, ready, idea |
| planning | sub_planning, ready, research |
| sub_planning | ready, planning |
| ready | implementing, planning |
| implementing | merged, ready |
| merged | (terminal - warn but allow) |

Warn but allow invalid transitions:
```
Warning: Unusual state transition from 'merged' to 'implementing'.
Proceeding anyway. Use --force to suppress this warning.
```

### Step 4: Validate Dependencies

If `--add-dep` is provided:
1. Parse format: `target:type[:reason]`
2. Validate target workstream exists
3. Validate type is one of: blocks, informs, conflicts
4. Check for circular dependencies (basic check: target doesn't depend on this)

### Step 5: Apply Updates

For each provided option, update the corresponding field:

```javascript
// State update
if (state) {
  workstream.state = state;
  if (state === 'merged') {
    workstream.mergedAt = new Date().toISOString();
  }
}

// Priority update
if (priority) {
  workstream.priority = priority;
}

// Description update
if (description) {
  workstream.description = description;
}

// Tags update (replaces all tags)
if (tags) {
  workstream.tags = tags.split(',').map(t => t.trim().toLowerCase());
}

// Notes update
if (notes) {
  workstream.notes = notes;
}

// Add dependency
if (addDep) {
  const [target, type, reason] = addDep.split(':');
  workstream.dependencies.push({ target, type, reason: reason || null });
}

// Remove dependency
if (removeDep) {
  workstream.dependencies = workstream.dependencies.filter(d => d.target !== removeDep);
}

// Phase update
if (phase) {
  const [current, total] = phase.split('/').map(Number);
  workstream.implementation.currentPhase = current;
  workstream.implementation.totalPhases = total;
}

// Branch update
if (branch) {
  workstream.implementation.branch = branch;
}

// Assignment
if (assign) {
  workstream.implementation.assignedInstance = assign;
}
if (unassign) {
  workstream.implementation.assignedInstance = null;
}

// Artifact link
if (artifact) {
  const [type, path] = artifact.split(':');
  workstream.artifacts[type] = path;
}

// Always update timestamp
workstream.updated = new Date().toISOString();
```

### Step 6: Update Registry

1. Update `lastUpdated` timestamp
2. Write back to `.swarm/workstreams.json` using atomic write

### Step 7: Report Changes

```
Workstream Updated: <id>
========================

Changes Applied:
  - state: ready -> implementing
  - priority: 3 -> 2
  - assignedInstance: null -> session-abc123

Current State:
  ID: <id>
  Title: <title>
  State: <new-state>
  Priority: P<priority>
  Assigned: <instance-or-none>

Registry updated: .swarm/workstreams.json
```

## Examples

### Update State

```
/workstream-update fog-of-war --state research
```

### Add Dependency

```
/workstream-update victory-conditions --add-dep player-faction-tracking:blocks:Requires player elimination tracking
```

### Update Implementation Progress

```
/workstream-update cli-integration-architecture --phase 2/5 --branch feature/2026-01-18-cli-phase-2
```

### Assign to Instance

```
/workstream-update production-queue --state implementing --assign session-abc123
```

### Link Artifact

```
/workstream-update fog-of-war --artifact research:.swarm/research/2026-01-18-fog-of-war.md
```

## Error Handling

### Workstream Not Found

```
Error: Workstream 'invalid-id' not found.

Use /workstream-status to see all workstreams.
```

### Invalid Dependency Target

```
Error: Dependency target 'nonexistent' not found.

Available workstreams:
  - cli-integration-architecture
  - player-faction-tracking
  ...
```

### Circular Dependency Detected

```
Error: Adding this dependency would create a cycle.

Detected cycle:
  foo -> bar -> baz -> foo

Dependency not added.
```

## Input

$ARGUMENTS

## Notes

- All updates are recorded in the `updated` timestamp
- State transitions to `merged` automatically set `mergedAt`
- Dependencies are validated to prevent obvious cycles
- Assignment changes should be coordinated with `/workstream-claim` and `/workstream-release`
