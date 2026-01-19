# Plan: CLI Frontend (civctl)

**Date**: 2026-01-18
**Status**: Implemented

## Overview

Implement `civctl`, a command-line interface for OpenCiv that enables programmatic game control through the GameEngine API. This CLI allows Claude Code and other AI agents to play the game through structured commands with JSON output support.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-cli-integration-phase4.md`:

- **Phase 2 (Command Layer) is COMPLETE**: `GameEngine.executeCommand()` is fully implemented with validators and executors for all command types
- **All command types implemented**: `MoveUnitCommand`, `AttackCommand`, `FoundCityCommand`, `SetProductionCommand`, `EndTurnCommand`
- **Query methods available**: `getState()`, `getUnits()`, `getCities()`, `getTile()`, `getMap()`, `getCompleteSnapshot()`
- **Snapshots are JSON-serializable**: All state queries return serializable objects ready for CLI output
- **No CLI package installed**: `commander` needs to be added to dependencies
- **Build recommendation**: esbuild for standalone CLI bundle

## Phased Implementation

### Phase 1: Setup and Infrastructure

**Goal**: Establish CLI entry point, dependencies, and build configuration.

- [x] Add `commander` to dependencies in `package.json`
- [x] Add `esbuild` to devDependencies in `package.json`
- [x] Add build script `"build:cli": "esbuild src/cli/civctl.ts --bundle --platform=node --outfile=dist/civctl.js"`
- [x] Create `/Users/alex/workspace/civ/src/cli/civctl.ts` - CLI entry point with commander setup
- [x] Create `/Users/alex/workspace/civ/src/cli/formatters/text.ts` - Human-readable output formatting
- [x] Create `/Users/alex/workspace/civ/src/cli/formatters/json.ts` - JSON output formatting
- [x] Create `/Users/alex/workspace/civ/src/cli/formatters/index.ts` - Formatter exports
- [x] Create `/Users/alex/workspace/civ/src/cli/context.ts` - Engine initialization and state management
- [x] Create `/Users/alex/workspace/civ/src/cli/index.ts` - Module exports
- [x] Verify CLI builds and runs with `--help`

### Phase 2: Query Commands (Read-Only)

**Goal**: Implement commands that query game state without modifying it.

- [x] Create `/Users/alex/workspace/civ/src/cli/commands/game.ts`:
  - `civctl game status` - Returns turn number, phase, current player, player count
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/unit.ts`:
  - `civctl unit list [-p <playerId>]` - List all units, optionally filtered by player
  - `civctl unit show <eid>` - Show details of a specific unit
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/city.ts`:
  - `civctl city list [-p <playerId>]` - List all cities, optionally filtered by player
  - `civctl city show <eid>` - Show details of a specific city
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/map.ts`:
  - `civctl map tile <q,r>` - Get tile information at coordinates
  - `civctl map info` - Get map dimensions and seed
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/player.ts`:
  - `civctl player list` - List all players with unit/city counts
- [x] Wire all query commands to main program in `civctl.ts`
- [x] Test all query commands with both `--output text` and `--output json`

### Phase 3: Action Commands

**Goal**: Implement commands that modify game state through executeCommand().

- [x] Add to `/Users/alex/workspace/civ/src/cli/commands/game.ts`:
  - `civctl game end-turn` - End current player's turn
  - `civctl game new [--seed <seed>] [--size <size>]` - Start new game
- [x] Add to `/Users/alex/workspace/civ/src/cli/commands/unit.ts`:
  - `civctl unit move <eid> --to <q,r>` - Move unit to target hex
  - `civctl unit attack <eid> --target <defenderEid>` - Attack enemy unit
  - `civctl unit found-city <eid> [--name <cityName>]` - Found city with settler
- [x] Add to `/Users/alex/workspace/civ/src/cli/commands/city.ts`:
  - `civctl city production <eid> <type>` - Set city production (warrior/scout/settler/none)
- [x] Implement error handling with structured error output for `-o json`
- [x] Ensure all action commands emit CommandResult with success/error status

### Phase 4: Tests and Documentation

**Goal**: Ensure CLI works correctly and document usage.

- [x] Create `/Users/alex/workspace/civ/src/cli/commands/game.test.ts`:
  - Test `game status` returns correct snapshot
  - Test `game end-turn` advances turn
  - Test `game new` creates new game state
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/unit.test.ts`:
  - Test `unit list` returns all units
  - Test `unit list -p 0` filters correctly
  - Test `unit move` with valid/invalid moves
  - Test `unit attack` with valid/invalid attacks
  - Test `unit found-city` success and failures
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/city.test.ts`:
  - Test `city list` returns all cities
  - Test `city production` sets production correctly
- [x] Create `/Users/alex/workspace/civ/src/cli/commands/map.test.ts`:
  - Test `map tile` returns correct tile data
  - Test `map info` returns dimensions
- [x] Update `/Users/alex/workspace/civ/CLAUDE.md` with CLI usage documentation
- [x] Run full test suite to verify no regressions

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/package.json` | Modify | Add commander, esbuild, build:cli script |
| `/Users/alex/workspace/civ/src/cli/civctl.ts` | Create | CLI entry point with commander program |
| `/Users/alex/workspace/civ/src/cli/index.ts` | Create | Module exports |
| `/Users/alex/workspace/civ/src/cli/context.ts` | Create | Engine initialization and state context |
| `/Users/alex/workspace/civ/src/cli/formatters/text.ts` | Create | Text output formatting functions |
| `/Users/alex/workspace/civ/src/cli/formatters/json.ts` | Create | JSON output formatting functions |
| `/Users/alex/workspace/civ/src/cli/formatters/index.ts` | Create | Formatter exports |
| `/Users/alex/workspace/civ/src/cli/commands/game.ts` | Create | game status, end-turn, new commands |
| `/Users/alex/workspace/civ/src/cli/commands/unit.ts` | Create | unit list, show, move, attack, found-city |
| `/Users/alex/workspace/civ/src/cli/commands/city.ts` | Create | city list, show, production commands |
| `/Users/alex/workspace/civ/src/cli/commands/map.ts` | Create | map tile, info commands |
| `/Users/alex/workspace/civ/src/cli/commands/player.ts` | Create | player list command |
| `/Users/alex/workspace/civ/src/cli/commands/game.test.ts` | Create | Unit tests for game commands |
| `/Users/alex/workspace/civ/src/cli/commands/unit.test.ts` | Create | Unit tests for unit commands |
| `/Users/alex/workspace/civ/src/cli/commands/city.test.ts` | Create | Unit tests for city commands |
| `/Users/alex/workspace/civ/src/cli/commands/map.test.ts` | Create | Unit tests for map commands |
| `/Users/alex/workspace/civ/CLAUDE.md` | Modify | Add CLI usage documentation |

