# Plan: Player/Faction Tracking System

**Date**: 2026-01-18
**Status**: Completed

## Overview

Implement a formal Player/Faction tracking system for OpenCiv that provides a single source of truth for player data, enables player enumeration and status queries, and supports elimination tracking. Currently, players exist only as implicit numeric IDs via `OwnerComponent.playerId`. This plan covers creating the core Player module (Phase 1), PlayerManager class (Phase 2), and integration with main.ts and existing systems (Phase 3).

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-player-faction-tracking.md`:

- **Players are purely implicit**: No `Player` type, interface, or entity exists - only numeric IDs in `OwnerComponent.playerId`
- **Player 0 is human by convention**: Code comments reference "player 0" as human, but nothing enforces this
- **No player enumeration**: No way to list all active players or their counts
- **No elimination tracking**: A player with 0 units/cities is not formally tracked as eliminated
- **Player colors are hardcoded**: `PLAYER_COLORS` array in `UnitRenderer.ts` defines 6 player colors
- **GameState has `currentPlayer`**: Field exists but is unused (always 0), indicating future multiplayer intent
- **OwnerComponent uses ui8**: Supports 0-255 player IDs (sufficient for any reasonable player count)

**Design Decision**: Use TypeScript class approach (not bitECS entities) because:
- Players are fundamentally different from game entities (no positions, no frame updates)
- Player count is small and fixed at game start
- Player queries don't need ECS performance characteristics

**Recommendation**: Support 2-8 players initially.

---

## Phased Implementation

### Phase 1: Core Player Module

**Goal**: Create the Player interface, types, and constants that define player data structures.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/player/Player.ts`:
  ```typescript
  /** Maximum number of players supported */
  export const MAX_PLAYERS = 8;

  /** Player color palette (expanded from PLAYER_COLORS in UnitRenderer.ts) */
  export const PLAYER_COLORS: readonly number[] = [
    0x3498db, // Blue (Player 0)
    0xe74c3c, // Red (Player 1)
    0x2ecc71, // Green (Player 2)
    0xf39c12, // Orange (Player 3)
    0x9b59b6, // Purple (Player 4)
    0x1abc9c, // Teal (Player 5)
    0xe91e63, // Pink (Player 6)
    0x795548, // Brown (Player 7)
  ];

  /** Core player data */
  export interface Player {
    readonly id: number;       // Matches OwnerComponent.playerId
    name: string;              // "Player 1", faction name, etc.
    color: number;             // Hex color for rendering
    isHuman: boolean;          // true for human players
    isEliminated: boolean;     // true when defeated
  }

  /** Read-only player data for external use */
  export type PlayerSnapshot = Readonly<Player>;

  /** Event types for player state changes */
  export type PlayerEventType =
    | 'eliminated'
    | 'added'
    | 'updated';

  export interface PlayerEvent {
    type: PlayerEventType;
    playerId: number;
  }
  ```

- [x] Create `/Users/alex/workspace/civ/src/player/index.ts`:
  ```typescript
  export {
    MAX_PLAYERS,
    PLAYER_COLORS,
    type Player,
    type PlayerSnapshot,
    type PlayerEventType,
    type PlayerEvent,
  } from './Player';

  export { PlayerManager } from './PlayerManager';
  ```

- [x] Write unit tests `/Users/alex/workspace/civ/src/player/Player.test.ts`:
  - Verify PLAYER_COLORS has exactly 8 entries
  - Verify MAX_PLAYERS equals 8
  - Verify PLAYER_COLORS are all valid hex color numbers

#### Success Criteria

- [x] `Player` interface defined with all required fields (id, name, color, isHuman, isEliminated)
- [x] `PLAYER_COLORS` array has 8 entries (expanded from 6 in UnitRenderer.ts)
- [x] `MAX_PLAYERS` constant equals 8
- [x] `PlayerSnapshot` provides read-only access
- [x] `PlayerEvent` and `PlayerEventType` types defined
- [x] Module exports cleanly from `index.ts`
- [x] Unit tests pass

---

### Phase 2: PlayerManager Class

**Goal**: Create the PlayerManager class that manages player state, provides queries, and tracks elimination.

#### Tasks

