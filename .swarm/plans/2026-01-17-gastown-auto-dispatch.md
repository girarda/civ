# Plan: Gastown Auto-Dispatch Enhancement

**Date**: 2026-01-17
**Status**: Ready for Implementation

## Overview

Enhance the `/gastown` command to automatically dispatch work to polecats after creating a convoy. Currently, gastown creates beads and convoys but only reports dispatch commands without executing them. The enhancement adds an opt-in `--dispatch` flag that spawns workers using `gt sling`, with optional `--max-workers N` throttling based on polecat capacity.

## Research Summary

Key findings from `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-gastown-workflow.md`:

- **Current gastown flow**: Plan -> Beads -> Convoy -> Report (stops here)
- **Desired flow**: Plan -> Beads -> Convoy -> Dispatch -> Report
- **Dispatch command**: `gt sling <bead-id> <rig>` spawns polecat with work
- **Capacity check**: `gt polecat list <rig>` shows polecat status (idle/working)
- **Existing pattern**: `mol-convoy-feed` formula provides dispatch logic template
- **Throttling approach**: `min(ready_issues, idle_polecats, max_workers)`

## Phased Implementation

### Phase 1: Argument Parsing Enhancement

- [ ] Add `--dispatch` flag to argument parsing documentation
- [ ] Add optional `--max-workers N` flag for throttling
- [ ] Update argument hint from `<plan-file> <phase-number>` to `<plan-file> <phase-number> [--dispatch] [--max-workers N]`
- [ ] Document that flags can appear in any position after the two required args

### Phase 2: Capacity Detection Logic

- [ ] Add step to detect target rig from bead prefixes (e.g., `civ-` -> `civ` rig)
- [ ] Add instructions to check polecat capacity: `gt polecat list <rig>`
- [ ] Parse polecat list output to identify idle polecats
- [ ] Calculate available slots: count of idle polecats
- [ ] Apply max-workers limit if specified: `min(available_slots, max_workers)`

### Phase 3: Dispatch Execution Logic

- [ ] Add new Step 5.5: "Dispatch Work (if --dispatch)"
- [ ] For each bead (up to calculated limit):
  - [ ] Execute `gt sling <bead-id> <rig>`
  - [ ] Capture result (polecat name assigned)
  - [ ] Track success/failure for each dispatch
- [ ] Handle dispatch failures gracefully (continue with remaining beads)
- [ ] Note skipped beads due to capacity limits

### Phase 4: Enhanced Reporting

- [ ] Extend final report to include dispatch results when `--dispatch` used
- [ ] Show: dispatched count, skipped count (capacity), failed count
- [ ] List which polecats were spawned for which beads
- [ ] Show remaining undispatched beads with manual commands

## Files to Create/Modify

| File | Action |
|------|--------|
| `/Users/alex/gt/.claude/commands/gastown.md` | Modify - add dispatch logic |

## Detailed Implementation

### Modified gastown.md Structure

```markdown
---
description: Create a convoy from a plan file phase
argument-hint: <plan-file> <phase-number> [--dispatch] [--max-workers N]
---

... existing Steps 1-4 ...

### Step 5: Dispatch Work (Optional)

If `--dispatch` flag is present, automatically dispatch work:

**5.1 Determine target rig:**
Extract rig from bead ID prefix (e.g., `civ-abc` -> `civ`)

**5.2 Check polecat capacity:**
```bash
gt polecat list <rig>
```
Count idle polecats.

**5.3 Calculate dispatch count:**
```
dispatch_count = min(ready_beads, idle_polecats)
if --max-workers specified:
    dispatch_count = min(dispatch_count, max_workers)
```

**5.4 Dispatch each bead:**
```bash
gt sling <bead-id> <rig>
```

Track results for reporting.

### Step 6: Report (Enhanced)

... enhanced reporting with dispatch results ...
```

## Success Criteria

- [ ] `/gastown plan.md 1` works exactly as before (no dispatch)
- [ ] `/gastown plan.md 1 --dispatch` creates convoy AND spawns polecats
- [ ] `/gastown plan.md 1 --dispatch --max-workers 2` limits to 2 concurrent workers
- [ ] Output clearly shows which agents were spawned for which beads
- [ ] Handles zero idle polecats gracefully (reports, does not fail)
- [ ] Handles dispatch failures gracefully (continues with remaining, reports failures)

## Dependencies & Integration

- **Depends on**:
  - `gt sling` command (exists)
  - `gt polecat list` command (exists)
  - `gt convoy create` command (exists)
  - `bd create` command (exists)
- **Consumed by**:
  - Mayor when orchestrating phase work
  - Crew members using gastown command
- **Integration points**:
  - Witness will track spawned polecats
  - Convoy system tracks overall progress

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| All polecats busy (zero capacity) | Report clearly, suggest running later or checking `gt polecat list` |
| Rig detection fails for mixed-prefix beads | Default to cwd rig, or require `--rig <name>` override |
| `gt sling` fails mid-batch | Continue with remaining beads, report failures at end |
| Context window limits in Claude | Dispatch logic is simple bash loops, minimal context overhead |
| User expects serial completion | Document that dispatch is fire-and-forget, use convoy status to monitor |

## Testing Approach

1. **Dry run test**: Use gastown without `--dispatch`, verify existing behavior unchanged
2. **Single dispatch test**: Create 1-task phase, use `--dispatch`, verify polecat spawns
3. **Throttle test**: Create 5-task phase, use `--dispatch --max-workers 2`, verify only 2 spawn
4. **Zero capacity test**: Kill all idle polecats, use `--dispatch`, verify graceful report
5. **Full integration test**: Complete phase execution with multiple workers

## Example Usage

```bash
# Traditional (no auto-dispatch)
/gastown 2026-01-17-rust-skills.md 1

# Auto-dispatch all to available polecats
/gastown 2026-01-17-rust-skills.md 1 --dispatch

# Auto-dispatch with limit of 3 concurrent workers
/gastown 2026-01-17-rust-skills.md 1 --dispatch --max-workers 3
```

## Notes

- The `mol-convoy-feed` formula provides a proven pattern for checking capacity and dispatching
- Polecat capacity is determined by counting idle polecats in `gt polecat list` output
- `gt sling` handles polecat allocation automatically (spawns new if needed)
- The enhancement is additive - no breaking changes to existing workflow
