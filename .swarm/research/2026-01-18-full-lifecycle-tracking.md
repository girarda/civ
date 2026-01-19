# Research: Full Feature Lifecycle Tracking

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research extends the workflow scaling recommendations to cover the complete feature lifecycle from initial idea through merged completion. The proposed solution introduces a workstream registry that tracks features through seven distinct states, integrates with all existing slash commands, and provides visibility into what work exists at each stage. The design prioritizes minimal friction while enabling coordination across 2-6 concurrent instances.

## Key Discoveries

- **Seven lifecycle stages identified**: Idea, Research, Planning, Sub-planning, Ready, Implementing, Merged
- **Existing commands don't produce or consume unified state**: Each command (`/research`, `/plan`, `/implement-worktree`, `/validate`, `/merge-worktree`) operates independently on file artifacts
- **Artifact-based state inference is fragile**: Current state is determined by checking which files exist (research doc? plan doc? validation doc?), which is error-prone and requires scanning
- **TODOs.txt serves as informal backlog**: Contains mixed concerns - ideas, in-progress work, completed items, dependencies
- **Plan files have Status field**: Plans include `**Status**: Ready for Implementation` but research docs and other artifacts vary
- **No explicit "idea" tracking**: Ideas exist only in TODOs.txt or user's head until research begins
- **Commands lack awareness of each other**: `/plan` doesn't know about prior research; `/implement-worktree` doesn't register anywhere

## Feature Lifecycle State Machine

### States

```
+--------+     +----------+     +----------+     +--------------+
|  IDEA  | --> | RESEARCH | --> | PLANNING | --> | SUB_PLANNING |
+--------+     +----------+     +----------+     +--------------+
                                     |                  |
                                     v                  v
                              +-------+          +-------+
                              | READY | <--------| READY |
                              +-------+          +-------+
                                  |
                                  v
                          +--------------+
                          | IMPLEMENTING |
                          +--------------+
                                  |
                                  v
                             +--------+
                             | MERGED |
                             +--------+
```

### State Definitions

| State | Description | Artifacts | Entry Trigger | Exit Trigger |
|-------|-------------|-----------|---------------|--------------|
| `idea` | Just a thought, not yet explored | None required | Manual registration | Start `/research` |
| `research` | Actively exploring feasibility/design | `.swarm/research/YYYY-MM-DD-<topic>.md` | `/research` command | Research doc complete |
| `planning` | Creating implementation plan | `.swarm/plans/YYYY-MM-DD-<feature>.md` | `/plan` command | Plan doc complete |
| `sub_planning` | Breaking large plan into phases | Multiple plan docs or phase sections | Manual or large scope detected | All sub-plans ready |
| `ready` | Has plan, waiting for implementation | Plan with `Status: Ready for Implementation` | Plan marked ready | Start `/implement-worktree` |
| `implementing` | Active worktree exists | Worktree, branch, checkpoints | `/implement-worktree` command | `/merge-worktree` complete |
| `merged` | Completed and in main | Validation doc, review doc | `/merge-worktree` command | (terminal state) |

### Valid Transitions

```
idea --> research
idea --> planning (skip research if simple)
idea --> ready (trivial change, no plan needed)
research --> planning
research --> ready (research revealed simple fix)
research --> idea (research showed idea not viable, shelve)
planning --> sub_planning
planning --> ready
sub_planning --> ready
ready --> implementing
implementing --> ready (implementation paused/deferred)
implementing --> merged
merged --> (terminal)
```

## Artifact-to-State Mapping

### Current Implicit State Detection (Fragile)

```
To determine feature state today:
1. Is there a merged branch in git? -> merged (but hard to detect)
2. Is there a worktree? -> implementing
3. Is there a validation doc? -> likely merged
4. Is there a review doc? -> likely ready for merge
5. Is there a plan with "Ready for Implementation"? -> ready
6. Is there a plan? -> planning
7. Is there a research doc? -> research
8. Is it in TODOs.txt? -> idea (maybe)
```

### Proposed Explicit State Tracking

