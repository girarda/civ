# Research: CLI Integration Architecture for Claude Code

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research document analyzes the OpenCiv codebase and proposes an architecture that enables Claude Code (or other AI agents) to play the game via a CLI interface while maintaining the existing PixiJS GUI. The proposed architecture separates game logic from presentation through a Command-based action system and a serializable state query layer, following patterns proven successful in the OpenRCT2 Claude integration.

## Key Discoveries

- **Game logic is partially coupled to rendering** - Movement, combat, and city founding logic currently receive renderer instances directly, violating separation of concerns
- **State management is reactive** - `GameState`, `SelectionState`, `HoverState` use subscriber patterns that can be leveraged for state observation
- **bitECS is already headless** - The ECS layer (`world.ts`, `citySystems.ts`, `unitSystems.ts`) has no rendering dependencies and can be queried directly
- **No command abstraction exists** - Actions (move, attack, found city) are directly executed with imperative calls mixed with render updates
- **Turn system hooks exist** - `TurnSystem.ts` provides `onTurnStart`/`onTurnEnd` hooks that can integrate with a command processor
- **Map data is decoupled** - `tileMap: Map<string, GeneratedTile>` is a plain data structure, independent of rendering

## Architecture Overview

### Current Architecture (Tightly Coupled)

```
                    main.ts (monolithic coordinator)
                         |
    +--------------------+--------------------+
    |                    |                    |
    v                    v                    v
  PixiJS             bitECS              UI Panels
(Renderers)         (World)            (HTML DOM)
    |                    |                    |
    +--------------------+--------------------+
                         |
               Mouse/Keyboard Events
```

**Problems:**
1. `MovementExecutor`, `CombatExecutor`, `CityProcessor` all receive `UnitRenderer` directly
2. Input handling (click, right-click, keyboard) directly calls executors and renderers
3. No way to execute game actions programmatically without a canvas
4. State queries require passing `world` instance through many layers

### Proposed Architecture (Decoupled with Command Layer)

```
                       GameEngine
              (Pure Logic, No Rendering)
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
   CommandBus       StateQuery        EventBus
   (Actions)        (Read State)     (Observers)
        |                |                |
        +----------------+----------------+
                         |
        +----------------+----------------+
        |                                 |
        v                                 v
   GUI Frontend                     CLI Frontend
   (PixiJS + DOM)                  (stdin/stdout)
        |                                 |
   Human Player                     Claude Code
```

## Patterns Found

### 1. Command Pattern for Actions

Every game action should be expressed as a serializable command:

```typescript
// src/engine/commands/types.ts
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

### 2. Command Executor (Engine Core)

```typescript
// src/engine/GameEngine.ts
export interface CommandResult {
  success: boolean;
  error?: string;
  events: GameEvent[];
}

export class GameEngine {
  private world: IWorld;
  private tileMap: Map<string, GeneratedTile>;
  private territoryManager: TerritoryManager;
  private gameState: GameState;
  private eventBus: EventBus;

  constructor(config: GameConfig) {
    this.world = createGameWorld();
    // Initialize systems without renderers
  }

  executeCommand(command: GameCommand): CommandResult {
    const validator = this.getValidator(command.type);
    const validation = validator.validate(command, this);

    if (!validation.valid) {
      return { success: false, error: validation.error, events: [] };
    }

    const executor = this.getExecutor(command.type);
    const events = executor.execute(command, this);

    // Emit events for listeners (renderers, CLI output, etc.)
    for (const event of events) {
      this.eventBus.emit(event);
    }

    return { success: true, events };
  }

  // State query methods (detailed below)
  getState(): GameStateSnapshot;
  getUnits(playerId?: number): UnitSnapshot[];
  getCities(playerId?: number): CitySnapshot[];
  getTile(q: number, r: number): TileSnapshot | null;
  getMap(): MapSnapshot;
}
```

### 3. State Query Snapshots (Serializable)

```typescript
// src/engine/state/snapshots.ts
export interface GameStateSnapshot {
  turnNumber: number;
  phase: string; // 'PlayerAction' | 'TurnStart' | 'TurnEnd'
  currentPlayer: number;
  playerCount: number;
}

export interface UnitSnapshot {
  eid: number;
  type: string;           // 'Warrior', 'Scout', 'Settler'
  owner: number;
  position: { q: number; r: number };
  health: { current: number; max: number };
  movement: { current: number; max: number };
  canMove: boolean;
  canAttack: boolean;
  canFoundCity: boolean;  // Settler only
}

export interface CitySnapshot {
  eid: number;
  name: string;
  owner: number;
  position: { q: number; r: number };
  population: number;
  production: {
    currentItem: string | null;
    progress: number;
    cost: number;
    turnsRemaining: number;
  };
  yields: {
    food: number;
    production: number;
    gold: number;
    science: number;
    culture: number;
    faith: number;
  };
  territory: { q: number; r: number }[];
}

export interface TileSnapshot {
  position: { q: number; r: number };
  terrain: string;
  feature: string | null;
  resource: string | null;
  yields: {
    food: number;
    production: number;
    gold: number;
    science: number;
    culture: number;
    faith: number;
  };
  isPassable: boolean;
  movementCost: number;
  owner: number | null;   // City that owns this tile
  hasUnit: boolean;
  hasCity: boolean;
}

