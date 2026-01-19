# Research: Player/Faction Tracking System

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research document analyzes the OpenCiv codebase to understand the current player representation and design a formal Player/Faction tracking system. Currently, players are represented only by implicit numeric IDs (0, 1, 2...) via `OwnerComponent.playerId`. This research identifies all usage points, proposes a Player entity system with comprehensive tracking, and provides detailed implementation recommendations.

## Key Discoveries

- **Players are purely implicit**: No `Player` type, interface, or entity exists - only numeric IDs in `OwnerComponent.playerId`
- **Player 0 is human by convention**: Code comments reference "player 0" as human, "player 1+" as AI, but nothing enforces this
- **No AI system exists**: The codebase has no AI-related code - AI players are just spawned units with different owner IDs
- **Player colors are hardcoded**: `PLAYER_COLORS` array in `UnitRenderer.ts` defines 6 player colors used via `playerId % length`
- **No player enumeration**: No way to list all active players or their counts
- **No player elimination tracking**: A player with 0 units/cities is not formally tracked as eliminated
- **No player resources/score**: No per-player resource tracking (gold, science, etc.) or scoring system
- **OwnerComponent uses ui8**: Supports 0-255 player IDs (far more than typical game needs)
- **GameState has `currentPlayer`**: Field exists but is unused (always 0), indicating future multiplayer intent

## Architecture Overview

### Current State: Implicit Player Representation

Players exist only as numeric values in the `OwnerComponent`:

```typescript
// From /Users/alex/workspace/civ/src/ecs/world.ts (lines 53-55)
export const OwnerComponent = defineComponent({
  playerId: Types.ui8,
});
```

This component is attached to:
1. **Units** - via `createUnitEntity()` function
2. **Cities** - via `createCityEntity()` function

### Places Where playerId Is Used

| File | Usage |
|------|-------|
| `/Users/alex/workspace/civ/src/ecs/world.ts` | OwnerComponent definition, createUnitEntity, createCityEntity |
| `/Users/alex/workspace/civ/src/ecs/unitSystems.ts` | `getUnitsForPlayer()`, `getUnitOwner()` |
| `/Users/alex/workspace/civ/src/ecs/citySystems.ts` | `getCitiesForPlayer()` |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Enemy detection (attackerOwner !== defenderOwner) |
| `/Users/alex/workspace/civ/src/render/UnitRenderer.ts` | Color lookup: `PLAYER_COLORS[playerId % PLAYER_COLORS.length]` |
| `/Users/alex/workspace/civ/src/render/CityRenderer.ts` | Uses PLAYER_COLORS for city coloring |
| `/Users/alex/workspace/civ/src/render/TerritoryRenderer.ts` | Uses PLAYER_COLORS for territory borders |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Production spawns units with city's playerId |
| `/Users/alex/workspace/civ/src/city/CityFounder.ts` | City gets playerId from founding settler |
| `/Users/alex/workspace/civ/src/main.ts` | Test unit spawning with hardcoded 0 and 1 |

### Current GameState Structure

```typescript
// From /Users/alex/workspace/civ/src/game/GameState.ts
export interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: number;  // Currently unused - always 0
}
```

The `currentPlayer` field indicates future multiplayer/hotseat intent but is never modified.

### Player Colors System

```typescript
// From /Users/alex/workspace/civ/src/render/UnitRenderer.ts (lines 11-18)
export const PLAYER_COLORS: readonly number[] = [
  0x3498db, // Blue (Player 0)
  0xe74c3c, // Red (Player 1)
  0x2ecc71, // Green (Player 2)
  0xf39c12, // Orange (Player 3)
  0x9b59b6, // Purple (Player 4)
  0x1abc9c, // Teal (Player 5)
];
```

Used by `UnitRenderer`, `CityRenderer`, and `TerritoryRenderer` for consistent player coloring.

## Patterns Found

### 1. Reactive State Pattern

All UI state in the codebase follows a subscriber pattern:

```typescript
// Pattern from /Users/alex/workspace/civ/src/ui/HoverState.ts
export class HoverState {
  private current: HoveredTile | null = null;
  private listeners: HoverListener[] = [];

  subscribe(listener: HoverListener): () => void {
    this.listeners.push(listener);
    return () => { /* unsubscribe */ };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.current);
    }
  }
}
```

PlayerManager should follow this pattern for player state notifications.

### 2. bitECS Query Pattern

Entity queries follow this pattern:

```typescript
// From /Users/alex/workspace/civ/src/ecs/unitSystems.ts
export function getUnitsForPlayer(world: IWorld, playerId: number): number[] {
  const units = unitQuery(world);
  return units.filter((eid) => OwnerComponent.playerId[eid] === playerId);
}
```

