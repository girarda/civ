# Research: CLI Integration Architecture - Phase 4 (CLI Frontend)

**Date**: 2026-01-18
**Status**: Complete

## Summary

Phase 4 of the CLI Integration Architecture focuses on creating `civctl`, a command-line interface that enables programmatic game interaction (for Claude Code or other AI agents) through the GameEngine API. This research documents the prerequisites, dependencies, implementation patterns, and detailed specifications for the CLI frontend. Phase 4 depends on Phases 2 and 3, which are not yet implemented.

## Key Discoveries

- **Phase 1 is complete**: `GameEngine`, `EventBus`, snapshots, and state queries are fully implemented
- **Phases 2-3 are NOT implemented**: Command layer and decoupled renderers do not exist yet
- **No CLI package exists**: `commander` or similar CLI framework is not in dependencies
- **GameEngine provides query methods**: `getState()`, `getUnits()`, `getCities()`, `getTile()`, `getMap()` are ready
- **EventBus supports subscriptions**: CLI can subscribe to game events for output
- **Snapshots are JSON-serializable**: All state queries return serializable objects
- **No executeCommand method exists**: GameEngine currently has no command execution (Phase 2 required)
- **Build system uses Vite**: CLI will need separate entry point or bundling strategy

## Architecture Overview

### Current State (Phase 1 Complete)

```
                    GameEngine (src/engine/)
                         |
         +---------------+---------------+
         |               |               |
    EventBus       State Queries    [No Commands]
    (Complete)       (Complete)     (Phase 2 needed)
         |               |
    subscribers     snapshots
```

### Target State (After Phase 4)

```
                    GameEngine
                         |
         +---------------+---------------+---------------+
         |               |               |               |
    EventBus       State Queries    Commands        CLI Frontend
    (Complete)       (Complete)    (Phase 2)        (Phase 4)
                                       |                |
                                   executors       civctl binary
                                       |                |
                                    events          stdin/stdout
```

### Phase 4 Dependencies

| Prerequisite | Status | Required For |
|--------------|--------|--------------|
| Phase 1: Engine Core | COMPLETE | State queries, EventBus |
| Phase 2: Command Layer | NOT STARTED | executeCommand() method |
| Phase 3: Decouple Renderers | NOT STARTED | Headless operation |
| `commander` package | NOT INSTALLED | CLI argument parsing |

## Patterns Found

### 1. GameEngine Query API (Available Now)

The `GameEngine` class at `/Users/alex/workspace/civ/src/engine/GameEngine.ts` provides:

```typescript
// State queries - all return JSON-serializable snapshots
getState(): GameStateSnapshot
getUnits(playerId?: number): UnitSnapshot[]
getUnit(eid: number): UnitSnapshot | null
getCities(playerId?: number): CitySnapshot[]
getCity(eid: number): CitySnapshot | null
getTile(q: number, r: number): TileSnapshot | null
getMap(): MapSnapshot
getUnitAtPosition(q: number, r: number): UnitSnapshot | null
getCityAtPosition(q: number, r: number): CitySnapshot | null
getCompleteSnapshot(): CompleteGameSnapshot

// Event subscriptions
on<T>(eventType: string, handler: (event: T) => void): () => void
onAny(handler: (event: GameEventType) => void): () => void
getEventBus(): EventBus
```

### 2. Snapshot Types (Available for CLI Output)

From `/Users/alex/workspace/civ/src/engine/state/snapshots.ts`:

```typescript
interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;  // 'TurnStart' | 'PlayerAction' | 'TurnEnd'
  currentPlayer: number;
  playerCount: number;
}

interface UnitSnapshot {
  eid: number;
  type: UnitType;
  typeName: string;  // 'Warrior', 'Scout', 'Settler'
  owner: number;
  position: { q: number; r: number };
  health: { current: number; max: number };
  movement: { current: number; max: number };
  capabilities: {
    canMove: boolean;
    canAttack: boolean;
    canFoundCity: boolean;
  };
}

interface CitySnapshot {
  eid: number;
  name: string;
  owner: number;
  position: { q: number; r: number };
  population: number;
  foodStockpile: number;
  foodForGrowth: number;
  production: ProductionSnapshot;
  yields: YieldsSnapshot;
  territoryTileCount: number;
}

interface TileSnapshot {
  position: { q: number; r: number };
  terrain: Terrain;
  terrainName: string;
  feature: TileFeature | null;
  featureName: string | null;
  resource: TileResource | null;
  resourceName: string | null;
  yields: YieldsSnapshot;
  isPassable: boolean;
  isWater: boolean;
  isHill: boolean;
  movementCost: number;
  owner: number | null;
  hasUnit: boolean;
  hasCity: boolean;
}
```

