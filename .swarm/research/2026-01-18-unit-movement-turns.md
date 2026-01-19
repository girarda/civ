# Research: Unit Movement and Turn System Integration Bug

**Date**: 2026-01-18
**Status**: Complete

## Summary

Units can only move on the first turn because the turn system's `resetUnitMovement()` method in `TurnSystem.ts` is a stub that does nothing. While the `MovementExecutor` class has a fully implemented `resetAllMovementPoints()` method, it is never called when turns advance. The hook mechanism exists but is not wired up to actually reset movement points.

## Key Discoveries

- **Root Cause Found**: `TurnSystem.resetUnitMovement()` at line 82-85 is an empty stub with a TODO comment
- The `MovementExecutor.resetAllMovementPoints()` method exists and is fully implemented (lines 84-88)
- The `TurnSystem` has a hook mechanism (`onTurnStart` callback) that fires correctly on turn transitions
- The `main.ts` creates the `TurnSystem` with `onTurnStart` hook, but the callback only logs a message - it does not call `movementExecutor.resetAllMovementPoints()`
- Movement points are correctly consumed when units move (`MovementComponent.current` is decremented)
- Units start with movement points equal to their `max` value when created

## Architecture Overview

### Turn System Flow

```
GameState.nextTurn()
    |
    v
Phase: TurnEnd -> TurnStart -> PlayerAction
    |
    v
TurnSystem listens via subscribe()
    |
    v
On TurnStart: processTurnStart()
    |
    +-> resetUnitMovement() [STUB - DOES NOTHING]
    +-> hooks.onTurnStart?.() [Only logs message]
```

### Movement System Flow

```
User right-clicks tile
    |
    v
movementExecutor.executeMove()
    |
    v
Check MovementComponent.current[eid] > 0
    |
    v
Deduct cost: MovementComponent.current[eid] -= totalCost
    |
    v
After all movement exhausted: canMove returns false
```

### The Disconnect

The turn system and movement system are not connected:

1. `TurnSystem` has `resetUnitMovement()` as an internal stub method that needs implementation
2. `TurnSystem` does not have access to the `MovementExecutor` or the ECS `world`
3. The `onTurnStart` hook in `main.ts` does not call any movement reset logic

## Patterns Found

### Turn Processing Pattern
The turn system uses a phase-based state machine with listener subscriptions:
- `TurnPhase.TurnEnd` - End of turn processing
- `TurnPhase.TurnStart` - Start of turn processing (where movement reset should happen)
- `TurnPhase.PlayerAction` - Player can take actions

### ECS Component Pattern
Movement is tracked via bitECS components:
```typescript
MovementComponent = defineComponent({
  current: Types.ui8,  // Remaining movement this turn
  max: Types.ui8,      // Maximum movement points
});
```

### Dependency Injection via Hooks
The `TurnSystem` uses optional callback hooks for extensibility:
```typescript
interface TurnProcessingHooks {
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/game/TurnSystem.ts` | Turn orchestration with stub `resetUnitMovement()` at line 82-85 |
| `/Users/alex/workspace/civ/src/game/GameState.ts` | Turn state management, phase transitions |
| `/Users/alex/workspace/civ/src/unit/MovementSystem.ts` | Movement execution with `resetAllMovementPoints()` at lines 84-88 |
| `/Users/alex/workspace/civ/src/main.ts` | Application wiring - hooks not connected (lines 171-180) |
| `/Users/alex/workspace/civ/src/ecs/world.ts` | ECS components including `MovementComponent` |

## Code Evidence

### TurnSystem.ts - Empty Stub (lines 79-85)
```typescript
/**
 * Stub: Reset movement points for all units.
 * Will be implemented when unit system is added.
 */
private resetUnitMovement(): void {
  // TODO: Implement when unit system is added
  // Query all units and reset their movement points
}
```

### MovementSystem.ts - Working Implementation (lines 84-88)
```typescript
/**
 * Reset movement points for all units in the world.
 */
resetAllMovementPoints(): void {
  const units = unitQuery(this.world);
  for (const eid of units) {
    MovementComponent.current[eid] = MovementComponent.max[eid];
  }
}
```

### main.ts - Missing Connection (lines 171-180)
```typescript
const turnSystem = new TurnSystem(gameState, {
  onTurnStart: () => {
    console.log(`Turn ${gameState.getTurnNumber()} started`);
    // MISSING: movementExecutor.resetAllMovementPoints();
  },
  onTurnEnd: () => {
    console.log(`Turn ${gameState.getTurnNumber()} ending`);
  },
});
```

## Recommendations

### Option 1: Wire Up Hook in main.ts (Simplest)
Add a single line to the `onTurnStart` callback in `main.ts`:
```typescript
onTurnStart: () => {
  console.log(`Turn ${gameState.getTurnNumber()} started`);
  movementExecutor.resetAllMovementPoints();
},
```

### Option 2: Inject MovementExecutor into TurnSystem (Better Architecture)
Modify `TurnSystem` to accept and use a `MovementExecutor`:
```typescript
constructor(
  gameState: GameState,
  movementExecutor: MovementExecutor,
  hooks: TurnProcessingHooks = {}
) {
  this.movementExecutor = movementExecutor;
  // ...
}

private resetUnitMovement(): void {
  this.movementExecutor.resetAllMovementPoints();
}
```

### Option 3: Use Event System (Most Flexible)
Create a proper event bus where:
- `TurnSystem` emits a `TurnStarted` event
- `MovementExecutor` subscribes and resets movement on that event

### Recommended Approach
**Option 1** is the quickest fix with minimal code change. However, **Option 2** provides better separation of concerns and would allow the `TurnSystem` to own the responsibility of orchestrating turn-start effects, which aligns with its documented purpose.

## Open Questions

1. Should movement reset happen in `TurnSystem.resetUnitMovement()` (internal) or via the `onTurnStart` hook (external)? Current architecture suggests the stub method was intended to be filled in.

2. Are there other systems that will need turn-start/turn-end processing (e.g., healing, supply consumption)? If so, a more robust event system may be warranted.

3. Should there be tests verifying that movement points reset across turns? Currently, the unit tests for movement and turn system are isolated and don't test their integration.

4. The `TurnSystem` currently has no reference to the ECS world or movement executor - was this intentional to keep it decoupled, or an oversight?