- [x] Create `/Users/alex/workspace/civ/src/player/PlayerManager.ts`:
  ```typescript
  import { IWorld } from 'bitecs';
  import {
    Player,
    PlayerSnapshot,
    PlayerEvent,
    PLAYER_COLORS,
    MAX_PLAYERS,
  } from './Player';
  import { getUnitsForPlayer } from '../ecs/unitSystems';
  import { getCitiesForPlayer } from '../ecs/citySystems';

  type PlayerListener = (event: PlayerEvent) => void;

  /**
   * Manages player state throughout the game.
   * Provides queries for active players and elimination tracking.
   */
  export class PlayerManager {
    private players: Map<number, Player> = new Map();
    private listeners: PlayerListener[] = [];

    /**
     * Initialize players for a new game.
     * @param humanPlayerIds - IDs of human-controlled players (typically [0])
     * @param totalPlayers - Total number of players (human + AI)
     */
    initialize(humanPlayerIds: number[], totalPlayers: number): void {
      this.players.clear();

      const effectiveTotal = Math.min(totalPlayers, MAX_PLAYERS);
      for (let id = 0; id < effectiveTotal; id++) {
        const isHuman = humanPlayerIds.includes(id);
        this.players.set(id, {
          id,
          name: isHuman ? `Player ${id + 1}` : `AI ${id}`,
          color: PLAYER_COLORS[id % PLAYER_COLORS.length],
          isHuman,
          isEliminated: false,
        });
      }
    }

    /** Get a player by ID */
    getPlayer(id: number): PlayerSnapshot | undefined {
      return this.players.get(id);
    }

    /** Get all players */
    getAllPlayers(): PlayerSnapshot[] {
      return Array.from(this.players.values());
    }

    /** Get active (non-eliminated) players */
    getActivePlayers(): PlayerSnapshot[] {
      return this.getAllPlayers().filter((p) => !p.isEliminated);
    }

    /** Get human players */
    getHumanPlayers(): PlayerSnapshot[] {
      return this.getAllPlayers().filter((p) => p.isHuman);
    }

    /** Get AI players */
    getAIPlayers(): PlayerSnapshot[] {
      return this.getAllPlayers().filter((p) => !p.isHuman);
    }

    /** Get eliminated players */
    getEliminatedPlayers(): PlayerSnapshot[] {
      return this.getAllPlayers().filter((p) => p.isEliminated);
    }

    /** Check if a player is eliminated */
    isPlayerEliminated(id: number): boolean {
      return this.players.get(id)?.isEliminated ?? false;
    }

    /** Get the number of active players */
    getActivePlayerCount(): number {
      return this.getActivePlayers().length;
    }

    /** Get total player count */
    getPlayerCount(): number {
      return this.players.size;
    }

    /**
     * Check if a player should be eliminated (0 units and 0 cities).
     * Call after combat or city capture.
     * @returns true if player was eliminated, false otherwise
     */
    checkElimination(world: IWorld, playerId: number): boolean {
      const player = this.players.get(playerId);
      if (!player || player.isEliminated) return false;

      const units = getUnitsForPlayer(world, playerId);
      const cities = getCitiesForPlayer(world, playerId);

      if (units.length === 0 && cities.length === 0) {
        player.isEliminated = true;
        this.notify({ type: 'eliminated', playerId });
        return true;
      }
      return false;
    }

    /**
     * Manually mark a player as eliminated.
     * Use for scenarios like surrender or disconnection.
     */
    eliminatePlayer(playerId: number): void {
      const player = this.players.get(playerId);
      if (player && !player.isEliminated) {
        player.isEliminated = true;
        this.notify({ type: 'eliminated', playerId });
      }
    }

    /**
     * Get player color (convenience method for renderers).
     * Falls back to first color if player not found.
     */
    getPlayerColor(id: number): number {
      return this.players.get(id)?.color ?? PLAYER_COLORS[0];
    }

    /**
     * Get player name.
     * Falls back to "Unknown" if player not found.
     */
    getPlayerName(id: number): string {
      return this.players.get(id)?.name ?? 'Unknown';
    }

    /** Subscribe to player events */
    subscribe(listener: PlayerListener): () => void {
      this.listeners.push(listener);
      return () => {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) this.listeners.splice(index, 1);
      };
    }

    private notify(event: PlayerEvent): void {
      for (const listener of this.listeners) {
        listener(event);
      }
    }

    /** Clear all state */
    clear(): void {
      this.players.clear();
      this.listeners = [];
    }
  }
  ```

