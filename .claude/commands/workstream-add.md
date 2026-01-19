# Workstream Add

Register a new workstream in the project registry.

## Description

This command adds a new workstream to `.swarm/workstreams.json`. It creates an entry with the specified title and optional metadata, defaulting to `idea` state unless otherwise specified.

## Usage

```
/workstream-add "<title>" [--id <id>] [--priority <1-5>] [--type <type>] [--state <state>] [--parent <parent-id>] [--description "<text>"] [--tags <tag1,tag2>]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<title>` | Yes | - | Human-readable title for the workstream |
| `--id` | No | auto-generated | Workstream ID (kebab-case, auto-derived from title if not provided) |
| `--priority` | No | 3 | Priority level 1-5 (1=highest) |
| `--type` | No | feature | Type: epic, feature, phase, task, bug |
| `--state` | No | idea | Initial state: idea, research, planning, ready |
| `--parent` | No | null | Parent workstream ID for hierarchical relationships |
| `--description` | No | null | Longer description of the workstream |
| `--tags` | No | [] | Comma-separated list of tags |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Parse Arguments

Extract the title (required) and optional arguments from the input.

### Step 2: Generate ID

If `--id` is not provided, generate an ID from the title:
1. Convert to lowercase
2. Replace spaces with hyphens
3. Remove special characters
4. Truncate to 50 characters

Example: "Fog of War System" -> "fog-of-war-system"

### Step 3: Validate

1. Check that ID doesn't already exist in registry
2. Check that parent exists if specified
3. Validate priority is 1-5
4. Validate type is one of: epic, feature, phase, task, bug
5. Validate state is one of: idea, research, planning, ready

### Step 4: Create Workstream Object

```json
{
  "id": "<generated-or-provided-id>",
  "title": "<title>",
  "type": "<type>",
  "state": "<state>",
  "parent": "<parent-id-or-null>",
  "priority": <priority>,
  "created": "<YYYY-MM-DD>",
  "updated": "<ISO-8601-timestamp>",
  "description": "<description-or-null>",
  "dependencies": [],
  "artifacts": {
    "research": null,
    "plan": null,
    "validation": null,
    "review": null,
    "checkpoints": []
  },
  "implementation": {
    "branch": null,
    "worktree": null,
    "assignedInstance": null,
    "currentPhase": null,
    "totalPhases": null
  },
  "children": [],
  "tags": ["<tag1>", "<tag2>"],
  "notes": null
}
```

### Step 5: Update Registry

1. Read current `.swarm/workstreams.json`
2. Add new workstream to `workstreams` object
3. Update `lastUpdated` timestamp
4. If parent specified, add this ID to parent's `children` array
5. Write back to `.swarm/workstreams.json`

Use atomic write pattern:
```bash
# Write to temp file first
cat > .swarm/workstreams.json.tmp << 'EOF'
<new-json-content>
EOF

# Atomic move
mv .swarm/workstreams.json.tmp .swarm/workstreams.json
```

### Step 6: Report Success

```
Workstream Added
================
ID: <id>
Title: <title>
Type: <type>
State: <state>
Priority: P<priority>
Parent: <parent-or-none>
Tags: <tags-or-none>

Registry updated: .swarm/workstreams.json
```

## Examples

### Basic Usage

```
/workstream-add "Fog of War"
```

Creates:
- ID: fog-of-war
- Type: feature
- State: idea
- Priority: P3

### With Options

```
/workstream-add "Server Client Architecture" --priority 2 --type epic --tags architecture,multiplayer
```

Creates:
- ID: server-client-architecture
- Type: epic
- State: idea
- Priority: P2
- Tags: architecture, multiplayer

### As Child Phase

```
/workstream-add "Phase 4: CLI Frontend" --parent cli-integration-architecture --type phase --state ready
```

Creates:
- ID: cli-integration-architecture/phase-4
- Type: phase
- Parent: cli-integration-architecture
- State: ready

## Error Handling

### ID Already Exists

```
Error: Workstream ID 'fog-of-war' already exists.

Existing workstream:
  Title: Fog of War
  State: idea
  Priority: P3

Use --id to specify a different ID, or use /workstream-update to modify the existing workstream.
```

### Parent Not Found

```
Error: Parent workstream 'nonexistent-parent' not found.

Available workstreams:
  - cli-integration-architecture
  - player-faction-tracking
  - ...
```

### Invalid Priority

```
Error: Priority must be between 1 and 5. Got: 7
```

## Input

$ARGUMENTS

## Notes

- The ID must be unique across all workstreams
- Child workstreams (with parent) automatically get hierarchical IDs
- Tags are case-insensitive and stored lowercase
- The registry is the single source of truth for all workstream metadata