### 3. Index-Based Data Pattern

The codebase uses index-based lookups for static data:

```typescript
// City names indexed: CityComponent.nameIndex -> getCityNameByIndex()
// Unit types: UnitComponent.type -> UNIT_TYPE_DATA[type]
```

Player data could follow this pattern if using bitECS, or use a direct Map for TypeScript class approach.

## Requirements Analysis

### Essential Player Data

Based on Civilization-style games and the existing codebase:

| Property | Type | Purpose |
|----------|------|---------|
| `id` | `number` | Unique identifier (matches OwnerComponent.playerId) |
| `name` | `string` | Display name ("Player 1", "Rome", etc.) |
| `color` | `number` | Hex color for rendering (migrate from PLAYER_COLORS) |
| `isHuman` | `boolean` | Human vs AI distinction |
| `isEliminated` | `boolean` | Track defeat status |

### Future Extensions (Not MVP)

- Per-player resources (gold, science, culture, faith)
- Score tracking
- Diplomatic relations map
- Technology research state
- Civilization/faction type with unique abilities

### Player Count

The `PLAYER_COLORS` array has 6 entries, suggesting 6 as a reasonable maximum. The `OwnerComponent.playerId` uses `Types.ui8` (0-255), which is sufficient for any reasonable player count.

**Recommendation**: Support 2-8 players initially.

## Implementation Approach

### Design Decision: TypeScript Class vs bitECS Entity

**Option A: TypeScript Class (Recommended)**

Players are managed outside the ECS as they are fundamentally different from game entities:
- Players don't have positions
- Players don't tick/update per frame
- Player count is small and fixed at game start
- Player queries don't need ECS performance

```typescript
// src/player/Player.ts
export interface Player {
  readonly id: number;
  name: string;
  color: number;
  isHuman: boolean;
  isEliminated: boolean;
}
```

**Option B: bitECS Entity**

Players as ECS entities with components:
- `PlayerComponent { isHuman: Types.ui8, isEliminated: Types.ui8 }`
- Would need separate name/color storage

**Recommendation**: Option A - TypeScript classes. Players are conceptually different from game entities and don't benefit from ECS patterns.

### Proposed File Structure

```
src/
  player/
    index.ts              - Module exports
    Player.ts             - Player interface and constants
    PlayerManager.ts      - Player tracking and management
```

### Detailed Interface Definitions

```typescript
// src/player/Player.ts

/** Maximum number of players supported */
export const MAX_PLAYERS = 8;

/** Player color palette (expanded from PLAYER_COLORS) */
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
  name: string;              // "Player 1", "Rome", faction name
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

```typescript
// src/player/PlayerManager.ts