- [x] Write unit tests `/Users/alex/workspace/civ/src/player/PlayerManager.test.ts`:
  - `initialize()` creates correct number of players
  - `initialize()` correctly marks human vs AI players
  - `initialize()` assigns correct colors from palette
  - `initialize()` clamps to MAX_PLAYERS
  - `getPlayer()` returns correct player or undefined
  - `getAllPlayers()` returns all players
  - `getActivePlayers()` excludes eliminated players
  - `getHumanPlayers()` and `getAIPlayers()` filter correctly
  - `checkElimination()` marks player eliminated when 0 units and 0 cities
  - `checkElimination()` returns false for already eliminated player
  - `checkElimination()` notifies listeners
  - `subscribe()` adds listener and returns unsubscribe function
  - `clear()` removes all players and listeners
  - `getPlayerColor()` returns correct color or fallback
  - `getPlayerName()` returns correct name or fallback

#### Success Criteria

- [x] `PlayerManager.initialize()` creates players with correct properties
- [x] Query methods (`getPlayer`, `getAllPlayers`, `getActivePlayers`, etc.) work correctly
- [x] `checkElimination()` correctly identifies eliminated players (0 units + 0 cities)
- [x] Event subscription system works (subscribe, notify, unsubscribe)
- [x] `clear()` resets all state
- [x] Unit tests achieve >90% coverage of PlayerManager
- [x] No circular dependencies with ecs/unitSystems and ecs/citySystems

---

### Phase 3: Integration with main.ts and Existing Systems

**Goal**: Wire PlayerManager into the application, integrate with combat system for elimination checks, and update renderers to use the canonical PLAYER_COLORS.

#### Tasks

##### 3.1 Initialize PlayerManager in main.ts

- [x] Import PlayerManager in `/Users/alex/workspace/civ/src/main.ts`:
  ```typescript
  import { PlayerManager } from './player';
  ```

- [x] Create and initialize PlayerManager after world creation:
  ```typescript
  // Initialize player manager
  const playerManager = new PlayerManager();
  playerManager.initialize([0], 2); // Player 0 is human, 2 total players
  ```

- [x] Add PlayerManager reset in `generateMap()` function:
  ```typescript
  function generateMap(seed: number): void {
    // ... existing clear operations ...

    // Reset player manager
    playerManager.clear();
    playerManager.initialize([0], 2);

    // ... rest of function ...
  }
  ```

- [x] Subscribe to elimination events for logging:
  ```typescript
  playerManager.subscribe((event) => {
    if (event.type === 'eliminated') {
      const player = playerManager.getPlayer(event.playerId);
      console.log(`${player?.name ?? 'Unknown player'} has been eliminated!`);
    }
  });
  ```

##### 3.2 Integrate with Combat System

- [x] Update CombatExecutor constructor in `/Users/alex/workspace/civ/src/combat/CombatSystem.ts`:
  ```typescript
  import { PlayerManager } from '../player';

  export class CombatExecutor {
    private world: IWorld;
    private tileMap: Map<string, GeneratedTile>;
    private unitRenderer: UnitRenderer;
    private selectionState: SelectionState;
    private gameState: GameState;
    private playerManager: PlayerManager | null;

    constructor(
      world: IWorld,
      tileMap: Map<string, GeneratedTile>,
      unitRenderer: UnitRenderer,
      selectionState: SelectionState,
      gameState: GameState,
      playerManager?: PlayerManager
    ) {
      // ... existing assignments ...
      this.playerManager = playerManager ?? null;
    }

    setPlayerManager(playerManager: PlayerManager): void {
      this.playerManager = playerManager;
    }
  ```

- [x] Add elimination check after unit death in `removeUnit()`:
  ```typescript
  private removeUnit(eid: number): void {
    // Get owner before removing
    const playerId = getUnitOwner(eid);

    // ... existing removal code ...

    // Check for player elimination
    if (this.playerManager) {
      this.playerManager.checkElimination(this.world, playerId);
    }
  }
  ```

- [x] Update CombatExecutor instantiation in main.ts:
  ```typescript
  const combatExecutor = new CombatExecutor(
    world,
    tileMap,
    unitRenderer,
    selectionState,
    gameState,
    playerManager
  );
  ```

- [x] Update combatExecutor reset in generateMap():
  ```typescript
  combatExecutor.setWorld(world);
  combatExecutor.setTileMap(tileMap);
  combatExecutor.setUnitRenderer(unitRenderer);
  combatExecutor.setPlayerManager(playerManager);
  ```

##### 3.3 Update Renderers to Use Canonical PLAYER_COLORS

