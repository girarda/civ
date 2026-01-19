# Plan: Command Layer and Renderer Decoupling (Phases 2-3)

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement Phase 2 (Command Layer) and Phase 3 (Decouple Renderers) of the CLI integration architecture. Phase 2 introduces a command abstraction layer with validators and pure executors that replace direct method calls. Phase 3 removes direct renderer dependencies from game logic, making renderers react to events through a GuiFrontend coordination layer.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-cli-integration-phases2-3.md`:

- **Phase 1 complete**: `GameEngine`, `EventBus`, state snapshots, and queries are fully implemented
- **Existing executors are tightly coupled**: `MovementExecutor`, `CombatExecutor`, `CityProcessor`, `CityFounder` all receive renderer instances directly
- **Event types already defined**: All necessary event types exist in `/Users/alex/workspace/civ/src/engine/events/types.ts`
- **Validation logic exists**: `canFoundCity`, `combatExecutor.canAttack`, `movementExecutor.canMove` provide validation patterns to extract
- **main.ts directly invokes executors**: Right-click handler calls executors directly, needs to route through commands

## Phased Implementation

### Phase 2: Command Layer

#### Phase 2.1: Command Types and Result Interface

**Goal**: Define all command types and execution result structure.

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/types.ts`:
  ```typescript
  /** Base interface for all commands */
  interface Command {
    type: string;
    playerId: number;
    timestamp?: number;
  }

  /** Move a unit to a target hex */
  interface MoveUnitCommand extends Command {
    type: 'MOVE_UNIT';
    unitEid: number;
    targetQ: number;
    targetR: number;
  }

  /** Attack an enemy unit */
  interface AttackCommand extends Command {
    type: 'ATTACK';
    attackerEid: number;
    defenderEid: number;
  }

  /** Found a city with the selected settler */
  interface FoundCityCommand extends Command {
    type: 'FOUND_CITY';
    settlerEid: number;
    cityName?: string;
  }

  /** Set production for a city */
  interface SetProductionCommand extends Command {
    type: 'SET_PRODUCTION';
    cityEid: number;
    buildableType: number;
  }

  /** End the current player's turn */
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
  import { GameEventType } from '../events/types';

  export interface ValidationResult {
    valid: boolean;
    error?: string;
  }

  export interface CommandResult {
    success: boolean;
    error?: string;
    events: GameEventType[];
  }
  ```

**Success Criteria**:
- [ ] All 5 command types are defined with proper TypeScript discriminated union
- [ ] Commands are JSON-serializable (no functions, circular refs)
- [ ] CommandResult captures success/failure and emitted events

---

#### Phase 2.2: Validators

