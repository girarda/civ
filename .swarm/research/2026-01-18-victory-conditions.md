# Research: Victory Conditions for OpenCiv

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research document analyzes the OpenCiv codebase to identify how to implement victory conditions, specifically focusing on Domination victory (destroy all enemy units and cities). The codebase has well-established ECS patterns, combat and city systems, and reactive state management. Victory conditions can be implemented by adding a VictorySystem that monitors game state and triggers game-end conditions when met.

## Key Discoveries

- **Player system is implicit**: Player IDs exist as simple numbers (0, 1, 2...) via `OwnerComponent.playerId`, but no formal Player entity or data structure exists
- **Combat already removes defeated units**: `CombatExecutor.removeUnit()` uses `removeEntity()` from bitECS to fully remove dead units
- **Units and cities track ownership**: Both use `OwnerComponent.playerId` (ui8 type) for ownership tracking
- **Query functions exist for per-player queries**: `getUnitsForPlayer(world, playerId)` and `getCitiesForPlayer(world, playerId)` already implemented
- **No victory checking currently exists**: No code checks for win/lose conditions at turn end or after combat
- **Turn system has hooks for game-wide effects**: `TurnSystem.processTurnEnd()` is the natural place to check victory conditions
- **No game-over state handling exists**: `GameState` has `TurnPhase` enum but no `GameOver` or `Victory` phase

## Architecture Overview

### Current Player Tracking

Players are represented only by numeric IDs (playerId: 0, 1, 2...) stored in ownership components:

```typescript
// From /Users/alex/workspace/civ/src/ecs/world.ts
export const OwnerComponent = defineComponent({
  playerId: Types.ui8,
});
```

Player 0 is the human player by convention. Player 1+ are AI opponents (currently spawned in test scenarios).

### Unit/City Ownership Queries

```typescript
// From /Users/alex/workspace/civ/src/ecs/unitSystems.ts
export function getUnitsForPlayer(world: IWorld, playerId: number): number[] {
  const units = unitQuery(world);
  return units.filter((eid) => OwnerComponent.playerId[eid] === playerId);
}

// From /Users/alex/workspace/civ/src/ecs/citySystems.ts
export function getCitiesForPlayer(world: IWorld, playerId: number): number[] {
  const cities = cityQuery(world);
  return cities.filter((eid) => OwnerComponent.playerId[eid] === playerId);
}
```

### Current Game State Structure

```typescript
// From /Users/alex/workspace/civ/src/game/GameState.ts
export interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: number;  // Currently unused - always 0
}

// From /Users/alex/workspace/civ/src/game/TurnPhase.ts
export enum TurnPhase {
  TurnStart = 'TurnStart',
  PlayerAction = 'PlayerAction',
  TurnEnd = 'TurnEnd',
}
```

### Entity Removal on Death

```typescript
// From /Users/alex/workspace/civ/src/combat/CombatSystem.ts
private removeUnit(eid: number): void {
  // Deselect if this unit was selected
  if (this.selectionState.isSelected(eid)) {
    this.selectionState.deselect();
  }
  // Remove from renderer
  this.unitRenderer.removeUnit(eid);
  // Remove from ECS
  removeEntity(this.world, eid);
}
```

## Patterns Found

### 1. Reactive State Pattern for UI Updates

Victory/defeat notifications should follow the existing reactive pattern:

```typescript
// Template from /Users/alex/workspace/civ/src/ui/HoverState.ts
export class HoverState {
  private listeners: HoverListener[] = [];

  subscribe(listener: HoverListener): () => void {
    this.listeners.push(listener);
    return () => { /* unsubscribe */ };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentTile);
    }
  }
}
```

### 2. Turn System Hooks

The turn system already has hooks for game-wide processing:

```typescript
// From /Users/alex/workspace/civ/src/game/TurnSystem.ts
export interface TurnProcessingHooks {
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}
```

Victory checking can be added as a new hook or integrated into `processTurnEnd()`.

### 3. UI Panel Pattern

Victory/defeat screen should follow the existing panel pattern:

```typescript
// Template from /Users/alex/workspace/civ/src/ui/TileInfoPanel.ts
export class TileInfoPanel {
  constructor() {
    // Get DOM elements by ID
  }
  show(data): void {
    // Update DOM, remove 'hidden' class
  }
  hide(): void {
    // Add 'hidden' class
  }
}
```

## Missing Features Analysis

### 1. Player/Faction Tracking System

**Current State**: Players are just numeric IDs with no formal data structure.

