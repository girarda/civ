# Research: Victory System Implementation

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research analyzes the OpenCiv codebase to understand how to implement a victory system, with focus on Domination victory (last player standing wins). The codebase has a well-implemented Player/Faction tracking system with elimination detection already built into PlayerManager. The main remaining work is creating a VictorySystem to orchestrate victory checking and adding UI for game-end states.

## Key Discoveries

- **Player system is fully implemented**: `PlayerManager` in `src/player/` provides player tracking, elimination checking, and event notifications
- **Elimination checking exists**: `PlayerManager.checkElimination(world, playerId)` already checks if a player has zero units AND zero cities
- **Combat triggers elimination checks**: `CombatSystem.removeUnit()` calls `playerManager.checkElimination()` after unit death
- **Event system in place**: `EventBus` in `src/engine/events/` supports typed game events
- **No victory system implemented yet**: No `src/victory/` directory exists
- **GameState lacks game-over phase**: `TurnPhase` enum has only `TurnStart`, `PlayerAction`, `TurnEnd`
- **Helper functions available**: `getUnitsForPlayer()` and `getCitiesForPlayer()` exist and are used

## Architecture Overview

### Existing Player Tracking (Implemented)

The player system is fully functional:

```typescript
// /Users/alex/workspace/civ/src/player/Player.ts
export interface Player {
  readonly id: number;       // Matches OwnerComponent.playerId
  name: string;              // "Player 1", faction name, etc.
  color: number;             // Hex color for rendering
  isHuman: boolean;          // true for human players
  isEliminated: boolean;     // true when defeated
}
```

```typescript
// /Users/alex/workspace/civ/src/player/PlayerManager.ts
export class PlayerManager {
  // Initialize with human and AI players
  initialize(humanPlayerIds: number[], totalPlayers: number): void;

  // Query methods
  getPlayer(id: number): PlayerSnapshot | undefined;
  getAllPlayers(): PlayerSnapshot[];
  getActivePlayers(): PlayerSnapshot[];  // Non-eliminated players
  getActivePlayerCount(): number;

  // Elimination handling
  checkElimination(world: IWorld, playerId: number): boolean;
  eliminatePlayer(playerId: number): void;
  isPlayerEliminated(id: number): boolean;

  // Event subscription
  subscribe(listener: PlayerListener): () => void;
}
```

### Combat System Integration (Implemented)

Combat already triggers elimination checks:

```typescript
// /Users/alex/workspace/civ/src/combat/CombatSystem.ts (lines 150-168)
private removeUnit(eid: number): void {
  // Get owner before removing (for elimination check)
  const playerId = getUnitOwner(eid);

  // Deselect if this unit was selected
  if (this.selectionState.isSelected(eid)) {
    this.selectionState.deselect();
  }

  // Remove from renderer
  this.unitRenderer.removeUnit(eid);

  // Remove from ECS
  removeEntity(this.world, eid);

  // Check for player elimination
  if (this.playerManager) {
    this.playerManager.checkElimination(this.world, playerId);
  }
}
```

### Main.ts Integration (Implemented)

PlayerManager is initialized and wired up:

```typescript
// /Users/alex/workspace/civ/src/main.ts (lines 158-171)
// Initialize player manager
const playerManager = new PlayerManager();
playerManager.initialize([0], 2); // Player 0 is human, 2 total players

// Subscribe to elimination events for notifications
playerManager.subscribe((event) => {
  if (event.type === 'eliminated') {
    const player = playerManager.getPlayer(event.playerId);
    notificationState.push(
      NotificationType.Success,
      `${player?.name ?? 'Unknown player'} has been eliminated!`
    );
  }
});
```

### Turn System (Implemented)

Turn processing already has hooks where victory checks can be added:

```typescript
// /Users/alex/workspace/civ/src/game/TurnSystem.ts
export interface TurnProcessingHooks {
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}
```

### Event System (Implemented)

The EventBus supports game events:

```typescript
// /Users/alex/workspace/civ/src/engine/events/types.ts
export type GameEventType =
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

## Patterns Found

### 1. Reactive State Pattern for UI

All UI state follows subscriber pattern:

```typescript
// From /Users/alex/workspace/civ/src/ui/HoverState.ts
export class SomeState {
  private listeners: Listener[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => { /* unsubscribe */ };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.currentValue);
    }
  }
}
```

### 2. Panel UI Pattern

UI panels follow consistent show/hide pattern:

```typescript
// From /Users/alex/workspace/civ/src/ui/TileInfoPanel.ts
export class SomePanel {
  private element: HTMLElement;

