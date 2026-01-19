# Workstream Status

Display the current status of all workstreams in the project.

## Description

This command reads the workstream registry at `.swarm/workstreams.json` and displays all workstreams organized by their current state. It provides a comprehensive overview of project progress including blocked workstreams and active instance assignments.

## Usage

```
/workstream-status [--state <state>] [--tag <tag>] [--verbose]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--state` | No | all | Filter by state (idea, research, planning, ready, implementing, merged) |
| `--tag` | No | none | Filter by tag |
| `--verbose` | No | false | Show full details including descriptions and notes |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Load Registry

```bash
# Read the workstream registry
cat .swarm/workstreams.json
```

Parse the JSON and extract the workstreams object.

### Step 2: Group by State

Group all workstreams by their `state` field into these categories:
- IDEAS: state = "idea"
- RESEARCH: state = "research"
- PLANNING: state = "planning" or "sub_planning"
- READY: state = "ready"
- IMPLEMENTING: state = "implementing"
- MERGED: state = "merged"

### Step 3: Identify Blocked Workstreams

A workstream is blocked if:
1. It has dependencies with `type: "blocks"`
2. Any blocking dependency's target workstream is NOT in `merged` state

For each blocked workstream, note which dependencies are blocking it.

### Step 4: Load Instance Data

```bash
# Read instance tracking
cat .swarm/instances.json
```

Map assigned instances to their workstreams.

### Step 5: Format Output

Display the status report in this format:

```
Workstream Status (YYYY-MM-DD)
==============================

IDEAS (N):
  - <id>: <title> [P<priority>]
    <description if verbose>

RESEARCH (N):
  - <id>: <title> [P<priority>]

PLANNING (N):
  - <id>: <title> [P<priority>]

READY (N):
  - <id>: <title> [P<priority>]
    <blockers if any>

IMPLEMENTING (N):
  - <id>: <title> [P<priority>]
    Phase <current>/<total>, assigned to <instance>

MERGED TODAY (N):
  - <id>: <title>

BLOCKED (N):
  - <id>
    Blocked by: <blocker-id> (state: <state>)
```

### Step 6: Summary Statistics

Display summary:

```
Summary:
  Total: N workstreams
  In Progress: N
  Ready to Start: N
  Blocked: N
```

## Example Output

```
Workstream Status (2026-01-18)
==============================

IDEAS (2):
  - resources-visible-bug: Resources Not Visible on Map [P3]
  - server-client-architecture: Server-Client Architecture [P4]

RESEARCH (1):
  - solo-worktree-improvements: Solo Worktree Workflow Improvements [P3]

PLANNING (0):

READY (4):
  - production-queue: Production Queue System [P2]
  - hover-highlight-bug-fix: Hover Highlight Bug Fix [P3]
  - city-system: City System [P2]
  - combat-system: Combat System [P2]

IMPLEMENTING (3):
  - cli-integration-architecture: CLI Integration Architecture [P1]
    Phase 1/5
  - player-faction-tracking: Player/Faction Tracking System [P1]
    Phase 3/3
  - workstream-tracking-system: Workstream Tracking System [P1]
    Phase 1/5

MERGED TODAY (1):
  - notification-system: Notification System

BLOCKED (1):
  - victory-conditions
    Blocked by: player-faction-tracking (state: implementing)

Summary:
  Total: 14 workstreams
  In Progress: 3
  Ready to Start: 4
  Blocked: 1
```

## Input

$ARGUMENTS

## Notes

- This command is read-only and does not modify the registry
- Workstreams with parent IDs are indented under their parent if displayed
- Priority is shown as [P1] through [P5] where P1 is highest priority
- The "MERGED TODAY" section only shows workstreams merged in the last 24 hours
