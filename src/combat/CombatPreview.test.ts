import { describe, it, expect, vi } from 'vitest';
import { CombatPreviewState, CombatPreviewData } from './CombatPreview';

describe('CombatPreviewState', () => {
  const createTestData = (overrides?: Partial<CombatPreviewData>): CombatPreviewData => ({
    attackerName: 'Warrior',
    defenderName: 'Scout',
    attackerCurrentHealth: 100,
    attackerMaxHealth: 100,
    attackerExpectedHealth: 85,
    defenderCurrentHealth: 100,
    defenderMaxHealth: 100,
    defenderExpectedHealth: 52,
    defenderModifiers: [],
    ...overrides,
  });

  describe('show/hide', () => {
    it('should store and return data when shown', () => {
      const state = new CombatPreviewState();
      const data = createTestData();

      state.show(data);

      expect(state.get()).toEqual(data);
      expect(state.isVisible()).toBe(true);
    });

    it('should clear data when hidden', () => {
      const state = new CombatPreviewState();
      state.show(createTestData());

      state.hide();

      expect(state.get()).toBeNull();
      expect(state.isVisible()).toBe(false);
    });

    it('should not notify if already hidden', () => {
      const state = new CombatPreviewState();
      const listener = vi.fn();
      state.subscribe(listener);

      // Already null, hide should not trigger
      state.hide();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should notify listener when data changes', () => {
      const state = new CombatPreviewState();
      const listener = vi.fn();
      const data = createTestData();

      state.subscribe(listener);
      state.show(data);

      expect(listener).toHaveBeenCalledWith(data);
    });

    it('should notify listener when hidden', () => {
      const state = new CombatPreviewState();
      const listener = vi.fn();

      state.show(createTestData());
      state.subscribe(listener);
      state.hide();

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should support multiple listeners', () => {
      const state = new CombatPreviewState();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const data = createTestData();

      state.subscribe(listener1);
      state.subscribe(listener2);
      state.show(data);

      expect(listener1).toHaveBeenCalledWith(data);
      expect(listener2).toHaveBeenCalledWith(data);
    });

    it('should allow unsubscribing', () => {
      const state = new CombatPreviewState();
      const listener = vi.fn();

      const unsubscribe = state.subscribe(listener);
      unsubscribe();
      state.show(createTestData());

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all listeners and reset state', () => {
      const state = new CombatPreviewState();
      const listener = vi.fn();

      state.show(createTestData());
      state.subscribe(listener);
      state.clear();

      expect(state.get()).toBeNull();

      // Listener should have been removed, not called
      state.show(createTestData());
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('data with modifiers', () => {
    it('should store modifier information', () => {
      const state = new CombatPreviewState();
      const data = createTestData({
        defenderModifiers: ['Hills +25%', 'Forest +25%'],
      });

      state.show(data);

      expect(state.get()?.defenderModifiers).toEqual(['Hills +25%', 'Forest +25%']);
    });
  });
});
