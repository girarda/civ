# Plan: AI Extensibility - Phase 1 Foundation

**Date**: 2026-01-18
**Status**: Complete (All 9 Phases)

## Overview

Implement the foundation of the AI extensibility system for OpenCiv. This phase creates the Action Registry pattern that enables self-registering actions, defines the AIContext interface for AI decision-making, and implements action definitions for all 5 existing command types. The base AIController coordinates action generation, scoring, and execution.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-ai-extensibility-phase1.md`:

- **Command System Ready**: 5 command types (MOVE_UNIT, ATTACK, FOUND_CITY, SET_PRODUCTION, END_TURN) with validators/executors
- **State Queries Exist**: `queryUnits()`, `queryCities()`, `queryTile()` produce rich snapshots with capabilities
- **Pathfinder Available**: `getReachableTiles()` returns all tiles reachable with given movement points
- **Combat Calculator**: Pure `calculateCombat()` function for attack evaluation
- **CityFounder**: `canFoundCity()` validates settler placement
- **PlayerManager**: `getActivePlayers()` provides enemy player enumeration
- **No AI Code Yet**: Clean slate for implementing extensible patterns

Architecture follows self-describing action registry where each action registers itself with generation and scoring logic, enabling automatic discovery of new actions as they are added.

## Phased Implementation

### Phase 1: Project Structure and Interfaces

**Goal**: Create directory structure and define core interfaces.

#### Tasks

- [x] Create directory structure:
  ```
  src/ai/
    registry/
    actions/
    context/
    controller/
  ```
- [x] Create `/Users/alex/workspace/civ/src/ai/registry/ActionDefinition.ts`:
  - Define `EntityType` type: `'unit' | 'city' | 'player'`
  - Define `ActionDefinition<TCommand>` interface with:
    - `id: string` - Unique action identifier
    - `commandType: CommandType` - Maps to command types
    - `description: string` - Human-readable description
    - `applicableTo: EntityType[]` - What entity types can perform this
    - `generateCandidates(context, entityEid): TCommand[]` - Generate valid commands
    - `scoreCandidate(context, command): number` - Score a candidate (0-100)
- [x] Create `/Users/alex/workspace/civ/src/ai/context/AIContext.ts`:
  - Define `AIContext` interface with:
    - Core references: `world`, `playerId`, `gameState`, `tileMap`, `pathfinder`, `territoryManager`
    - Cached queries: `myUnits`, `myCities`, `enemyUnits`, `enemyCities`
    - Helper methods: `getTile()`, `getEnemyUnitAt()`, `getAdjacentEnemies()`
- [x] Write unit tests for interface type safety

#### Success Criteria

- [x] Directory structure created
- [x] `ActionDefinition` interface compiles with proper generic constraints
- [x] `AIContext` interface includes all required properties
- [x] TypeScript compilation passes with no errors

---

### Phase 2: ActionRegistry Implementation

**Goal**: Implement singleton registry for action definitions.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/registry/ActionRegistry.ts`:
  - Private constructor (singleton pattern)
  - `getInstance(): ActionRegistry` - Get singleton
  - `resetInstance(): void` - Clear for testing
  - `register<T>(definition: ActionDefinition<T>): void` - Register action, throw if duplicate
  - `getAction(id: string): ActionDefinition | undefined` - Get by ID
  - `getActionsFor(entityType: EntityType): ActionDefinition[]` - Filter by entity type
  - `getAllActions(): ActionDefinition[]` - Get all registered actions
  - `hasAction(id: string): boolean` - Check if registered
  - `getActionCount(): number` - Count of registered actions
- [x] Export convenience function `getActionRegistry(): ActionRegistry`
- [x] Create `/Users/alex/workspace/civ/src/ai/registry/ActionRegistry.test.ts`:
  - Test singleton behavior
  - Test register/get operations
  - Test duplicate registration throws error
  - Test filtering by entity type
  - Test reset clears all actions

#### Success Criteria

