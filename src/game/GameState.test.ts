import { describe, it, expect, vi } from 'vitest';
import { GameState } from './GameState';
import { TurnPhase } from './TurnPhase';

describe('GameState', () => {
  describe('initial state', () => {
    it('should start at turn 1', () => {
      const state = new GameState();
      expect(state.getTurnNumber()).toBe(1);
    });

    it('should start in PlayerAction phase', () => {
      const state = new GameState();
      expect(state.getPhase()).toBe(TurnPhase.PlayerAction);
    });

    it('should start with player 0', () => {
      const state = new GameState();
      expect(state.getCurrentPlayer()).toBe(0);
    });
  });

  describe('getSnapshot', () => {
    it('should return a snapshot of current state', () => {
      const state = new GameState();
      const snapshot = state.getSnapshot();

      expect(snapshot.turnNumber).toBe(1);
      expect(snapshot.phase).toBe(TurnPhase.PlayerAction);
      expect(snapshot.currentPlayer).toBe(0);
    });
  });

  describe('nextTurn', () => {
    it('should increment turn number', () => {
      const state = new GameState();
      state.nextTurn();
      expect(state.getTurnNumber()).toBe(2);
    });

    it('should end in PlayerAction phase', () => {
      const state = new GameState();
      state.nextTurn();
      expect(state.getPhase()).toBe(TurnPhase.PlayerAction);
    });

    it('should transition through all phases', () => {
      const state = new GameState();
      const phases: TurnPhase[] = [];

      state.subscribe((snapshot) => {
        phases.push(snapshot.phase);
      });

      state.nextTurn();

      // Should go: TurnEnd -> TurnStart -> PlayerAction
      expect(phases).toContain(TurnPhase.TurnEnd);
      expect(phases).toContain(TurnPhase.TurnStart);
      expect(phases).toContain(TurnPhase.PlayerAction);
    });

    it('should increment correctly over multiple turns', () => {
      const state = new GameState();
      state.nextTurn();
      state.nextTurn();
      state.nextTurn();
      expect(state.getTurnNumber()).toBe(4);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on state change', () => {
      const state = new GameState();
      const listener = vi.fn();
      state.subscribe(listener);

      state.nextTurn();

      expect(listener).toHaveBeenCalled();
    });

    it('should pass snapshot to listener', () => {
      const state = new GameState();
      const listener = vi.fn();
      state.subscribe(listener);

      state.nextTurn();

      // Find the call with PlayerAction phase at turn 2
      const finalCall = listener.mock.calls.find(
        (call) => call[0].phase === TurnPhase.PlayerAction && call[0].turnNumber === 2
      );
      expect(finalCall).toBeDefined();
    });

    it('should support multiple listeners', () => {
      const state = new GameState();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      state.subscribe(listener1);
      state.subscribe(listener2);

      state.nextTurn();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const state = new GameState();
      const listener = vi.fn();
      const unsubscribe = state.subscribe(listener);

      state.nextTurn();
      const callCount = listener.mock.calls.length;

      unsubscribe();
      state.nextTurn();

      expect(listener.mock.calls.length).toBe(callCount);
    });
  });

  describe('clear', () => {
    it('should reset turn number to 1', () => {
      const state = new GameState();
      state.nextTurn();
      state.nextTurn();
      state.clear();
      expect(state.getTurnNumber()).toBe(1);
    });

    it('should reset phase to PlayerAction', () => {
      const state = new GameState();
      state.clear();
      expect(state.getPhase()).toBe(TurnPhase.PlayerAction);
    });

    it('should remove all listeners', () => {
      const state = new GameState();
      const listener = vi.fn();
      state.subscribe(listener);

      state.nextTurn();
      const callCount = listener.mock.calls.length;

      state.clear();
      state.nextTurn();

      expect(listener.mock.calls.length).toBe(callCount);
    });
  });
});
