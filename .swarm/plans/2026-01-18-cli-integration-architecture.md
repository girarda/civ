# Plan: CLI Integration Architecture

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement a decoupled game engine architecture that separates game logic from rendering, enabling both GUI (PixiJS) and CLI frontends to control the game. This plan covers the foundation phases: extracting the GameEngine core, implementing a command layer for actions, and decoupling renderers to react to events rather than being called directly.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-cli-integration-architecture.md`:

- **Game logic is partially coupled to rendering**: `MovementExecutor`, `CombatExecutor`, `CityProcessor`, and `CityFounder` receive renderer instances directly
- **State management is reactive**: `GameState`, `SelectionState`, `HoverState` use subscriber patterns that can be leveraged for state observation
- **bitECS is already headless**: The ECS layer (`world.ts`, `citySystems.ts`, `unitSystems.ts`) has no rendering dependencies
- **No command abstraction exists**: Actions are directly executed with imperative calls mixed with render updates
- **Turn system hooks exist**: `TurnSystem.ts` provides `onTurnStart`/`onTurnEnd` hooks that can integrate with a command processor
- **Map data is decoupled**: `tileMap: Map<string, GeneratedTile>` is a plain data structure

Architecture pattern: Command-based action system with serializable state snapshots and an EventBus for observer notifications, following the OpenRCT2 Claude integration patterns.

## Phased Implementation

### Phase 1: Extract Engine Core (Foundation)

**Goal**: Create `GameEngine` class that holds all game state and logic, independent of rendering.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/engine/GameEngine.ts`:
  ```typescript
  export class GameEngine {
    private world: IWorld;
    private tileMap: Map<string, GeneratedTile>;
    private territoryManager: TerritoryManager;
    private gameState: GameState;
    private eventBus: EventBus;

    constructor(config: GameConfig);

    // State query methods
    getState(): GameStateSnapshot;
    getUnits(playerId?: number): UnitSnapshot[];
    getCities(playerId?: number): CitySnapshot[];
    getTile(q: number, r: number): TileSnapshot | null;
    getMap(): MapSnapshot;
  }
  ```
- [x] Create `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` with serializable snapshot types:
  - `GameStateSnapshot` (turnNumber, phase, currentPlayer, playerCount)
  - `UnitSnapshot` (eid, type, owner, position, health, movement, capabilities)
  - `CitySnapshot` (eid, name, owner, position, population, production, yields, territory)
  - `TileSnapshot` (position, terrain, feature, resource, yields, passability, ownership)
  - `MapSnapshot` (width, height, seed, tiles)
- [x] Create `/Users/alex/workspace/civ/src/engine/state/queries.ts` implementing state query functions:
  - `queryGameState(gameState: GameState): GameStateSnapshot`
  - `queryUnits(world: IWorld, playerId?: number): UnitSnapshot[]`
  - `queryCities(world: IWorld, playerId?: number): CitySnapshot[]`
  - `queryTile(tileMap, q, r): TileSnapshot | null`
  - `queryMap(tileMap, config): MapSnapshot`
- [x] Create `/Users/alex/workspace/civ/src/engine/events/EventBus.ts`:
  ```typescript
  export class EventBus {
    emit(event: GameEvent): void;
    subscribe(eventType: string, handler: (event: GameEvent) => void): () => void;
    subscribeAll(handler: (event: GameEvent) => void): () => void;
  }
  ```
- [x] Create `/Users/alex/workspace/civ/src/engine/events/types.ts` with event type definitions:
  - `UnitMovedEvent`
  - `CombatResolvedEvent`
  - `CityFoundedEvent`
  - `UnitSpawnedEvent`
  - `TurnEndedEvent`
  - `TurnStartedEvent`
  - `ProductionCompletedEvent`
- [x] Move ECS world creation from `main.ts` into `GameEngine` constructor
- [x] Move `tileMap` and `territoryManager` ownership into `GameEngine`
- [x] Create `/Users/alex/workspace/civ/src/engine/index.ts` for module exports
- [x] Write unit tests in `/Users/alex/workspace/civ/src/engine/state/queries.test.ts`:
  - Test `queryGameState` returns correct snapshot
  - Test `queryUnits` filters by playerId
  - Test `queryCities` returns correct yields and production
  - Test `queryTile` handles valid and invalid coordinates