```json
{
  "workstreams": [
    {
      "id": "notification-system",
      "title": "Notification System",
      "state": "ready",
      "priority": 2,
      "created": "2026-01-18",
      "updated": "2026-01-18T22:00:00Z",
      "artifacts": {
        "research": ".swarm/research/2026-01-18-notification-system.md",
        "plan": ".swarm/plans/2026-01-18-notification-system.md"
      },
      "currentPhase": null,
      "assignedInstance": null,
      "dependencies": [],
      "notes": "Ready for implementation, no blockers"
    }
  ]
}
```

## Integration with Existing Commands

### Command: `/research`

**Current behavior**: Creates `.swarm/research/YYYY-MM-DD-<topic>.md`

**Proposed integration**:
1. Check if workstream exists with matching ID
2. If exists: Update state to `research`, link artifact
3. If not exists: Create new workstream entry with state `research`
4. On completion: Update state to `planning` or `ready` based on recommendation

**Registry update example**:
```bash
# At start of /research
jq --arg id "$topic_id" --arg path "$research_path" '
  if (.workstreams | map(.id) | index($id)) then
    (.workstreams[] | select(.id == $id)).state = "research" |
    (.workstreams[] | select(.id == $id)).artifacts.research = $path
  else
    .workstreams += [{
      id: $id,
      title: ($id | gsub("-"; " ") | gsub("^"; "") | ascii_upcase[0:1] + .[1:]),
      state: "research",
      priority: 3,
      created: (now | strftime("%Y-%m-%d")),
      updated: (now | tostring),
      artifacts: { research: $path }
    }]
  end
' .swarm/workstreams.json > .swarm/workstreams.json.tmp && mv .swarm/workstreams.json.tmp .swarm/workstreams.json
```

### Command: `/plan`

**Current behavior**: Creates `.swarm/plans/YYYY-MM-DD-<feature>.md`

**Proposed integration**:
1. Check if workstream exists (may have come from research)
2. Update or create entry with state `planning`
3. Link plan artifact
4. When plan includes `Status: Ready for Implementation`, update state to `ready`

### Command: `/implement-worktree`

**Current behavior**: Creates worktree, implements phases, creates checkpoints/validation/review

**Proposed integration**:
1. Verify workstream exists and is in `ready` state
2. Update state to `implementing`
3. Set `assignedInstance` to current session ID
4. Set `currentPhase` as implementation progresses
5. Link checkpoint artifacts as created
6. On validation completion: Leave in `implementing` until merge

### Command: `/validate`

**Current behavior**: Runs tests and creates validation document

**Proposed integration**:
1. Find workstream by feature name
2. Link validation artifact
3. State remains `implementing` (validation is part of implementation)

### Command: `/merge-worktree`

**Current behavior**: Merges branch to main, cleans up worktree

**Proposed integration**:
1. Find workstream by branch name
2. Update state to `merged`
3. Clear `assignedInstance`
4. Set `mergedAt` timestamp
5. Link review artifact (created during implementation)

## Proposed Registry Schema

### File: `.swarm/workstreams.json`

```json
{
  "version": 1,
  "lastUpdated": "2026-01-18T23:30:00Z",
  "workstreams": [
    {
      "id": "notification-system",
      "title": "Notification System",
      "description": "Toast notifications and debug overlay",
      "state": "ready",
      "priority": 2,
      "created": "2026-01-18",
      "updated": "2026-01-18T22:00:00Z",
      "artifacts": {
        "research": ".swarm/research/2026-01-18-notification-system.md",
        "plan": ".swarm/plans/2026-01-18-notification-system.md",
        "validation": null,
        "review": null,
        "checkpoints": []
      },
      "implementation": {
        "branch": null,
        "worktree": null,
        "currentPhase": null,
        "totalPhases": 4,
        "assignedInstance": null
      },
      "dependencies": [],
      "blockedBy": [],
      "tags": ["ui", "developer-tools"],
      "notes": ""
    }
  ]
}
```

### State-Specific Fields

