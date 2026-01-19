/**
 * Domination victory condition checker.
 * Domination: Only one player remains (all others eliminated).
 */

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
      losers: playerManager.getEliminatedPlayers().map((p) => p.id),
      turnNumber,
    };
  }

  return null;
}