- [x] Write unit tests in `/Users/alex/workspace/civ/src/engine/events/EventBus.test.ts`:
  - Test subscribe and emit
  - Test unsubscribe
  - Test subscribeAll catches all events

#### Success Criteria

- [x] `GameEngine` can be instantiated with configuration
- [x] All state queries return properly typed snapshot objects
- [x] Snapshots are serializable to JSON without errors
- [x] EventBus correctly dispatches events to subscribers
- [x] Unit tests pass for state queries and event bus
- [ ] Existing game functionality remains unchanged (main.ts still works) *(Note: main.ts not yet integrated - this is Phase 3)*

---

### Phase 2: Command Layer

**Goal**: Replace direct method calls with command objects that are validated and executed through the engine.

#### Tasks

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/types.ts` with command type definitions:
  ```typescript
  interface Command {
    type: string;
    playerId: number;
    timestamp?: number;
  }

  interface MoveUnitCommand extends Command {
    type: 'MOVE_UNIT';
    unitEid: number;
    targetQ: number;
    targetR: number;
  }

  interface AttackCommand extends Command {
    type: 'ATTACK';
    attackerEid: number;
    defenderEid: number;
  }

  interface FoundCityCommand extends Command {
    type: 'FOUND_CITY';
    settlerEid: number;
    cityName?: string;
  }

  interface SetProductionCommand extends Command {
    type: 'SET_PRODUCTION';
    cityEid: number;
    buildableType: number;
  }

  interface EndTurnCommand extends Command {
    type: 'END_TURN';
  }

  type GameCommand =
    | MoveUnitCommand
    | AttackCommand
    | FoundCityCommand
    | SetProductionCommand
    | EndTurnCommand;
  ```
- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/CommandResult.ts`:
  ```typescript
  export interface CommandResult {
    success: boolean;
    error?: string;
    events: GameEvent[];
  }
  ```
- [ ] Create command validators in `/Users/alex/workspace/civ/src/engine/commands/validators/`:
  - `MoveUnitValidator.ts` - Check unit exists, has movement, target is valid
  - `AttackValidator.ts` - Check attacker/defender exist, adjacent, valid target
  - `FoundCityValidator.ts` - Check settler exists, valid location
  - `SetProductionValidator.ts` - Check city exists, buildable is valid
  - `EndTurnValidator.ts` - Check it's player's turn
  - `index.ts` - Export validator registry
- [ ] Create command executors in `/Users/alex/workspace/civ/src/engine/commands/executors/`:
  - `MoveUnitExecutor.ts` - Execute movement, emit `UnitMovedEvent`
  - `AttackExecutor.ts` - Execute combat, emit `CombatResolvedEvent`
  - `FoundCityExecutor.ts` - Found city, emit `CityFoundedEvent`
  - `SetProductionExecutor.ts` - Set production, emit event
  - `EndTurnExecutor.ts` - Process turn end, emit `TurnEndedEvent`/`TurnStartedEvent`
  - `index.ts` - Export executor registry
- [ ] Add `executeCommand(command: GameCommand): CommandResult` method to `GameEngine`:
  - Get validator for command type
  - Validate command against current state
  - If invalid, return error result
  - Get executor for command type
  - Execute command, collect events
  - Emit events through EventBus
  - Return success result with events
- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/index.ts` for module exports
- [ ] Write unit tests in `/Users/alex/workspace/civ/src/engine/commands/validators/`:
  - Test each validator with valid inputs
  - Test each validator with invalid inputs (unit not found, no movement, etc.)
- [ ] Write unit tests in `/Users/alex/workspace/civ/src/engine/commands/executors/`:
  - Test each executor produces correct events
  - Test state changes after execution
- [ ] Write integration tests for `GameEngine.executeCommand()`:
  - Test full command flow: validate -> execute -> emit events
  - Test invalid commands return errors without state changes

#### Success Criteria

- [ ] All game actions can be expressed as typed command objects
- [ ] Commands are validated before execution
- [ ] Invalid commands return descriptive error messages
- [ ] Successful commands emit appropriate events
- [ ] Commands are serializable to JSON
- [ ] Unit tests pass for all validators and executors
- [ ] Integration tests pass for command execution flow

---

### Phase 3: Decouple Renderers

**Goal**: Make renderers react to events rather than being called directly by game logic.

#### Tasks

- [ ] Create `/Users/alex/workspace/civ/src/gui/GuiFrontend.ts`:
  ```typescript
  export class GuiFrontend {
    private engine: GameEngine;
    private unitRenderer: UnitRenderer;
    private cityRenderer: CityRenderer;
    private territoryRenderer: TerritoryRenderer;
    // ... other renderers

    constructor(engine: GameEngine, app: Application);

    // Set up event subscriptions
    initialize(): void;
  }
  ```
- [ ] Create `/Users/alex/workspace/civ/src/gui/EventHandlers.ts` with renderer event handlers:
  - `handleUnitMoved(event: UnitMovedEvent, unitRenderer: UnitRenderer)`
  - `handleCombatResolved(event: CombatResolvedEvent, unitRenderer: UnitRenderer)`
  - `handleCityFounded(event: CityFoundedEvent, cityRenderer, territoryRenderer)`
  - `handleUnitSpawned(event: UnitSpawnedEvent, unitRenderer: UnitRenderer)`
  - `handleTurnEnded(event: TurnEndedEvent, uiUpdater)`
  - `handleTurnStarted(event: TurnStartedEvent, uiUpdater)`
- [ ] Modify `/Users/alex/workspace/civ/src/unit/MovementSystem.ts`:
  - Remove direct `UnitRenderer` dependency from `MovementExecutor`
  - Return movement result data instead of calling renderer
  - Movement executor in engine emits `UnitMovedEvent`
- [ ] Modify `/Users/alex/workspace/civ/src/combat/CombatSystem.ts`:
  - Remove direct `UnitRenderer` dependency from `CombatExecutor`
  - Return combat result data instead of calling renderer
  - Combat executor in engine emits `CombatResolvedEvent`
- [ ] Modify `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:
  - Convert production completion callbacks to events
  - Emit `ProductionCompletedEvent` instead of callback
  - Emit `UnitSpawnedEvent` when units are produced
- [ ] Modify `/Users/alex/workspace/civ/src/city/CityFounder.ts`:
  - Remove entity removal calls to renderer
  - Return city founding result data
  - Engine executor emits `CityFoundedEvent`
- [ ] Update `/Users/alex/workspace/civ/src/main.ts`:
  - Create `GameEngine` instance
  - Create `GuiFrontend` instance with engine
  - Wire GUI input handlers to create commands and call `engine.executeCommand()`
  - Remove direct executor instantiation (use engine instead)
- [ ] Create `/Users/alex/workspace/civ/src/gui/index.ts` for module exports
- [ ] Update `/Users/alex/workspace/civ/src/ui/SelectionSystem.ts`:
  - On right-click, create command (MoveUnit or Attack)
  - Call `engine.executeCommand(command)` instead of direct executor
- [ ] Write integration tests verifying event-driven rendering:
  - Test that `UnitMovedEvent` triggers renderer update
  - Test that `CombatResolvedEvent` triggers health bar update
  - Test that `CityFoundedEvent` triggers city and territory rendering
- [ ] Run existing E2E tests to verify no regressions:
  - All movement tests still pass
  - All combat tests still pass
  - All city tests still pass

#### Success Criteria