- [x] Singleton pattern works correctly
- [x] Duplicate registration throws descriptive error
- [x] `getActionsFor()` correctly filters by entity type
- [x] `resetInstance()` clears state for clean test isolation
- [x] All unit tests pass

---

### Phase 3: ContextBuilder Implementation

**Goal**: Build AIContext from game state with cached queries.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/context/ContextBuilder.ts`:
  - Define `ContextBuilderDeps` interface:
    - `world: IWorld`
    - `gameState: GameState`
    - `tileMap: Map<string, GeneratedTile>`
    - `pathfinder: Pathfinder`
    - `territoryManager: TerritoryManager`
    - `playerManager: PlayerManager`
  - Implement `buildAIContext(playerId: number, deps: ContextBuilderDeps): AIContext`
    - Query own units with `queryUnits(world, playerId)`
    - Query own cities with `queryCities(world, territoryManager, tileMap, playerId)`
    - Build `enemyUnits` map by iterating `playerManager.getActivePlayers()`
    - Build `enemyCities` map similarly
    - Build enemy units position lookup map for `getEnemyUnitAt()`
    - Implement `getTile()` using `queryTile()`
    - Implement `getAdjacentEnemies()` using `TilePosition.neighbors()`
- [x] Create `/Users/alex/workspace/civ/src/ai/context/ContextBuilder.test.ts`:
  - Test context creation with mock dependencies
  - Test enemy unit/city enumeration
  - Test `getTile()` returns correct data
  - Test `getEnemyUnitAt()` position lookup
  - Test `getAdjacentEnemies()` returns correct units

#### Success Criteria

- [x] Context is built correctly from game state
- [x] Own units/cities are filtered by playerId
- [x] Enemy units/cities are grouped by playerId
- [x] Helper methods (`getTile`, `getEnemyUnitAt`, `getAdjacentEnemies`) work correctly
- [x] All unit tests pass

---

### Phase 4: EndTurn and SetProduction Actions

**Goal**: Implement simpler actions first to validate the pattern.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/actions/EndTurnAction.ts`:
  - `id: 'END_TURN'`, `applicableTo: ['player']`
  - `generateCandidates()` always returns one EndTurnCommand
  - `scoreCandidate()` returns 100 if no units have actions, 1 otherwise
  - Auto-register on import: `getActionRegistry().register(EndTurnAction)`
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/SetProductionAction.ts`:
  - `id: 'SET_PRODUCTION'`, `applicableTo: ['city']`
  - `generateCandidates()` returns one command per buildable type (use `getAvailableBuildables()`)
  - `scoreCandidate()` basic scoring:
    - Settler: 80 if < 3 cities, else 40
    - Warrior: 50
    - Scout: 30
  - Auto-register on import
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/EndTurnAction.test.ts`:
  - Test generates exactly one candidate
  - Test score is 100 when no units have actions
  - Test score is 1 when units have actions remaining
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/SetProductionAction.test.ts`:
  - Test generates 3 candidates (Warrior, Scout, Settler)
  - Test Settler scoring based on city count

#### Success Criteria

- [x] EndTurnAction auto-registers on import
- [x] SetProductionAction generates correct candidates for each buildable
- [x] Scoring logic produces expected values
- [x] All unit tests pass

---

### Phase 5: FoundCity and Move Actions

**Goal**: Implement unit-level actions with validation.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/actions/FoundCityAction.ts`:
  - `id: 'FOUND_CITY'`, `applicableTo: ['unit']`
  - `generateCandidates()`:
    - Return empty if unit is not Settler
    - Return empty if `canFoundCity()` returns false
    - Return one FoundCityCommand otherwise
  - `scoreCandidate()` returns 70 (high priority for founding)
  - Auto-register on import
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/MoveAction.ts`:
  - `id: 'MOVE_UNIT'`, `applicableTo: ['unit']`
  - `generateCandidates()`:
    - Return empty if `!unit.capabilities.canMove`
    - Use `pathfinder.getReachableTiles(currentPos, movement.current)`
    - Generate MoveUnitCommand for each reachable tile (excluding current position)
  - `scoreCandidate()` returns 10 (base score, refined in Phase 2)
  - Auto-register on import
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/FoundCityAction.test.ts`:
  - Test returns empty for non-Settler units
  - Test returns empty when canFoundCity is false
  - Test returns one candidate when valid
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/MoveAction.test.ts`:
  - Test returns empty for units with no movement
  - Test generates correct number of candidates based on reachable tiles
  - Test excludes current position from candidates

#### Success Criteria

- [x] FoundCityAction correctly validates Settler and position
- [x] MoveAction generates candidates for all reachable tiles
- [x] Current position is excluded from move candidates
- [x] Both actions auto-register on import
- [x] All unit tests pass

---

### Phase 6: Attack Action

**Goal**: Implement attack action with combat evaluation.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/actions/AttackAction.ts`:
  - `id: 'ATTACK'`, `applicableTo: ['unit']`
  - `generateCandidates()`:
    - Return empty if `!unit.capabilities.canAttack`
    - Use `context.getAdjacentEnemies(unit.position.q, unit.position.r)`
    - Generate AttackCommand for each adjacent enemy
  - `scoreCandidate()` using CombatCalculator:
    - Build `CombatContext` from attacker/defender stats
    - Get defense modifier from `getTotalDefenseModifier(tile)`
    - Call `calculateCombat()` to predict outcome
    - Base score: 50
    - +30 if defender dies
    - -40 if attacker dies
    - +damageRatio bonus (up to 20)
  - Auto-register on import
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/AttackAction.test.ts`:
  - Test returns empty for units without attack capability
  - Test generates candidates for adjacent enemies only
  - Test scoring favors killing enemy
  - Test scoring penalizes dying
  - Test terrain modifiers affect scoring

#### Success Criteria

- [x] AttackAction only generates candidates for adjacent enemies
- [x] Combat scoring uses CombatCalculator for predictions
- [x] Terrain defense modifiers are factored into scoring
- [x] Score reflects combat outcome (favors favorable trades)
- [x] All unit tests pass

---

### Phase 7: Module Index and Auto-Registration

**Goal**: Create module exports and ensure auto-registration works.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/actions/index.ts`:
  - Import all action files to trigger registration:
    ```typescript
    import './MoveAction';
    import './AttackAction';
    import './FoundCityAction';
    import './SetProductionAction';
    import './EndTurnAction';
    ```
  - Re-export actions for direct access if needed