| State | Required Fields | Optional Fields |
|-------|----------------|-----------------|
| `idea` | id, title, created | description, priority, tags, notes |
| `research` | + artifacts.research | |
| `planning` | + artifacts.plan | |
| `sub_planning` | + artifacts.plan | subPlans[] |
| `ready` | artifacts.plan with Ready status | dependencies, blockedBy |
| `implementing` | implementation.branch, implementation.worktree | currentPhase, assignedInstance |
| `merged` | mergedAt, artifacts.validation | artifacts.review |

## New Commands for Lifecycle Management

### `/workstream-add` - Register New Workstream

```markdown
# Add Workstream

Register a new idea or workstream in the tracking system.

## Usage
/workstream-add <title> [--priority <1-5>] [--state <state>] [--description <desc>]

## Behavior
1. Generate ID from title (kebab-case)
2. Create workstream entry with specified or default state (idea)
3. Set priority (default: 3)
4. Report success with ID for future reference

## Example
/workstream-add "Fog of War" --priority 2 --description "Hide unexplored map areas"
```

### `/workstream-status` - View All Workstreams

```markdown
# Workstream Status

Display current status of all tracked workstreams.

## Usage
/workstream-status [--state <state>] [--mine]

## Output Format
```
Workstream Status (2026-01-18)
==============================

IDEAS (3):
  - fog-of-war: Fog of War [P2]
  - diplomacy: Diplomacy System [P4]
  - multiplayer: Multiplayer Support [P5]

RESEARCH (1):
  - cli-phases-2-3: CLI Integration Phases 2-3 [P1]

READY (2):
  - notification-system: Notification System [P2]
  - production-queue: Production Queue [P2]

IMPLEMENTING (1):
  - cli-integration-arch: CLI Integration Architecture [P1]
    Phase 2/5, assigned to session:abc123
    Worktree: ../civ-2026-01-18-cli-integration-architecture

MERGED TODAY (2):
  - player-faction-tracking
  - production-system
```

### `/workstream-update` - Update Workstream State

```markdown
# Update Workstream

Manually update workstream state or metadata.

## Usage
/workstream-update <id> [--state <state>] [--priority <N>] [--notes <text>]

## Example
/workstream-update fog-of-war --state research --notes "Starting feasibility research"
```

### `/workstream-claim` - Assign Instance to Workstream

```markdown
# Claim Workstream

Assign current instance to work on a specific workstream.

## Usage
/workstream-claim <id>

## Behavior
1. Verify workstream is in claimable state (ready, implementing)
2. Check not already claimed by another active instance
3. Set assignedInstance to current session ID
4. Report claim success
```

### `/workstream-release` - Release Workstream Assignment

```markdown
# Release Workstream

Remove current instance assignment from workstream.

## Usage
/workstream-release [<id>]

## Behavior
1. If no ID provided, find workstream assigned to current session
2. Clear assignedInstance
3. Optionally update notes with pause reason
```

## Integration Approach: Minimal Friction

### Principle: Automatic When Possible, Manual When Needed

The goal is for the registry to stay in sync with minimal explicit user action:

1. **Auto-register on first artifact creation**
   - Running `/research notification-system` auto-creates workstream if not exists
   - Running `/plan notification-system` links to existing or creates new

2. **Auto-update on command completion**
   - `/research` completion: state -> `research` (or `planning` if recommended)
   - `/plan` completion: state -> `planning` or `ready`
   - `/implement-worktree` start: state -> `implementing`
   - `/merge-worktree` completion: state -> `merged`

3. **Manual intervention for edge cases**
   - Registering ideas before any work
   - Updating priority
   - Marking dependencies
   - Pausing/resuming work
   - Archiving abandoned ideas

### Wrapper Approach for Existing Commands

Rather than modifying each command file, create wrapper behavior:

**Option A: Pre/Post Hooks in Commands**

Add sections to each command:

```markdown
## Pre-Command Registry Update
Before executing, check/update workstream registry...