  constructor() {
    this.element = document.getElementById('panel-id')!;
  }

  show(data: Data): void {
    // Update element content
    this.element.classList.remove('hidden');
  }

  hide(): void {
    this.element.classList.add('hidden');
  }
}
```

### 3. Turn Processing Hook Pattern

Turn events are processed via hooks:

```typescript
// From /Users/alex/workspace/civ/src/main.ts (lines 405-435)
const turnSystem = new TurnSystem(gameState, {
  onTurnStart: () => {
    movementExecutor.resetAllMovementPoints();
    // ... other start-of-turn processing
  },
  onTurnEnd: () => {
    cityProcessor.processTurnEnd();
    // ... other end-of-turn processing
  },
});
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/player/Player.ts` | Player interface and constants (MAX_PLAYERS, PLAYER_COLORS) |
| `/Users/alex/workspace/civ/src/player/PlayerManager.ts` | Player state management with elimination checking |
| `/Users/alex/workspace/civ/src/ecs/unitSystems.ts` | `getUnitsForPlayer()` helper function |
| `/Users/alex/workspace/civ/src/ecs/citySystems.ts` | `getCitiesForPlayer()` helper function |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Combat execution, calls elimination check |
| `/Users/alex/workspace/civ/src/game/GameState.ts` | Game state with turn number and phase |
| `/Users/alex/workspace/civ/src/game/TurnPhase.ts` | Turn phase enum (TurnStart, PlayerAction, TurnEnd) |
| `/Users/alex/workspace/civ/src/game/TurnSystem.ts` | Turn processing with hooks |
| `/Users/alex/workspace/civ/src/engine/events/types.ts` | Game event type definitions |
| `/Users/alex/workspace/civ/src/engine/events/EventBus.ts` | Event pub/sub system |
| `/Users/alex/workspace/civ/src/main.ts` | Application entry point, wires everything together |
| `/Users/alex/workspace/civ/index.html` | DOM structure for UI panels |

## Integration Points

### 1. Victory Check After Combat

The combat system already checks for elimination. Victory checking should be added:

```typescript
// In CombatSystem.ts removeUnit(), after checkElimination:
if (this.playerManager.checkElimination(this.world, playerId)) {
  // Player was eliminated, check if game is won
  this.checkVictory();
}
```

### 2. Victory Check at Turn End

Add to TurnSystem hooks:

```typescript
const turnSystem = new TurnSystem(gameState, {
  onTurnEnd: () => {
    cityProcessor.processTurnEnd();
    victorySystem.checkVictoryConditions(); // NEW
  },
});
```

### 3. Game Over State in GameState

Extend GameState to track game-over:

```typescript
// Extended GameState
setGameOver(result: VictoryResult): void;
isGameOver(): boolean;
getVictoryResult(): VictoryResult | null;
```

### 4. Block Actions When Game Over

All action entry points should check game state:

```typescript
// In CombatSystem.canAttack()
if (this.gameState.isGameOver()) {
  return false;
}

