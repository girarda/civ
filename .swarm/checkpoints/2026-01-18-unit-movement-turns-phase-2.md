# Checkpoint: Unit Movement Turns - Phase 2

**Date**: 2026-01-18 20:47
**Feature**: Unit Movement Points Reset Across Turns
**Phase**: Phase 2 of 4
**Status**: Complete

## Completed Tasks
- [x] After calling `resetAllMovementPoints()`, check if a unit is selected
- [x] If selected, refresh the movement preview with the unit's restored movement points

## Files Modified
| File | Action | Summary |
|------|--------|---------|
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Added movement preview refresh for selected unit in `onTurnStart` hook (lines 177-185) |

## Test Results
- Tests run: 355
- Passed: 355
- Failed: 0

## Next Steps
- Phase 3: Add unit test for turn-movement integration
- Phase 4: Add E2E test for movement across turns

## Recovery Notes
Phase 2 adds polish to the core fix from Phase 1. When a turn starts and a unit is selected, the movement preview now refreshes to show the unit's restored movement range. This provides immediate visual feedback to the player that their unit can move again.

The implementation reads the selected unit from `selectionState`, retrieves its position and movement points from ECS components, and calls `movementPreview.showReachableTiles()` to update the visual display.
