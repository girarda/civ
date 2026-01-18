import { describe, it, expect } from 'vitest';
import { TilePosition } from './TilePosition';

describe('TilePosition', () => {
  describe('constructor', () => {
    it('should create a position with q and r coordinates', () => {
      const pos = new TilePosition(3, -2);
      expect(pos.q).toBe(3);
      expect(pos.r).toBe(-2);
    });

    it('should have a static ORIGIN at (0,0)', () => {
      expect(TilePosition.ORIGIN.q).toBe(0);
      expect(TilePosition.ORIGIN.r).toBe(0);
    });
  });

  describe('neighbors', () => {
    it('should return 6 neighbors', () => {
      const pos = new TilePosition(0, 0);
      const neighbors = pos.neighbors();
      expect(neighbors).toHaveLength(6);
    });

    it('should return correct neighbor positions from origin', () => {
      const pos = TilePosition.ORIGIN;
      const neighbors = pos.neighbors();
      const keys = neighbors.map((n) => n.key());

      expect(keys).toContain('1,0');
      expect(keys).toContain('1,-1');
      expect(keys).toContain('0,-1');
      expect(keys).toContain('-1,0');
      expect(keys).toContain('-1,1');
      expect(keys).toContain('0,1');
    });

    it('should return correct neighbors for non-origin position', () => {
      const pos = new TilePosition(2, 3);
      const neighbors = pos.neighbors();
      const keys = neighbors.map((n) => n.key());

      expect(keys).toContain('3,3');
      expect(keys).toContain('3,2');
      expect(keys).toContain('2,2');
      expect(keys).toContain('1,3');
      expect(keys).toContain('1,4');
      expect(keys).toContain('2,4');
    });
  });

  describe('range', () => {
    it('should return only the center tile for radius 0', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.range(0);
      expect(tiles).toHaveLength(1);
      expect(tiles[0].equals(pos)).toBe(true);
    });

    it('should return 7 tiles for radius 1 (center + 6 neighbors)', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.range(1);
      expect(tiles).toHaveLength(7);
    });

    it('should return 19 tiles for radius 2', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.range(2);
      expect(tiles).toHaveLength(19);
    });

    it('should return correct count for radius 3: 1 + 6 + 12 + 18 = 37', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.range(3);
      expect(tiles).toHaveLength(37);
    });
  });

  describe('ring', () => {
    it('should return only center tile for radius 0', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.ring(0);
      expect(tiles).toHaveLength(1);
      expect(tiles[0].equals(pos)).toBe(true);
    });

    it('should return 6 tiles for radius 1', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.ring(1);
      expect(tiles).toHaveLength(6);
    });

    it('should return 12 tiles for radius 2', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.ring(2);
      expect(tiles).toHaveLength(12);
    });

    it('should return 18 tiles for radius 3', () => {
      const pos = new TilePosition(0, 0);
      const tiles = pos.ring(3);
      expect(tiles).toHaveLength(18);
    });
  });

  describe('distanceTo', () => {
    it('should return 0 for same position', () => {
      const pos = new TilePosition(3, -2);
      expect(pos.distanceTo(pos)).toBe(0);
    });

    it('should return 1 for adjacent tiles', () => {
      const pos = new TilePosition(0, 0);
      const neighbor = new TilePosition(1, 0);
      expect(pos.distanceTo(neighbor)).toBe(1);
    });

    it('should return correct distance for farther tiles', () => {
      const a = new TilePosition(0, 0);
      const b = new TilePosition(3, -2);
      expect(a.distanceTo(b)).toBe(3);
    });

    it('should be symmetric', () => {
      const a = new TilePosition(2, 5);
      const b = new TilePosition(-1, 3);
      expect(a.distanceTo(b)).toBe(b.distanceTo(a));
    });
  });

  describe('equals', () => {
    it('should return true for same coordinates', () => {
      const a = new TilePosition(3, -2);
      const b = new TilePosition(3, -2);
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different coordinates', () => {
      const a = new TilePosition(3, -2);
      const b = new TilePosition(3, -1);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('key', () => {
    it('should return a unique string key', () => {
      const pos = new TilePosition(3, -2);
      expect(pos.key()).toBe('3,-2');
    });

    it('should produce different keys for different positions', () => {
      const a = new TilePosition(1, 2);
      const b = new TilePosition(2, 1);
      expect(a.key()).not.toBe(b.key());
    });
  });

  describe('toString', () => {
    it('should return readable string representation', () => {
      const pos = new TilePosition(3, -2);
      expect(pos.toString()).toBe('TilePosition(3, -2)');
    });
  });
});
