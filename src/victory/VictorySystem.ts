/**
 * VictorySystem - Orchestrates victory condition checking.
 * Integrates with PlayerManager to detect when victory conditions are met.
 */

import { PlayerManager } from '../player';
import { GameState } from '../game/GameState';
import { VictoryResult } from './VictoryTypes';
import { checkDominationVictory } from './DominationVictory';
import { EventBus } from '../engine/events/EventBus';
import { createEvent, GameOverEvent } from '../engine/events/types';

export class VictorySystem {
  private playerManager: PlayerManager;
  private gameState: GameState;
  private eventBus: EventBus | null = null;

  constructor(playerManager: PlayerManager, gameState: GameState, eventBus?: EventBus) {
    this.playerManager = playerManager;
    this.gameState = gameState;
    this.eventBus = eventBus ?? null;
  }

  /**
   * Check all victory conditions.
   * Returns VictoryResult if game is won, null otherwise.
   */
  checkVictoryConditions(): VictoryResult | null {
    const turnNumber = this.gameState.getTurnNumber();

    // Check domination victory (last player standing)
    const dominationResult = checkDominationVictory(this.playerManager, turnNumber);
    if (dominationResult) {
      return dominationResult;
    }

    // Future: Check other victory conditions here
    // - Science victory
    // - Culture victory
    // - Diplomatic victory
    // - Score victory

    return null;
  }

  /**
   * Call after elimination to check for victory.
   * If victory achieved, sets game over state and emits event.
   */
  onPlayerEliminated(): void {
    // Prevent re-triggering if game is already over
    if (this.gameState.isGameOver()) {
      return;
    }

    const result = this.checkVictoryConditions();
    if (result) {
      this.gameState.setGameOver(result);

      // Emit GAME_OVER event for logging/replay
      if (this.eventBus) {
        this.eventBus.emit(
          createEvent<GameOverEvent>({
            type: 'GAME_OVER',
            victoryType: result.type,
            winnerId: result.winnerId,
            winnerName: result.winnerName,
            losers: result.losers,
            turnNumber: result.turnNumber,
          })
        );
      }
    }
  }

  /**
   * Set the event bus for emitting events.
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }
}
