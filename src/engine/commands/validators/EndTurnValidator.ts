/**
 * Validator for EndTurnCommand.
 * Validates current player matches command playerId.
 */

import { EndTurnCommand } from '../types';
import { ValidationResult, validationSuccess, validationError } from '../CommandResult';
import { GameState } from '../../../game/GameState';

export interface EndTurnValidatorDeps {
  gameState: GameState;
}

/**
 * Validate an EndTurnCommand.
 */
export function validateEndTurn(
  command: EndTurnCommand,
  deps: EndTurnValidatorDeps
): ValidationResult {
  const { gameState } = deps;
  const { playerId } = command;

  // Check playerId matches current player
  const currentPlayer = gameState.getCurrentPlayer();
  if (playerId !== currentPlayer) {
    return validationError(`It is not player ${playerId}'s turn`);
  }

  return validationSuccess();
}
