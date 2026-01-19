# Research: CLI Integration Architecture - Phases 2 and 3

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research documents the implementation requirements for Phase 2 (Command Layer) and Phase 3 (Decouple Renderers) of the CLI integration architecture plan. Phase 1 (Extract Engine Core) has already been completed, establishing the `GameEngine` class, EventBus, and state query/snapshot systems. The remaining phases focus on creating a command abstraction layer and removing direct renderer dependencies from game logic.

## Key Discoveries

- **Phase 1 is complete**: `GameEngine`, `EventBus`, state snapshots, and queries are fully implemented and tested
- **Existing executors tightly couple to renderers**: `MovementExecutor`, `CombatExecutor`, `CityProcessor`, and `CityFounder` all receive renderer instances directly
- **Event types already defined**: All necessary event types (`UnitMovedEvent`, `CombatResolvedEvent`, `CityFoundedEvent`, etc.) exist in `/Users/alex/workspace/civ/src/engine/events/types.ts`
- **Validation logic already exists**: `canFoundCity`, `combatExecutor.canAttack`, `movementExecutor.canMove` provide validation that can be extracted into validators
- **main.ts directly invokes executors**: Right-click handler calls `combatExecutor.executeAttack()` and `movementExecutor.executeMove()` directly
- **GameEngine lacks command execution**: Currently only provides state queries, no `executeCommand()` method exists
- **E2E tests exist but are UI-based**: 14 Playwright E2E tests cover movement, combat, cities, and production via UI interactions

## Architecture Overview

### Current State (After Phase 1)

```
                      +----------------+
                      |   GameEngine   |
                      |----------------|
                      | - world        |
                      | - tileMap      |
                      | - eventBus     |
                      | - gameState    |
                      |----------------|
                      | + getUnits()   |
                      | + getCities()  |
                      | + getTile()    |
                      | + emit()       |
                      +----------------+
                              |
                              v
+----------------+    +----------------+    +----------------+
| MovementExec.  |    | CombatExecutor |    | CityProcessor  |
|----------------|    |----------------|    |----------------|
| - world        |    | - world        |    | - world        |
| - pathfinder   |    | - tileMap      |    | - territoryMgr |
| - unitRenderer |<-->| - unitRenderer |<-->| - callbacks    |
+----------------+    | - selectionSt. |    +----------------+
                      | - gameState    |
                      +----------------+
                              ^
                              |
                      +----------------+
                      |    main.ts     |
                      |  (right-click) |
                      +----------------+
```

### Target State (After Phase 3)

```
                      +------------------+
                      |    GameEngine    |
                      |------------------|
                      | + executeCommand |
                      |   (validates,    |
                      |    executes,     |
                      |    emits events) |
                      +--------+---------+
                               |
              +----------------+----------------+
              |                                 |
    +---------v---------+            +---------v---------+
    |  Validator Layer  |            |  Executor Layer   |
    |-------------------|            |-------------------|
    | MoveUnitValidator |            | MoveUnitExecutor  |
    | AttackValidator   |            | AttackExecutor    |
    | FoundCityValidator|            | FoundCityExecutor |
    | SetProductionVal. |            | SetProductionExec |
    | EndTurnValidator  |            | EndTurnExecutor   |
    +-------------------+            +-------------------+
                               |
                               v EventBus
              +----------------+----------------+
              |                                 |
    +---------v---------+            +---------v---------+
    |   GuiFrontend     |            |   (Future CLI)    |
    |-------------------|            |-------------------|
    | - UnitRenderer    |            | - text output     |
    | - CityRenderer    |            | - command input   |
    | - TerritoryRend.  |            +-------------------+
    | subscribes to     |
    | events & updates  |
    +-------------------+
```

## Patterns Found

### Command Structure Pattern

Commands in the plan follow this structure:
```typescript
interface Command {
  type: string;        // Discriminator for command routing
  playerId: number;    // Player issuing the command
  timestamp?: number;  // Optional for replay/logging
}
```

### Existing Validation Patterns

Current validators to extract:

1. **Movement validation** (`/Users/alex/workspace/civ/src/unit/MovementSystem.ts:39-47`):
   - Check unit has movement points
   - Check path is reachable via pathfinder
   - Check target is valid

2. **Attack validation** (`/Users/alex/workspace/civ/src/combat/CombatSystem.ts:47-88`):
   - Check game phase is PlayerAction
   - Check attacker has movement points
   - Check attacker has combat strength
   - Check target is adjacent
   - Check target has enemy unit

3. **City founding validation** (`/Users/alex/workspace/civ/src/city/CityFounder.ts:28-66`):
   - Check unit is Settler
   - Check tile is valid land
   - Check no existing city at position

4. **Production validation** (`/Users/alex/workspace/civ/src/city/CityProcessor.ts:198-202`):
   - Check city exists
   - Check buildable type is valid

### Event Emission Pattern