**Goal**: Extract validation logic from existing executors into pure validator functions.

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/MoveUnitValidator.ts`:
  - Extract logic from `MovementExecutor.canMove()` (lines 39-47 of MovementSystem.ts)
  - Validate: unit exists, has movement points, target is reachable via pathfinder
  ```typescript
  export interface MoveUnitValidatorDeps {
    world: IWorld;
    pathfinder: Pathfinder;
  }

  export function validateMoveUnit(
    command: MoveUnitCommand,
    deps: MoveUnitValidatorDeps
  ): ValidationResult {
    // Check unit exists
    // Check movement points > 0
    // Check pathfinder.findPath() returns reachable
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/AttackValidator.ts`:
  - Extract logic from `CombatExecutor.canAttack()` (lines 47-88 of CombatSystem.ts)
  - Validate: game phase is PlayerAction, attacker has MP, has combat strength, target is adjacent enemy
  ```typescript
  export interface AttackValidatorDeps {
    world: IWorld;
    tileMap: Map<string, GeneratedTile>;
    gameState: GameState;
  }

  export function validateAttack(
    command: AttackCommand,
    deps: AttackValidatorDeps
  ): ValidationResult {
    // Check phase is PlayerAction
    // Check attacker has MP > 0
    // Check attacker has combat strength
    // Check defender exists and is adjacent
    // Check different owners (enemy)
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/FoundCityValidator.ts`:
  - Reuse existing `canFoundCity()` and `getFoundCityBlockReason()` from CityFounder.ts
  ```typescript
  export interface FoundCityValidatorDeps {
    world: IWorld;
    tileMap: Map<string, GeneratedTile>;
  }

  export function validateFoundCity(
    command: FoundCityCommand,
    deps: FoundCityValidatorDeps
  ): ValidationResult {
    // Delegate to existing getFoundCityBlockReason()
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/SetProductionValidator.ts`:
  - Validate city exists, buildable type is valid
  ```typescript
  export interface SetProductionValidatorDeps {
    world: IWorld;
  }

  export function validateSetProduction(
    command: SetProductionCommand,
    deps: SetProductionValidatorDeps
  ): ValidationResult {
    // Check city entity exists
    // Check buildable type is valid (0 < type <= max)
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/EndTurnValidator.ts`:
  - Validate current player matches command playerId
  ```typescript
  export interface EndTurnValidatorDeps {
    gameState: GameState;
  }

  export function validateEndTurn(
    command: EndTurnCommand,
    deps: EndTurnValidatorDeps
  ): ValidationResult {
    // Check playerId matches current player
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/validators/index.ts`:
  - Export all validators
  - Create `getValidator(commandType)` registry function

- [ ] Write unit tests `/Users/alex/workspace/civ/src/engine/commands/validators/validators.test.ts`:
  - MoveUnitValidator: valid move, no MP, unreachable target, invalid unit
  - AttackValidator: valid attack, wrong phase, no MP, not adjacent, friendly target
  - FoundCityValidator: valid location, not settler, water tile, existing city
  - SetProductionValidator: valid city, invalid city, invalid buildable
  - EndTurnValidator: correct player, wrong player

**Success Criteria**:
- [ ] All 5 validators implemented as pure functions
- [ ] Validators return descriptive error messages
- [ ] All validator tests pass
- [ ] No renderer/UI imports in validator files

---

#### Phase 2.3: Executors

**Goal**: Create pure executors that mutate ECS state and return events to emit.

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/MoveUnitExecutor.ts`:
  - Pure state mutation from MovementExecutor.executeMove() without renderer call
  ```typescript
  export interface MoveUnitExecutorDeps {
    world: IWorld;
    pathfinder: Pathfinder;
  }

  export function executeMoveUnit(
    command: MoveUnitCommand,
    deps: MoveUnitExecutorDeps
  ): GameEventType[] {
    // Get current position
    // Calculate path cost
    // Update Position components
    // Update MovementComponent.current
    // Return [UnitMovedEvent]
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/AttackExecutor.ts`:
  - Pure combat execution returning events, no renderer calls
  ```typescript
  export interface AttackExecutorDeps {
    world: IWorld;
    tileMap: Map<string, GeneratedTile>;
    playerManager?: PlayerManager;
  }

  export function executeAttack(
    command: AttackCommand,
    deps: AttackExecutorDeps
  ): GameEventType[] {
    // Calculate combat result
    // Apply damage to both units
    // Set attacker MP to 0
    // If unit dies: removeEntity, add UnitDestroyedEvent
    // Check player elimination
    // Return [CombatResolvedEvent, ...UnitDestroyedEvents]
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/FoundCityExecutor.ts`:
  - Pure city founding returning events
  ```typescript
  export interface FoundCityExecutorDeps {
    world: IWorld;
    territoryManager: TerritoryManager;
  }

  export function executeFoundCity(
    command: FoundCityCommand,
    deps: FoundCityExecutorDeps
  ): GameEventType[] {
    // Get settler position/owner
    // Create city entity
    // Initialize territory
    // Remove settler entity
    // Return [UnitDestroyedEvent (settler), CityFoundedEvent]
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/SetProductionExecutor.ts`:
  - Pure production setting
  ```typescript
  export interface SetProductionExecutorDeps {
    world: IWorld;
  }

  export function executeSetProduction(
    command: SetProductionCommand,
    deps: SetProductionExecutorDeps
  ): GameEventType[] {
    // Update ProductionComponent
    // Return [ProductionChangedEvent]
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/EndTurnExecutor.ts`:
  - Process turn end including city production
  ```typescript
  export interface EndTurnExecutorDeps {
    world: IWorld;
    gameState: GameState;
    territoryManager: TerritoryManager;
    tileMap: Map<string, GeneratedTile>;
  }

  export function executeEndTurn(
    command: EndTurnCommand,
    deps: EndTurnExecutorDeps
  ): GameEventType[] {
    const events: GameEventType[] = [];
    // Process all cities (production, growth)
    // Collect ProductionCompletedEvent, UnitSpawnedEvent, PopulationGrowthEvent
    // Reset movement points for next player
    // Advance turn
    // Return [TurnEndedEvent, ...cityEvents, TurnStartedEvent]
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/executors/index.ts`:
  - Export all executors
  - Create `getExecutor(commandType)` registry function

- [ ] Write unit tests `/Users/alex/workspace/civ/src/engine/commands/executors/executors.test.ts`:
  - MoveUnitExecutor: emits UnitMovedEvent, updates position, deducts MP
  - AttackExecutor: emits CombatResolvedEvent, applies damage, emits UnitDestroyedEvent on death
  - FoundCityExecutor: emits CityFoundedEvent and UnitDestroyedEvent, creates city entity
  - SetProductionExecutor: emits ProductionChangedEvent, updates components
  - EndTurnExecutor: emits turn events, processes cities

**Success Criteria**:
- [ ] All 5 executors implemented as pure functions
- [ ] Executors return arrays of events (don't emit directly)
- [ ] No renderer imports in executor files
- [ ] All executor tests pass
- [ ] State changes verified in tests

---

#### Phase 2.4: GameEngine.executeCommand()

**Goal**: Add command execution method to GameEngine that validates, executes, and emits events.

- [ ] Modify `/Users/alex/workspace/civ/src/engine/GameEngine.ts`:
  - Add Pathfinder as a dependency (create in constructor or accept via setter)
  - Add `executeCommand(command: GameCommand): CommandResult` method:
    ```typescript
    executeCommand(command: GameCommand): CommandResult {
      // Get validator for command type
      const validator = getValidator(command.type);
      const deps = this.getValidatorDeps(command.type);
      const validation = validator(command, deps);

      if (!validation.valid) {
        return { success: false, error: validation.error, events: [] };
      }

      // Get executor for command type
      const executor = getExecutor(command.type);
      const execDeps = this.getExecutorDeps(command.type);
      const events = executor(command, execDeps);

      // Emit all events
      for (const event of events) {
        this.eventBus.emit(event);
      }

      return { success: true, events };
    }
    ```
  - Add private helper methods for dependency injection:
    - `getValidatorDeps(commandType)` returns appropriate deps object
    - `getExecutorDeps(commandType)` returns appropriate deps object
  - Add Pathfinder getter/setter for validator access

- [ ] Create `/Users/alex/workspace/civ/src/engine/commands/index.ts`:
  - Export all command types
  - Export CommandResult
  - Export validator and executor registries

- [ ] Write integration tests `/Users/alex/workspace/civ/src/engine/GameEngine.executeCommand.test.ts`:
  - Full move command flow: validate -> execute -> events emitted -> state changed
  - Invalid command returns error without state change
  - Attack command kills defender, emits both combat and destroyed events
  - Found city removes settler, creates city

**Success Criteria**:
- [ ] `executeCommand()` validates before executing
- [ ] Events are emitted through EventBus after execution
- [ ] Invalid commands return error result with descriptive message
- [ ] State changes are reflected in subsequent queries
- [ ] Integration tests pass

---

### Phase 3: Decouple Renderers

#### Phase 3.1: GuiFrontend and Event Handlers

**Goal**: Create GUI coordination layer that subscribes to engine events and updates renderers.

- [ ] Create `/Users/alex/workspace/civ/src/gui/EventHandlers.ts`:
  - Pure functions mapping events to renderer calls
  ```typescript
  export function handleUnitMoved(
    event: UnitMovedEvent,
    unitRenderer: UnitRenderer
  ): void {
    const pos = new TilePosition(event.toQ, event.toR);
    unitRenderer.updatePosition(event.unitEid, pos);
  }

  export function handleCombatResolved(
    event: CombatResolvedEvent,
    unitRenderer: UnitRenderer
  ): void {
    // Update health bars if units survive
    // (UnitDestroyedEvent handles removal separately)
  }

  export function handleUnitDestroyed(
    event: UnitDestroyedEvent,
    unitRenderer: UnitRenderer,
    selectionState: SelectionState
  ): void {
    // Deselect if selected
    if (selectionState.isSelected(event.unitEid)) {
      selectionState.deselect();
    }
    unitRenderer.removeUnit(event.unitEid);
  }

  export function handleCityFounded(
    event: CityFoundedEvent,
    cityRenderer: CityRenderer,
    territoryRenderer: TerritoryRenderer
  ): void {
    const pos = new TilePosition(event.q, event.r);
    cityRenderer.createCityGraphic(event.cityEid, pos, event.cityName, event.playerId);
    territoryRenderer.updateTerritoryBorders(
      event.cityEid,
      event.territoryTiles.map(t => new TilePosition(t.q, t.r)),
      event.playerId
    );
  }

  export function handleUnitSpawned(
    event: UnitSpawnedEvent,
    unitRenderer: UnitRenderer
  ): void {
    const pos = new TilePosition(event.q, event.r);
    unitRenderer.createUnitGraphic(event.unitEid, pos, event.unitType, event.playerId);
  }

  export function handleProductionCompleted(
    event: ProductionCompletedEvent,
    cityInfoPanel: CityInfoPanel
  ): void {
    cityInfoPanel.refresh();
  }

  export function handleTurnStarted(
    event: TurnStartedEvent,
    turnControls: TurnControls,
    movementPreview: MovementPreview,
    selectionState: SelectionState
  ): void {
    turnControls.updateTurnDisplay(event.turnNumber);
    // Refresh movement preview for selected unit
    const selectedUnit = selectionState.get();
    if (selectedUnit !== null) {
      // Movement preview refresh handled by selection state subscriber
    }
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/gui/GuiFrontend.ts`:
  ```typescript
  export class GuiFrontend {
    private engine: GameEngine;
    private unitRenderer: UnitRenderer;
    private cityRenderer: CityRenderer;
    private territoryRenderer: TerritoryRenderer;
    private selectionState: SelectionState;
    private cityInfoPanel: CityInfoPanel;
    private turnControls: TurnControls;
    private unsubscribers: Array<() => void> = [];

    constructor(
      engine: GameEngine,
      renderers: {
        unitRenderer: UnitRenderer;
        cityRenderer: CityRenderer;
        territoryRenderer: TerritoryRenderer;
      },
      ui: {
        selectionState: SelectionState;
        cityInfoPanel: CityInfoPanel;
        turnControls: TurnControls;
      }
    ) {
      this.engine = engine;
      // Store all references
    }

    initialize(): void {
      // Subscribe to all relevant events
      this.unsubscribers.push(
        this.engine.on<UnitMovedEvent>('UNIT_MOVED', (e) =>
          handleUnitMoved(e, this.unitRenderer)
        ),
        this.engine.on<CombatResolvedEvent>('COMBAT_RESOLVED', (e) =>
          handleCombatResolved(e, this.unitRenderer)
        ),
        this.engine.on<UnitDestroyedEvent>('UNIT_DESTROYED', (e) =>
          handleUnitDestroyed(e, this.unitRenderer, this.selectionState)
        ),
        this.engine.on<CityFoundedEvent>('CITY_FOUNDED', (e) =>
          handleCityFounded(e, this.cityRenderer, this.territoryRenderer)
        ),
        this.engine.on<UnitSpawnedEvent>('UNIT_SPAWNED', (e) =>
          handleUnitSpawned(e, this.unitRenderer)
        ),
        this.engine.on<ProductionCompletedEvent>('PRODUCTION_COMPLETED', (e) =>
          handleProductionCompleted(e, this.cityInfoPanel)
        ),
        this.engine.on<TurnStartedEvent>('TURN_STARTED', (e) =>
          handleTurnStarted(e, this.turnControls, ...)
        )
      );
    }

    destroy(): void {
      for (const unsub of this.unsubscribers) {
        unsub();
      }
      this.unsubscribers = [];
    }
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/gui/index.ts`:
  - Export GuiFrontend
  - Export event handlers

**Success Criteria**:
- [ ] GuiFrontend subscribes to all game events
- [ ] Event handlers map events to appropriate renderer methods
- [ ] No game logic in event handlers (only rendering calls)
- [ ] Subscriptions are properly cleaned up in destroy()

---

#### Phase 3.2: Remove Renderer Dependencies from Game Logic

**Goal**: Modify existing executors and systems to not call renderers directly.

- [ ] Modify `/Users/alex/workspace/civ/src/unit/MovementSystem.ts`:
  - Remove `unitRenderer` from constructor
  - Remove `this.unitRenderer.updatePosition()` call from `executeMove()`
  - Keep for backward compatibility but mark as `@deprecated`
  - New code should use `GameEngine.executeCommand()` instead
  ```typescript
  // Remove this line:
  // this.unitRenderer.updatePosition(unitEid, target);

  // executeMove now just returns boolean, renderer update happens via event
  ```

- [ ] Modify `/Users/alex/workspace/civ/src/combat/CombatSystem.ts`:
  - Remove `unitRenderer` and `selectionState` from constructor
  - Remove `this.unitRenderer.removeUnit()` call from `removeUnit()`
  - Remove `this.selectionState.deselect()` call from `removeUnit()`
  - Mark as `@deprecated` in favor of commands
  ```typescript
  // removeUnit() should just do ECS cleanup:
  private removeUnit(eid: number): void {
    const playerId = getUnitOwner(eid);
    removeEntity(this.world, eid);
    if (this.playerManager) {
      this.playerManager.checkElimination(this.world, playerId);
    }
    // NO renderer calls - those happen via event handlers
  }
  ```

- [ ] Modify `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:
  - Remove callback pattern, emit events instead
  - Modify `completeProduction()` to return event data instead of calling callback
  - Add method `processTurnEndForEngine()` that returns events
  ```typescript
  // New method for command executor to use:
  processTurnEndForEngine(): GameEventType[] {
    const events: GameEventType[] = [];
    const cities = getAllCities(this.world);
    for (const cityEid of cities) {
      const productionEvents = this.processProductionForEngine(cityEid);
      events.push(...productionEvents);
      const growthEvents = this.processGrowthForEngine(cityEid);
      events.push(...growthEvents);
    }
    return events;
  }
  ```

- [ ] Modify `/Users/alex/workspace/civ/src/city/CityFounder.ts`:
  - Already mostly pure - `foundCity()` takes callback
  - Create `foundCityPure()` that returns city data without callback
  - Keep existing function for backward compatibility

**Success Criteria**:
- [ ] MovementSystem no longer imports UnitRenderer
- [ ] CombatSystem no longer imports UnitRenderer or SelectionState
- [ ] CityProcessor can return events instead of using callbacks
- [ ] CityFounder has pure version without callback requirement
- [ ] Existing tests still pass (backward compatibility)

---

#### Phase 3.3: Wire GuiFrontend in main.ts

**Goal**: Update main.ts to create commands instead of calling executors directly.

- [ ] Modify `/Users/alex/workspace/civ/src/main.ts`:
  1. Create `GameEngine` instance early
  2. Create `GuiFrontend` instance with all renderers
  3. Call `guiFrontend.initialize()` to set up subscriptions
  4. Update right-click handler to create commands:
     ```typescript
     // Instead of:
     // combatExecutor.executeAttack(selectedUnit, hexPos);
     // movementExecutor.executeMove(selectedUnit, hexPos);

     // Use:
     if (combatExecutor.hasEnemyAt(selectedUnit, hexPos)) {
       const defenderEid = getUnitAtPosition(world, hexPos.q, hexPos.r)!;
       const command: AttackCommand = {
         type: 'ATTACK',
         playerId: 0,
         attackerEid: selectedUnit,
         defenderEid,
       };
       const result = engine.executeCommand(command);
       if (!result.success) {
         console.log(`Attack failed: ${result.error}`);
       }
     } else {
       const command: MoveUnitCommand = {
         type: 'MOVE_UNIT',
         playerId: 0,
         unitEid: selectedUnit,
         targetQ: hexPos.q,
         targetR: hexPos.r,
       };
       const result = engine.executeCommand(command);
       if (result.success) {
         // Update selection highlight (still needed locally)
         selectionHighlight.show(hexPos);
         // Movement preview update happens via TurnStarted or manual refresh
       }
     }
     ```
  5. Update B key handler for founding cities:
     ```typescript
     const command: FoundCityCommand = {
       type: 'FOUND_CITY',
       playerId: 0,
       settlerEid: selectedUnit,
     };
     const result = engine.executeCommand(command);
     if (result.success) {
       selectionState.deselect();
     }
     ```
  6. Update production UI callback:
     ```typescript
     onProductionSelected: (cityEid, buildableType) => {
       const command: SetProductionCommand = {
         type: 'SET_PRODUCTION',
         playerId: 0,
         cityEid,
         buildableType,
       };
       engine.executeCommand(command);
     }
     ```
  7. Update end turn to use command:
     ```typescript
     turnControls.onEndTurn(() => {
       const command: EndTurnCommand = {
         type: 'END_TURN',
         playerId: 0,
       };
       engine.executeCommand(command);
     });
     ```

- [ ] Keep existing executors for backward compatibility but delegate to engine commands internally or mark deprecated

**Success Criteria**:
- [ ] All user actions flow through `engine.executeCommand()`
- [ ] GuiFrontend receives events and updates renderers
- [ ] Game plays identically to before
- [ ] No direct executor calls from input handlers

---

#### Phase 3.4: Run E2E Tests and Verify

**Goal**: Ensure no regressions in user-visible behavior.

- [ ] Run all E2E tests:
  - `/Users/alex/workspace/civ/tests/e2e/unit.spec.ts` - Unit selection, movement
  - `/Users/alex/workspace/civ/tests/e2e/combat.spec.ts` - Combat interactions
  - `/Users/alex/workspace/civ/tests/e2e/city.spec.ts` - City founding
  - `/Users/alex/workspace/civ/tests/e2e/production.spec.ts` - Production queue

- [ ] Manual testing checklist:
  - Select unit, see movement preview
  - Right-click to move, unit moves and preview updates
  - Select warrior, attack adjacent enemy, see combat result
  - Select settler, press B, city appears with territory
  - Click city, set production, end turn, unit spawns
  - End turn, movement points reset

**Success Criteria**:
- [ ] All 14 E2E tests pass
- [ ] Manual testing shows identical behavior
- [ ] No console errors during normal gameplay
- [ ] Performance is not degraded (event overhead is minimal)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/engine/commands/types.ts` | Create | Command type definitions |
| `/Users/alex/workspace/civ/src/engine/commands/CommandResult.ts` | Create | Result and validation types |
| `/Users/alex/workspace/civ/src/engine/commands/validators/MoveUnitValidator.ts` | Create | Movement validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/AttackValidator.ts` | Create | Combat validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/FoundCityValidator.ts` | Create | City founding validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/SetProductionValidator.ts` | Create | Production validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/EndTurnValidator.ts` | Create | Turn end validation |
| `/Users/alex/workspace/civ/src/engine/commands/validators/index.ts` | Create | Validator registry |
| `/Users/alex/workspace/civ/src/engine/commands/validators/validators.test.ts` | Create | Validator unit tests |
| `/Users/alex/workspace/civ/src/engine/commands/executors/MoveUnitExecutor.ts` | Create | Movement execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/AttackExecutor.ts` | Create | Combat execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/FoundCityExecutor.ts` | Create | City founding execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/SetProductionExecutor.ts` | Create | Production execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/EndTurnExecutor.ts` | Create | Turn end execution |
| `/Users/alex/workspace/civ/src/engine/commands/executors/index.ts` | Create | Executor registry |
| `/Users/alex/workspace/civ/src/engine/commands/executors/executors.test.ts` | Create | Executor unit tests |
| `/Users/alex/workspace/civ/src/engine/commands/index.ts` | Create | Command module exports |
| `/Users/alex/workspace/civ/src/engine/GameEngine.ts` | Modify | Add executeCommand() method |
| `/Users/alex/workspace/civ/src/engine/GameEngine.executeCommand.test.ts` | Create | Integration tests |
| `/Users/alex/workspace/civ/src/gui/EventHandlers.ts` | Create | Event to renderer mapping |
| `/Users/alex/workspace/civ/src/gui/GuiFrontend.ts` | Create | GUI coordination class |
| `/Users/alex/workspace/civ/src/gui/index.ts` | Create | GUI module exports |
| `/Users/alex/workspace/civ/src/unit/MovementSystem.ts` | Modify | Remove renderer dependency |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Modify | Remove renderer/selection dependency |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Modify | Add event-returning methods |
| `/Users/alex/workspace/civ/src/city/CityFounder.ts` | Modify | Add pure version |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Wire commands and GuiFrontend |

**Total: 20 files to create, 6 files to modify**

---

## Success Criteria

### Phase 2 Success Criteria
- [ ] All 5 command types defined and serializable
- [ ] All 5 validators implemented with comprehensive tests
- [ ] All 5 executors implemented as pure functions with tests
- [ ] `GameEngine.executeCommand()` validates then executes
- [ ] Invalid commands return errors without state changes
- [ ] Successful commands emit appropriate events
- [ ] Integration tests pass for full command flows

### Phase 3 Success Criteria
- [ ] GuiFrontend subscribes to all game events
- [ ] Event handlers update renderers correctly
- [ ] No renderer imports in engine/commands directory
- [ ] All user actions create commands via `executeCommand()`
- [ ] All E2E tests pass
- [ ] Game plays identically to before refactoring

---

## Dependencies & Integration

### Depends On
- **Phase 1 (Complete)**: GameEngine, EventBus, event types, state queries
- **Pathfinder** (`/Users/alex/workspace/civ/src/pathfinding/Pathfinder.ts`): For move validation
- **CombatCalculator** (`/Users/alex/workspace/civ/src/combat/CombatCalculator.ts`): For attack execution
- **TerritoryManager** (`/Users/alex/workspace/civ/src/city/Territory.ts`): For city founding
- **UnitType data** (`/Users/alex/workspace/civ/src/unit/UnitType.ts`): For unit capabilities
- **Buildable types** (`/Users/alex/workspace/civ/src/city/Buildable.ts`): For production validation

### Consumed By (Future Phases)
- **Phase 4: CLI Frontend**: Will call `engine.executeCommand()` directly
- **JSON-RPC Server**: Will expose command execution over network
- **AI Players**: Will construct and execute commands
- **Save/Load**: Will serialize command history
- **Replay System**: Will replay commands

### Integration Points
- **main.ts**: Creates GameEngine, GuiFrontend, wires input to commands
- **SelectionSystem**: May need updates to work with commands (currently handles click->select)
- **TurnControls**: End turn button creates EndTurnCommand
- **ProductionUI**: Production selection creates SetProductionCommand

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing functionality | High | Medium | Incremental changes with E2E tests after each sub-phase |
| Event ordering issues | Medium | Medium | Emit events synchronously in order; test event sequences |
| SelectionState race conditions | Medium | Low | Ensure deselection events are handled before selection |
| Missing renderer updates | High | Medium | Comprehensive manual testing after Phase 3.3 |
| Pathfinder not available in validators | Medium | Low | Add Pathfinder to GameEngine dependencies |
| Backward compatibility issues | Medium | Medium | Keep old methods, mark deprecated, test both paths |

---

## Estimated Effort

| Phase | Sub-Phase | Estimated Hours | Complexity |
|-------|-----------|-----------------|------------|
| 2 | 2.1 Command Types | 0.5 | Low |
| 2 | 2.2 Validators | 2-3 | Medium |
| 2 | 2.3 Executors | 2-3 | Medium |
| 2 | 2.4 GameEngine.executeCommand | 1-2 | Medium |
| 3 | 3.1 GuiFrontend | 2-3 | Medium |
| 3 | 3.2 Remove Renderer Deps | 2-3 | Medium |
| 3 | 3.3 Wire main.ts | 1-2 | Low |
| 3 | 3.4 E2E Verification | 1 | Low |
| **Total** | | **11-17 hours** | |

---

## Open Questions and Decisions

### Resolved in This Plan

1. **Pathfinder ownership**: Add to GameEngine, expose via getter for validators/executors.

2. **SelectionState handling**: Handle via UnitDestroyedEvent handler in GuiFrontend.

3. **Existing executors**: Keep for backward compatibility, mark `@deprecated`.

4. **CityProcessor turn processing**: EndTurnExecutor calls CityProcessor methods and collects events.

### Remaining Open Questions

1. **Player turn validation**: For now, validate playerId === 0 (single player). Multi-player support deferred to Phase 4+.

2. **Error recovery**: No transaction support. If executor throws mid-execution, state may be inconsistent. Mitigation: Executors should not throw; handle errors gracefully.

3. **Event handler errors**: Wrap handlers in try-catch in GuiFrontend.initialize() to prevent one failed handler from blocking others.
