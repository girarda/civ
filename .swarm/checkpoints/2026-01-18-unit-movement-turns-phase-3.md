# Checkpoint: Unit Movement Turns - Phase 3

**Date**: 2026-01-18 20:48
**Feature**: Unit Movement Points Reset Across Turns
**Phase**: Phase 3 of 4
**Status**: Complete

## Completed Tasks
- [x] Create integration test verifying movement points reset across turns
- [x] Test should verify: spawn unit, move unit, end turn, verify movement points restored

## Files Modified
| File | Action | Summary |
|------|--------|---------|
| `/Users/alex/workspace/civ/src/game/TurnMovementIntegration.test.ts` | Create | Integration test with 5 test cases for turn-movement integration |

## Test Results
- Tests run: 360
- Passed: 360
- Failed: 0
- New tests: 5

## Test Cases Added
1. `should reset unit movement points on turn start` - Single unit movement reset
2. `should reset all units movement points` - Multiple units with different movement values
3. `should allow unit to move again after turn advance` - Full movement -> turn -> movement workflow
4. `should handle multiple turn transitions` - Verifies reset over 3 turns
5. `should handle empty world gracefully` - Edge case with no units

## Next Steps
- Phase 4: Add E2E test for movement across turns

## Recovery Notes
The integration test verifies that:
- The `onTurnStart` hook calls `movementExecutor.resetAllMovementPoints()`
- All units have their movement points restored to maximum
- Units can move again after turn transitions
- The system handles edge cases (empty world, multiple turns)

Note: Test file placed at `src/game/TurnMovementIntegration.test.ts` following the project's convention of placing tests alongside modules (not in `__tests__` subdirectory).
