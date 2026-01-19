# Workstream Import

Import workstreams from TODOs.txt and scan for unregistered artifacts.

## Description

This command migrates existing TODOs.txt entries to the workstream registry and scans `.swarm/research/` and `.swarm/plans/` directories for artifacts that aren't yet linked to workstreams.

## Usage

```
/workstream-import [--dry-run] [--todos-only] [--artifacts-only]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--dry-run` | No | false | Show what would be imported without making changes |
| `--todos-only` | No | false | Only import from TODOs.txt |
| `--artifacts-only` | No | false | Only scan artifact directories |

## Execution

When this command is invoked, perform the following steps:

### Step 1: Backup Existing Files

```bash
# Backup TODOs.txt before modification
cp TODOs.txt TODOs.txt.bak

# Backup registry
cp .swarm/workstreams.json .swarm/workstreams.json.bak
```

### Step 2: Parse TODOs.txt

Parse the TODOs.txt file to extract workstream entries:

```javascript
function parseTodosFile(content) {
  const entries = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match checkbox lines: - [ ] or - [x] or - [X]
    const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.+)$/);
    if (match) {
      const indent = match[1].length;
      const completed = match[2].toLowerCase() === 'x';
      const text = match[3].trim();

      entries.push({
        indent,
        completed,
        text,
        isChild: indent > 0
      });
    }
  }

  return entries;
}
```

### Step 3: Convert TODOs to Workstreams

For each TODO entry, create or update a workstream:

```javascript
function todoToWorkstream(todo) {
  // Extract ID from text (convert to kebab-case)
  const id = todo.text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  // Determine state based on completion and context
  let state = 'idea';
  if (todo.completed) {
    state = 'merged';
  } else if (todo.text.includes('in progress')) {
    state = 'implementing';
  } else if (todo.text.includes('.swarm/plans/')) {
    state = 'ready';
  } else if (todo.text.includes('.swarm/research/')) {
    state = 'research';
  }

  return {
    id,
    title: todo.text.replace(/\s*\(.*\)\s*$/, '').trim(),
    type: todo.isChild ? 'task' : 'feature',
    state,
    priority: 3, // Default priority
    // ... other fields
  };
}
```

### Step 4: Scan Artifact Directories

```bash
# Find research documents
ls .swarm/research/*.md

# Find plan documents
ls .swarm/plans/*.md
```

For each artifact file:

```javascript
function processArtifact(filePath, type) {
  // Extract workstream ID from filename
  // .swarm/research/2026-01-18-foo-bar.md -> foo-bar
  const filename = path.basename(filePath, '.md');
  const id = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '');

  return {
    id,
    artifactType: type, // 'research' or 'plan'
    path: filePath
  };
}
```

### Step 5: Match and Merge

For each artifact:
1. Check if workstream exists in registry
2. If exists: Link artifact
3. If not: Create new workstream entry

```javascript
function mergeArtifact(artifact, registry) {
  const existing = registry.workstreams[artifact.id];

  if (existing) {
    // Link artifact
    existing.artifacts[artifact.artifactType] = artifact.path;

    // Update state if needed
    if (artifact.artifactType === 'plan' && existing.state === 'idea') {
      existing.state = 'ready';
    }

    return { action: 'linked', id: artifact.id };
  } else {
    // Create new workstream
    const workstream = createWorkstreamFromArtifact(artifact);
    registry.workstreams[artifact.id] = workstream;
    return { action: 'created', id: artifact.id };
  }
}
```

### Step 6: Report Results

```
Importing from TODOs.txt and .swarm/ artifacts...
==================================================

From TODOs.txt:
---------------
  - resources-visible-bug: Created as idea
  - solo-worktree-improvements: Created as research (has research doc)
  - server-client-arch: Created as idea
  - victory: Created as epic

Skipped (already exists):
  - cli-integration-architecture
  - player-faction-tracking

From .swarm/research/:
----------------------
  - notification-system: Linked research artifact
  - cli-integration-architecture: Already linked
  - combat-system: Linked research artifact

From .swarm/plans/:
-------------------
  - notification-system: State updated to ready, plan linked
  - combat-system: State updated to ready, plan linked
  - hover-highlight-bug-fix: Created as ready (new workstream from plan)

Summary:
--------
  Workstreams created: 5
  Workstreams updated: 8
  Artifacts linked: 15
  Skipped (already exists): 3
  Errors: 0

TODOs.txt has been marked as deprecated.
Original backed up to: TODOs.txt.bak

Run /workstream-status to see all workstreams.
```

### Step 7: Mark TODOs.txt Deprecated

Add deprecation notice to TODOs.txt:

```
# DEPRECATED - This file is no longer maintained
#
# Workstreams are now tracked in .swarm/workstreams.json
# Use the following commands instead:
#
#   /workstream-status  - See all workstreams
#   /workstream-add     - Add new workstream
#   /workstream-ready   - Find available work
#   /workstream-claim   - Claim work to implement
#
# This file is preserved for reference only.
# Last migrated: 2026-01-18
#
# ============================================

<original content below>
```

## Dry Run Output

With `--dry-run`:

```
DRY RUN - No changes will be made
=================================

Would import from TODOs.txt:
  - resources-visible-bug: Would create as idea
  - solo-worktree-improvements: Would create as research

Would scan .swarm/research/:
  - 5 artifacts found
  - 3 would be linked to existing workstreams
  - 2 would create new workstreams

Would scan .swarm/plans/:
  - 8 artifacts found
  - 6 would be linked to existing workstreams
  - 2 would create new workstreams

Summary:
  Would create: 4 workstreams
  Would update: 9 workstreams
  Would link: 13 artifacts

Run without --dry-run to apply changes.
```

## Error Handling

### File Not Found

```
Warning: TODOs.txt not found.

Proceeding with artifact scanning only.
Use --artifacts-only to suppress this warning.
```

### Parse Errors

```
Warning: Could not parse line 15 of TODOs.txt:
  "malformed content here"

Skipping this line. Review manually if needed.
```

### Duplicate IDs

```
Warning: Duplicate workstream ID detected.

  ID: 'foo-bar' appears in:
    - TODOs.txt line 5
    - .swarm/plans/2026-01-18-foo-bar.md

  Using existing registry entry.
  Manual review recommended.
```

## Input

$ARGUMENTS

## Notes

- Original TODOs.txt is backed up before modification
- Import is idempotent - running multiple times is safe
- Use `--dry-run` to preview changes before applying
- Hierarchical TODOs (indented) become child workstreams
- Priority defaults to 3 (can be updated later with `/workstream-update`)