### 3. Event Types (For CLI Feedback)

From `/Users/alex/workspace/civ/src/engine/events/types.ts`:

```typescript
type GameEventType =
  | UnitMovedEvent
  | CombatResolvedEvent
  | CityFoundedEvent
  | UnitSpawnedEvent
  | UnitDestroyedEvent
  | TurnEndedEvent
  | TurnStartedEvent
  | ProductionCompletedEvent
  | ProductionChangedEvent
  | PopulationGrowthEvent;
```

### 4. Command Types (Phase 2 - Not Yet Implemented)

From the plan at `/Users/alex/workspace/civ/.swarm/plans/2026-01-18-cli-integration-architecture.md`:

```typescript
// These types will be created in Phase 2
type GameCommand =
  | MoveUnitCommand
  | AttackCommand
  | FoundCityCommand
  | SetProductionCommand
  | EndTurnCommand;

interface CommandResult {
  success: boolean;
  error?: string;
  events: GameEvent[];
}
```

### 5. Existing Game Constants

**Unit Types** (from `/Users/alex/workspace/civ/src/unit/UnitType.ts`):
- `Warrior` (strength: 8, movement: 2, cost: 40)
- `Scout` (strength: 5, movement: 3, cost: 25)
- `Settler` (strength: 0, movement: 2, cost: 80)

**Buildable Types** (from `/Users/alex/workspace/civ/src/city/Buildable.ts`):
- `None = 0`
- `Warrior = 1`
- `Scout = 2`
- `Settler = 3`

**Turn Phases** (from `/Users/alex/workspace/civ/src/game/TurnPhase.ts`):
- `TurnStart`
- `PlayerAction`
- `TurnEnd`

## Phase 4 Implementation Specification

### CLI Command Structure

