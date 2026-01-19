import { describe, it, expect, beforeEach } from 'vitest';
import { TerritoryManager } from './Territory';
import { TilePosition } from '../hex/TilePosition';

describe('TerritoryManager', () => {
  let manager: TerritoryManager;

  beforeEach(() => {
    manager = new TerritoryManager();
  });

  describe('initializeTerritory', () => {
    it('should initialize territory with correct number of tiles', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(1, center);

      // For radius 1, should have 7 tiles (center + 6 neighbors)
      const tiles = manager.getTilesForCity(1);
      expect(tiles.length).toBe(7);
    });

    it('should include center tile', () => {
      const center = new TilePosition(5, 3);
      manager.initializeTerritory(1, center);

      expect(manager.isOwnedBy(5, 3, 1)).toBe(true);
    });

    it('should include all neighbor tiles', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(1, center);

      // Check all 6 neighbors of (0,0)
      expect(manager.isOwnedBy(1, 0, 1)).toBe(true);
      expect(manager.isOwnedBy(1, -1, 1)).toBe(true);
      expect(manager.isOwnedBy(0, -1, 1)).toBe(true);
      expect(manager.isOwnedBy(-1, 0, 1)).toBe(true);
      expect(manager.isOwnedBy(-1, 1, 1)).toBe(true);
      expect(manager.isOwnedBy(0, 1, 1)).toBe(true);
    });

    it('should not claim already-owned tiles', () => {
      const center1 = new TilePosition(0, 0);
      const center2 = new TilePosition(2, 0); // Adjacent city

      manager.initializeTerritory(1, center1);
      manager.initializeTerritory(2, center2);

      // (1, 0) should still belong to city 1
      expect(manager.isOwnedBy(1, 0, 1)).toBe(true);
      expect(manager.isOwnedBy(1, 0, 2)).toBe(false);
    });
  });

  describe('getOwnerAtPosition', () => {
    it('should return null for unowned tile', () => {
      expect(manager.getOwnerAtPosition(0, 0)).toBe(null);
    });

    it('should return city ID for owned tile', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(42, center);

      expect(manager.getOwnerAtPosition(0, 0)).toBe(42);
    });
  });

  describe('isOwned', () => {
    it('should return false for unowned tile', () => {
      expect(manager.isOwned(0, 0)).toBe(false);
    });

    it('should return true for owned tile', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(1, center);

      expect(manager.isOwned(0, 0)).toBe(true);
    });
  });

  describe('getTileCount', () => {
    it('should return 0 for non-existent city', () => {
      expect(manager.getTileCount(999)).toBe(0);
    });

    it('should return correct count for city', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(1, center);

      expect(manager.getTileCount(1)).toBe(7);
    });
  });

  describe('removeTerritory', () => {
    it('should remove all tiles from city', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(1, center);

      manager.removeTerritory(1);

      expect(manager.getTileCount(1)).toBe(0);
      expect(manager.isOwned(0, 0)).toBe(false);
    });

    it('should allow tiles to be claimed by another city', () => {
      const center = new TilePosition(0, 0);
      manager.initializeTerritory(1, center);
      manager.removeTerritory(1);

      manager.initializeTerritory(2, center);
      expect(manager.isOwnedBy(0, 0, 2)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all territory data', () => {
      manager.initializeTerritory(1, new TilePosition(0, 0));
      manager.initializeTerritory(2, new TilePosition(5, 5));

      manager.clear();

      expect(manager.getCityCount()).toBe(0);
      expect(manager.isOwned(0, 0)).toBe(false);
      expect(manager.isOwned(5, 5)).toBe(false);
    });
  });

  describe('getCityIds', () => {
    it('should return empty array when no cities', () => {
      expect(manager.getCityIds()).toEqual([]);
    });

    it('should return all city IDs', () => {
      manager.initializeTerritory(1, new TilePosition(0, 0));
      manager.initializeTerritory(2, new TilePosition(10, 10));

      const ids = manager.getCityIds();
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids.length).toBe(2);
    });
  });

  describe('getCityCount', () => {
    it('should return 0 when no cities', () => {
      expect(manager.getCityCount()).toBe(0);
    });

    it('should return correct count', () => {
      manager.initializeTerritory(1, new TilePosition(0, 0));
      manager.initializeTerritory(2, new TilePosition(10, 10));
      manager.initializeTerritory(3, new TilePosition(20, 20));

      expect(manager.getCityCount()).toBe(3);
    });
  });

  describe('getTilesForCity', () => {
    it('should return empty array for non-existent city', () => {
      expect(manager.getTilesForCity(999)).toEqual([]);
    });

    it('should return TilePosition objects', () => {
      const center = new TilePosition(5, 3);
      manager.initializeTerritory(1, center);

      const tiles = manager.getTilesForCity(1);
      expect(tiles.length).toBe(7);
      expect(tiles[0]).toBeInstanceOf(TilePosition);

      // Verify center is included
      const centerTile = tiles.find((t) => t.q === 5 && t.r === 3);
      expect(centerTile).toBeDefined();
    });
  });
});