**Missing Elements**:
- No `Player` entity or data type defining player properties
- No way to enumerate all active players in the game
- No tracking of player elimination (a player with 0 units/cities)
- No multiplayer turn order (all on player 0)

**Implementation Needs**:
```typescript
// New: src/player/Player.ts
export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  isEliminated: boolean;
  color: number;  // Currently hardcoded in PLAYER_COLORS
}

// New: src/player/PlayerManager.ts
export class PlayerManager {
  private players: Map<number, Player> = new Map();

  getPlayer(id: number): Player | undefined;
  getAllPlayers(): Player[];
  getActivePlayers(): Player[];  // Non-eliminated players
  eliminatePlayer(id: number): void;
  isPlayerEliminated(id: number): boolean;
}
```

### 2. Victory Condition System

**Current State**: None - no code checks for victory/defeat.

**Missing Elements**:
- No victory type definitions (Domination, Science, Culture, etc.)
- No victory condition checking logic
- No game-end state handling
- No winner determination

**Implementation Needs**:
```typescript
// New: src/victory/VictoryTypes.ts
export enum VictoryType {
  Domination = 'Domination',     // Destroy all enemies
  // Future: Science, Culture, Diplomatic, Score
}

export interface VictoryCondition {
  type: VictoryType;
  checkCondition(world: IWorld, playerId: number): boolean;
  getDescription(): string;
}

// New: src/victory/VictorySystem.ts
export class VictorySystem {
  checkVictoryConditions(world: IWorld): VictoryResult | null;
  checkEliminationConditions(world: IWorld): number[];  // Eliminated player IDs
}

export interface VictoryResult {
  type: VictoryType;
  winnerId: number;
  losers: number[];
}
```

### 3. Domination Victory Logic

**Current State**: Combat removes units, but no check for "all enemies eliminated".

**Missing Elements**:
- Check if any player has no units AND no cities
- Trigger elimination when player loses everything
- Check if only one player remains (victory)
- Handle city capture (not implemented yet)

**Implementation Needs**:
```typescript
// New: src/victory/DominationVictory.ts
export function checkDominationVictory(world: IWorld, playerIds: number[]): VictoryResult | null {
  const activePlayers = playerIds.filter(id => {
    const units = getUnitsForPlayer(world, id);
    const cities = getCitiesForPlayer(world, id);
    return units.length > 0 || cities.length > 0;
  });

  if (activePlayers.length === 1) {
    return {
      type: VictoryType.Domination,
      winnerId: activePlayers[0],
      losers: playerIds.filter(id => id !== activePlayers[0]),
    };
  }

  return null;  // No winner yet
}

export function checkPlayerElimination(world: IWorld, playerId: number): boolean {
  const units = getUnitsForPlayer(world, playerId);
  const cities = getCitiesForPlayer(world, playerId);
  return units.length === 0 && cities.length === 0;
}
```

### 4. Game End State Handling

**Current State**: `TurnPhase` has no game-over state.

**Missing Elements**:
- Game-over phase that blocks player actions
- Victory/defeat screen display
- Option to restart or return to menu
- Disable UI controls after game ends

**Implementation Needs**:
```typescript
// Modify: src/game/TurnPhase.ts
export enum TurnPhase {
  TurnStart = 'TurnStart',
  PlayerAction = 'PlayerAction',
  TurnEnd = 'TurnEnd',
  GameOver = 'GameOver',  // NEW
}

// Modify: src/game/GameState.ts
export interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: number;
  gameResult: VictoryResult | null;  // NEW
}
```

### 5. Victory/Defeat UI

**Current State**: No victory or defeat screen.

**Missing Elements**:
- Victory screen overlay showing winner
- Defeat screen for human player loss
- Game statistics (units killed, cities founded, etc.)
- Restart/menu buttons

**Implementation Needs**:
```html
<!-- Add to index.html -->
<div id="victory-overlay" class="hidden">
  <div class="victory-panel">
    <h1 id="victory-title">Victory!</h1>
    <p id="victory-message">You have achieved Domination victory!</p>
    <div class="victory-stats">
      <div>Turns: <span id="victory-turns">42</span></div>
      <div>Units destroyed: <span id="victory-kills">5</span></div>
    </div>
    <button id="restart-btn">Play Again</button>
  </div>
</div>
```

```typescript
// New: src/ui/VictoryOverlay.ts
export class VictoryOverlay {
  showVictory(result: VictoryResult, isHumanWinner: boolean): void;
  showDefeat(result: VictoryResult): void;
  onRestart(callback: () => void): void;
  hide(): void;
}
```

### 6. Combat-Triggered Victory Check

**Current State**: Combat removes units but doesn't check for victory.