Following the pattern from the research document:

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
```

### Files to Create

| File | Purpose | Dependencies |
|------|---------|--------------|
| `/Users/alex/workspace/civ/src/cli/civctl.ts` | CLI entry point, program setup | commander |
| `/Users/alex/workspace/civ/src/cli/commands/game.ts` | `game status`, `game end-turn` | GameEngine |
| `/Users/alex/workspace/civ/src/cli/commands/unit.ts` | `unit list`, `unit move`, `unit attack`, `unit found-city` | GameEngine, Phase 2 commands |
| `/Users/alex/workspace/civ/src/cli/commands/city.ts` | `city list`, `city <eid> production set <type>` | GameEngine, Phase 2 commands |
| `/Users/alex/workspace/civ/src/cli/commands/map.ts` | `map tile <q,r>`, `map tiles --range <q,r,radius>` | GameEngine |
| `/Users/alex/workspace/civ/src/cli/commands/player.ts` | `player list`, `player <id>` | GameEngine |
| `/Users/alex/workspace/civ/src/cli/formatters/text.ts` | Human-readable output formatting | - |
| `/Users/alex/workspace/civ/src/cli/formatters/json.ts` | JSON output formatting | - |
| `/Users/alex/workspace/civ/src/cli/index.ts` | Module exports | - |

### Command Specifications

#### `civctl game status`

**Input**: None
**Output (text)**:
```
Turn: 5
Phase: PlayerAction
Current Player: 0
Players: 2
```

**Output (json)**:
```json
{
  "turnNumber": 5,
  "phase": "PlayerAction",
  "currentPlayer": 0,
  "playerCount": 2
}
```

**Implementation**:
```typescript
const state = engine.getState();
// Format and output
```

#### `civctl game end-turn`

**Requires**: Phase 2 (EndTurnCommand)

**Input**: None
**Output (text)**:
```
Turn ended. Now turn 6.
```

**Implementation**:
```typescript
const result = engine.executeCommand({ type: 'END_TURN', playerId: 0 });
if (result.success) {
  console.log(`Turn ended. Now turn ${engine.getState().turnNumber}.`);
} else {
  console.error(`Error: ${result.error}`);
  process.exit(1);
}
```

#### `civctl unit list [-p <playerId>]`

**Input**: Optional player filter
**Output (text)**:
```
[1] Warrior at (5,3) HP:100/100 MP:2/2 Owner:0
[2] Scout at (7,4) HP:100/100 MP:3/3 Owner:0
[3] Warrior at (6,3) HP:80/100 MP:0/2 Owner:1
```

**Output (json)**:
```json
[
  {
    "eid": 1,
    "typeName": "Warrior",
    "position": {"q": 5, "r": 3},
    "health": {"current": 100, "max": 100},
    "movement": {"current": 2, "max": 2},
    "owner": 0,
    "capabilities": {"canMove": true, "canAttack": true, "canFoundCity": false}
  }
]
```

**Implementation**:
```typescript
const units = engine.getUnits(opts.player ? parseInt(opts.player) : undefined);
// Format and output
```

#### `civctl unit move <eid> --to <q,r>`

**Requires**: Phase 2 (MoveUnitCommand)

**Input**: Unit entity ID, target coordinates
**Output (text)**:
```
Unit 1 moved to (6,3). Remaining MP: 1
```

**Output (json)**:
```json
{
  "success": true,
  "unitEid": 1,
  "from": {"q": 5, "r": 3},
  "to": {"q": 6, "r": 3},
  "remainingMovement": 1
}
```

#### `civctl unit attack <eid> --target <defenderEid>`

**Requires**: Phase 2 (AttackCommand)

**Input**: Attacker entity ID, defender entity ID
**Output (text)**:
```
Combat: Warrior[1] vs Warrior[3]
  Attacker took 15 damage (85/100)
  Defender took 23 damage (57/100)
  Both units survived.
```

#### `civctl unit found-city <eid> [--name <cityName>]`

**Requires**: Phase 2 (FoundCityCommand)

**Input**: Settler entity ID, optional city name
**Output (text)**:
```
Founded city: Rome at (5,3)
Territory: 7 tiles
```

#### `civctl city list [-p <playerId>]`

**Input**: Optional player filter
**Output (text)**:
```
[4] Rome at (5,3) Pop:1 Owner:0
    Production: Warrior (15/40, 2 turns)
    Yields: F:3 P:2 G:1 S:1 C:1 Faith:0
```

#### `civctl city <eid> production set <type>`

**Requires**: Phase 2 (SetProductionCommand)

**Input**: City entity ID, buildable type name
**Valid types**: `warrior`, `scout`, `settler`, `none`

**Output (text)**:
```
City 4 now producing: Warrior (40 production, ~2 turns)
```

#### `civctl map tile <q,r>`

**Input**: Tile coordinates
**Output (text)**:
```
Tile (5,3):
  Terrain: Grassland
  Feature: None
  Resource: Wheat (+1 food)
  Yields: F:3 P:1 G:0 S:0 C:0 Faith:0
  Movement Cost: 1
  Passable: Yes
  Owner: City 4 (Rome)
```

#### `civctl map tiles --range <q,r,radius>`

**Input**: Center coordinates and radius
**Output**: List of tiles within radius

### Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "commander": "^12.0.0"
  }
}
```

### Build Configuration

The CLI needs a separate entry point for Node.js execution. Options:

**Option A: Vite Build with Multiple Entry Points**

Add to `vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        cli: 'src/cli/civctl.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'cli' ? 'civctl.js' : '[name].[hash].js';
        },
      },
    },
  },
});
```

**Option B: Separate tsconfig for CLI**

Create `tsconfig.cli.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist/cli"
  },
  "include": ["src/cli/**/*", "src/engine/**/*"]
}
```

Add script:
```json
{
  "scripts": {
    "build:cli": "tsc -p tsconfig.cli.json"
  }
}
```

**Option C: esbuild for CLI bundle**

