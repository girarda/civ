import { describe, it, expect, vi } from 'vitest';
import { TurnSystem } from './TurnSystem';
import { GameState } from './GameState';

describe('TurnSystem', () => {
  describe('attach/detach', () => {
    it('should attach to game state', () => {
      const gameState = new GameState();
      const turnSystem = new TurnSystem(gameState);

      // Should not throw
      turnSystem.attach();
      turnSystem.detach();
    });

    it('should process hooks when attached', () => {
      const gameState = new GameState();
      const onTurnStart = vi.fn();
      const onTurnEnd = vi.fn();

      const turnSystem = new TurnSystem(gameState, {
        onTurnStart,
        onTurnEnd,
      });

      turnSystem.attach();
      gameState.nextTurn();

      expect(onTurnStart).toHaveBeenCalled();
      expect(onTurnEnd).toHaveBeenCalled();
    });

    it('should not process hooks after detach', () => {
      const gameState = new GameState();
      const onTurnStart = vi.fn();
      const onTurnEnd = vi.fn();

      const turnSystem = new TurnSystem(gameState, {
        onTurnStart,
        onTurnEnd,
      });

      turnSystem.attach();
      turnSystem.detach();

      gameState.nextTurn();

      expect(onTurnStart).not.toHaveBeenCalled();
      expect(onTurnEnd).not.toHaveBeenCalled();
    });
  });

  describe('turn processing', () => {
    it('should call onTurnEnd at turn end', () => {
      const gameState = new GameState();
      const onTurnEnd = vi.fn();

      const turnSystem = new TurnSystem(gameState, { onTurnEnd });
      turnSystem.attach();

      gameState.nextTurn();

      expect(onTurnEnd).toHaveBeenCalled();
    });

    it('should call onTurnStart at turn start', () => {
      const gameState = new GameState();
      const onTurnStart = vi.fn();

      const turnSystem = new TurnSystem(gameState, { onTurnStart });
      turnSystem.attach();

      gameState.nextTurn();

      expect(onTurnStart).toHaveBeenCalled();
    });

    it('should work without hooks', () => {
      const gameState = new GameState();
      const turnSystem = new TurnSystem(gameState);
      turnSystem.attach();

      // Should not throw
      gameState.nextTurn();
      expect(gameState.getTurnNumber()).toBe(2);
    });

    it('should call hooks in correct order', () => {
      const gameState = new GameState();
      const callOrder: string[] = [];

      const turnSystem = new TurnSystem(gameState, {
        onTurnEnd: () => callOrder.push('end'),
        onTurnStart: () => callOrder.push('start'),
      });
      turnSystem.attach();

      gameState.nextTurn();

      // TurnEnd happens before TurnStart
      expect(callOrder[0]).toBe('end');
      expect(callOrder[1]).toBe('start');
    });
  });

  describe('multiple turns', () => {
    it('should process hooks for each turn', () => {
      const gameState = new GameState();
      const onTurnStart = vi.fn();
      const onTurnEnd = vi.fn();

      const turnSystem = new TurnSystem(gameState, {
        onTurnStart,
        onTurnEnd,
      });
      turnSystem.attach();

      gameState.nextTurn();
      gameState.nextTurn();
      gameState.nextTurn();

      expect(onTurnStart).toHaveBeenCalledTimes(3);
      expect(onTurnEnd).toHaveBeenCalledTimes(3);
    });
  });
});
