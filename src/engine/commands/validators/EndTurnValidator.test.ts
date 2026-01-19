import { describe, it, expect, beforeEach } from 'vitest';
import { validateEndTurn, EndTurnValidatorDeps } from './EndTurnValidator';
import { EndTurnCommand } from '../types';
import { GameState } from '../../../game/GameState';

/**
 * Create an EndTurnCommand for testing.
 */
function createEndTurnCommand(playerId: number): EndTurnCommand {
  return {
    type: 'END_TURN',
    playerId,
  };
}

describe('EndTurnValidator', () => {
  let gameState: GameState;
  let deps: EndTurnValidatorDeps;

  beforeEach(() => {
    gameState = new GameState();
    deps = { gameState };
  });

  describe('valid end turn', () => {
    it('should pass validation when playerId matches current player', () => {
      // Default current player is 0
      const command = createEndTurnCommand(0);

      const result = validateEndTurn(command, deps);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('wrong player', () => {
    it('should fail validation when playerId does not match current player', () => {
      // Current player is 0, but command says player 1
      const command = createEndTurnCommand(1);

      const result = validateEndTurn(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("It is not player 1's turn");
    });

    it('should fail validation with correct error message for player 2', () => {
      const command = createEndTurnCommand(2);

      const result = validateEndTurn(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("It is not player 2's turn");
    });
  });
});