export interface MapSnapshot {
  width: number;
  height: number;
  seed: number;
  tiles: TileSnapshot[];  // Or provide query method for large maps
}
```

### 4. Event System for Observers

```typescript
// src/engine/events/types.ts
interface GameEvent {
  type: string;
  timestamp: number;
}

interface UnitMovedEvent extends GameEvent {
  type: 'UNIT_MOVED';
  unitEid: number;
  from: { q: number; r: number };
  to: { q: number; r: number };
  remainingMovement: number;
}

interface CombatResolvedEvent extends GameEvent {
  type: 'COMBAT_RESOLVED';
  attackerEid: number;
  defenderEid: number;
  attackerDamage: number;
  defenderDamage: number;
  attackerSurvives: boolean;
  defenderSurvives: boolean;
}

interface CityFoundedEvent extends GameEvent {
  type: 'CITY_FOUNDED';
  cityEid: number;
  position: { q: number; r: number };
  name: string;
  owner: number;
}

interface UnitSpawnedEvent extends GameEvent {
  type: 'UNIT_SPAWNED';
  unitEid: number;
  unitType: string;
  position: { q: number; r: number };
  owner: number;
}

interface TurnEndedEvent extends GameEvent {
  type: 'TURN_ENDED';
  turnNumber: number;
}

interface TurnStartedEvent extends GameEvent {
  type: 'TURN_STARTED';
  turnNumber: number;
}

type GameEvent =
  | UnitMovedEvent
  | CombatResolvedEvent
  | CityFoundedEvent
  | UnitSpawnedEvent
  | TurnEndedEvent
  | TurnStartedEvent;
```

### 5. CLI Frontend Interface

Following the OpenRCT2 `rctctl` pattern:

```
civctl <resource> <action> [args] [flags]

Resources:
  game        Game state and turn control
  unit        Unit queries and actions
  city        City queries and actions
  map         Map and tile queries
  player      Player information

Common flags:
  -o, --output   Output format: text (default), json
  -p, --player   Filter by player ID

Examples:
  civctl game status
  civctl game end-turn
  civctl unit list
  civctl unit list -p 0
  civctl unit move 1 --to 5,3
  civctl unit attack 1 --target 2
  civctl city list
  civctl city 1 production set warrior
  civctl map tile 5,3
  civctl map tiles --range 3,3,2
```

```typescript
// src/cli/civctl.ts
import { GameEngine } from '../engine/GameEngine';
import { Command as CliCommand } from 'commander';

const program = new CliCommand();

program
  .name('civctl')
  .description('CLI interface for OpenCiv')
  .version('0.1.0');

// Game commands
program
  .command('game')
  .description('Game state and turn control')
  .addCommand(
    new CliCommand('status')
      .description('Show current game status')
      .action(() => {
        const state = engine.getState();
        console.log(`Turn: ${state.turnNumber}`);
        console.log(`Phase: ${state.phase}`);
        console.log(`Current Player: ${state.currentPlayer}`);
      })
  )
  .addCommand(
    new CliCommand('end-turn')
      .description('End the current turn')
      .action(() => {
        const result = engine.executeCommand({ type: 'END_TURN', playerId: 0 });
        if (result.success) {
          console.log('Turn ended.');
        } else {
          console.error(`Error: ${result.error}`);
        }
      })
  );

// Unit commands
program
  .command('unit')
  .description('Unit queries and actions')
  .addCommand(
    new CliCommand('list')
      .description('List units')
      .option('-p, --player <id>', 'Filter by player ID')
      .option('-o, --output <format>', 'Output format', 'text')
      .action((opts) => {
        const units = engine.getUnits(opts.player ? parseInt(opts.player) : undefined);
        if (opts.output === 'json') {
          console.log(JSON.stringify(units, null, 2));
        } else {
          for (const unit of units) {
            console.log(`[${unit.eid}] ${unit.type} at (${unit.position.q},${unit.position.r}) HP:${unit.health.current}/${unit.health.max} MP:${unit.movement.current}/${unit.movement.max}`);
          }
        }
      })
  )
  .addCommand(
    new CliCommand('move <eid>')
      .description('Move a unit')
      .requiredOption('--to <q,r>', 'Target position')
      .action((eid, opts) => {
        const [q, r] = opts.to.split(',').map(Number);
        const result = engine.executeCommand({
          type: 'MOVE_UNIT',
          playerId: 0,
          unitEid: parseInt(eid),
          targetQ: q,
          targetR: r,
        });
        if (result.success) {
          console.log(`Unit ${eid} moved to (${q},${r})`);
        } else {
          console.error(`Error: ${result.error}`);
        }
      })
  );