- [ ] Renderers have no direct coupling to game logic executors
- [ ] All visual updates happen through event handlers
- [ ] `GuiFrontend` subscribes to engine events and routes to appropriate renderers
- [ ] Input handlers create commands instead of calling executors directly
- [ ] All existing E2E tests pass with new architecture
- [ ] Game is playable with identical user experience
- [ ] No renderer imports in engine module

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/engine/GameEngine.ts` | Create | Core game engine class with state and command execution |
| `/Users/alex/workspace/civ/src/engine/index.ts` | Create | Engine module exports |
| `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` | Create | Serializable state snapshot type definitions |
| `/Users/alex/workspace/civ/src/engine/state/queries.ts` | Create | State query implementations |
| `/Users/alex/workspace/civ/src/engine/state/queries.test.ts` | Create | Unit tests for state queries |
| `/Users/alex/workspace/civ/src/engine/events/types.ts` | Create | Game event type definitions |
| `/Users/alex/workspace/civ/src/engine/events/EventBus.ts` | Create | Event publication/subscription system |
| `/Users/alex/workspace/civ/src/engine/events/EventBus.test.ts` | Create | Unit tests for EventBus |
| `/Users/alex/workspace/civ/src/engine/commands/types.ts` | Create | Command type definitions |
| `/Users/alex/workspace/civ/src/engine/commands/CommandResult.ts` | Create | Command result type |
| `/Users/alex/workspace/civ/src/engine/commands/index.ts` | Create | Command module exports |
| `/Users/alex/workspace/civ/src/engine/commands/validators/MoveUnitValidator.ts` | Create | Movement command validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/AttackValidator.ts` | Create | Attack command validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/FoundCityValidator.ts` | Create | City founding validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/SetProductionValidator.ts` | Create | Production command validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/EndTurnValidator.ts` | Create | End turn validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/index.ts` | Create | Validator registry |
| `/Users/alex/workspace/civ/src/engine/commands/executors/MoveUnitExecutor.ts` | Create | Movement execution logic |
| `/Users/alex/workspace/civ/src/engine/commands/executors/AttackExecutor.ts` | Create | Combat execution logic |
| `/Users/alex/workspace/civ/src/engine/commands/executors/FoundCityExecutor.ts` | Create | City founding execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/SetProductionExecutor.ts` | Create | Production setting execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/EndTurnExecutor.ts` | Create | Turn end execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/index.ts` | Create | Executor registry |
| `/Users/alex/workspace/civ/src/gui/GuiFrontend.ts` | Create | GUI-specific coordination and event subscription |
| `/Users/alex/workspace/civ/src/gui/EventHandlers.ts` | Create | Event to renderer mapping |
| `/Users/alex/workspace/civ/src/gui/index.ts` | Create | GUI module exports |
| `/Users/alex/workspace/civ/src/unit/MovementSystem.ts` | Modify | Remove renderer dependency |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Modify | Remove renderer dependency |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Modify | Convert callbacks to events |
| `/Users/alex/workspace/civ/src/city/CityFounder.ts` | Modify | Remove renderer calls |
| `/Users/alex/workspace/civ/src/ui/SelectionSystem.ts` | Modify | Use commands instead of direct execution |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Wire GameEngine and GuiFrontend |

**Total: 26 files to create, 6 files to modify**

---

## Success Criteria

### Architectural Requirements
- [ ] GameEngine can be instantiated and used without any PixiJS imports
- [ ] All game state is queryable through typed snapshot methods
- [ ] All game actions flow through `executeCommand()` method
- [ ] Commands are validated before execution
- [ ] Events are emitted for all state changes
- [ ] Renderers subscribe to events, not called directly

### Functional Requirements
- [ ] Game plays identically to before refactoring
- [ ] All unit movement works via commands
- [ ] All combat works via commands
- [ ] City founding works via commands
- [ ] Production setting works via commands
- [ ] Turn advancement works via commands

### Code Quality Requirements
- [ ] No renderer imports in `/Users/alex/workspace/civ/src/engine/` directory
- [ ] All commands are JSON-serializable
- [ ] All snapshots are JSON-serializable
- [ ] All events are JSON-serializable
- [ ] Unit tests cover validators and executors
- [ ] No TypeScript errors or ESLint warnings
- [ ] All existing E2E tests pass

---

## Dependencies & Integration

### Depends On
- **ECS World** (`/Users/alex/workspace/civ/src/ecs/world.ts`): Components, entity creation, queries
- **Unit Systems** (`/Users/alex/workspace/civ/src/ecs/unitSystems.ts`): Unit queries and operations
- **City Systems** (`/Users/alex/workspace/civ/src/ecs/citySystems.ts`): City queries and operations
- **Game State** (`/Users/alex/workspace/civ/src/game/GameState.ts`): Turn state management
- **Turn System** (`/Users/alex/workspace/civ/src/game/TurnSystem.ts`): Turn processing hooks
- **Territory Manager** (`/Users/alex/workspace/civ/src/city/TerritoryManager.ts`): City territory
- **Map Generation** (`/Users/alex/workspace/civ/src/map/`): Tile map data

### Consumed By (Future Phases)
- **CLI Frontend**: Will use `GameEngine` to execute commands and query state
- **JSON-RPC Server**: Will expose `GameEngine` methods over network
- **AI Players**: Will query state and issue commands
- **Save/Load System**: Will serialize commands and state
- **Replay System**: Will replay command history

### Integration Points
- **main.ts**: Bootstrap both GameEngine and GuiFrontend
- **SelectionSystem**: Translates UI input to commands
- **UnitRenderer**: Subscribes to unit events
- **CityRenderer**: Subscribes to city events
- **TerritoryRenderer**: Subscribes to territory events

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing functionality during refactor | High | Medium | Incremental changes with E2E test runs after each phase |
| Event ordering issues cause visual glitches | Medium | Medium | Process events synchronously; add event sequencing if needed |
| Performance regression from event overhead | Low | Low | Events are lightweight; profile if issues arise |
| Command validation misses edge cases | Medium | Medium | Comprehensive unit tests for validators; property-based testing |
| Circular dependencies between engine and renderers | Medium | Low | Strict module boundaries; no renderer imports in engine |
| State snapshot serialization performance | Low | Low | Lazy computation; cache snapshots if needed |
| Renderer event handler errors crash game | Medium | Low | Wrap handlers in try-catch; log errors without propagating |

---

## Testing Strategy

### Unit Tests

**queries.test.ts**
- `queryGameState` returns correct turn/phase/player
- `queryUnits` with no filter returns all units
- `queryUnits` with playerId returns filtered list
- `queryCities` includes correct yields calculation
- `queryTile` returns null for invalid coordinates
- Snapshots are JSON-serializable

**EventBus.test.ts**
- Subscribe receives emitted events
- Unsubscribe stops receiving events
- Multiple subscribers all receive events
- subscribeAll catches events of all types

**Validator Tests**
- MoveUnitValidator: valid move passes
- MoveUnitValidator: nonexistent unit fails
- MoveUnitValidator: no movement points fails
- MoveUnitValidator: impassable terrain fails
- AttackValidator: adjacent enemy passes
- AttackValidator: friendly unit fails
- AttackValidator: non-adjacent fails
- FoundCityValidator: valid location passes
- FoundCityValidator: non-settler fails
- SetProductionValidator: valid buildable passes
- EndTurnValidator: correct player passes

**Executor Tests**
- MoveUnitExecutor emits UnitMovedEvent
- MoveUnitExecutor updates unit position
- AttackExecutor emits CombatResolvedEvent
- AttackExecutor applies damage
- FoundCityExecutor emits CityFoundedEvent
- FoundCityExecutor removes settler
- EndTurnExecutor emits TurnEndedEvent and TurnStartedEvent

### Integration Tests

**GameEngine.executeCommand() tests**
- Full move command flow
- Invalid command returns error
- Events are emitted on success
- State changes reflected in queries

### E2E Tests (Existing)

- All existing movement tests pass
- All existing combat tests pass
- All existing city tests pass
- All existing turn tests pass

---

## Estimated Effort

| Phase | Estimated Hours | Complexity |
|-------|-----------------|------------|
| Phase 1: Extract Engine Core | 4-6 hours | Medium |
| Phase 2: Command Layer | 6-8 hours | High |
| Phase 3: Decouple Renderers | 4-6 hours | Medium |
| **Total** | **14-20 hours** | |

---

## Future Phases (Not In Scope)

The following phases from the research are explicitly excluded from this plan:

- **Phase 4: CLI Frontend** - Creating `civctl` command-line interface
- **Phase 5: Integration Testing** - Testing GUI and CLI together
- **Phase 6: JSON-RPC Server** - Network interface for external tools

These will be addressed in a future plan once the foundation phases are complete.
