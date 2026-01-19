# Plan: CLI Integration Tests

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement the missing unit tests and integration tests for the CLI integration architecture as defined in the parent plan (`2026-01-18-cli-integration-architecture.md`). This covers validator tests, executor tests, and GameEngine integration tests for all command types.

## Research Summary

Key findings from reviewing the existing codebase:

- **Existing test patterns**: Tests use Vitest with `describe`/`it`/`expect` patterns, `beforeEach` for setup, `vi.fn()` for mocks
- **Engine structure**: `GameEngine.executeCommand()` validates then executes commands, emitting events via EventBus
- **Validators**: Each validator has a `validate*` function that takes command and deps, returns `ValidationResult`
- **Executors**: Each executor has an `execute*` function that takes command and deps, returns `GameEventType[]`
- **Completed tests**: `EventBus.test.ts` and `queries.test.ts` are already complete
- **Missing tests**: All validator tests, executor tests, and `GameEngine.executeCommand()` integration tests

## Phased Implementation

### Phase 1: Validator Unit Tests

**Goal**: Test all command validators with valid and invalid inputs.

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/MoveUnitValidator.test.ts`
  - Test valid move passes validation
  - Test nonexistent unit fails with "Unit does not exist"
  - Test unit with no movement points fails with "no movement points remaining"
  - Test move to same position fails with "already at target position"
  - Test unreachable target fails with "not reachable"

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/AttackValidator.test.ts`
  - Test valid attack on adjacent enemy passes
  - Test attack on nonexistent attacker fails
  - Test attack on nonexistent defender fails
  - Test attack with no movement points fails
  - Test attack with zero-strength unit fails (Settler)
  - Test attack on non-adjacent target fails
  - Test attack on friendly unit fails
  - Test attack during wrong game phase fails

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/FoundCityValidator.test.ts`
  - Test valid settler on valid land passes
  - Test nonexistent settler fails
  - Test non-settler unit fails (Warrior)
  - Test settler on water fails
  - Test settler on mountain fails
  - Test settler where city exists fails

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/SetProductionValidator.test.ts`
  - Test valid city and buildable passes
  - Test nonexistent city fails
  - Test invalid buildable type fails

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/EndTurnValidator.test.ts`
  - Test correct player can end turn
  - Test wrong player cannot end turn

---

### Phase 2: Executor Unit Tests

**Goal**: Test all command executors produce correct events and state changes.

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/MoveUnitExecutor.test.ts`
  - Test emits `UnitMovedEvent` with correct fields
  - Test updates unit position in ECS
  - Test deducts movement points correctly
  - Test movement along path deducts correct cost

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/AttackExecutor.test.ts`
  - Test emits `CombatResolvedEvent` with correct damage values
  - Test applies damage to both units
  - Test consumes all attacker movement points
  - Test emits `UnitDestroyedEvent` when defender dies
  - Test removes dead defender from ECS
  - Test emits `UnitDestroyedEvent` when attacker dies
  - Test removes dead attacker from ECS
  - Test applies terrain defense bonus correctly
  - Test instant kills zero-strength defender (Settler)

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/FoundCityExecutor.test.ts`
  - Test emits `CityFoundedEvent` with correct fields
  - Test emits `UnitDestroyedEvent` for settler
  - Test creates city entity at correct position
  - Test removes settler from ECS
  - Test initializes territory for city
  - Test uses provided city name
  - Test generates city name when not provided

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/SetProductionExecutor.test.ts`
  - Test emits `ProductionChangedEvent`
  - Test updates ProductionComponent correctly
  - Test sets correct production cost

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/EndTurnExecutor.test.ts`
  - Test emits `TurnEndedEvent` with correct turn number
  - Test emits `TurnStartedEvent` with incremented turn
  - Test resets all unit movement points
  - Test processes city production (emits `ProductionCompletedEvent` and `UnitSpawnedEvent`)
  - Test spawns unit when production completes
  - Test processes city growth (emits `PopulationGrowthEvent`)
  - Test advances game state turn number

---

### Phase 3: GameEngine Integration Tests

**Goal**: Test full command flow through `GameEngine.executeCommand()`.