program.parse();
```

### 6. JSON-RPC Protocol (Alternative to CLI)

For tighter integration (like OpenRCT2), a TCP JSON-RPC server:

```typescript
// src/rpc/server.ts
import * as net from 'net';
import { GameEngine } from '../engine/GameEngine';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export class GameRpcServer {
  private engine: GameEngine;
  private server: net.Server;

  constructor(engine: GameEngine, port: number = 9876) {
    this.engine = engine;
    this.server = net.createServer((socket) => this.handleConnection(socket));
    this.server.listen(port);
  }

  private handleConnection(socket: net.Socket): void {
    socket.on('data', (data) => {
      const request: JsonRpcRequest = JSON.parse(data.toString());
      const response = this.handleRequest(request);
      socket.write(JSON.stringify(response) + '\n');
    });
  }

  private handleRequest(request: JsonRpcRequest): JsonRpcResponse {
    try {
      const result = this.dispatch(request.method, request.params);
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32000, message: (error as Error).message },
      };
    }
  }

  private dispatch(method: string, params: unknown): unknown {
    switch (method) {
      case 'game.status':
        return this.engine.getState();
      case 'game.endTurn':
        return this.engine.executeCommand({ type: 'END_TURN', playerId: 0 });
      case 'unit.list':
        return this.engine.getUnits((params as { playerId?: number })?.playerId);
      case 'unit.move':
        return this.engine.executeCommand({
          type: 'MOVE_UNIT',
          playerId: 0,
          ...(params as { unitEid: number; targetQ: number; targetR: number }),
        });
      // ... more methods
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}
```

## Key Files

### Current Files Requiring Modification

| File | Current Role | Required Changes |
|------|--------------|------------------|
| `/Users/alex/workspace/civ/src/main.ts` | Monolithic coordinator | Extract engine initialization to `GameEngine`, keep as GUI frontend only |
| `/Users/alex/workspace/civ/src/unit/MovementSystem.ts` | Movement with renderer | Remove renderer dependency, return events instead |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Combat with renderer | Remove renderer dependency, return events instead |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Production with callbacks | Convert callbacks to events |
| `/Users/alex/workspace/civ/src/city/CityFounder.ts` | City founding | Remove entity removal from renderer |
| `/Users/alex/workspace/civ/src/game/GameState.ts` | Turn state | Add snapshot export method |
| `/Users/alex/workspace/civ/src/game/TurnSystem.ts` | Turn orchestration | Integrate with command processor |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/engine/GameEngine.ts` | Core game engine with command execution |
| `src/engine/commands/types.ts` | Command type definitions |
| `src/engine/commands/validators/` | Command validation logic |
| `src/engine/commands/executors/` | Command execution logic |
| `src/engine/state/snapshots.ts` | Serializable state snapshot types |
| `src/engine/state/queries.ts` | State query implementations |
| `src/engine/events/types.ts` | Event type definitions |
| `src/engine/events/EventBus.ts` | Event publication/subscription |
| `src/cli/civctl.ts` | CLI entry point |
| `src/cli/commands/` | CLI command handlers |
| `src/rpc/server.ts` | JSON-RPC server (optional) |
| `src/gui/GuiFrontend.ts` | GUI-specific code extracted from main.ts |

## Implementation Strategy

### Phase 1: Extract Engine Core (Foundation)

**Goal**: Create `GameEngine` class that holds all game state and logic, independent of rendering.

1. Create `src/engine/GameEngine.ts` with state containers
2. Move ECS world, tileMap, territoryManager into engine
3. Create state snapshot methods (`getState()`, `getUnits()`, etc.)
4. Add EventBus for observers
5. **Test**: Unit tests for state queries

**Estimated effort**: 4-6 hours

### Phase 2: Command Layer

**Goal**: Replace direct method calls with command objects.

1. Define command types in `src/engine/commands/types.ts`
2. Create validators for each command type
3. Create executors that modify state and emit events
4. Wire `executeCommand()` method in GameEngine
5. **Test**: Unit tests for command validation and execution

**Estimated effort**: 6-8 hours

### Phase 3: Decouple Renderers

**Goal**: Make renderers react to events rather than being called directly.

1. Modify `MovementExecutor` to return events, not call renderer
2. Modify `CombatExecutor` to return events
3. Modify `CityProcessor` to emit events
4. Create `GuiFrontend` that subscribes to EventBus
5. Renderer calls happen in event handlers
6. **Test**: E2E tests still pass with new architecture

**Estimated effort**: 4-6 hours

### Phase 4: CLI Frontend

**Goal**: Create command-line interface for game interaction.

1. Add `commander` package dependency
2. Create `civctl` entry point
3. Implement resource commands (game, unit, city, map)
4. Add JSON output mode for machine consumption
5. **Test**: CLI commands work headlessly

**Estimated effort**: 4-6 hours

### Phase 5: Integration Testing

**Goal**: Verify both frontends can control the same game.

1. Create test scenario: CLI moves unit, GUI shows update
2. Create test scenario: GUI founds city, CLI queries it
3. Document Claude Code integration workflow
4. **Test**: Both frontends remain synchronized

**Estimated effort**: 2-4 hours

## Comparison: Approaches

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **CLI subprocess** | Simple, battle-tested | Startup overhead per command | Quick prototyping |
| **JSON-RPC server** | Low latency, bidirectional | Requires server management | Real-time AI play |
| **Shared library (WASM)** | Zero overhead | Complex build, no TypeScript | Performance-critical |
| **In-process Node.js** | Direct access, no serialization | Tightly coupled | Testing, scripting |

**Recommendation**: Start with **CLI subprocess** for simplicity. Add **JSON-RPC** later if latency becomes an issue for Claude Code's game loop.

## Claude Code Integration Workflow

### Option A: CLI via Bash Tool

Claude Code uses its Bash tool to execute `civctl` commands:

```markdown
Claude Code can play OpenCiv by:

1. Query game state: `civctl game status -o json`
2. List available units: `civctl unit list -p 0 -o json`
3. Analyze options and decide action
4. Execute action: `civctl unit move 1 --to 5,3`
5. Observe result from stdout
6. Repeat until turn complete
7. End turn: `civctl game end-turn`
```

### Option B: CLAUDE.md Instructions

Add to CLAUDE.md:

```markdown
## Playing OpenCiv

OpenCiv can be played via the CLI:

### Query Commands
- `civctl game status` - Get turn number, phase, current player
- `civctl unit list -p 0` - List your units
- `civctl city list -p 0` - List your cities
- `civctl map tile Q,R` - Get tile information

### Action Commands
- `civctl unit move EID --to Q,R` - Move unit
- `civctl unit attack EID --target DEFENDER_EID` - Attack
- `civctl unit found-city EID` - Found city with Settler
- `civctl city EID production set TYPE` - Set city production
- `civctl game end-turn` - End your turn

### Strategy Tips
- Scout the map early
- Found cities on high-yield tiles
- Build Warriors for defense
- Attack enemies when advantageous

Use `-o json` flag for structured output.
```

## Trade-offs and Considerations

### 1. Serialization Overhead

**Issue**: Converting ECS component arrays to snapshot objects adds CPU cost.

**Mitigation**:
- Cache snapshots, invalidate on state change
- Lazy computation for rarely-queried data
- For CLI, overhead is negligible compared to process startup

### 2. Event vs Callback Pattern

**Issue**: Current code uses callbacks for production completion.

**Decision**: Convert to events for consistency. Events are:
- Serializable (can be logged, replayed)
- Decoupled (emitter doesn't know subscribers)
- Testable (verify events emitted without mocking)

### 3. Command Validation Timing

**Issue**: Should commands be validated immediately or on execution?

**Decision**: Validate on execution. Reasons:
- State may change between creation and execution
- Simplifies command creation (no async validation)
- Error returned from `executeCommand()` is clear

### 4. Turn Advancement

**Issue**: Who controls turn advancement in CLI mode?

**Decision**: Explicit `END_TURN` command required. The engine doesn't auto-advance. This matches human play and gives Claude Code full control.

### 5. Multi-Player Support

**Issue**: Current architecture assumes single active player.

**Decision**: Add `playerId` to all commands. Engine validates player has control during their turn. Future multiplayer will need authentication.

## UI/CLI Alignment

This section addresses how to ensure the UI (PixiJS + DOM) and CLI frontends stay aligned as the game evolves, preventing feature drift where one interface supports capabilities the other lacks.

### Current State Analysis

The codebase currently has no abstraction between game logic and UI:

| Action | GUI Implementation | CLI Equivalent |
|--------|-------------------|----------------|
| Move Unit | `MovementExecutor.executeMove()` with `UnitRenderer` | Does not exist |
| Attack | `CombatExecutor.executeAttack()` with `UnitRenderer` | Does not exist |
| Found City | `CityFounder.foundCity()` with renderer callbacks | Does not exist |
| End Turn | Direct `GameState.nextTurn()` call | Does not exist |
| Set Production | `CityProcessor.setProduction()` | Does not exist |

**Risk**: Without intervention, adding CLI would require duplicating logic or creating parallel code paths.

### Recommended Pattern: Single Source of Truth

**Core Principle**: Both frontends should consume the same `GameEngine` API. Neither should have direct access to internals.

```
                     GameEngine
                    (Source of Truth)
                          |
            +-------------+-------------+
            |             |             |
        Commands      Queries       Events
            |             |             |
    +-------+-------+     |     +-------+-------+
    |               |     |     |               |
GUI Frontend   CLI Frontend     GUI Frontend   CLI Frontend
(translator)   (translator)    (subscriber)   (subscriber)
```

### Shared Interfaces

#### 1. Command Interface (Actions)

```typescript
// src/engine/commands/types.ts - THE source of truth for all actions
export type GameCommand =
  | MoveUnitCommand
  | AttackCommand
  | FoundCityCommand
  | SetProductionCommand
  | EndTurnCommand;

// Both GUI and CLI translate user intent into these commands
```

**Enforcement**:
- GUI input handlers create commands, pass to `engine.executeCommand()`
- CLI parses arguments, creates same command types, passes to same method
- If a new action is added, TypeScript compiler forces both frontends to handle it

#### 2. Query Interface (State)

```typescript
// src/engine/state/queries.ts - THE source of truth for state queries
export interface GameQueries {
  getState(): GameStateSnapshot;
  getUnits(filter?: UnitFilter): UnitSnapshot[];
  getCities(filter?: CityFilter): CitySnapshot[];
  getTile(q: number, r: number): TileSnapshot | null;
  getValidMoves(unitEid: number): TilePosition[];
  getValidAttacks(unitEid: number): number[]; // enemy eids
}
```

**Enforcement**:
- GUI reads state through queries to update visuals
- CLI uses same queries to output text/JSON
- Adding a new query requires no frontend changes (optional consumption)

#### 3. Event Interface (Notifications)

```typescript
// src/engine/events/types.ts - THE source of truth for state changes
export type GameEvent =
  | UnitMovedEvent
  | CombatResolvedEvent
  | CityFoundedEvent
  | UnitSpawnedEvent
  | TurnEndedEvent;
```

**Enforcement**:
- GUI subscribes to events for rendering updates
- CLI subscribes for output feedback
- New events can be ignored by frontends until they choose to handle them

### Type Safety Patterns

#### Exhaustive Switch Enforcement

```typescript
// src/cli/commands/index.ts
function handleCommand(cmd: GameCommand): void {
  switch (cmd.type) {
    case 'MOVE_UNIT':
      // ...
      break;
    case 'ATTACK':
      // ...
      break;
    case 'FOUND_CITY':
      // ...
      break;
    case 'SET_PRODUCTION':
      // ...
      break;
    case 'END_TURN':
      // ...
      break;
    default:
      // TypeScript error if a command type is not handled
      const _exhaustive: never = cmd;
      throw new Error(`Unhandled command: ${_exhaustive}`);
  }
}
```

**Benefit**: Adding a new command type to `GameCommand` union causes TypeScript errors in any switch that doesn't handle it.

#### Schema Validation (Optional)

For external consumption (Claude Code, mods), consider Zod schemas:

```typescript
// src/engine/schemas.ts
import { z } from 'zod';

export const MoveUnitCommandSchema = z.object({
  type: z.literal('MOVE_UNIT'),
  playerId: z.number(),
  unitEid: z.number(),
  targetQ: z.number(),
  targetR: z.number(),
});

export const GameCommandSchema = z.discriminatedUnion('type', [
  MoveUnitCommandSchema,
  AttackCommandSchema,
  // ...
]);
```

**Benefit**: Runtime validation for CLI input, JSON-RPC, or file-based commands.

### Testing Strategies for Drift Detection

#### 1. Shared Test Cases

Create test cases that run against both frontends:

```typescript
// tests/shared/scenarios.ts
export interface TestScenario {
  name: string;
  setup: (engine: GameEngine) => void;
  actions: GameCommand[];
  expectedState: Partial<GameStateSnapshot>;
}

export const scenarios: TestScenario[] = [
  {
    name: 'unit moves and attacks',
    setup: (engine) => { /* spawn units */ },
    actions: [
      { type: 'MOVE_UNIT', playerId: 0, unitEid: 1, targetQ: 1, targetR: 0 },
      { type: 'ATTACK', playerId: 0, attackerEid: 1, defenderEid: 2 },
    ],
    expectedState: { /* ... */ },
  },
];

// tests/gui/scenarios.spec.ts - Run scenarios via GUI clicks
// tests/cli/scenarios.spec.ts - Run scenarios via CLI commands
```

#### 2. Feature Parity Tests

```typescript
// tests/parity/features.test.ts
describe('Feature Parity', () => {
  const guiActions = extractActionsFromGuiHandlers();  // Parse GUI code
  const cliActions = extractActionsFromCliCommands();  // Parse CLI code

  it('GUI and CLI support the same actions', () => {
    expect(guiActions.sort()).toEqual(cliActions.sort());
  });
});
```

#### 3. Contract Tests

```typescript
// tests/contracts/command-results.test.ts
describe('Command Result Contracts', () => {
  for (const commandType of getAllCommandTypes()) {
    it(`${commandType} returns consistent result shape`, () => {
      const guiResult = executeViaGui(commandType, validArgs);
      const cliResult = executeViaCli(commandType, validArgs);

      expect(guiResult.success).toBe(cliResult.success);
      expect(guiResult.events.map(e => e.type)).toEqual(
        cliResult.events.map(e => e.type)
      );
    });
  }
});
```

### Code Generation Approaches

#### 1. Generate CLI from Command Types

```typescript
// scripts/generate-cli.ts
import { GameCommandSchema } from '../src/engine/schemas';

function generateCliCommand(commandType: string, schema: ZodSchema) {
  const fields = extractFields(schema);
  return `
program
  .command('${toKebabCase(commandType)}')
  ${fields.map(f => `.option('--${f.name} <value>', '${f.description}')`).join('\n  ')}
  .action((opts) => {
    const cmd = ${commandType}Schema.parse(opts);
    engine.executeCommand(cmd);
  });
`;
}
```

**Benefit**: CLI commands auto-generated from schema, always in sync.

#### 2. Generate TypeScript from Schema

If using an external schema format (OpenAPI, JSON Schema):

```yaml
# openapi/commands.yaml
components:
  schemas:
    MoveUnitCommand:
      type: object
      properties:
        type: { const: 'MOVE_UNIT' }
        unitEid: { type: integer }
        targetQ: { type: integer }
        targetR: { type: integer }
```

Run `openapi-typescript` to generate types used by both frontends.

### Preventing Feature Drift

| Strategy | Effort | Effectiveness | When to Use |
|----------|--------|---------------|-------------|
| Shared command types | Low | High | Always |
| Exhaustive switches | Low | High | Always |
| Shared test scenarios | Medium | High | When test suite exists |
| Code generation | Medium | Very High | When adding many commands |
| Contract tests | High | Very High | Before releases |
| Schema validation | Low | Medium | For external consumers |

**Recommended Minimum**:
1. Shared `GameCommand` union with exhaustive switch in both frontends
2. Shared `TestScenario` definitions run against both frontends
3. CI check that all command types appear in both frontend codebases

### Architecture Decision Record

**ADR-001: Single Command Interface**

**Context**: We need both GUI and CLI to execute game actions.

**Decision**: All game actions flow through `GameEngine.executeCommand(cmd: GameCommand)`.

**Consequences**:
- (+) Single point of validation and execution
- (+) TypeScript ensures both frontends handle all commands
- (+) Commands are serializable for logging, replay, save/load
- (-) GUI must translate mouse events to command objects
- (-) Small overhead for command object creation

**Status**: Proposed

---

## Testing Strategy: CLI vs Playwright

This section analyzes whether the proposed CLI architecture is useful for acceptance testing, comparing it with the existing Playwright e2e test approach.

### Current Testing Landscape

#### Unit Tests (Vitest)

**Location**: `src/**/*.test.ts` (27 files, ~724 test cases)

**Characteristics**:
- Fast execution (~1-5 seconds total)
- Test isolated logic (pathfinding, combat calculation, ECS queries)
- Mock renderers and external dependencies
- Example: `CombatSystem.test.ts` tests attack validation and damage calculation

**Strengths**:
- Fast feedback loop
- Easy to write and maintain
- High coverage of pure logic

**Limitations**:
- Cannot test user flows
- Mock renderers may not reflect real behavior
- No visual verification

#### E2E Tests (Playwright)

**Location**: `tests/e2e/*.spec.ts` (12 files, ~92 test cases)

**Characteristics**:
- Slow execution (~2-4 minutes in CI, 30-60 seconds locally)
- Test real browser with real rendering
- Interact via mouse clicks and keyboard events
- Example: `combat.spec.ts` clicks canvas positions to trigger attacks

**Current Playwright Test Patterns**:

```typescript
// Typical test structure
test('unit can move after turn advances', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas', { state: 'visible' });
  await page.waitForTimeout(1000);  // Wait for game init

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();

  // Click to select unit (approximate position)
  await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await page.waitForTimeout(200);

  // Right-click to move
  await canvas.click({
    button: 'right',
    position: { x: box!.width / 2 + 50, y: box!.height / 2 },
  });

  // Verify no crash (implicit success)
  await expect(canvas).toBeVisible();
});
```

**Observed Problems in Current E2E Tests**:

1. **Position-based clicking**: Tests click approximate screen coordinates, hoping a unit is there
2. **Timing dependencies**: Heavy use of `waitForTimeout(1000)` instead of proper assertions
3. **Implicit assertions**: Many tests just verify "no crash" rather than expected outcomes
4. **Flakiness risk**: Random map generation means units spawn in different positions
5. **No state verification**: Cannot query "did the unit actually move?" directly

### CLI Testing: A New Paradigm

With the proposed CLI architecture, tests could execute via command interface:

```typescript
// tests/cli/unit-movement.test.ts
describe('Unit Movement via CLI', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine({ seed: 12345 });  // Deterministic
  });

  it('unit moves to valid position', () => {
    const units = engine.getUnits({ playerId: 0 });
    const warrior = units.find(u => u.type === 'Warrior');

    const result = engine.executeCommand({
      type: 'MOVE_UNIT',
      playerId: 0,
      unitEid: warrior.eid,
      targetQ: warrior.position.q + 1,
      targetR: warrior.position.r,
    });

    expect(result.success).toBe(true);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'UNIT_MOVED' })
    );

    // Verify state change
    const updatedUnit = engine.getUnits({ eid: warrior.eid })[0];
    expect(updatedUnit.position.q).toBe(warrior.position.q + 1);
    expect(updatedUnit.movement.current).toBeLessThan(warrior.movement.max);
  });

  it('unit cannot move to impassable terrain', () => {
    const result = engine.executeCommand({
      type: 'MOVE_UNIT',
      playerId: 0,
      unitEid: 1,
      targetQ: mountainTile.q,
      targetR: mountainTile.r,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('impassable');
  });
});
```

### Comparison Matrix

| Aspect | Playwright E2E | CLI/Engine Tests | Unit Tests |
|--------|---------------|------------------|------------|
| **Speed** | Slow (2-4 min) | Fast (1-5 sec) | Fastest (<1 sec) |
| **Determinism** | Low (visual, timing) | High (seeded) | Highest |
| **State Verification** | Hard (DOM/visual) | Easy (queries) | Easy (mocks) |
| **User Flow Testing** | Native | Simulated | N/A |
| **Visual Regression** | Yes | No | No |
| **Browser Quirks** | Catches them | Misses them | Misses them |
| **Maintenance** | High (selectors break) | Low (API stable) | Low |
| **Coverage Scope** | Full stack | Logic + Integration | Isolated logic |
| **CI Cost** | High (browser, time) | Low | Minimal |
| **Debugging** | Hard (screenshots) | Easy (logs, state) | Easiest |

### Verdict: CLI Testing is Valuable, Not a Replacement

**CLI/Engine testing is better than Playwright for**:
- Game logic validation (rules, state transitions)
- Edge case exploration (invalid moves, boundary conditions)
- Performance testing (execute 1000 turns)
- Regression testing (deterministic, fast)
- AI behavior testing (Claude Code strategies)

**Playwright remains necessary for**:
- Visual rendering verification (do units appear on screen?)
- Browser compatibility (WebGL, event handling)
- Real user flow simulation (mouse/keyboard)
- Performance perception (does it feel responsive?)
- Accessibility testing (keyboard navigation)

### Recommended Testing Pyramid

```
                    /\
                   /  \
                  / E2E \ (Playwright)
                 / (few) \
                +--------+
               /          \
              / Integration \ (CLI/Engine)
             /   (medium)    \
            +----------------+
           /                  \
          /      Unit Tests    \ (Vitest)
         /        (many)        \
        +------------------------+
```

**Recommended distribution**:
- **Unit tests (70%)**: Pure logic, calculations, data structures
- **CLI/Engine tests (25%)**: Game rules, command validation, state transitions
- **Playwright E2E (5%)**: Critical user paths, visual smoke tests

### CLI-Enabled Testing Patterns

#### 1. Property-Based Testing

```typescript
// tests/properties/movement.property.test.ts
import { fc } from 'fast-check';

describe('Movement Properties', () => {
  it('movement never exceeds max points in one turn', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),  // number of moves
        (moveCount) => {
          const engine = new GameEngine({ seed: 42 });
          const unit = engine.getUnits()[0];

          for (let i = 0; i < moveCount; i++) {
            const moves = engine.getValidMoves(unit.eid);
            if (moves.length === 0) break;
            engine.executeCommand({
              type: 'MOVE_UNIT',
              playerId: 0,
              unitEid: unit.eid,
              targetQ: moves[0].q,
              targetR: moves[0].r,
            });
          }

          const finalUnit = engine.getUnits({ eid: unit.eid })[0];
          return finalUnit.movement.current >= 0;
        }
      )
    );
  });
});
```

**Benefit**: Explores edge cases automatically, impossible with Playwright.

#### 2. Fuzz Testing

```typescript
// tests/fuzz/command-fuzzer.test.ts
describe('Command Fuzzer', () => {
  it('engine handles malformed commands gracefully', () => {
    const engine = new GameEngine();

    for (let i = 0; i < 1000; i++) {
      const randomCommand = generateRandomCommand();

      // Should never throw, only return error results
      expect(() => {
        engine.executeCommand(randomCommand);
      }).not.toThrow();
    }
  });
});
```

**Benefit**: Tests robustness against unexpected input, security testing.

#### 3. AI Behavior Testing

```typescript
// tests/ai/strategy.test.ts
describe('AI Strategy Validation', () => {
  it('aggressive AI attacks when advantageous', () => {
    const engine = new GameEngine({ seed: 100 });
    setupScenario(engine, 'flanking_opportunity');

    const decision = aggressiveAI.decideAction(engine.getState());

    expect(decision.type).toBe('ATTACK');
    expect(decision.targetEid).toBe(weakDefender.eid);
  });

  it('defensive AI retreats when outnumbered', () => {
    const engine = new GameEngine({ seed: 200 });
    setupScenario(engine, 'outnumbered_3_to_1');

    const decision = defensiveAI.decideAction(engine.getState());

    expect(decision.type).toBe('MOVE_UNIT');
    expect(distance(decision.target, enemyUnits)).toBeGreaterThan(2);
  });
});
```

**Benefit**: Test Claude Code's decision-making logic directly.

#### 4. Simulation/Monte Carlo Testing

```typescript
// tests/simulation/balance.test.ts
describe('Game Balance', () => {
  it('neither player wins >60% of games from equal start', () => {
    const results = { player0: 0, player1: 0, draws: 0 };

    for (let i = 0; i < 100; i++) {
      const winner = simulateGame(new GameEngine({ seed: i }), randomAI, randomAI);
      results[winner]++;
    }

    expect(results.player0).toBeGreaterThan(20);
    expect(results.player1).toBeGreaterThan(20);
  });
});
```

**Benefit**: Balance testing at scale, impossible with manual/Playwright tests.

### Migration Strategy

#### Phase 1: Keep Existing Playwright Tests (Now)

- Current 92 tests continue running
- Fix flaky tests with better selectors/waits
- Add deterministic seed to reduce randomness

#### Phase 2: Add CLI/Engine Tests (After Engine Extraction)

- Write new tests against `GameEngine` API
- Cover all command validations
- Cover state transitions
- Target: 50+ engine tests in first iteration

#### Phase 3: Reduce Playwright to Smoke Tests (Future)

- Keep ~10-15 critical path tests
- Focus on visual rendering, not game logic
- Run expensive Playwright tests on release branches only

#### Phase 4: Advanced Testing (Optional)

- Property-based testing for rule invariants
- Fuzz testing for robustness
- AI simulation for balance tuning

### Cost-Benefit Summary

| Investment | Effort | Benefit | ROI |
|------------|--------|---------|-----|
| Extract GameEngine | High (20-30 hrs) | Enables all CLI testing | High |
| CLI command tests | Medium (10-15 hrs) | Fast, deterministic, thorough | Very High |
| Property-based tests | Low (2-4 hrs) | Edge case discovery | High |
| Reduce Playwright suite | Low (2-3 hrs) | Faster CI, less flakiness | Medium |
| Fuzz testing | Low (1-2 hrs) | Security, robustness | Medium |
| AI simulation testing | Medium (5-10 hrs) | Balance tuning | Context-dependent |

### Recommendations

1. **Do not replace Playwright entirely** - Keep a small set of visual smoke tests
2. **Invest heavily in CLI/Engine tests** - They provide the best coverage-to-cost ratio
3. **Use seeded random generation** - Makes all tests deterministic
4. **Add property-based tests for rules** - Movement, combat, production rules are perfect candidates
5. **Consider fuzz testing for security** - Important if CLI is exposed externally
6. **Delay AI simulation until gameplay is stable** - Premature optimization otherwise

---

## Open Questions

1. **Fog of War**: Should CLI queries respect visibility, or is it a "debug" interface with full map access?
   - Recommendation: Full access for now. Add visibility filtering later.

2. **Action Animation**: CLI doesn't need animations. Should GUI animations be optional?
   - Recommendation: GUI can animate based on events. Engine doesn't care.

3. **Undo/Redo**: Should command history enable undo?
   - Recommendation: Not for MVP. Would require state snapshots.

4. **Save/Load**: Should game state be serializable to file?
   - Recommendation: Yes, essential for resuming games. Command log replay is bonus.

5. **Replay**: Should command log enable game replay?
   - Recommendation: Nice-to-have. Requires deterministic RNG seeding.

6. **Performance**: How does CLI overhead scale with game size?
   - Recommendation: Benchmark with 100 units, 20 cities. Optimize if needed.

## Appendix: Directory Structure After Implementation

```
src/
  engine/
    GameEngine.ts           # Core engine class
    commands/
      types.ts              # Command type definitions
      validators/
        MoveUnitValidator.ts
        AttackValidator.ts
        FoundCityValidator.ts
        SetProductionValidator.ts
        EndTurnValidator.ts
      executors/
        MoveUnitExecutor.ts
        AttackExecutor.ts
        FoundCityExecutor.ts
        SetProductionExecutor.ts
        EndTurnExecutor.ts
    state/
      snapshots.ts          # Snapshot type definitions
      queries.ts            # State query implementations
    events/
      types.ts              # Event type definitions
      EventBus.ts           # Event pub/sub
    index.ts                # Engine exports

  cli/
    civctl.ts               # CLI entry point
    commands/
      game.ts               # game subcommands
      unit.ts               # unit subcommands
      city.ts               # city subcommands
      map.ts                # map subcommands
    formatters/
      text.ts               # Human-readable output
      json.ts               # JSON output
    index.ts                # CLI exports

  rpc/                      # Optional JSON-RPC server
    server.ts
    handlers.ts

  gui/
    GuiFrontend.ts          # GUI-specific coordination
    EventHandlers.ts        # Event -> Renderer mapping

  # Existing directories remain, with reduced responsibilities:
  ecs/                      # Pure ECS components and queries (no render)
  game/                     # GameState, TurnPhase (no render)
  city/                     # City logic (no render)
  unit/                     # Unit logic (no render)
  combat/                   # Combat calculation (no render)
  tile/                     # Terrain, yields (unchanged)
  hex/                      # Hex math (unchanged)
  map/                      # Map generation (unchanged)
  pathfinding/              # Pathfinding (unchanged)

  render/                   # PixiJS renderers (subscribe to events)
  ui/                       # HTML panels (subscribe to events)

  main.ts                   # Thin bootstrap, initializes GUI frontend
```

## Conclusion

The proposed architecture cleanly separates game logic from presentation by introducing:

1. **GameEngine** - Single source of truth for game state
2. **Commands** - Serializable action requests with validation
3. **Events** - Observable state changes for any frontend
4. **Snapshots** - Serializable state queries for external tools

This enables Claude Code to play OpenCiv via CLI while humans can simultaneously observe or interact via the GUI. The implementation can be phased over approximately 20-30 hours of development effort, with each phase delivering testable, incremental value.

The patterns mirror the successful OpenRCT2 Claude integration while being adapted for TypeScript, bitECS, and the existing OpenCiv architecture.

The additional sections on UI/CLI alignment and testing strategy provide concrete patterns for keeping both frontends synchronized and leveraging the CLI architecture for superior acceptance testing compared to browser-based approaches alone.