// In MovementExecutor
if (this.gameState.isGameOver()) {
  return false;
}
```

## Helper Functions Needed

### Already Implemented

- `getUnitsForPlayer(world, playerId)` - Returns entity IDs of player's units
- `getCitiesForPlayer(world, playerId)` - Returns entity IDs of player's cities
- `PlayerManager.getActivePlayers()` - Returns non-eliminated players
- `PlayerManager.checkElimination(world, playerId)` - Checks and marks elimination
- `PlayerManager.isPlayerEliminated(id)` - Returns elimination status

### To Implement

```typescript
// In new src/victory/VictorySystem.ts
export function checkDominationVictory(playerManager: PlayerManager): VictoryResult | null {
  const activePlayers = playerManager.getActivePlayers();
  if (activePlayers.length === 1) {
    return {
      type: VictoryType.Domination,
      winnerId: activePlayers[0].id,
      losers: playerManager.getEliminatedPlayers().map(p => p.id),
    };
  }
  return null;
}
```

## Recommendations

### Phase 1: Victory Types and Core System

1. **Create victory type definitions** (`src/victory/VictoryTypes.ts`)
   ```typescript
   export enum VictoryType {
     Domination = 'Domination',
     // Future: Science, Culture, Diplomatic, Score
   }

   export interface VictoryResult {
     type: VictoryType;
     winnerId: number;
     losers: number[];
     turnNumber: number;
   }
   ```

2. **Create VictorySystem** (`src/victory/VictorySystem.ts`)
   - `checkVictoryConditions()` - Orchestrates all victory type checks
   - `checkDominationVictory()` - Specific check for last player standing
   - Returns `VictoryResult | null`

### Phase 2: Game State Integration

1. **Extend TurnPhase** (`src/game/TurnPhase.ts`)
   - Add `GameOver = 'GameOver'` to enum

2. **Extend GameState** (`src/game/GameState.ts`)
   - Add `victoryResult: VictoryResult | null`
   - Add `setGameOver(result: VictoryResult)` method
   - Add `isGameOver()` method
   - Notify listeners on game-over

3. **Block Actions** - Update canAttack/canMove checks

### Phase 3: Victory Check Integration

1. **Add to CombatSystem**
   - After elimination check, call `victorySystem.checkVictoryConditions()`
   - If result, call `gameState.setGameOver(result)`

2. **Add to TurnSystem hooks**
   - Check victory conditions at turn end as fallback

### Phase 4: Victory UI

1. **Add Victory Overlay HTML** (`index.html`)
   ```html
   <div id="victory-overlay" class="hidden">
     <div class="victory-panel">
       <h1 id="victory-title">Victory!</h1>
       <p id="victory-message"></p>
       <div id="victory-stats"></div>
       <button id="restart-btn">Play Again</button>
     </div>
   </div>
   ```

2. **Create VictoryOverlay** (`src/ui/VictoryOverlay.ts`)
   - Follow existing panel pattern
   - `showVictory(result, isHumanWinner)`
   - `showDefeat(result)`
   - Restart button triggers map regeneration

3. **Wire Up in main.ts**
   - Subscribe to GameState changes
   - Show overlay when game over

### Phase 5: Event System Integration

1. **Add victory event type** (`src/engine/events/types.ts`)
   ```typescript
   export interface GameOverEvent extends GameEvent {
     type: 'GAME_OVER';
     victoryType: VictoryType;
     winnerId: number;
   }
   ```

2. **Emit event when game ends**
   - Allows other systems to react to game over

## Proposed File Structure

```
src/
  victory/
    index.ts              - Module exports
    VictoryTypes.ts       - Victory enums and interfaces
    VictorySystem.ts      - Victory condition orchestration
  ui/
    VictoryOverlay.ts     - Victory/defeat screen UI (NEW)
```

## Implementation Complexity

| Task | Complexity | Dependencies |
|------|------------|--------------|
| VictoryTypes.ts | Low | None |
| VictorySystem.ts | Low | PlayerManager |
| Extend GameState | Low | VictoryTypes |
| Extend TurnPhase | Trivial | None |
| Block actions on game over | Low | GameState |
| Victory check in combat | Low | VictorySystem, GameState |
| VictoryOverlay.ts | Medium | DOM, CSS |
| Wire up in main.ts | Low | All above |

**Total estimated time: 4-5 hours**

## Open Questions

1. **City capture**: When city capture is implemented, should capturing all cities without eliminating all units trigger victory?
   - **Recommendation**: Follow Civ rules - a player with no units AND no cities is eliminated

2. **Immediate vs turn-end check**: Should victory be checked immediately after combat or at turn end?
   - **Recommendation**: Immediate for better UX - player sees victory right away

3. **Restart behavior**: Should "Play Again" use same seed or new seed?
   - **Recommendation**: New random seed for variety

4. **Statistics tracking**: Track kills, cities founded, turns played?
   - **Recommendation**: Defer to post-MVP, just show victory message

5. **Animation/delay**: Should there be a delay before showing victory screen?
   - **Recommendation**: Small delay (500ms) to let the final combat resolve visually

## Conclusion

The OpenCiv codebase is well-prepared for adding a victory system:

1. **Player tracking is complete** - PlayerManager has all needed methods
2. **Elimination checking exists** - Already called after combat
3. **Event system is ready** - Can emit game-over events
4. **UI patterns are established** - Follow existing panel/overlay patterns

The main work remaining is:
- Create VictorySystem to orchestrate checking
- Extend GameState with game-over state
- Add UI for victory/defeat screens
- Wire everything together in main.ts

This is a straightforward feature to implement given the existing infrastructure.