- [ ] Create `/Users/alex/workspace/civ/src/engine/GameEngine.test.ts`
  - **Setup tests**:
    - Test GameEngine can be instantiated with default config
    - Test GameEngine generates map on construction
    - Test getState() returns valid snapshot
  - **MoveUnit integration**:
    - Test full move command flow: validate -> execute -> emit events
    - Test invalid move returns error without state changes
    - Test events are emitted on successful move
    - Test state changes reflected in queries after move
  - **Attack integration**:
    - Test full attack command flow
    - Test attack on invalid target returns error
    - Test combat events emitted correctly
    - Test unit death handled correctly
  - **FoundCity integration**:
    - Test full found city command flow
    - Test city creation reflected in getCities()
    - Test settler removal reflected in getUnits()
    - Test territory assigned correctly
  - **SetProduction integration**:
    - Test full set production command flow
    - Test production change reflected in getCity()
  - **EndTurn integration**:
    - Test full end turn command flow
    - Test turn number incremented in getState()
    - Test movement points reset reflected in getUnits()
    - Test production progress updated
  - **Error handling**:
    - Test invalid command type throws error
    - Test missing pathfinder for move command throws error

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/engine/commands/validators/MoveUnitValidator.test.ts` | Create | Unit tests for movement validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/AttackValidator.test.ts` | Create | Unit tests for attack validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/FoundCityValidator.test.ts` | Create | Unit tests for city founding validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/SetProductionValidator.test.ts` | Create | Unit tests for production validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/EndTurnValidator.test.ts` | Create | Unit tests for end turn validation |
| `/Users/alex/workspace/civ/src/engine/commands/executors/MoveUnitExecutor.test.ts` | Create | Unit tests for movement execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/AttackExecutor.test.ts` | Create | Unit tests for attack execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/FoundCityExecutor.test.ts` | Create | Unit tests for city founding execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/SetProductionExecutor.test.ts` | Create | Unit tests for production execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/EndTurnExecutor.test.ts` | Create | Unit tests for end turn execution |
| `/Users/alex/workspace/civ/src/engine/GameEngine.test.ts` | Create | Integration tests for full command flow |

**Total: 11 new test files**

---

## Success Criteria

- [ ] All validator tests pass with 100% branch coverage of validation logic
- [ ] All executor tests pass and verify correct events are emitted
- [ ] All executor tests verify correct state mutations
- [ ] GameEngine integration tests pass for full command flow
- [ ] Invalid commands return descriptive errors without state changes
- [ ] Tests use existing patterns (Vitest, describe/it, vi.fn for mocks)
- [ ] Tests are deterministic (use seeded maps/worlds where needed)
- [ ] All existing tests continue to pass (`npm run test`)
- [ ] No TypeScript errors or ESLint warnings in test files

---

## Dependencies & Integration

### Depends On
- **Phase 1-2 implementations complete**: Validators and executors already created
- **EventBus and queries tests**: Already complete, provide patterns
- **ECS world helpers**: `createGameWorld`, `createUnitEntity`, `createCityEntity`
- **Pathfinder**: Required for movement tests
- **GameState**: Required for turn/phase tests

### Consumed By
- **CI Pipeline**: Tests run on every commit
- **Future development**: Regression testing for engine changes
- **CLI Frontend**: Confidence that commands work correctly

### Integration Points
- **GameEngine**: Main integration point for command testing
- **Existing unit tests**: Pattern reference (CombatSystem.test.ts, CityFounder.test.ts)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Test setup complexity for pathfinder | Create helper function to create minimal pathfinder with test tiles |
| Flaky tests due to random map generation | Use fixed seeds in all tests |
| Slow test execution | Keep tests focused and unit-level; avoid full map generation where possible |
| Missing edge cases | Use existing CombatSystem.test.ts and CityFounder.test.ts as reference for coverage |

---

## Test Patterns Reference

Based on existing tests, use these patterns:

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity } from '../../ecs/world';

describe('ComponentName', () => {
  let world: IWorld;
  // ... other test fixtures

  beforeEach(() => {
    world = createGameWorld();
    // ... setup
  });

  describe('methodName', () => {
    it('should do expected behavior', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Creating Test Fixtures

```typescript
// Create unit
const warriorEid = createUnitEntity(world, q, r, UnitType.Warrior, playerId, movement);

// Create city
const cityEid = createCityEntity(world, q, r, playerId, nameIndex);

