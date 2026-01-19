# Plan: Victory System

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement a victory system for OpenCiv that detects when a player has won the game and displays victory/defeat screens. The initial implementation focuses on Domination victory (last player standing wins). The system integrates with the existing PlayerManager (which already has elimination tracking), GameState, and turn system.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-victory-system.md`:

- **Player system fully implemented**: `PlayerManager` provides player tracking, elimination checking (`checkElimination()`), and event notifications
- **Elimination checking exists**: `PlayerManager.checkElimination(world, playerId)` checks if a player has 0 units AND 0 cities
- **Combat triggers elimination**: `CombatSystem.removeUnit()` already calls `playerManager.checkElimination()` after unit death
- **Helper functions available**: `getActivePlayers()`, `getEliminatedPlayers()`, `isPlayerEliminated()`
- **Event system ready**: `EventBus` supports typed game events; can add `GameOverEvent`
- **UI patterns established**: Follow `TileInfoPanel`/`CombatPreviewPanel` pattern for victory overlay
- **TurnPhase lacks GameOver**: Currently only has `TurnStart`, `PlayerAction`, `TurnEnd`

The main work remaining is:
1. Create VictorySystem to orchestrate victory checking
2. Extend GameState with game-over state
3. Add TurnPhase.GameOver
4. Block player actions when game is over
5. Add UI for victory/defeat screens
6. Wire everything together in main.ts

## Phased Implementation

### Phase 1: Victory Types and Core Logic

**Goal**: Define victory types and create the core victory checking system.

#### Tasks

- [ ] Create `/Users/alex/workspace/civ/src/victory/VictoryTypes.ts`:
  ```typescript
  export enum VictoryType {
    Domination = 'Domination',
    // Future: Science, Culture, Diplomatic, Score
  }

  export interface VictoryResult {
    type: VictoryType;
    winnerId: number;
    winnerName: string;
    losers: number[];
    turnNumber: number;
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/victory/DominationVictory.ts`:
  ```typescript
  import { PlayerManager } from '../player';
  import { VictoryResult, VictoryType } from './VictoryTypes';

  /**
   * Check if domination victory has been achieved.
   * Domination: Only one player remains (all others eliminated).
   */
  export function checkDominationVictory(
    playerManager: PlayerManager,
    turnNumber: number
  ): VictoryResult | null {
    const activePlayers = playerManager.getActivePlayers();

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      return {
        type: VictoryType.Domination,
        winnerId: winner.id,
        winnerName: winner.name,
        losers: playerManager.getEliminatedPlayers().map(p => p.id),
        turnNumber,
      };
    }

    return null;
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/victory/VictorySystem.ts`:
  ```typescript
  import { PlayerManager } from '../player';
  import { GameState } from '../game/GameState';
  import { VictoryResult } from './VictoryTypes';
  import { checkDominationVictory } from './DominationVictory';

  export class VictorySystem {
    private playerManager: PlayerManager;
    private gameState: GameState;

    constructor(playerManager: PlayerManager, gameState: GameState);

    /**
     * Check all victory conditions.
     * Returns VictoryResult if game is won, null otherwise.
     */
    checkVictoryConditions(): VictoryResult | null;

    /**
     * Call after elimination to check for victory.
     * If victory achieved, sets game over state.
     */
    onPlayerEliminated(): void;
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/victory/index.ts` - module exports

- [ ] Write unit tests in `/Users/alex/workspace/civ/src/victory/VictorySystem.test.ts`:
  - 2 players, 1 eliminated -> domination victory
  - 3 players, 1 eliminated -> no victory yet
  - 3 players, 2 eliminated -> domination victory
  - All players active -> no victory

#### Success Criteria

- [ ] VictoryType enum defined with Domination
- [ ] VictoryResult interface captures winner, losers, turn number
- [ ] checkDominationVictory correctly identifies last player standing
- [ ] VictorySystem.checkVictoryConditions returns correct results
- [ ] Unit tests pass for all victory checking scenarios

---

### Phase 2: Game State Integration

**Goal**: Extend GameState and TurnPhase to support game-over state.

#### Tasks

- [ ] Modify `/Users/alex/workspace/civ/src/game/TurnPhase.ts`:
  ```typescript
  export enum TurnPhase {
    TurnStart = 'TurnStart',
    PlayerAction = 'PlayerAction',
    TurnEnd = 'TurnEnd',
    GameOver = 'GameOver',  // NEW
  }
  ```

- [ ] Modify `/Users/alex/workspace/civ/src/game/GameState.ts`:
  - Add `victoryResult: VictoryResult | null` private field
  - Add `setGameOver(result: VictoryResult): void` method
    - Sets phase to `TurnPhase.GameOver`
    - Stores victory result
    - Notifies listeners
  - Add `isGameOver(): boolean` method
  - Add `getVictoryResult(): VictoryResult | null` method
  - Update `GameStateSnapshot` interface to include `victoryResult`
  - Update `clear()` to reset victory state

- [ ] Update GameStateSnapshot interface:
  ```typescript
  export interface GameStateSnapshot {
    turnNumber: number;
    phase: TurnPhase;
    currentPlayer: number;
    victoryResult: VictoryResult | null;  // NEW
  }
  ```

- [ ] Write unit tests for GameState game-over functionality:
  - setGameOver transitions to GameOver phase
  - isGameOver returns correct value
  - getVictoryResult returns stored result
  - clear() resets victory state
  - Listeners notified on game over

#### Success Criteria

- [ ] TurnPhase.GameOver exists
- [ ] GameState.setGameOver() transitions to GameOver phase
- [ ] GameState.isGameOver() returns true after game over
- [ ] GameState.getVictoryResult() returns the stored result
- [ ] GameStateSnapshot includes victoryResult
- [ ] Listeners notified when game ends
- [ ] Unit tests pass

---

### Phase 3: Action Blocking

**Goal**: Block player actions when game is over.

#### Tasks

- [ ] Modify `/Users/alex/workspace/civ/src/combat/CombatSystem.ts`:
  - Update `canAttack()` to return false if `gameState.isGameOver()`
  - Add early return at start of method

- [ ] Modify `/Users/alex/workspace/civ/src/unit/MovementExecutor.ts`:
  - Add `gameState` dependency to constructor
  - Update `executeMove()` to check `gameState.isGameOver()`
  - Return early if game is over

- [ ] Modify `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:
  - Add check in `processTurnEnd()` to skip processing if game over
  - Add check in `setProduction()` to block production changes

- [ ] Modify `/Users/alex/workspace/civ/src/ui/SelectionSystem.ts`:
  - Block unit selection when game is over (optional - may want to allow viewing)

- [ ] Modify `/Users/alex/workspace/civ/src/game/TurnSystem.ts`:
  - Block `nextTurn()` if game is over (or trigger differently)

- [ ] Update turn controls button state:
  - Disable "End Turn" button when game is over

#### Success Criteria

- [ ] Cannot attack units after game over
- [ ] Cannot move units after game over
- [ ] Cannot change city production after game over
- [ ] End Turn button is disabled after game over
- [ ] Game state frozen at victory moment

---

### Phase 4: Victory UI

**Goal**: Create victory/defeat overlay that shows when game ends.

#### Tasks

- [ ] Add HTML elements to `/Users/alex/workspace/civ/index.html`:
  ```html
  <div id="victory-overlay" class="hidden">
    <div class="victory-panel">
      <h1 id="victory-title">Victory!</h1>
      <p id="victory-type"></p>
      <p id="victory-message"></p>
      <div id="victory-stats">
        <div class="stat-row">
          <span class="label">Turn:</span>
          <span id="victory-turn">1</span>
        </div>
      </div>
      <button id="play-again-btn">Play Again</button>
    </div>
  </div>
  ```

- [ ] Add CSS styles to `/Users/alex/workspace/civ/src/style.css`:
  ```css
  /* Victory Overlay */
  #victory-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
  }

  #victory-overlay.hidden {
    display: none;
  }

  .victory-panel {
    background: rgba(26, 26, 46, 0.98);
    border: 3px solid #6a9a6a;
    border-radius: 12px;
    padding: 40px 60px;
    text-align: center;
    color: #e0e0e0;
    font-family: 'Segoe UI', sans-serif;
    min-width: 400px;
  }

  .victory-panel.defeat {
    border-color: #9a4a4a;
  }

  #victory-title {
    font-size: 48px;
    margin: 0 0 16px 0;
    color: #90c090;
  }

  .victory-panel.defeat #victory-title {
    color: #c09090;
  }

  #victory-type {
    font-size: 24px;
    color: #a0a0b0;
    margin: 0 0 24px 0;
  }

  #victory-message {
    font-size: 18px;
    margin: 0 0 32px 0;
  }

  #victory-stats {
    margin-bottom: 32px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
  }

  #victory-stats .stat-row {
    display: flex;
    justify-content: space-between;
    margin: 8px 0;
  }

  #victory-stats .label {
    color: #a0a0b0;
  }

  #play-again-btn {
    background: #5a8a5a;
    border: none;
    border-radius: 8px;
    color: #ffffff;
    padding: 16px 32px;
    cursor: pointer;
    font-size: 18px;
    font-weight: 600;
    transition: background 0.15s ease;
  }

  #play-again-btn:hover {
    background: #6a9a6a;
  }
  ```

- [ ] Create `/Users/alex/workspace/civ/src/ui/VictoryOverlay.ts`:
  ```typescript
  import { VictoryResult, VictoryType } from '../victory/VictoryTypes';

  export class VictoryOverlay {
    private overlay: HTMLElement;
    private titleEl: HTMLElement;
    private typeEl: HTMLElement;
    private messageEl: HTMLElement;
    private turnEl: HTMLElement;
    private playAgainBtn: HTMLElement;
    private panel: HTMLElement;

    constructor();

    /**
     * Show victory screen for the winner.
     */
    showVictory(result: VictoryResult): void;

    /**
     * Show defeat screen for the loser.
     */
    showDefeat(result: VictoryResult, loserName: string): void;

    /**
     * Hide the overlay.
     */
    hide(): void;

    /**
     * Register callback for play again button.
     */
    onPlayAgain(callback: () => void): void;
  }
  ```

- [ ] Implement victory message logic:
  - Victory: "You have achieved {VictoryType} Victory!"
  - Defeat: "{WinnerName} has achieved {VictoryType} Victory!"

- [ ] Add to UI exports in `/Users/alex/workspace/civ/src/ui/index.ts`

#### Success Criteria

- [ ] Victory overlay displays centered on screen
- [ ] Victory shows green styling with "Victory!" title
- [ ] Defeat shows red styling with "Defeat!" title
- [ ] Victory type displayed (e.g., "Domination Victory")
- [ ] Turn number shown in stats
- [ ] Play Again button visible and clickable
- [ ] Overlay hidden by default

---

### Phase 5: Integration and Wiring

**Goal**: Wire victory system into main.ts and connect all components.

#### Tasks

- [ ] Update `/Users/alex/workspace/civ/src/main.ts`:
  - Import victory modules
  - Create `VictorySystem` instance after PlayerManager
  - Create `VictoryOverlay` instance
  - Subscribe to PlayerManager elimination events:
    ```typescript
    playerManager.subscribe((event) => {
      if (event.type === 'eliminated') {
        // Existing notification code...

        // Check for victory
        const result = victorySystem.checkVictoryConditions();
        if (result) {
          gameState.setGameOver(result);
        }
      }
    });
    ```
  - Subscribe to GameState for game-over:
    ```typescript
    gameState.subscribe((state) => {
      // Existing turn display update...

      if (state.victoryResult) {
        const humanPlayer = playerManager.getHumanPlayers()[0];
        if (humanPlayer && state.victoryResult.winnerId === humanPlayer.id) {
          victoryOverlay.showVictory(state.victoryResult);
        } else {
          victoryOverlay.showDefeat(state.victoryResult, humanPlayer?.name ?? 'You');
        }
      }
    });
    ```
  - Wire Play Again button to regenerate map:
    ```typescript
    victoryOverlay.onPlayAgain(() => {
      victoryOverlay.hide();
      generateMap(Math.floor(Math.random() * 1000000));
    });
    ```
  - Update `generateMap()` to reset game state:
    ```typescript
    function generateMap(seed: number): void {
      // Existing clear code...
      gameState.clear();  // Resets victory state
      // ...rest of generation
    }
    ```

- [ ] Add optional 500ms delay before showing victory overlay:
  ```typescript
  setTimeout(() => {
    if (state.victoryResult.winnerId === humanPlayer.id) {
      victoryOverlay.showVictory(state.victoryResult);
    } else {
      victoryOverlay.showDefeat(state.victoryResult, humanPlayer?.name ?? 'You');
    }
  }, 500);
  ```

- [ ] Pass gameState to MovementExecutor (if not already):
  - Update constructor call in main.ts

- [ ] Update TurnControls to disable button on game over:
  - Add method `setEnabled(enabled: boolean)` to TurnControls
  - Subscribe to game state and disable when game over

#### Success Criteria

- [ ] Victory system created and initialized in main.ts
- [ ] Victory checked after each elimination
- [ ] Victory overlay shown when game ends
- [ ] Correct victory/defeat screen shown based on winner
- [ ] Play Again button regenerates map with new seed
- [ ] All actions blocked after game over
- [ ] End Turn button disabled after game over

---

### Phase 6: Event System Integration

**Goal**: Emit game-over event through EventBus for future extensibility.

#### Tasks

- [ ] Add GameOverEvent to `/Users/alex/workspace/civ/src/engine/events/types.ts`:
  ```typescript
  export interface GameOverEvent extends GameEvent {
    type: 'GAME_OVER';
    victoryType: VictoryType;
    winnerId: number;
    winnerName: string;
    turnNumber: number;
  }

  // Add to GameEventType union
  export type GameEventType =
    | UnitMovedEvent
    | ...
    | GameOverEvent;

  // Add type guard
  export function isGameOverEvent(event: GameEvent): event is GameOverEvent {
    return event.type === 'GAME_OVER';
  }
  ```

- [ ] Emit event from VictorySystem when game ends
- [ ] (Future use: replay system, achievements, analytics)

#### Success Criteria

- [ ] GameOverEvent interface defined
- [ ] Event emitted when game ends
- [ ] Type guard function available

---

### Phase 7: Testing and Polish

**Goal**: Comprehensive testing and edge case handling.

#### Tasks

- [ ] Write E2E test `/Users/alex/workspace/civ/e2e/victory.spec.ts`:
  - Eliminate all enemy units to trigger victory
  - Verify victory overlay appears
  - Verify Play Again works

- [ ] Manual testing checklist:
  - [ ] Eliminate enemy player -> victory overlay shows
  - [ ] Victory shows correct type (Domination)
  - [ ] Victory shows correct turn number
  - [ ] Cannot move units after victory
  - [ ] Cannot attack after victory
  - [ ] Cannot end turn after victory
  - [ ] Play Again regenerates map
  - [ ] New game works normally after Play Again

- [ ] Edge case testing:
  - [ ] Both players lose last unit simultaneously (attacker vs defender)
  - [ ] Victory on turn 1 (if possible)
  - [ ] Multiple eliminations in same turn

- [ ] Run full test suite and fix failures

#### Success Criteria

- [ ] All unit tests pass
- [ ] E2E test passes
- [ ] Manual testing checklist complete
- [ ] No console errors during victory flow
- [ ] Edge cases handled gracefully

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/victory/VictoryTypes.ts` | Create | Victory enum and result interface |
| `/Users/alex/workspace/civ/src/victory/DominationVictory.ts` | Create | Domination victory check function |
| `/Users/alex/workspace/civ/src/victory/VictorySystem.ts` | Create | Victory condition orchestration |
| `/Users/alex/workspace/civ/src/victory/VictorySystem.test.ts` | Create | Unit tests for victory system |
| `/Users/alex/workspace/civ/src/victory/index.ts` | Create | Module exports |
| `/Users/alex/workspace/civ/src/ui/VictoryOverlay.ts` | Create | Victory/defeat UI panel |
| `/Users/alex/workspace/civ/src/game/TurnPhase.ts` | Modify | Add GameOver phase |
| `/Users/alex/workspace/civ/src/game/GameState.ts` | Modify | Add game-over state management |
| `/Users/alex/workspace/civ/src/combat/CombatSystem.ts` | Modify | Block attacks when game over |
| `/Users/alex/workspace/civ/src/unit/MovementExecutor.ts` | Modify | Block movement when game over |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Modify | Block production when game over |
| `/Users/alex/workspace/civ/src/ui/TurnControls.ts` | Modify | Disable button when game over |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Modify | Export VictoryOverlay |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Initialize and wire victory system |
| `/Users/alex/workspace/civ/src/style.css` | Modify | Add victory overlay styles |
| `/Users/alex/workspace/civ/index.html` | Modify | Add victory overlay DOM |
| `/Users/alex/workspace/civ/src/engine/events/types.ts` | Modify | Add GameOverEvent (optional) |
| `/Users/alex/workspace/civ/e2e/victory.spec.ts` | Create | E2E test for victory flow |

**Total: 7 files to create, 11 files to modify**

---

## Success Criteria

### Functional Requirements
- [ ] Game detects when only one player remains
- [ ] Victory overlay appears when game ends
- [ ] Correct victory/defeat screen based on human player outcome
- [ ] Play Again button starts new game with new seed
- [ ] All player actions blocked after game over

### State Management
- [ ] GameState tracks victory result
- [ ] TurnPhase.GameOver prevents turn advancement
- [ ] Victory state reset on new game
- [ ] Listeners notified of game-over

### UI Requirements
- [ ] Victory overlay centered and prominent
- [ ] Victory (green) and defeat (red) visual distinction
- [ ] Victory type and turn number displayed
- [ ] Play Again button functional

### Integration Requirements
- [ ] Works with existing elimination checking
- [ ] Integrates with PlayerManager events
- [ ] Combat/movement properly blocked
- [ ] Clean state reset on new game

---

## Dependencies & Integration

### Depends On
- **PlayerManager** (`/Users/alex/workspace/civ/src/player/PlayerManager.ts`): `getActivePlayers()`, `getEliminatedPlayers()`, elimination events
- **GameState** (`/Users/alex/workspace/civ/src/game/GameState.ts`): Turn tracking, phase management
- **TurnPhase** (`/Users/alex/workspace/civ/src/game/TurnPhase.ts`): Phase enum
- **CombatSystem** (`/Users/alex/workspace/civ/src/combat/CombatSystem.ts`): Triggers elimination checks
- **UI Patterns**: Follow TileInfoPanel/CombatPreviewPanel patterns

### Consumed By (Future Phases)
- **AI System**: Should stop AI processing when game over
- **Statistics System**: Track victory statistics across games
- **Achievement System**: Unlock achievements on victory
- **Multiplayer**: Handle victory in networked games

### Integration Points
- **PlayerManager**: Subscribe to elimination events
- **GameState**: Add victory result storage
- **CombatSystem**: Check game-over in canAttack
- **MovementExecutor**: Check game-over before moves
- **main.ts**: Wire all components together
- **MapControls**: Play Again triggers regeneration

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Victory check too slow | Low | Low | Simple O(n) check on player count; n is always small |
| Race condition on elimination | Medium | Low | Victory check happens synchronously after elimination |
| Overlay appears during combat animation | Low | Medium | Add 500ms delay before showing overlay |
| Game state not properly reset | High | Low | Explicitly call gameState.clear() in generateMap |
| Listeners not cleaned up | Medium | Low | Use unsubscribe functions, clear in generateMap |
| Both players eliminated same frame | Low | Low | Check winner before processing second death |

---

## Testing Strategy

### Unit Tests

**VictorySystem.test.ts**
- 2 players, 0 eliminated -> no victory
- 2 players, 1 eliminated -> domination victory for survivor
- 3 players, 1 eliminated -> no victory
- 3 players, 2 eliminated -> domination victory
- Human wins -> correct winnerId
- AI wins -> correct winnerId
- Turn number captured correctly

**GameState.test.ts (additions)**
- setGameOver sets phase to GameOver
- isGameOver returns true after setGameOver
- getVictoryResult returns stored result
- clear() resets victory state
- Listeners notified with victoryResult

### E2E Tests

**victory.spec.ts**
- Start game with 2 players (human vs AI)
- Move human warrior to attack AI warrior multiple times
- When AI warrior dies, verify victory overlay appears
- Verify "Victory!" title displayed
- Verify "Domination" victory type shown
- Click Play Again, verify new game starts
- Verify can play normally in new game

### Manual Testing Checklist

- [ ] Start new game
- [ ] Attack enemy until eliminated
- [ ] Victory overlay appears with 500ms delay
- [ ] Shows "Victory!" for human win
- [ ] Shows "Domination Victory" type
- [ ] Shows correct turn number
- [ ] Cannot click to select units
- [ ] Cannot right-click to move
- [ ] End Turn button disabled
- [ ] Click Play Again
- [ ] New map generated (different layout)
- [ ] Can play new game normally

---

## Appendix: Future Victory Types

These victory types can be added in future iterations:

| Victory Type | Condition | Complexity |
|-------------|-----------|------------|
| Domination | Last player standing | Implemented |
| Science | Complete space race project | High |
| Culture | Achieve cultural dominance | Medium |
| Diplomatic | Win world leader vote | Medium |
| Score | Highest score at turn limit | Low |
| Religious | Convert majority of civs | Medium |

Score victory is the simplest to add next - just track resources/units/cities and compare at turn X.

---

## Appendix: VictoryOverlay Implementation Detail

```typescript
export class VictoryOverlay {
  private overlay: HTMLElement;
  private titleEl: HTMLElement;
  private typeEl: HTMLElement;
  private messageEl: HTMLElement;
  private turnEl: HTMLElement;
  private playAgainBtn: HTMLElement;
  private panel: HTMLElement;

  constructor() {
    this.overlay = document.getElementById('victory-overlay')!;
    this.panel = this.overlay.querySelector('.victory-panel')!;
    this.titleEl = document.getElementById('victory-title')!;
    this.typeEl = document.getElementById('victory-type')!;
    this.messageEl = document.getElementById('victory-message')!;
    this.turnEl = document.getElementById('victory-turn')!;
    this.playAgainBtn = document.getElementById('play-again-btn')!;
  }

  showVictory(result: VictoryResult): void {
    this.panel.classList.remove('defeat');
    this.titleEl.textContent = 'Victory!';
    this.typeEl.textContent = `${result.type} Victory`;
    this.messageEl.textContent = `You have conquered all opponents!`;
    this.turnEl.textContent = result.turnNumber.toString();
    this.overlay.classList.remove('hidden');
  }

  showDefeat(result: VictoryResult, loserName: string): void {
    this.panel.classList.add('defeat');
    this.titleEl.textContent = 'Defeat!';
    this.typeEl.textContent = `${result.type} Victory`;
    this.messageEl.textContent = `${result.winnerName} has conquered all opponents!`;
    this.turnEl.textContent = result.turnNumber.toString();
    this.overlay.classList.remove('hidden');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }

  onPlayAgain(callback: () => void): void {
    this.playAgainBtn.addEventListener('click', callback);
  }
}
```
