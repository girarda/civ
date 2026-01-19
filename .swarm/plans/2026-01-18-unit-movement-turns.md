# Plan: Fix Unit Movement Points Reset Across Turns

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Units can only move on the first turn because movement points are never reset when turns advance. The `TurnSystem.resetUnitMovement()` method is a stub, and the `onTurnStart` hook in `main.ts` does not call the existing `MovementExecutor.resetAllMovementPoints()` method. This plan addresses wiring up the movement point reset to the turn system.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-unit-movement-turns.md`:

- **Root Cause**: `TurnSystem.resetUnitMovement()` at line 82-85 is an empty stub with a TODO comment
- **Working Implementation Exists**: `MovementExecutor.resetAllMovementPoints()` (lines 84-88) is fully implemented and correctly resets all unit movement points
- **Hook Mechanism Works**: `TurnSystem` fires `onTurnStart` callback correctly on turn transitions
- **Missing Connection**: The `onTurnStart` hook in `main.ts` (lines 172-175) only logs a message - it does not call `movementExecutor.resetAllMovementPoints()`

### Architecture Context

```
GameState.nextTurn()
    |
    v
TurnSystem.processTurnStart()
    |
    +-> resetUnitMovement()      [STUB - EMPTY]
    +-> hooks.onTurnStart?.()    [ONLY LOGS MESSAGE]
```

The `movementExecutor` is already instantiated in `main.ts` (line 77) and is available in the same scope as the `TurnSystem` initialization.

## Phased Implementation

### Phase 1: Wire Up Movement Reset in onTurnStart Hook

This is the minimal fix - add a single line to the existing `onTurnStart` callback.

- [ ] Modify `main.ts` to call `movementExecutor.resetAllMovementPoints()` in the `onTurnStart` callback

**Implementation**:

Change `/Users/alex/workspace/civ/src/main.ts` lines 172-175 from:

```typescript
const turnSystem = new TurnSystem(gameState, {
  onTurnStart: () => {
    console.log(`Turn ${gameState.getTurnNumber()} started`);
  },
```

To:

```typescript
const turnSystem = new TurnSystem(gameState, {
  onTurnStart: () => {
    console.log(`Turn ${gameState.getTurnNumber()} started`);
    movementExecutor.resetAllMovementPoints();
  },
```

### Phase 2: Update Movement Preview After Reset

After movement points reset, if a unit is selected, the movement preview should refresh to show the new reachable tiles.

- [ ] After calling `resetAllMovementPoints()`, check if a unit is selected
- [ ] If selected, refresh the movement preview with the unit's restored movement points

**Implementation**:

```typescript
onTurnStart: () => {
  console.log(`Turn ${gameState.getTurnNumber()} started`);
  movementExecutor.resetAllMovementPoints();

  // Refresh movement preview for selected unit
  const selectedUnit = selectionState.get();
  if (selectedUnit !== null) {
    const q = Position.q[selectedUnit];
    const r = Position.r[selectedUnit];
    const mp = MovementComponent.current[selectedUnit];
    const pos = new TilePosition(q, r);
    movementPreview.showReachableTiles(pos, mp);
  }
},
```

### Phase 3: Add Unit Test for Turn-Movement Integration

- [ ] Create integration test verifying movement points reset across turns
- [ ] Test should verify: spawn unit, move unit, end turn, verify movement points restored

### Phase 4: Add E2E Test for Movement Across Turns

- [ ] Create or extend E2E test to verify full user flow
- [ ] Test: select unit, move unit, end turn, verify unit can move again

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Add `movementExecutor.resetAllMovementPoints()` call in `onTurnStart` hook; add movement preview refresh |
| `/Users/alex/workspace/civ/src/game/__tests__/TurnMovementIntegration.test.ts` | Create | Integration test for movement reset across turns |
| `/Users/alex/workspace/civ/e2e/unit-movement-turns.spec.ts` | Create | E2E test for movement across multiple turns |

## Success Criteria

- [ ] Units can move on turn 1
- [ ] After ending turn and starting turn 2, units can move again
- [ ] Movement points are restored to maximum value at turn start
- [ ] Movement preview updates correctly after turn change (if unit selected)
- [ ] All existing tests continue to pass
- [ ] New unit test verifies movement point reset across turns
- [ ] E2E test verifies user can move a unit, end turn, and move again

## Dependencies & Integration

- **Depends on**:
  - `MovementExecutor` class with `resetAllMovementPoints()` method (already implemented)
  - `TurnSystem` with `onTurnStart` hook (already implemented)
  - `GameState.nextTurn()` triggering phase transitions (already implemented)

- **Consumed by**:
  - All unit movement operations depend on movement points being available
  - Future features (combat, AI) that consume movement points

- **Integration points**:
  - `main.ts` - Wiring location for hook callback
  - ECS `MovementComponent` - Data store for movement points
  - `MovementPreview` - Visual feedback for available movement

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Movement reset called before units exist | `unitQuery()` in `resetAllMovementPoints()` handles empty result gracefully |
| World reference stale after map regeneration | `movementExecutor.setWorld()` is already called in `generateMap()` (line 129) |
| Selection state out of sync after turn change | Phase 2 explicitly refreshes movement preview for selected unit |
| Performance with many units | `unitQuery` and loop are O(n); acceptable for typical game sizes |

## Edge Cases to Consider

1. **No units on map**: `resetAllMovementPoints()` should handle empty unit query (it does - loops over empty array)
2. **Unit selected when turn ends**: Movement preview should refresh after reset (Phase 2)
3. **Map regeneration mid-game**: `generateMap()` already resets world and `movementExecutor.setWorld()` is called
4. **Movement points already at max**: Setting to max again is idempotent (no harm)
5. **Unit with 0 max movement**: Would be set to 0 current (correct behavior for immobile units)

## Testing Strategy

### Unit Test: Turn-Movement Integration

```typescript
// src/game/__tests__/TurnMovementIntegration.test.ts
describe('Turn-Movement Integration', () => {
  it('should reset unit movement points on turn start', () => {
    // Setup: Create world with unit
    // Move unit to consume movement points
    // Advance turn
    // Assert: Movement points restored to max
  });

  it('should reset all units movement points', () => {
    // Setup: Create world with multiple units
    // Move all units
    // Advance turn
    // Assert: All units have movement points restored
  });
});
```

### E2E Test: Movement Across Turns

```typescript
// e2e/unit-movement-turns.spec.ts
test('unit can move after turn advances', async ({ page }) => {
  // Click on unit to select
  // Right-click on adjacent tile to move
  // Verify unit moved
  // Click End Turn button
  // Verify unit can move again (movement preview shows reachable tiles)
  // Right-click on another tile to move
  // Verify unit moved
});
```

## Implementation Notes

- The fix is minimal: one line of code in `main.ts`
- Phase 2 adds polish by refreshing the movement preview
- This approach uses the existing hook mechanism as intended by the architecture
- Alternative approaches (injecting MovementExecutor into TurnSystem, event bus) were considered but deemed over-engineering for this fix
- The stub `TurnSystem.resetUnitMovement()` can optionally be removed or left as documentation of intent