**Missing Elements**:
- Victory check after each combat that kills a unit
- Immediate game-end when last enemy unit dies
- Not waiting until turn end for victory check

**Implementation Needs**:
```typescript
// Modify: src/combat/CombatSystem.ts
export class CombatExecutor {
  private victorySystem: VictorySystem;  // NEW dependency

  executeAttack(attackerEid: number, targetPos: TilePosition): CombatResult | null {
    // ... existing combat logic ...

    // After removing dead units, check for victory
    if (!result.defenderSurvives) {
      this.removeUnit(defenderEid);
      this.checkForVictory();  // NEW
    }
    // ...
  }

  private checkForVictory(): void {
    const result = this.victorySystem.checkVictoryConditions(this.world);
    if (result) {
      this.gameState.setGameOver(result);
    }
  }
}
```

## Key Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `/Users/alex/workspace/civ/src/ecs/world.ts` | ECS components including OwnerComponent | Player ownership tracking |
| `/Users/alex/workspace/civ/src/ecs/unitSystems.ts` | Unit queries including `getUnitsForPlayer` | Check units per player |
| `/Users/alex/workspace/civ/src/ecs/citySystems.ts` | City queries including `getCitiesForPlayer` | Check cities per player |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Combat execution and unit removal | Integration point for victory check |
| `/Users/alex/workspace/civ/src/game/GameState.ts` | Game state management | Add game-over state |
| `/Users/alex/workspace/civ/src/game/TurnSystem.ts` | Turn processing | Hook for turn-end victory check |
| `/Users/alex/workspace/civ/src/game/TurnPhase.ts` | Turn phase enum | Add GameOver phase |
| `/Users/alex/workspace/civ/src/render/UnitRenderer.ts` | Player colors array | Player identification |
| `/Users/alex/workspace/civ/src/main.ts` | Application entry point | Integration wiring |
| `/Users/alex/workspace/civ/index.html` | DOM structure | Add victory overlay |

## Implementation Recommendations

### Phase 1: Player Management Foundation

1. **Create Player Data Structure** (`src/player/Player.ts`)
   - Define `Player` interface with id, name, isHuman, isEliminated
   - Create `PlayerManager` class to track all players
   - Initialize with human player (0) and AI players (1+)

2. **Integrate PlayerManager** (`src/main.ts`)
   - Initialize PlayerManager at game start
   - Set up initial players based on game configuration

### Phase 2: Victory Condition Core

1. **Create Victory Types** (`src/victory/VictoryTypes.ts`)
   - Define `VictoryType` enum starting with Domination
   - Create `VictoryResult` interface

2. **Create VictorySystem** (`src/victory/VictorySystem.ts`)
   - Implement `checkDominationVictory()` using existing unit/city queries
   - Implement `checkPlayerElimination()` for detecting eliminated players
   - Return `VictoryResult` when conditions met

3. **Create Domination Victory Logic** (`src/victory/DominationVictory.ts`)
   - Pure function to check if only one player has units/cities
   - Use `getUnitsForPlayer()` and `getCitiesForPlayer()`

### Phase 3: Game State Integration

1. **Extend TurnPhase** (`src/game/TurnPhase.ts`)
   - Add `GameOver` phase

2. **Extend GameState** (`src/game/GameState.ts`)
   - Add `gameResult: VictoryResult | null`
   - Add `setGameOver(result)` method
   - Notify listeners on game-over

3. **Block Actions in GameOver** (`src/combat/CombatSystem.ts`, `src/unit/MovementSystem.ts`)
   - Check `gameState.getPhase() !== TurnPhase.GameOver` before actions

### Phase 4: Victory Check Integration

1. **Add Combat-Time Victory Check** (`src/combat/CombatSystem.ts`)
   - After `removeUnit()`, check victory conditions
   - Trigger game-over immediately if condition met

2. **Add Turn-End Victory Check** (`src/game/TurnSystem.ts`)
   - Check victory conditions in `processTurnEnd()`
   - Handle edge cases (e.g., cities captured)

### Phase 5: Victory UI

1. **Create Victory Overlay** (`src/ui/VictoryOverlay.ts`)
   - Modal overlay showing victory/defeat
   - Different messages for winner vs loser
   - Restart button

2. **Add DOM Elements** (`index.html`)
   - Victory overlay structure
   - Victory/defeat styling

3. **Wire Up UI** (`src/main.ts`)
   - Subscribe to gameState for game-over
   - Show appropriate overlay based on human player status

## Proposed File Structure

