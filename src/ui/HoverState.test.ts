import { describe, it, expect, vi } from 'vitest';
import { HoverState, HoveredTile } from './HoverState';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';

describe('HoverState', () => {
  const createMockTile = (q: number, r: number): HoveredTile => ({
    position: new TilePosition(q, r),
    terrain: Terrain.Grassland,
    feature: null,
  });

  describe('get/set', () => {
    it('should initially be null', () => {
      const state = new HoverState();
      expect(state.get()).toBeNull();
    });

    it('should return the set tile', () => {
      const state = new HoverState();
      const tile = createMockTile(1, 2);
      state.set(tile);
      expect(state.get()).toBe(tile);
    });

    it('should allow setting null', () => {
      const state = new HoverState();
      const tile = createMockTile(1, 2);
      state.set(tile);
      state.set(null);
      expect(state.get()).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('should notify listeners when tile changes', () => {
      const state = new HoverState();
      const listener = vi.fn();
      state.subscribe(listener);

      const tile = createMockTile(1, 2);
      state.set(tile);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(tile);
    });

    it('should notify listeners when tile becomes null', () => {
      const state = new HoverState();
      const listener = vi.fn();
      const tile = createMockTile(1, 2);
      state.set(tile);

      state.subscribe(listener);
      state.set(null);

      expect(listener).toHaveBeenCalledWith(null);
    });

    it('should support multiple listeners', () => {
      const state = new HoverState();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      state.subscribe(listener1);
      state.subscribe(listener2);

      const tile = createMockTile(1, 2);
      state.set(tile);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const state = new HoverState();
      const listener = vi.fn();
      const unsubscribe = state.subscribe(listener);

      const tile1 = createMockTile(1, 2);
      state.set(tile1);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      const tile2 = createMockTile(3, 4);
      state.set(tile2);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should skip update if same tile position', () => {
      const state = new HoverState();
      const listener = vi.fn();
      state.subscribe(listener);

      const tile1 = createMockTile(1, 2);
      const tile2 = createMockTile(1, 2); // Same position, different instance
      state.set(tile1);
      state.set(tile2);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should notify when position changes', () => {
      const state = new HoverState();
      const listener = vi.fn();
      state.subscribe(listener);

      const tile1 = createMockTile(1, 2);
      const tile2 = createMockTile(3, 4);
      state.set(tile1);
      state.set(tile2);

      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('should remove all listeners and reset state', () => {
      const state = new HoverState();
      const listener = vi.fn();
      state.subscribe(listener);

      const tile = createMockTile(1, 2);
      state.set(tile);
      expect(listener).toHaveBeenCalledTimes(1);

      state.clear();

      // After clear, state should be null and listener should not be called
      expect(state.get()).toBeNull();

      const tile2 = createMockTile(3, 4);
      state.set(tile2);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, listener was removed
    });
  });
});
