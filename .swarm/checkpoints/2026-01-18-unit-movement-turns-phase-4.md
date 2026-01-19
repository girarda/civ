# Checkpoint: Unit Movement Turns - Phase 4

**Date**: 2026-01-18 20:49
**Feature**: Unit Movement Points Reset Across Turns
**Phase**: Phase 4 of 4
**Status**: Complete

## Completed Tasks
- [x] Create or extend E2E test to verify full user flow
- [x] Test: select unit, move unit, end turn, verify unit can move again

## Files Modified
| File | Action | Summary |
|------|--------|---------|
| `/Users/alex/workspace/civ/tests/e2e/unit-movement-turns.spec.ts` | Create | E2E test with 5 test cases for movement across turns |

## Test Results
- E2E tests run: 72
- Passed: 72
- Failed: 0
- New E2E tests: 5

## E2E Test Cases Added
1. `unit can move after turn advances` - Basic workflow: select, move, end turn, move again
2. `unit can move multiple tiles after turn reset` - Exhaust movement then verify reset
3. `pressing Enter advances turn and restores movement` - Keyboard shortcut workflow
4. `movement across multiple turn cycles` - 3-turn cycle test
5. `no console errors during turn-movement workflow` - Error checking

## Implementation Complete

### Summary of All Changes

**Phase 1: Core Fix**
- Added `movementExecutor.resetAllMovementPoints()` call in `onTurnStart` hook in `/Users/alex/workspace/civ/src/main.ts`

**Phase 2: Polish**
- Added movement preview refresh for selected unit after turn change in `/Users/alex/workspace/civ/src/main.ts`

**Phase 3: Unit Tests**
- Created `/Users/alex/workspace/civ/src/game/TurnMovementIntegration.test.ts` with 5 integration tests

**Phase 4: E2E Tests**
- Created `/Users/alex/workspace/civ/tests/e2e/unit-movement-turns.spec.ts` with 5 E2E tests

### Final Test Results
- Unit tests: 360 passed (355 existing + 5 new)
- E2E tests: 72 passed (67 existing + 5 new)

### Files Created/Modified
| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/src/main.ts` | Modified |
| `/Users/alex/workspace/civ/src/game/TurnMovementIntegration.test.ts` | Created |
| `/Users/alex/workspace/civ/tests/e2e/unit-movement-turns.spec.ts` | Created |

## Recovery Notes
This is the final checkpoint. The feature is complete and all success criteria have been met. The bug where units could only move on the first turn has been fixed by wiring the existing `MovementExecutor.resetAllMovementPoints()` method to the `onTurnStart` hook in `TurnSystem`.