```json
{
  "scripts": {
    "build:cli": "esbuild src/cli/civctl.ts --bundle --platform=node --outfile=dist/civctl.js"
  }
}
```

**Recommendation**: Option C (esbuild) is simplest for a standalone CLI binary.

### Entry Point Structure

```typescript
// src/cli/civctl.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { GameEngine } from '../engine';
import { registerGameCommands } from './commands/game';
import { registerUnitCommands } from './commands/unit';
import { registerCityCommands } from './commands/city';
import { registerMapCommands } from './commands/map';

// Global engine instance (or load from state file)
let engine: GameEngine | null = null;

function getEngine(): GameEngine {
  if (!engine) {
    // Load from saved state or create new
    engine = new GameEngine({ seed: Date.now() });
  }
  return engine;
}

const program = new Command();

program
  .name('civctl')
  .description('CLI interface for OpenCiv')
  .version('0.1.0')
  .option('-s, --state <file>', 'Load game state from file')
  .option('-o, --output <format>', 'Output format: text, json', 'text');

registerGameCommands(program, getEngine);
registerUnitCommands(program, getEngine);
registerCityCommands(program, getEngine);
registerMapCommands(program, getEngine);

program.parse();
```

### State Persistence

For the CLI to be useful across invocations, game state must persist:

**Option A: JSON State File**
```typescript
// Save after each command
const snapshot = engine.getCompleteSnapshot();
fs.writeFileSync('game.json', JSON.stringify(snapshot, null, 2));

// Load on startup
const saved = JSON.parse(fs.readFileSync('game.json', 'utf-8'));
engine = GameEngine.fromSnapshot(saved);
```

**Note**: `GameEngine.fromSnapshot()` does not exist yet - would need implementation.

**Option B: Server Mode (JSON-RPC)**
Keep engine running, CLI connects via socket. Deferred to Phase 6.

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/engine/GameEngine.ts` | Core engine, all query methods |
| `/Users/alex/workspace/civ/src/engine/index.ts` | Engine module exports |
| `/Users/alex/workspace/civ/src/engine/state/snapshots.ts` | Snapshot type definitions |
| `/Users/alex/workspace/civ/src/engine/state/queries.ts` | State query implementations |
| `/Users/alex/workspace/civ/src/engine/events/types.ts` | Event type definitions |
| `/Users/alex/workspace/civ/src/engine/events/EventBus.ts` | Event pub/sub system |
| `/Users/alex/workspace/civ/src/unit/UnitType.ts` | Unit type data |
| `/Users/alex/workspace/civ/src/city/Buildable.ts` | Buildable type data |
| `/Users/alex/workspace/civ/src/game/TurnPhase.ts` | Turn phase enum |
| `/Users/alex/workspace/civ/package.json` | Add commander dependency |

## Testing Strategy

### Unit Tests for CLI

```typescript
// src/cli/commands/game.test.ts
describe('game commands', () => {
  it('status returns current game state', () => {
    const engine = new GameEngine({ seed: 42 });
    const result = executeCommand('game', 'status', { output: 'json' });
    expect(JSON.parse(result)).toEqual({
      turnNumber: 1,
      phase: 'PlayerAction',
      currentPlayer: 0,
      playerCount: 2,
    });
  });
});
```

### Integration Tests

```typescript
// tests/cli/workflow.test.ts
describe('CLI workflow', () => {
  it('can list units, move one, and see updated state', async () => {
    // Spawn civctl process
    const list = await exec('civctl unit list -o json');
    const units = JSON.parse(list.stdout);

    const firstUnit = units[0];
    await exec(`civctl unit move ${firstUnit.eid} --to ${firstUnit.position.q + 1},${firstUnit.position.r}`);

    const updated = await exec('civctl unit list -o json');
    const updatedUnits = JSON.parse(updated.stdout);
    expect(updatedUnits[0].position.q).toBe(firstUnit.position.q + 1);
  });
});
```

## Recommendations

### Implementation Order

1. **Wait for Phase 2 completion**: CLI action commands depend on `executeCommand()`
2. **Start with query-only commands**: `game status`, `unit list`, `city list`, `map tile` can be implemented now with Phase 1
3. **Add commander dependency**: `npm install commander`
4. **Create formatter utilities first**: Text and JSON output formatters
5. **Implement read commands, then action commands**

### Query-Only Phase 4.1 (Can Start Now)

These commands only need Phase 1 (complete):

| Command | Dependencies |
|---------|--------------|
| `civctl game status` | getState() |
| `civctl unit list` | getUnits() |
| `civctl city list` | getCities() |
| `civctl map tile` | getTile() |
| `civctl map tiles --range` | getTile() in loop |

### Action Commands Phase 4.2 (Requires Phase 2)

These commands need `executeCommand()`:

| Command | Required Command Type |
|---------|----------------------|
| `civctl game end-turn` | EndTurnCommand |
| `civctl unit move` | MoveUnitCommand |
| `civctl unit attack` | AttackCommand |
| `civctl unit found-city` | FoundCityCommand |
| `civctl city production set` | SetProductionCommand |

### Claude Code Integration

Once Phase 4 is complete, add to CLAUDE.md:

```markdown
## Playing OpenCiv via CLI