## Post-Command Registry Update
After executing, update workstream registry...
```

**Option B: Separate Registry Update Command**

Create `/workstream-sync` that:
1. Scans .swarm/ directories for artifacts
2. Matches artifacts to workstreams
3. Infers state from artifact presence
4. Updates registry

**Recommendation**: Option A is more reliable (explicit transitions) but Option B works as fallback/recovery.

## Handling TODOs.txt Migration

### Current TODOs.txt Content Analysis

```
- [ ] resources aren't visible on the map           -> idea: resource-visibility-bug
- [ ] plan and implement solo-worktree-improvements -> ready: solo-worktree-improvements
- [ ] 2026-01-18-e2e-game-roadmap.md                -> planning: e2e-game-roadmap
  - [X] A                                           -> merged phases
  - [X] B
  - [X] C
  - [X] D
  - [ ] E(just units) (phase 2 in progress)         -> implementing: e2e-roadmap-E
  - [ ] E produce buildings                         -> sub-plan of E
  - [ ] F (depends on D, E)                         -> ready with dependency
- [ ] server-client architecture                    -> idea: server-client-arch
- [X] /research unit movement and turns             -> merged
- [ ] victory                                       -> idea with sub-items
  - [ ] 1. Player/Faction Tracking                  -> implementing (phases 1,2,3)
  - [ ] 2. Victory Condition System                 -> idea
  - [ ] 3. Game-Over State                          -> idea
  - [ ] 4. Victory UI                               -> idea
- 2026-01-18-cli-integration-architecture.md        -> implementing
  - [ ] phase 2,3 (in progress)
  - [ ] phase 4
  - [ ] phase 5
- [ ] toast notifications (in progress)             -> implementing: notification-system
```

### Migration Strategy

1. Create `/workstream-import-todos` command that:
   - Parses TODOs.txt structure
   - Creates workstream entries for each top-level item
   - Infers state from checkbox and notes
   - Links existing artifacts if found

2. Deprecate TODOs.txt in favor of:
   - Ideas: workstreams.json with state `idea`
   - Progress: `/workstream-status` command
   - Notes: workstream `notes` field

3. Keep TODOs.txt as optional human-readable view (generated from registry)

## Instance Coordination

### Session Registration

When a Claude instance starts working on a feature:

```json
{
  "instances": [
    {
      "sessionId": "abc123",
      "startedAt": "2026-01-18T20:00:00Z",
      "lastHeartbeat": "2026-01-18T23:30:00Z",
      "workingOn": "notification-system",
      "worktree": "../civ-2026-01-18-notification-system",
      "currentTask": "Phase 2: Toast Panel"
    }
  ]
}
```

### Heartbeat Mechanism

Update `lastHeartbeat` on each significant action (via hooks):

```bash
# In .claude/hooks/log-prompt.sh
# Update heartbeat timestamp
jq --arg sid "$SESSION_ID" '
  (.instances[] | select(.sessionId == $sid)).lastHeartbeat = (now | tostring)
' .swarm/instances.json > .swarm/instances.json.tmp && mv .swarm/instances.json.tmp .swarm/instances.json
```

### Stale Instance Detection

When claiming work, check for stale instances:

```
If workstream.assignedInstance exists:
  Find instance in instances.json
  If lastHeartbeat > 1 hour ago:
    Mark instance as stale
    Clear workstream assignment
    Allow claim
  Else:
    Reject claim, report who has it