```
src/
  player/
    index.ts              - Module exports
    Player.ts             - Player interface and constants
    PlayerManager.ts      - Player tracking and management
  victory/
    index.ts              - Module exports
    VictoryTypes.ts       - Victory enums and interfaces
    VictorySystem.ts      - Victory condition orchestration
    DominationVictory.ts  - Domination victory check logic
  ui/
    VictoryOverlay.ts     - Victory/defeat screen UI
```

## Dependencies and Risks

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| OwnerComponent | Complete | Player ownership exists |
| getUnitsForPlayer | Complete | Unit query per player |
| getCitiesForPlayer | Complete | City query per player |
| Combat unit removal | Complete | Dead units already removed |
| GameState reactive | Complete | Listener pattern exists |
| Turn system hooks | Complete | processTurnEnd exists |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| City capture not implemented | High | Medium | Domination works with unit-only check initially |
| Multiple human players | Low | Medium | Defer multiplayer; focus on single-player |
| Victory check performance | Low | Low | Only check when units/cities change |
| UI overlay blocking game | Low | Medium | Careful z-index and event handling |
| Restart functionality complex | Medium | Medium | Simple page reload initially |

### Integration Risks

1. **Combat executor dependency injection**: Adding VictorySystem to CombatExecutor requires constructor changes and potentially dependency updates in main.ts

2. **Game state modification**: Adding gameResult to GameState may require snapshot interface updates and listener handling

3. **Blocking player actions**: Need to ensure all action entry points check for GameOver phase

## Testing Strategy

### Unit Tests

1. **Victory condition checks**:
   - Test with 1 player having units, others have none
   - Test with 1 player having cities only
   - Test with multiple players still active
   - Test with 0 players (edge case)

2. **Elimination detection**:
   - Player with no units and no cities is eliminated
   - Player with units but no cities is NOT eliminated
   - Player with cities but no units is NOT eliminated

### Integration Tests

1. **Combat leading to victory**:
   - Set up two players with one unit each
   - Execute combat that kills the enemy
   - Verify victory triggered

2. **Turn-end victory check**:
   - Verify victory is checked at turn end
   - Verify game enters GameOver phase

## Open Questions

1. **City capture vs destruction**: When implementing city capture, should capturing the last city trigger victory, or does the player need to lose all units too?
   - Recommendation: Capturing last city should trigger victory (matches Civ behavior)

2. **Settler-only scenario**: If a player has only Settlers (no military), can they be eliminated?
   - Recommendation: Yes, a player with only non-combat units is still in the game

3. **Restart vs new game**: Should "Play Again" restart with same seed or generate new map?
   - Recommendation: New random seed for variety

4. **Statistics tracking**: Should we track combat statistics for victory screen?
   - Recommendation: Defer statistics to post-MVP; basic victory message first

5. **AI player elimination**: When an AI player is eliminated mid-game, any special handling?
   - Recommendation: Just log it; no special UI needed initially

6. **Draw conditions**: Can there be a draw (all players eliminated simultaneously)?
   - Recommendation: Edge case - whoever attacks last survives, so attacker wins ties

7. **Turn limit victory**: Should there be a score/turn-limit victory type?
   - Recommendation: Defer to later; Domination is simplest for MVP

## Implementation Order

1. **Phase 1: Foundation** (1 hour)
   - Create Player interface and PlayerManager
   - Basic player initialization in main.ts

2. **Phase 2: Victory Core** (1.5 hours)
   - Create VictoryTypes and VictorySystem
   - Implement DominationVictory check function
   - Unit tests for victory logic

3. **Phase 3: Game State** (1 hour)
   - Add GameOver to TurnPhase
   - Add gameResult to GameState
   - Add setGameOver method with notification

4. **Phase 4: Integration** (1.5 hours)
   - Add victory check to CombatExecutor
   - Add victory check to TurnSystem
   - Block actions when game over

5. **Phase 5: UI** (1.5 hours)
   - Add victory overlay HTML
   - Create VictoryOverlay class
   - Wire up to GameState changes
   - Restart functionality

**Total estimated time: 6.5 hours**

## Conclusion

The OpenCiv codebase is well-structured for adding victory conditions. The key missing pieces are:

1. **Formal player tracking** - currently just implicit IDs
2. **Victory condition system** - no checking logic exists
3. **Game-over state** - no phase for ended games
4. **Victory UI** - no screen for win/loss

The Domination victory is the simplest to implement because:
- Unit and city ownership tracking already exists
- Unit removal on combat death already works
- Per-player queries are already implemented

Implementation can proceed incrementally, starting with basic victory detection and adding UI polish afterward. The reactive state pattern used throughout the codebase provides a clean integration point for victory notifications.