- [x] Create `/Users/alex/workspace/civ/src/ai/index.ts`:
  - Import `'./actions'` to trigger registration
  - Export public API:
    - `ActionDefinition`, `EntityType` from registry
    - `ActionRegistry`, `getActionRegistry` from registry
    - `AIContext` from context
    - `buildAIContext`, `ContextBuilderDeps` from context
    - `AIController`, `ScoredAction` from controller
- [x] Create `/Users/alex/workspace/civ/src/ai/actions/index.test.ts`:
  - Test that importing `'../ai'` registers all 5 actions
  - Test `getActionRegistry().getActionCount() === 5`
  - Test each action ID is registered

#### Success Criteria

- [x] Importing `src/ai` registers all 5 actions
- [x] Registry contains exactly 5 actions after import
- [x] All action IDs match COMMAND_TYPES values
- [x] Public API exports are accessible

---

### Phase 8: AIController Implementation

**Goal**: Implement controller that coordinates action generation and execution.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/controller/AIController.ts`:
  - Define `ScoredAction` interface: `{ command, score, actionId }`
  - `constructor(engine: GameEngine, deps: ContextBuilderDeps)`
  - `executeTurn(playerId: number): void`:
    - Loop with safety limit (100 iterations)
    - Build fresh context each iteration
    - Call `selectBestAction(context)`
    - If best action is END_TURN or null, end turn and break
    - Execute command via `engine.executeCommand()`
    - Log warnings for failed commands, continue to next action
  - `selectBestAction(context: AIContext): ScoredAction | null`:
    - Get unit actions for each unit in `context.myUnits`
    - Get city actions for each city in `context.myCities`
    - Get player actions (END_TURN) with entityEid = -1
    - Score all candidates
    - Sort by score descending
    - Return highest scored action
  - `getAllScoredActions(context: AIContext): ScoredAction[]`:
    - Generate and score all candidates (for debugging)
    - Return sorted by score descending
- [x] Create `/Users/alex/workspace/civ/src/ai/controller/AIController.test.ts`:
  - Test `selectBestAction` returns highest scored action
  - Test `executeTurn` executes actions until END_TURN
  - Test safety limit prevents infinite loops
  - Test failed commands are logged but don't stop execution

#### Success Criteria

- [x] AIController generates candidates from all registered actions
- [x] Actions are scored and sorted correctly
- [x] Best action is selected and executed
- [x] Turn execution loops until END_TURN or no actions
- [x] Safety limit prevents infinite loops
- [x] All unit tests pass

---

### Phase 9: Integration Testing

**Goal**: Verify complete AI turn flow with real game state.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/ai/integration.test.ts`:
  - Setup real game world with units, cities, enemies
  - Test AI turn execution:
    - AI with Settler founds city
    - AI with Warrior attacks adjacent enemy
    - AI with unit moves when no other actions available
    - AI city sets production when no current production
    - AI ends turn when all units exhausted
  - Test multi-unit turn:
    - AI with multiple units processes all units
    - AI stops after reasonable number of actions
