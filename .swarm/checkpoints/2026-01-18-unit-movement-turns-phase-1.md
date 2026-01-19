# Checkpoint: Unit Movement Turns - Phase 1

**Date**: 2026-01-18 20:47
**Feature**: Unit Movement Points Reset Across Turns
**Phase**: Phase 1 of 4
**Status**: Complete

## Completed Tasks
- [x] Modify `main.ts` to call `movementExecutor.resetAllMovementPoints()` in the `onTurnStart` callback

## Files Modified
| File | Action | Summary |
|------|--------|---------|
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Added `movementExecutor.resetAllMovementPoints()` call in `onTurnStart` hook at line 175 |

## Test Results
- Tests run: 355
- Passed: 355
- Failed: 0

## Next Steps
- Phase 2: Update movement preview after reset (refresh for selected unit)
- Phase 3: Add unit test for turn-movement integration
- Phase 4: Add E2E test for movement across turns

## Recovery Notes
The core fix is in place. The `onTurnStart` hook now calls `movementExecutor.resetAllMovementPoints()` which resets all unit movement points to their maximum values at the start of each turn. The movement preview refresh (Phase 2) is polish that improves UX when a unit is selected during turn transition.
