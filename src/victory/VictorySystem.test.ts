/**
 * Unit tests for VictorySystem and victory checking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VictorySystem } from './VictorySystem';
import { VictoryType } from './VictoryTypes';
import { checkDominationVictory } from './DominationVictory';
import { PlayerManager } from '../player';
import { GameState } from '../game/GameState';

describe('checkDominationVictory', () => {
  let playerManager: PlayerManager;

  beforeEach(() => {
    playerManager = new PlayerManager();
  });

  it('should return null when 2 players, 0 eliminated', () => {
    playerManager.initialize([0], 2);

    const result = checkDominationVictory(playerManager, 5);

    expect(result).toBeNull();
  });

  it('should return victory when 2 players, 1 eliminated', () => {
    playerManager.initialize([0], 2);
    playerManager.eliminatePlayer(1);

    const result = checkDominationVictory(playerManager, 10);

    expect(result).not.toBeNull();
    expect(result!.type).toBe(VictoryType.Domination);
    expect(result!.winnerId).toBe(0);
    expect(result!.winnerName).toBe('Player 1');
    expect(result!.losers).toEqual([1]);
    expect(result!.turnNumber).toBe(10);
  });

  it('should return null when 3 players, 1 eliminated', () => {
    playerManager.initialize([0], 3);
    playerManager.eliminatePlayer(1);

    const result = checkDominationVictory(playerManager, 15);

    expect(result).toBeNull();
  });

  it('should return victory when 3 players, 2 eliminated', () => {
    playerManager.initialize([0], 3);
    playerManager.eliminatePlayer(1);
    playerManager.eliminatePlayer(2);

    const result = checkDominationVictory(playerManager, 20);

    expect(result).not.toBeNull();
    expect(result!.type).toBe(VictoryType.Domination);
    expect(result!.winnerId).toBe(0);
    expect(result!.losers).toEqual([1, 2]);
    expect(result!.turnNumber).toBe(20);
  });

  it('should identify AI winner correctly', () => {
    playerManager.initialize([0], 2);
    playerManager.eliminatePlayer(0); // Human eliminated

    const result = checkDominationVictory(playerManager, 8);

    expect(result).not.toBeNull();
    expect(result!.winnerId).toBe(1);
    expect(result!.winnerName).toBe('AI 1');
    expect(result!.losers).toEqual([0]);
  });

  it('should return correct turn number', () => {
    playerManager.initialize([0], 2);
    playerManager.eliminatePlayer(1);

    const result1 = checkDominationVictory(playerManager, 1);
    expect(result1!.turnNumber).toBe(1);

    const result2 = checkDominationVictory(playerManager, 100);
    expect(result2!.turnNumber).toBe(100);
  });
});

describe('VictorySystem', () => {
  let playerManager: PlayerManager;
  let gameState: GameState;
  let victorySystem: VictorySystem;

  beforeEach(() => {
    playerManager = new PlayerManager();
    gameState = new GameState();
    victorySystem = new VictorySystem(playerManager, gameState);
  });

  describe('checkVictoryConditions', () => {
    it('should return null when all players active', () => {
      playerManager.initialize([0], 3);

      const result = victorySystem.checkVictoryConditions();

      expect(result).toBeNull();
    });

    it('should return domination victory when one player remains', () => {
      playerManager.initialize([0], 2);
      playerManager.eliminatePlayer(1);

      const result = victorySystem.checkVictoryConditions();

      expect(result).not.toBeNull();
      expect(result!.type).toBe(VictoryType.Domination);
      expect(result!.winnerId).toBe(0);
    });

    it('should capture current turn number', () => {
      playerManager.initialize([0], 2);
      playerManager.eliminatePlayer(1);

      // Advance turns
      gameState.nextTurn();
      gameState.nextTurn();
      gameState.nextTurn();

      const result = victorySystem.checkVictoryConditions();

      expect(result!.turnNumber).toBe(4);
    });
  });

  describe('onPlayerEliminated', () => {
    it('should not set game over when multiple players remain', () => {
      playerManager.initialize([0], 3);
      playerManager.eliminatePlayer(2);

      victorySystem.onPlayerEliminated();

      expect(gameState.isGameOver()).toBe(false);
    });

    it('should set game over when victory achieved', () => {
      playerManager.initialize([0], 2);
      playerManager.eliminatePlayer(1);

      victorySystem.onPlayerEliminated();

      expect(gameState.isGameOver()).toBe(true);
      const result = gameState.getVictoryResult();
      expect(result).not.toBeNull();
      expect(result!.type).toBe(VictoryType.Domination);
    });
  });
});