Existing callback pattern that needs conversion to events:
```typescript
// Current (CityProcessor)
onProductionCompleted: (event) => {
  unitRenderer.createUnitGraphic(...);
}

// Target (EventBus subscription)
engine.on('PRODUCTION_COMPLETED', (event) => {
  unitRenderer.createUnitGraphic(...);
});
```

### Renderer API Pattern

Renderers have consistent APIs suitable for event handlers:

| Renderer | Key Methods |
|----------|-------------|
| UnitRenderer | `createUnitGraphic()`, `updatePosition()`, `removeUnit()` |
| CityRenderer | `createCityGraphic()`, `updatePosition()`, `removeCity()` |
| TerritoryRenderer | `updateTerritoryBorders()`, `removeTerritoryForCity()` |

## Key Files

### Phase 2: Command Layer Files to Create

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/engine/commands/types.ts` | Command type definitions (MoveUnitCommand, AttackCommand, etc.) |
| `/Users/alex/workspace/civ/src/engine/commands/CommandResult.ts` | Result type for command execution |
| `/Users/alex/workspace/civ/src/engine/commands/validators/MoveUnitValidator.ts` | Movement validation logic extracted from MovementSystem |
| `/Users/alex/workspace/civ/src/engine/commands/validators/AttackValidator.ts` | Combat validation logic extracted from CombatSystem |
| `/Users/alex/workspace/civ/src/engine/commands/validators/FoundCityValidator.ts` | City founding validation extracted from CityFounder |
| `/Users/alex/workspace/civ/src/engine/commands/validators/SetProductionValidator.ts` | Production validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/EndTurnValidator.ts` | Turn end validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/index.ts` | Validator registry |
| `/Users/alex/workspace/civ/src/engine/commands/executors/MoveUnitExecutor.ts` | Movement execution logic |
| `/Users/alex/workspace/civ/src/engine/commands/executors/AttackExecutor.ts` | Combat execution logic |
| `/Users/alex/workspace/civ/src/engine/commands/executors/FoundCityExecutor.ts` | City founding execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/SetProductionExecutor.ts` | Production setting execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/EndTurnExecutor.ts` | Turn end processing |
| `/Users/alex/workspace/civ/src/engine/commands/executors/index.ts` | Executor registry |
| `/Users/alex/workspace/civ/src/engine/commands/index.ts` | Module exports |

### Phase 2: Files to Modify

| File | Modification |
|------|--------------|
| `/Users/alex/workspace/civ/src/engine/GameEngine.ts` | Add `executeCommand()` method |

### Phase 3: Files to Create

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/gui/GuiFrontend.ts` | Coordinates event subscriptions to renderers |
| `/Users/alex/workspace/civ/src/gui/EventHandlers.ts` | Maps events to renderer method calls |
| `/Users/alex/workspace/civ/src/gui/index.ts` | Module exports |

### Phase 3: Files to Modify

| File | Modification |
|------|--------------|
| `/Users/alex/workspace/civ/src/unit/MovementSystem.ts` | Remove `unitRenderer` dependency |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Remove `unitRenderer` and `selectionState` dependencies |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Convert callbacks to events |
| `/Users/alex/workspace/civ/src/city/CityFounder.ts` | Remove renderer callback |
| `/Users/alex/workspace/civ/src/main.ts` | Wire GameEngine with GuiFrontend |
| `/Users/alex/workspace/civ/src/ui/SelectionSystem.ts` | Create commands instead of direct execution |