- [x] Update `/Users/alex/workspace/civ/src/render/UnitRenderer.ts`:
  ```typescript
  // Remove local PLAYER_COLORS definition
  // Import from player module instead:
  import { PLAYER_COLORS } from '../player';

  // Keep export for backward compatibility (re-export):
  export { PLAYER_COLORS } from '../player';
  ```

- [x] Update `/Users/alex/workspace/civ/src/render/CityRenderer.ts`:
  ```typescript
  // If it imports PLAYER_COLORS from UnitRenderer, update import:
  import { PLAYER_COLORS } from '../player';
  ```

- [x] Update `/Users/alex/workspace/civ/src/render/TerritoryRenderer.ts`:
  ```typescript
  // If it imports PLAYER_COLORS from UnitRenderer, update import:
  import { PLAYER_COLORS } from '../player';
  ```

##### 3.4 Update Tests

- [x] Create integration test `/Users/alex/workspace/civ/src/player/integration.test.ts`:
  - Test PlayerManager with mock ECS world
  - Test elimination detection after removing all units/cities
  - Test event notification chain

- [x] Update combat system tests if they depend on player state

#### Success Criteria

- [x] PlayerManager is initialized at application start with 1 human + 1 AI player
- [x] PlayerManager is reset during map regeneration
- [x] Elimination events are logged to console
- [x] CombatExecutor checks for elimination after unit death
- [x] All renderers use PLAYER_COLORS from player module (single source of truth)
- [x] Existing functionality (unit rendering, combat, etc.) continues to work
- [x] No TypeScript errors or ESLint warnings
- [x] All tests pass (existing + new)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/player/Player.ts` | Create | Player interface, types, and constants |
| `/Users/alex/workspace/civ/src/player/PlayerManager.ts` | Create | Player state management class |
| `/Users/alex/workspace/civ/src/player/index.ts` | Create | Module exports |
| `/Users/alex/workspace/civ/src/player/Player.test.ts` | Create | Unit tests for Player types |
| `/Users/alex/workspace/civ/src/player/PlayerManager.test.ts` | Create | Unit tests for PlayerManager |
| `/Users/alex/workspace/civ/src/player/integration.test.ts` | Create | Integration tests |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Initialize PlayerManager, reset on map regen |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Modify | Add PlayerManager dependency, elimination checks |
| `/Users/alex/workspace/civ/src/render/UnitRenderer.ts` | Modify | Import PLAYER_COLORS from player module |
| `/Users/alex/workspace/civ/src/render/CityRenderer.ts` | Modify | Import PLAYER_COLORS from player module |
| `/Users/alex/workspace/civ/src/render/TerritoryRenderer.ts` | Modify | Import PLAYER_COLORS from player module |

**Total: 6 files to create, 5 files to modify**

---

## Success Criteria

### Functional Requirements
- [x] Player data is formally tracked (id, name, color, isHuman, isEliminated)
- [x] Players can be queried by various criteria (all, active, human, AI)
- [x] Player elimination is detected when 0 units and 0 cities
- [x] Elimination events are broadcast to subscribers
- [x] PLAYER_COLORS is the single source of truth for player colors

### Integration Requirements
- [x] PlayerManager integrates with ECS via existing query functions
- [x] CombatExecutor checks elimination after unit death
- [x] Map regeneration resets player state
- [x] Renderers use canonical PLAYER_COLORS from player module

### Code Quality Requirements
- [x] New modules have comprehensive unit tests
- [x] No circular dependencies
- [x] Public functions have JSDoc comments
- [x] No TypeScript errors or ESLint warnings
- [x] Follows existing codebase patterns (reactive state, subscriber pattern)

---

## Dependencies & Integration

### Depends On
- **ECS World** (`/Users/alex/workspace/civ/src/ecs/world.ts`): OwnerComponent for playerId
- **Unit Queries** (`/Users/alex/workspace/civ/src/ecs/unitSystems.ts`): getUnitsForPlayer
- **City Queries** (`/Users/alex/workspace/civ/src/ecs/citySystems.ts`): getCitiesForPlayer
- **Combat System** (`/Users/alex/workspace/civ/src/combat/CombatSystem.ts`): Triggers elimination checks

### Consumed By (Future Phases)
- **Victory Conditions System**: Uses getActivePlayers() for domination victory check
- **AI System**: Will need player queries to evaluate threats and targets
- **Diplomacy System**: Will track relationships between players
- **Score/Ranking System**: Will compute per-player scores
- **UI Panels**: May display player list, scores, or status

### Integration Points
- **CombatExecutor**: Calls checkElimination() after unit death
- **main.ts**: Initializes and resets PlayerManager
- **Renderers**: Import PLAYER_COLORS from player module

### Dependency Direction
```
main.ts
   |
   v