```

## Phased Implementation Plan

### Phase 1: Registry Foundation (Small Effort)

- [ ] Create `.swarm/workstreams.json` with initial schema
- [ ] Create `.swarm/instances.json` for coordination
- [ ] Create `/workstream-add` command
- [ ] Create `/workstream-status` command
- [ ] Document JSON schema in `.swarm/schemas/`

### Phase 2: Command Integration (Medium Effort)

- [ ] Add registry hooks to `/research` command
- [ ] Add registry hooks to `/plan` command
- [ ] Add registry hooks to `/implement-worktree` skill
- [ ] Add registry hooks to `/merge-worktree` command
- [ ] Create `/workstream-update` command

### Phase 3: Instance Coordination (Medium Effort)

- [ ] Implement instance registration in hooks
- [ ] Add heartbeat updates
- [ ] Create `/workstream-claim` command
- [ ] Create `/workstream-release` command
- [ ] Add stale instance detection

### Phase 4: Migration and Polish (Medium Effort)

- [ ] Create `/workstream-import-todos` command
- [ ] Migrate existing TODOs.txt entries
- [ ] Create `/workstream-sync` for recovery
- [ ] Add workstream filtering/querying options
- [ ] Create dashboard view skill

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/.swarm/workstreams.json` | Central workstream registry (to create) |
| `/Users/alex/workspace/civ/.swarm/instances.json` | Active instance tracking (to create) |
| `/Users/alex/workspace/civ/TODOs.txt` | Current informal backlog (to migrate) |
| `/Users/alex/.claude/commands/implement-worktree.md` | User-level implement command (to enhance) |
| `/Users/alex/workspace/civ/.claude/commands/merge-worktree.md` | Workspace merge command (to enhance) |
| `/Users/alex/workspace/civ/.claude/skills/implement-worktree/SKILL.md` | Implementation skill (to enhance) |
| `/Users/alex/workspace/civ/.swarm/research/2026-01-18-workflow-scaling.md` | Prior research on scaling |

## Recommendations

### 1. Start with Registry + Status Command

The highest-value, lowest-risk first step:
- Create `workstreams.json` with current state inferred from artifacts
- Create `/workstream-status` for immediate visibility
- This alone provides value without changing any existing commands

### 2. Add Hooks Incrementally

Don't modify all commands at once:
- Start with `/implement-worktree` (most complex, most benefit)
- Then `/merge-worktree` (natural pair)
- Then `/research` and `/plan` (simpler)

### 3. Keep TODOs.txt as Fallback

During transition:
- Registry is source of truth
- TODOs.txt can be generated from registry
- Users can still edit TODOs.txt if they prefer

### 4. Design for Recovery

Things will get out of sync. Build in:
- `/workstream-sync` to reconcile artifacts with registry
- Clear instructions for manual registry edits
- Validation that warns about orphaned artifacts

### 5. Prefer State Updates Over State Inference

Instead of re-inferring state every time:
- Commands explicitly update state on transitions
- State is read directly from registry
- Sync command available for recovery

## Open Questions

1. **Archive behavior**: Should merged workstreams move to a separate `archive.json` or stay in main registry?
   - Recommendation: Keep in registry with `state: merged`, add `archiveAfter` date field for cleanup

2. **Cross-project workstreams**: User has multiple repos. Should there be a global registry in `~/.claude/`?
   - Recommendation: Per-project registry is sufficient. Cross-project coordination is a future enhancement.

3. **Notification on state changes**: When a workstream becomes unblocked or claimed by another instance, how to notify?
   - Recommendation: `/workstream-status` is pull-based. Push notifications are future scope.

4. **Conflict resolution**: What if two instances try to update the same workstream simultaneously?
   - Recommendation: Atomic file writes with version field. On conflict, re-read and retry.

5. **Sub-workstream tracking**: Large features have phases. Should phases be separate workstreams?
   - Recommendation: Phases are tracked within a workstream (`currentPhase`, `totalPhases`). Only create separate workstreams if truly independent.

## Conclusion

Full lifecycle tracking extends the workflow scaling solution by introducing explicit state management across seven stages. The key insight is that state should be tracked explicitly in a registry rather than inferred from artifacts, enabling reliable coordination across multiple instances.

The recommended approach:
1. Create workstream registry with clear state machine
2. Integrate with existing commands via pre/post hooks
3. Provide status/management commands for visibility
4. Support both automatic and manual state transitions
5. Migrate from TODOs.txt to structured registry

This provides answers to:
- "What's the status of feature X?" -> Check `workstreams.json` or run `/workstream-status`
- "What ideas are waiting to be researched?" -> Filter by state `idea`
- "Who's working on what?" -> Check `assignedInstance` fields
- "What's blocked?" -> Check `blockedBy` relationships

Total estimated effort: 2-3 days for full implementation, but value can be delivered incrementally starting with Phase 1 (registry + status command) which takes only a few hours.