OpenCiv supports command-line control via `civctl`:

### Query Commands
- `civctl game status -o json` - Get current game state
- `civctl unit list -p 0 -o json` - List player 0's units
- `civctl city list -o json` - List all cities
- `civctl map tile 5,3 -o json` - Get tile information

### Action Commands
- `civctl unit move <eid> --to <q,r>` - Move unit
- `civctl unit attack <eid> --target <defenderEid>` - Attack
- `civctl unit found-city <eid>` - Found city (Settler only)
- `civctl city <eid> production set <type>` - Set production
- `civctl game end-turn` - End current turn

Use `-o json` for structured output suitable for parsing.
```

## Open Questions

1. **State persistence strategy**: How should game state persist between CLI invocations? File-based or server mode?

2. **Multi-player support**: Should CLI validate that actions are from the current player? (GameState.currentPlayer)

3. **Error format**: Should errors be JSON-serializable for machine parsing?
   - Recommendation: Yes, use `{ "error": true, "message": "..." }` for `-o json`

4. **Valid move queries**: Should CLI expose `getValidMoves(unitEid)` and `getValidAttacks(unitEid)`?
   - Recommendation: Yes, as `civctl unit <eid> valid-moves` and `civctl unit <eid> valid-attacks`
   - Requires addition to GameEngine or use of Pathfinder directly

5. **Event streaming**: Should CLI support a "watch" mode that streams events?
   - Recommendation: Defer to Phase 6 (JSON-RPC server)

6. **Build tooling**: esbuild vs tsc vs Vite for CLI bundling?
   - Recommendation: esbuild for simplicity

## Estimated Effort

| Task | Hours | Blocked By |
|------|-------|------------|
| Add commander dependency, basic structure | 1-2 | - |
| Query commands (game, unit, city, map) | 2-3 | - |
| Text and JSON formatters | 1-2 | - |
| Build configuration (esbuild) | 1 | - |
| **Phase 4.1 Subtotal** | **5-8** | **Phase 1 only** |
| Action commands (move, attack, found-city) | 2-3 | Phase 2 |
| Production command | 1 | Phase 2 |
| End turn command | 0.5 | Phase 2 |
| State persistence | 2-3 | - |
| CLI unit tests | 2-3 | - |
| CLI integration tests | 2-3 | - |
| **Phase 4.2 Subtotal** | **10-13** | **Phase 2** |
| **Total Phase 4** | **15-21** | - |

## Conclusion

Phase 4 (CLI Frontend) is well-defined but blocked by Phase 2 (Command Layer). A partial implementation (query-only commands) can proceed immediately using the completed Phase 1 infrastructure. The full CLI with action commands requires Phase 2's `executeCommand()` method and command types.

The GameEngine already provides all necessary query methods and event subscriptions. The CLI implementation is primarily a translation layer between command-line arguments and the engine API, plus output formatting.

Recommended approach:
1. Implement query-only CLI (Phase 4.1) now
2. Complete Phase 2 (Command Layer)
3. Complete action CLI (Phase 4.2)
4. Defer state persistence and server mode to Phase 6