**Total: 15 files to create, 2 files to modify**

## Command Reference

### Global Options

```
civctl [command] [options]

Options:
  -o, --output <format>  Output format: text (default), json
  -s, --state <file>     State file for persistence (default: .civctl-state.json)
  -h, --help             Show help
  -V, --version          Show version
```

### Game Commands

```bash
civctl game status              # Show current game state
civctl game end-turn            # End current player's turn
civctl game new [--seed N]      # Start new game with optional seed
```

### Unit Commands

```bash
civctl unit list [-p <player>]         # List units
civctl unit show <eid>                  # Show unit details
civctl unit move <eid> --to <q,r>       # Move unit
civctl unit attack <eid> --target <id>  # Attack enemy
civctl unit found-city <eid> [--name]   # Found city (settler)
```

### City Commands

```bash
civctl city list [-p <player>]           # List cities
civctl city show <eid>                   # Show city details
civctl city production <eid> <type>      # Set production
```

### Map Commands

```bash
civctl map tile <q,r>   # Get tile at coordinates
civctl map info         # Get map dimensions and seed
```

### Player Commands

```bash
civctl player list      # List all players with stats
```

## Success Criteria

### Phase 1: Setup
- [ ] `npm run build:cli` produces `dist/civctl.js`
- [ ] `node dist/civctl.js --help` shows usage
- [ ] `node dist/civctl.js --version` shows version