import { IWorld } from 'bitecs';
import { Player, PlayerSnapshot, PlayerEvent, PLAYER_COLORS, MAX_PLAYERS } from './Player';
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

    for (let id = 0; id < totalPlayers && id < MAX_PLAYERS; id++) {
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
    return this.getAllPlayers().filter(p => !p.isEliminated);
  }

  /** Get human players */
  getHumanPlayers(): PlayerSnapshot[] {
    return this.getAllPlayers().filter(p => p.isHuman);
  }

  /** Get AI players */
  getAIPlayers(): PlayerSnapshot[] {
    return this.getAllPlayers().filter(p => !p.isHuman);
  }

  /** Check if a player is eliminated */
  isPlayerEliminated(id: number): boolean {
    return this.players.get(id)?.isEliminated ?? false;
  }

  /** Get the number of active players */
  getActivePlayerCount(): number {
    return this.getActivePlayers().length;
  }

  /**
   * Check if a player should be eliminated (0 units and 0 cities).
   * Call after combat or city capture.
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
   * Get player color (convenience method for renderers).
   */
  getPlayerColor(id: number): number {
    return this.players.get(id)?.color ?? PLAYER_COLORS[0];
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

## Integration Points

### 1. Initialization in main.ts

```typescript
// Initialize PlayerManager at game start
const playerManager = new PlayerManager();
playerManager.initialize([0], 2); // Player 0 is human, 2 total players

// Pass to systems that need player info
const combatExecutor = new CombatExecutor(
  world, tileMap, unitRenderer, selectionState, gameState, playerManager
);
```

### 2. Replace PLAYER_COLORS References

Update renderers to use PlayerManager:

```typescript
// Before (UnitRenderer.ts)
const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

// After
const color = playerManager.getPlayerColor(playerId);
```

**Or keep PLAYER_COLORS as the canonical source** and have PlayerManager import from it. This minimizes changes.

### 3. Combat Integration

After combat kills a unit:

```typescript
// In CombatExecutor.executeAttack()
if (!result.defenderSurvives) {
  this.removeUnit(defenderEid);
  const defenderOwner = getUnitOwner(defenderEid);
  this.playerManager.checkElimination(this.world, defenderOwner);
}
```

### 4. Victory Condition Integration

From the existing victory research:

```typescript
// In VictorySystem
const activePlayers = playerManager.getActivePlayers();
if (activePlayers.length === 1) {
  return {
    type: VictoryType.Domination,
    winnerId: activePlayers[0].id,
  };
}
```

### 5. GameState Extension

```typescript
// Extended GameStateSnapshot
export interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: number;
  isGameOver: boolean;       // NEW
  winnerId: number | null;   // NEW
}
```

## Key Files to Modify

| File | Changes |
|------|---------|
| `/Users/alex/workspace/civ/src/main.ts` | Add PlayerManager initialization, pass to systems |
| `/Users/alex/workspace/civ/src/render/UnitRenderer.ts` | Optionally use PlayerManager for colors (or keep PLAYER_COLORS) |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Add elimination check after unit death |
| `/Users/alex/workspace/civ/src/game/GameState.ts` | Add game over state if implementing victory |

## Recommendations

### Phase 1: Core Player System (Priority)

1. Create `src/player/Player.ts` with Player interface and constants
2. Create `src/player/PlayerManager.ts` with core methods
3. Export from `src/player/index.ts`
4. Initialize in `main.ts` with 2 players (1 human, 1 AI)
5. Update `generateMap()` to reset PlayerManager

### Phase 2: Integration

1. Pass PlayerManager to CombatExecutor
2. Add elimination checks after combat
3. Subscribe to elimination events for logging/UI

### Phase 3: Renderer Migration (Optional)

1. Keep `PLAYER_COLORS` in `UnitRenderer.ts` as source of truth
2. PlayerManager uses these colors via import
3. No renderer changes needed initially

### Phase 4: Victory Conditions

1. Combine with VictorySystem from existing research
2. Check for single remaining player for domination victory
3. Update GameState with winner on game end

## Risks and Considerations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Player ID mismatch | Low | High | Use same ID type (number) as OwnerComponent |
| Circular dependencies | Medium | Medium | PlayerManager imports ecs/unitSystems, not vice versa |
| Map regeneration | Medium | Low | Call playerManager.clear() then initialize() |
| Performance | Low | Low | Player count is small, linear search is fine |

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

## Open Questions

1. **Player names**: Should players have faction names (Rome, America) or generic names?
   - Recommendation: Generic names for MVP ("Player 1", "AI 2")

2. **Player persistence**: Should player state persist across map regeneration?
   - Recommendation: No - regenerate players with map

3. **Human player count**: Support for local multiplayer (hotseat)?
   - Recommendation: Single human for MVP, but design allows multiple

4. **AI player initialization**: Where should AI players get their starting units?
   - Current: `spawnTestWarriors()` in main.ts handles this
   - Future: Dedicated spawn system

5. **Color customization**: Should players be able to pick their color?
   - Recommendation: Defer to post-MVP

6. **Spectator mode**: Support for eliminated players watching?
   - Recommendation: Out of scope for MVP

## Implementation Order

1. **Phase 1: Foundation** (1 hour)
   - Create Player.ts with interface and constants
   - Create PlayerManager.ts with core methods
   - Create index.ts exports

2. **Phase 2: Integration** (1 hour)
   - Initialize PlayerManager in main.ts
   - Wire to map regeneration
   - Basic logging

3. **Phase 3: Combat Integration** (30 minutes)
   - Add PlayerManager to CombatExecutor
   - Add elimination checks

4. **Phase 4: Testing** (1 hour)
   - Unit tests for PlayerManager
   - Integration tests with combat

**Total estimated time: 3.5 hours**

## Conclusion

The current implicit player representation via `OwnerComponent.playerId` is functional but limiting. Introducing a formal `PlayerManager` class will:

1. Provide a single source of truth for player data
2. Enable player enumeration and status queries
3. Support elimination tracking for victory conditions
4. Lay groundwork for future features (resources, diplomacy, AI)

The implementation is straightforward with minimal changes to existing code. The TypeScript class approach (vs bitECS entities) is appropriate because players are conceptually different from game entities and don't need ECS patterns.

This work is a prerequisite for the Victory Conditions system documented in `/Users/alex/workspace/civ/.swarm/research/2026-01-18-victory-conditions.md`.