PlayerManager
   |
   v
unitSystems / citySystems (queries only)
   |
   v
OwnerComponent
```

No circular dependency risk as PlayerManager only calls query functions.

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Player ID mismatch with OwnerComponent | High | Low | Use same type (number) as OwnerComponent.playerId |
| Circular dependencies | Medium | Low | PlayerManager imports only query functions, not ECS core |
| Map regeneration leaves stale state | Medium | Medium | Clear PlayerManager in generateMap() before reinitializing |
| Elimination check called before player exists | Low | Low | Return false from checkElimination if player not found |
| Performance with many elimination checks | Low | Very Low | Player count is small; linear search is fine |
| PLAYER_COLORS import breaking existing code | Low | Medium | Re-export from UnitRenderer.ts for backward compatibility |

---

## Testing Strategy

### Unit Tests

**Player.test.ts**
- PLAYER_COLORS length equals 8
- All PLAYER_COLORS are valid hex numbers
- MAX_PLAYERS equals 8

**PlayerManager.test.ts**
- Initialize with 1 human, 1 AI
- Initialize with 2 humans (hotseat scenario)
- Initialize with more than MAX_PLAYERS (should clamp)
- getPlayer returns correct player
- getPlayer returns undefined for invalid ID
- getAllPlayers returns array of all players
- getActivePlayers excludes eliminated
- getHumanPlayers filters correctly
- getAIPlayers filters correctly
- checkElimination returns true when eliminated
- checkElimination returns false when has units
- checkElimination returns false when has cities
- checkElimination returns false for already eliminated
- subscribe receives elimination events
- unsubscribe stops receiving events
- clear removes all players
- getPlayerColor returns correct color
- getPlayerColor returns fallback for invalid ID
- getPlayerName returns correct name
- getPlayerName returns fallback for invalid ID

### Integration Tests

**integration.test.ts**
- Create mock world with units
- Remove all units for a player
- Verify checkElimination returns true
- Verify event was fired
- Verify player is marked eliminated

### Manual Testing Checklist

- [x] Start game - verify 2 players initialized (check console)
- [x] Attack enemy unit until killed - verify elimination message if last unit
- [x] Press R to regenerate map - verify players reset
- [x] Verify unit colors still work correctly
- [x] Verify city colors still work correctly
- [x] Verify territory colors still work correctly

---

## Implementation Order

1. **Phase 1** (~30 minutes)
   - Create Player.ts with interface and constants
   - Create index.ts exports
   - Write Player.test.ts

2. **Phase 2** (~1 hour)
   - Create PlayerManager.ts with all methods
   - Write PlayerManager.test.ts
   - Update index.ts exports

3. **Phase 3** (~1 hour)
   - Initialize PlayerManager in main.ts
   - Update CombatSystem.ts for elimination checks
   - Update renderer imports
   - Write integration.test.ts
   - Manual testing

**Total estimated time: 2.5 hours**

---

## Future Extensions (Out of Scope)

These are documented for future planning but not part of this implementation:

1. **Per-Player Resources**: Gold, science, culture, faith tracking
2. **Score System**: Per-player scoring based on cities, units, wonders, etc.
3. **Faction/Civilization Types**: Rome, America, etc. with unique abilities
4. **Diplomacy Relations**: War, peace, alliance status between players
5. **Color Customization**: Player-selectable colors
6. **Hotseat Multiplayer**: Multiple human players taking turns
7. **AI Personality**: Different AI behaviors based on player configuration
8. **Spectator Mode**: Allow eliminated players to watch

---

## Appendix: Key Code Patterns

### Reactive State Pattern (from HoverState)

```typescript
export class SomeState {
  private current: T | null = null;
  private listeners: ((value: T | null) => void)[] = [];

  subscribe(listener: (value: T | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }
}
```

### ECS Query Pattern (from unitSystems)

```typescript
export function getUnitsForPlayer(world: IWorld, playerId: number): number[] {
  const units = unitQuery(world);
  return units.filter((eid) => OwnerComponent.playerId[eid] === playerId);
}
```

### Module Export Pattern (from combat/index.ts)

```typescript
export { SomeClass } from './SomeClass';
export { type SomeType, someFunction } from './SomeModule';
```