### Phase 2: Query Commands
- [ ] `civctl game status -o json` returns valid JSON with turnNumber, phase, currentPlayer
- [ ] `civctl unit list` returns unit listing with eid, type, position, health, movement
- [ ] `civctl unit list -p 0` filters to player 0 only
- [ ] `civctl city list` returns city listing with production info
- [ ] `civctl map tile 0,0 -o json` returns tile snapshot
- [ ] `civctl player list` shows player count and statistics

### Phase 3: Action Commands
- [ ] `civctl game end-turn` advances turn and returns new state
- [ ] `civctl unit move <eid> --to <q,r>` moves unit, returns UnitMovedEvent data
- [ ] `civctl unit attack` returns CombatResolvedEvent data
- [ ] `civctl unit found-city` creates city, removes settler, returns CityFoundedEvent
- [ ] `civctl city production <eid> warrior` sets production
- [ ] Invalid commands return error with `{ "success": false, "error": "..." }`

### Phase 4: Tests and Docs
- [ ] All CLI unit tests pass (`npm run test`)
- [ ] CLAUDE.md includes CLI usage section
- [ ] No regressions in existing tests

## Dependencies & Integration

### Depends On
- **GameEngine** (`/Users/alex/workspace/civ/src/engine/GameEngine.ts`): All query methods and executeCommand()
- **Command types** (`/Users/alex/workspace/civ/src/engine/commands/types.ts`): Command definitions
- **Snapshot types** (`/Users/alex/workspace/civ/src/engine/state/snapshots.ts`): Output types
- **Buildable types** (`/Users/alex/workspace/civ/src/city/Buildable.ts`): Production type names

### Consumed By
- **Claude Code / AI Agents**: Primary use case for programmatic game control
- **Integration tests**: Verify CLI commands work end-to-end
- **Future JSON-RPC server**: May reuse command parsing logic

### Integration Points
- **GameEngine.executeCommand()**: All action commands
- **GameEngine query methods**: All read commands
- **Package.json scripts**: build:cli script for bundling

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| State persistence between CLI invocations | Start with stateless commands using --state flag; defer full persistence |
| esbuild bundling issues with dependencies | Test with simple bundle first; add external flags if needed |
| Pathfinder not initialized for move commands | Initialize pathfinder in context.ts when creating engine |
| Command parsing errors confusing | Validate args before calling executeCommand; clear error messages |
| Large map output overwhelming | Add --range flag for map queries; use pagination |

## Implementation Notes

### State Management

For MVP, use a simple JSON state file:

```typescript
// Save state after each command
const snapshot = engine.getCompleteSnapshot();
fs.writeFileSync(stateFile, JSON.stringify(snapshot, null, 2));

// Load state on startup
if (fs.existsSync(stateFile)) {
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  // Note: GameEngine.fromSnapshot() not yet implemented
  // For MVP, regenerate with same seed
}
```

Full snapshot restoration (`GameEngine.fromSnapshot()`) can be implemented in a future iteration.

### Pathfinder Initialization

The GameEngine requires a Pathfinder for move command validation:

```typescript
import { Pathfinder } from '../pathfinding/Pathfinder';

function createEngine(config: GameConfig): GameEngine {
  const engine = new GameEngine(config);
  const pathfinder = new Pathfinder(engine.getTileMap());
  engine.setPathfinder(pathfinder);
  return engine;
}
```

### Error Output Format

For `-o json`, errors follow this structure:

```json
{
  "success": false,
  "error": "Unit 999 not found"
}
```

Successful commands return:

```json
{
  "success": true,
  "data": { /* command-specific data */ },
  "events": [ /* emitted events */ ]
}
```

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Setup | 2-3 | Dependencies, build config, entry point |
| Phase 2: Query Commands | 3-4 | 5 command files with text/json output |
| Phase 3: Action Commands | 3-4 | Command execution with error handling |
| Phase 4: Tests & Docs | 3-4 | Unit tests and documentation |
| **Total** | **11-15** | |