// Create tile map
function createTileMap(tiles: { pos: TilePosition; terrain: Terrain }[]) {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    map.set(tile.pos.key(), {
      position: tile.pos,
      terrain: tile.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}
```

### Verifying Events

```typescript
const result = executeCommand(command, deps);
expect(result).toContainEqual(
  expect.objectContaining({ type: 'UNIT_MOVED' })
);
```

---

## Estimated Effort

| Phase | Estimated Hours | Complexity |
|-------|-----------------|------------|
| Phase 1: Validator Tests | 2-3 hours | Low |
| Phase 2: Executor Tests | 3-4 hours | Medium |
| Phase 3: Integration Tests | 2-3 hours | Medium |
| **Total** | **7-10 hours** | |

---

## Detailed Test Specifications

### MoveUnitValidator Tests

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid move | Unit at (0,0), target (1,0), MP=2 | `{ valid: true }` |
| Unit not found | unitEid=999 | `{ valid: false, error: "Unit does not exist" }` |
| No movement points | MP=0 | `{ valid: false, error: "no movement points remaining" }` |
| Same position | target same as current | `{ valid: false, error: "already at target position" }` |
| Unreachable target | blocked path | `{ valid: false, error: "not reachable" }` |

### AttackValidator Tests

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid attack | Adjacent enemy, MP>0, combat unit | `{ valid: true }` |
| Attacker not found | attackerEid=999 | `{ valid: false, error: "Attacker does not exist" }` |
| Defender not found | defenderEid=999 | `{ valid: false, error: "Defender does not exist" }` |
| No movement points | MP=0 | `{ valid: false, error: "no movement points remaining" }` |
| Zero strength attacker | Settler | `{ valid: false, error: "no combat strength" }` |
| Not adjacent | distance > 1 | `{ valid: false, error: "not adjacent" }` |
| Friendly fire | same owner | `{ valid: false, error: "friendly unit" }` |
| Wrong phase | TurnEnd phase | `{ valid: false, error: "PlayerAction phase" }` |

### FoundCityValidator Tests

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid founding | Settler on grassland | `{ valid: true }` |
| Settler not found | settlerEid=999 | `{ valid: false, error: "Settler does not exist" }` |
| Non-settler | Warrior | `{ valid: false, error: "Only Settlers can found" }` |
| On water | Ocean tile | `{ valid: false, error: "on water" }` |
| On mountain | Mountain tile | `{ valid: false, error: "impassable terrain" }` |
| Existing city | City at position | `{ valid: false, error: "already exists here" }` |

### SetProductionValidator Tests

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid production | Valid city, BuildableType.Warrior | `{ valid: true }` |
| City not found | cityEid=999 | `{ valid: false, error: "City does not exist" }` |
| Invalid buildable | buildableType=99 | `{ valid: false, error: "Invalid buildable type" }` |

### EndTurnValidator Tests

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Correct player | playerId=currentPlayer | `{ valid: true }` |
| Wrong player | playerId!=currentPlayer | `{ valid: false, error: "not player X's turn" }` |

---

## Implementation Notes

1. **Pathfinder Setup**: For movement tests, create a minimal pathfinder with known tiles:
   ```typescript
   const tileMap = createTileMap([
     { pos: new TilePosition(0, 0), terrain: Terrain.Grassland },
     { pos: new TilePosition(1, 0), terrain: Terrain.Grassland },
   ]);
   const pathfinder = new Pathfinder(tileMap, world);
   ```

2. **Game Phase Testing**: Use a mock or wrapper around GameState to control phase:
   ```typescript
   gameState.setPhase(TurnPhase.TurnEnd); // If method exists
   // Or spy on getPhase()
   vi.spyOn(gameState, 'getPhase').mockReturnValue(TurnPhase.TurnEnd);
   ```

3. **Event Verification**: Use `expect.objectContaining` for partial event matching:
   ```typescript
   expect(events).toContainEqual(
     expect.objectContaining({
       type: 'UNIT_MOVED',
       unitEid: warriorEid,
     })
   );
   ```

4. **ECS State Verification**: Check component values directly after execution:
   ```typescript
   expect(Position.q[unitEid]).toBe(targetQ);
   expect(MovementComponent.current[unitEid]).toBe(expectedMP);
   ```