### Existing Foundation Files (Phase 1 Complete)

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/engine/GameEngine.ts` | Core engine with state queries and event bus |
| `/Users/alex/workspace/civ/src/engine/events/EventBus.ts` | Pub/sub event system |
| `/Users/alex/workspace/civ/src/engine/events/types.ts` | 10 event types defined |
| `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` | Serializable snapshot types |
| `/Users/alex/workspace/civ/src/engine/state/queries.ts` | State query implementations |
| `/Users/alex/workspace/civ/src/engine/index.ts` | Module exports |

## Recommendations

### Phase 2 Implementation Approach

1. **Start with command types** (`commands/types.ts`)
   - Define all 5 command types as discriminated union
   - Keep commands simple and JSON-serializable
   - Include validation result type

2. **Extract validators from existing code**
   - MoveUnitValidator: Extract from `MovementExecutor.canMove()` (lines 39-47)
   - AttackValidator: Extract from `CombatExecutor.canAttack()` (lines 47-88)
   - FoundCityValidator: Use existing `canFoundCity()` and `getFoundCityBlockReason()`
   - SetProductionValidator: Validate city exists and buildable is valid
   - EndTurnValidator: Check current player

3. **Create pure executors**
   - Executors should only mutate ECS state
   - Return events to be emitted (don't emit directly)
   - No renderer dependencies
   - Use existing calculation logic (pathfinder, combat calculator)

4. **Add executeCommand() to GameEngine**
   ```typescript
   executeCommand(command: GameCommand): CommandResult {
     const validator = this.getValidator(command.type);
     const validation = validator.validate(command, this);
     if (!validation.valid) {
       return { success: false, error: validation.error, events: [] };
     }
     const executor = this.getExecutor(command.type);
     const events = executor.execute(command, this);
     for (const event of events) {
       this.eventBus.emit(event);
     }
     return { success: true, events };
   }
   ```

5. **Write tests alongside each component**
   - Use existing test patterns from `EventBus.test.ts` and `queries.test.ts`
   - Test validators with valid/invalid inputs
   - Test executors produce correct events
   - Test full command flow through GameEngine

### Phase 3 Implementation Approach

1. **Create GuiFrontend class first**
   - Accept GameEngine and PixiJS Application
   - Hold references to all renderers
   - Set up event subscriptions in `initialize()`

2. **Create event handlers** (`EventHandlers.ts`)
   - Pure functions mapping events to renderer calls
   - Example:
     ```typescript
     export function handleUnitMoved(
       event: UnitMovedEvent,
       unitRenderer: UnitRenderer
     ): void {
       const pos = new TilePosition(event.toQ, event.toR);
       unitRenderer.updatePosition(event.unitEid, pos);
     }
     ```

3. **Refactor existing executors incrementally**
   - Start with MovementSystem (simplest)
   - Remove renderer from constructor
   - Return result data instead of calling renderer
   - Test that game still works after each change

4. **Update main.ts**
   - Create GameEngine instance
   - Create GuiFrontend with engine
   - Wire input handlers to create commands:
     ```typescript
     // Right-click handler
     if (combatExecutor.hasEnemyAt(...)) {
       const command: AttackCommand = {
         type: 'ATTACK',
         playerId: 0,
         attackerEid: selectedUnit,
         defenderEid: enemyEid,
       };
       engine.executeCommand(command);
     }
     ```

5. **Run E2E tests after each change**
   - Existing tests verify user-visible behavior
   - Should catch regressions in movement, combat, cities

### Testing Strategy

**Phase 2 Unit Tests**:
- Each validator tested with 3+ valid scenarios
- Each validator tested with 3+ invalid scenarios
- Each executor tested for correct event emission
- Integration test for full command flow

**Phase 3 Integration Tests**:
- Event subscription/unsubscription
- Event -> renderer call mapping
- Error handling in handlers

**E2E Tests (Existing)**:
- `/Users/alex/workspace/civ/tests/e2e/unit.spec.ts` - Unit selection/movement
- `/Users/alex/workspace/civ/tests/e2e/combat.spec.ts` - Combat interactions
- `/Users/alex/workspace/civ/tests/e2e/city.spec.ts` - City founding and selection
- `/Users/alex/workspace/civ/tests/e2e/production.spec.ts` - Production queue

## Open Questions

1. **Pathfinder ownership**: Should `Pathfinder` be owned by `GameEngine` or passed to validators/executors? Currently owned by `main.ts`.

2. **SelectionState handling**: `CombatExecutor` currently updates `SelectionState` on unit death. Should this be an event handler responsibility or remain in the executor?

3. **Player turn validation**: Current `gameState.getCurrentPlayer()` returns 0 always (single-player). How should multi-player turn validation work for commands?

4. **Existing MovementSystem vs new executor**: Should we deprecate `MovementSystem.ts` and replace with command executor, or keep both?

5. **CityProcessor turn processing**: The `processTurnEnd()` method processes all cities. Should this be a single `END_TURN` command or separate commands per city?

6. **Error recovery**: If an executor partially completes before an error, should state changes be rolled back? Current system has no transaction support.

## Dependencies

### Phase 2 Dependencies
- **Pathfinder** (`/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts`): For movement validation
- **CombatCalculator** (`/Users/alex/workspace/civ/src/combat/CombatCalculator.ts`): For attack execution
- **TerritoryManager** (`/Users/alex/workspace/civ/src/city/Territory.ts`): For city founding
- **UnitType data** (`/Users/alex/workspace/civ/src/unit/UnitType.ts`): For unit capabilities
- **Buildable types** (`/Users/alex/workspace/civ/src/city/Buildable.ts`): For production validation

### Phase 3 Dependencies
- **Phase 2 complete**: Commands and executors must exist
- **PixiJS Application**: For GuiFrontend
- **All renderers**: UnitRenderer, CityRenderer, TerritoryRenderer
- **UI state classes**: SelectionState, CityState, HoverState

## Estimated Complexity

| Component | Complexity | LOC Estimate |
|-----------|------------|--------------|
| Command types | Low | ~100 |
| Validators (5) | Medium | ~300 |
| Executors (5) | Medium | ~400 |
| GameEngine.executeCommand | Medium | ~50 |
| GuiFrontend | Medium | ~150 |
| EventHandlers | Low | ~100 |
| main.ts refactor | High | ~200 changes |
| Executor refactors (4) | Medium | ~100 each |

**Total Phase 2**: ~900 LOC new code
**Total Phase 3**: ~650 LOC new/modified code