- [x] Verify no TypeScript errors
- [x] Verify ESLint passes
- [x] Run full test suite

#### Success Criteria

- [x] Integration tests pass with real game state
- [x] AI correctly prioritizes actions (attack > found city > move > end turn)
- [x] All units and cities are processed in a turn
- [x] No infinite loops or crashes
- [x] All tests pass
- [x] No TypeScript/ESLint errors

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/ai/registry/ActionDefinition.ts` | Create | Core ActionDefinition interface |
| `/Users/alex/workspace/civ/src/ai/registry/ActionRegistry.ts` | Create | Singleton registry for actions |
| `/Users/alex/workspace/civ/src/ai/registry/ActionRegistry.test.ts` | Create | Unit tests for registry |
| `/Users/alex/workspace/civ/src/ai/context/AIContext.ts` | Create | AIContext interface |
| `/Users/alex/workspace/civ/src/ai/context/ContextBuilder.ts` | Create | Build context from game state |
| `/Users/alex/workspace/civ/src/ai/context/ContextBuilder.test.ts` | Create | Unit tests for context builder |
| `/Users/alex/workspace/civ/src/ai/actions/MoveAction.ts` | Create | Move unit action definition |
| `/Users/alex/workspace/civ/src/ai/actions/MoveAction.test.ts` | Create | Unit tests for move action |
| `/Users/alex/workspace/civ/src/ai/actions/AttackAction.ts` | Create | Attack action definition |
| `/Users/alex/workspace/civ/src/ai/actions/AttackAction.test.ts` | Create | Unit tests for attack action |
| `/Users/alex/workspace/civ/src/ai/actions/FoundCityAction.ts` | Create | Found city action definition |
| `/Users/alex/workspace/civ/src/ai/actions/FoundCityAction.test.ts` | Create | Unit tests for found city action |
| `/Users/alex/workspace/civ/src/ai/actions/SetProductionAction.ts` | Create | Set production action definition |
| `/Users/alex/workspace/civ/src/ai/actions/SetProductionAction.test.ts` | Create | Unit tests for set production action |
| `/Users/alex/workspace/civ/src/ai/actions/EndTurnAction.ts` | Create | End turn action definition |
| `/Users/alex/workspace/civ/src/ai/actions/EndTurnAction.test.ts` | Create | Unit tests for end turn action |
| `/Users/alex/workspace/civ/src/ai/actions/index.ts` | Create | Action barrel exports and auto-registration |
| `/Users/alex/workspace/civ/src/ai/actions/index.test.ts` | Create | Test auto-registration |
| `/Users/alex/workspace/civ/src/ai/controller/AIController.ts` | Create | Main AI coordinator |
| `/Users/alex/workspace/civ/src/ai/controller/AIController.test.ts` | Create | Unit tests for controller |
| `/Users/alex/workspace/civ/src/ai/index.ts` | Create | Module public API exports |
| `/Users/alex/workspace/civ/src/ai/integration.test.ts` | Create | Integration tests with real game state |

**Total: 22 files to create**

---

## Success Criteria

### Functional Requirements
- [x] ActionDefinition interface supports all 5 command types
- [x] ActionRegistry singleton correctly manages action registration
- [x] AIContext provides all data needed for decision-making
- [x] Each action generates appropriate candidates
- [x] Scoring produces reasonable values for action prioritization
- [x] AIController executes complete turns

### Architecture Requirements
- [x] Actions self-register on import (no central switch statement)
- [x] New actions can be added by creating new file and importing
- [x] Context is built once per decision iteration
- [x] Scoring is encapsulated in each action definition

### Code Quality Requirements
- [x] All new modules have unit tests
- [x] Integration test covers realistic AI turn flow
- [x] No TypeScript errors or ESLint warnings
- [x] Public functions have JSDoc comments
- [x] Follows existing codebase patterns

---

## Dependencies & Integration

### Depends On
- **Command Types** (`/Users/alex/workspace/civ/src/engine/commands/types.ts`): COMMAND_TYPES, GameCommand interfaces
- **State Queries** (`/Users/alex/workspace/civ/src/engine/state/queries.ts`): queryUnits, queryCities, queryTile
- **Snapshots** (`/Users/alex/workspace/civ/src/engine/state/snapshots.ts`): UnitSnapshot, CitySnapshot
- **GameEngine** (`/Users/alex/workspace/civ/src/engine/GameEngine.ts`): executeCommand for action execution
- **Pathfinder** (`/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts`): getReachableTiles for move generation
- **CombatCalculator** (`/Users/alex/workspace/civ/src/combat/CombatCalculator.ts`): calculateCombat for attack scoring
- **CombatModifiers** (`/Users/alex/workspace/civ/src/combat/CombatModifiers.ts`): getTotalDefenseModifier
- **CityFounder** (`/Users/alex/workspace/civ/src/city/CityFounder.ts`): canFoundCity validation
- **Buildable** (`/Users/alex/workspace/civ/src/city/Buildable.ts`): getAvailableBuildables, BuildableType
- **PlayerManager** (`/Users/alex/workspace/civ/src/player/PlayerManager.ts`): getActivePlayers for enemy enumeration
- **TilePosition** (`/Users/alex/workspace/civ/src/hex/TilePosition.ts`): neighbors() for adjacency checks

### Consumed By (Future Phases)
- **Phase 2 Scoring**: Enhanced scoring modules will use this foundation
- **Phase 3 Auto-Discovery**: ActionCapability component will query registry
- **Phase 4 Strategy Layer**: Strategies will modify action scores
- **Game Loop Integration**: Turn processor will call AIController.executeTurn()

### Integration Points
- **GameEngine**: AIController uses engine.executeCommand() for action execution
- **Game Loop**: Future integration will call AI during AI player turns
- **Registry Pattern**: Actions register themselves, matching validator/executor pattern

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Circular dependency between AI and game modules | High | Medium | AIContext takes dependencies as parameters, no direct imports from game loop |
| Action scoring produces degenerate behavior | Medium | Medium | Start with simple scoring, log all scored actions for debugging |
| Context building is too slow | Medium | Low | Cache queries per decision iteration, profile if needed |
| Registry not reset between tests | Medium | Medium | Call resetInstance() in test setup/teardown |
| Move action generates too many candidates | Low | Medium | Pathfinder already limits by movement points; can add candidate limit later |
| Auto-registration order affects behavior | Low | Low | Actions are independent; order should not matter |

---

## Testing Strategy

### Unit Tests

**ActionRegistry.test.ts**
- Singleton returns same instance
- Reset creates new instance
- Register adds action to map
- Duplicate registration throws error
- getAction returns registered action
- getAction returns undefined for unknown ID
- getActionsFor filters by entity type
- getAllActions returns all registered
- hasAction returns correct boolean
- getActionCount returns correct number

**ContextBuilder.test.ts**
- Builds context with correct playerId
- myUnits contains only own units
- myCities contains only own cities
- enemyUnits maps player IDs to their units
- enemyCities maps player IDs to their cities
- getTile returns correct tile data
- getTile returns null for invalid position
- getEnemyUnitAt returns unit at position
- getEnemyUnitAt returns null for empty position
- getAdjacentEnemies returns correct neighbors

**EndTurnAction.test.ts**
- Generates exactly one candidate
- Candidate has correct type and playerId
- Score is 100 when no units have capabilities
- Score is 1 when units have actions remaining

**SetProductionAction.test.ts**
- Generates candidates for all buildable types
- Candidate count equals available buildables count
- Settler scores 80 with < 3 cities
- Settler scores 40 with >= 3 cities
- Warrior scores 50
- Scout scores 30

**FoundCityAction.test.ts**
- Returns empty for non-Settler units
- Returns empty when canFoundCity fails
- Returns single candidate for valid Settler
- Score is 70

**MoveAction.test.ts**
- Returns empty for units that cannot move
- Generates candidates for reachable tiles
- Does not include current position
- Candidate count matches reachable tile count minus one
- Score is 10 (base score)

**AttackAction.test.ts**
- Returns empty for units that cannot attack
- Returns empty when no adjacent enemies
- Generates candidate for each adjacent enemy
- Score increases when defender dies
- Score decreases when attacker dies
- Score accounts for terrain defense

**AIController.test.ts**
- selectBestAction returns highest scored action
- selectBestAction returns null when no candidates
- getAllScoredActions returns sorted list
- executeTurn stops on END_TURN action
- executeTurn respects iteration limit
- executeTurn continues after failed command

### Integration Tests

**integration.test.ts**
- AI Settler founds city when valid
- AI Warrior attacks adjacent enemy
- AI unit moves when no better action
- AI city sets production when idle
- AI processes multiple units in one turn
- AI ends turn after all actions complete
- No infinite loop with stuck unit

---

## Open Questions (Addressed)

From research, these were addressed as follows:

1. **Score normalization**: Use 0-100 range consistently; scoring will be refined in Phase 2
2. **Tie-breaking**: Currently first action wins; randomization can be added in Phase 4 Strategy Layer
3. **Action filtering**: No filtering for Phase 1; can add threshold in future if performance is an issue
4. **Per-unit tracking**: Not implemented in Phase 1; context is rebuilt each iteration
5. **Production decision timing**: Generate candidates always; scoring will make idle cities prioritize
6. **Testing AI turns**: getAllScoredActions() method enables debugging/visualization

---

## Appendix: Example Usage

```typescript
// Import AI module (triggers auto-registration of all actions)
import { AIController, buildAIContext, ContextBuilderDeps } from './ai';

// Build dependencies
const deps: ContextBuilderDeps = {
  world,
  gameState,
  tileMap,
  pathfinder,
  territoryManager,
  playerManager,
};

// Create controller
const aiController = new AIController(engine, deps);

// Execute AI turn for player 1
aiController.executeTurn(1);
```

```typescript
// Adding a new action (future)
// 1. Create src/ai/actions/ResearchAction.ts
export const ResearchAction: ActionDefinition<ResearchTechCommand> = {
  id: 'RESEARCH_TECH',
  commandType: COMMAND_TYPES.RESEARCH_TECH,
  applicableTo: ['player'],
  generateCandidates(context, entityEid) { /* ... */ },
  scoreCandidate(context, command) { /* ... */ },
};
getActionRegistry().register(ResearchAction);

// 2. Import in src/ai/actions/index.ts
import './ResearchAction';

// Done! AI will now consider research actions automatically.
```
