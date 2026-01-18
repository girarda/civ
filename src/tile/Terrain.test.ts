import { describe, it, expect } from 'vitest';
import {
  Terrain,
  TERRAIN_DATA,
  getTerrainData,
  isFlatLand,
  isHill,
  isWater,
  isPassable,
} from './Terrain';

describe('Terrain', () => {
  describe('enum values', () => {
    it('should have 14 terrain types', () => {
      const terrainValues = Object.values(Terrain);
      expect(terrainValues).toHaveLength(14);
    });

    it('should have all flat terrains', () => {
      expect(Terrain.Grassland).toBe('Grassland');
      expect(Terrain.Plains).toBe('Plains');
      expect(Terrain.Desert).toBe('Desert');
      expect(Terrain.Tundra).toBe('Tundra');
      expect(Terrain.Snow).toBe('Snow');
    });

    it('should have all hill variants', () => {
      expect(Terrain.GrasslandHill).toBe('GrasslandHill');
      expect(Terrain.PlainsHill).toBe('PlainsHill');
      expect(Terrain.DesertHill).toBe('DesertHill');
      expect(Terrain.TundraHill).toBe('TundraHill');
      expect(Terrain.SnowHill).toBe('SnowHill');
    });

    it('should have special and water terrain', () => {
      expect(Terrain.Mountain).toBe('Mountain');
      expect(Terrain.Coast).toBe('Coast');
      expect(Terrain.Ocean).toBe('Ocean');
      expect(Terrain.Lake).toBe('Lake');
    });
  });

  describe('TERRAIN_DATA', () => {
    it('should have data for all terrain types', () => {
      const terrainValues = Object.values(Terrain);
      for (const terrain of terrainValues) {
        expect(TERRAIN_DATA[terrain]).toBeDefined();
      }
    });

    it('should have correct yields for Grassland', () => {
      const data = TERRAIN_DATA[Terrain.Grassland];
      expect(data.food).toBe(2);
      expect(data.production).toBe(0);
      expect(data.gold).toBe(0);
    });

    it('should have correct yields for Plains', () => {
      const data = TERRAIN_DATA[Terrain.Plains];
      expect(data.food).toBe(1);
      expect(data.production).toBe(1);
      expect(data.gold).toBe(0);
    });

    it('should have correct yields for Desert (zero yields)', () => {
      const data = TERRAIN_DATA[Terrain.Desert];
      expect(data.food).toBe(0);
      expect(data.production).toBe(0);
      expect(data.gold).toBe(0);
    });

    it('should have correct yields for Lake (highest water food)', () => {
      const data = TERRAIN_DATA[Terrain.Lake];
      expect(data.food).toBe(2);
      expect(data.production).toBe(0);
      expect(data.gold).toBe(0);
    });

    it('should have hills with 2 production', () => {
      const hills = [
        Terrain.GrasslandHill,
        Terrain.PlainsHill,
        Terrain.DesertHill,
        Terrain.TundraHill,
        Terrain.SnowHill,
      ];
      for (const hill of hills) {
        expect(TERRAIN_DATA[hill].production).toBe(2);
        expect(TERRAIN_DATA[hill].food).toBe(0);
      }
    });

    it('should have correct movement costs for flat terrain', () => {
      const flatTerrains = [
        Terrain.Grassland,
        Terrain.Plains,
        Terrain.Desert,
        Terrain.Tundra,
        Terrain.Snow,
      ];
      for (const terrain of flatTerrains) {
        expect(TERRAIN_DATA[terrain].movementCost).toBe(1);
      }
    });

    it('should have hills with movement cost 2', () => {
      const hills = [
        Terrain.GrasslandHill,
        Terrain.PlainsHill,
        Terrain.DesertHill,
        Terrain.TundraHill,
        Terrain.SnowHill,
      ];
      for (const hill of hills) {
        expect(TERRAIN_DATA[hill].movementCost).toBe(2);
      }
    });

    it('should have impassable terrain with high movement cost', () => {
      const impassable = [
        Terrain.Mountain,
        Terrain.Coast,
        Terrain.Ocean,
        Terrain.Lake,
      ];
      for (const terrain of impassable) {
        expect(TERRAIN_DATA[terrain].movementCost).toBe(9999);
      }
    });
  });

  describe('getTerrainData', () => {
    it('should return correct data for any terrain', () => {
      const data = getTerrainData(Terrain.Plains);
      expect(data).toEqual(TERRAIN_DATA[Terrain.Plains]);
    });
  });

  describe('isFlatLand', () => {
    it('should return true for flat terrains', () => {
      expect(isFlatLand(Terrain.Grassland)).toBe(true);
      expect(isFlatLand(Terrain.Plains)).toBe(true);
      expect(isFlatLand(Terrain.Desert)).toBe(true);
      expect(isFlatLand(Terrain.Tundra)).toBe(true);
      expect(isFlatLand(Terrain.Snow)).toBe(true);
    });

    it('should return false for hills', () => {
      expect(isFlatLand(Terrain.GrasslandHill)).toBe(false);
      expect(isFlatLand(Terrain.PlainsHill)).toBe(false);
    });

    it('should return false for water', () => {
      expect(isFlatLand(Terrain.Coast)).toBe(false);
      expect(isFlatLand(Terrain.Ocean)).toBe(false);
      expect(isFlatLand(Terrain.Lake)).toBe(false);
    });

    it('should return false for mountain', () => {
      expect(isFlatLand(Terrain.Mountain)).toBe(false);
    });
  });

  describe('isHill', () => {
    it('should return true for hill terrains', () => {
      expect(isHill(Terrain.GrasslandHill)).toBe(true);
      expect(isHill(Terrain.PlainsHill)).toBe(true);
      expect(isHill(Terrain.DesertHill)).toBe(true);
      expect(isHill(Terrain.TundraHill)).toBe(true);
      expect(isHill(Terrain.SnowHill)).toBe(true);
    });

    it('should return false for flat terrains', () => {
      expect(isHill(Terrain.Grassland)).toBe(false);
      expect(isHill(Terrain.Plains)).toBe(false);
    });

    it('should return false for water and mountain', () => {
      expect(isHill(Terrain.Ocean)).toBe(false);
      expect(isHill(Terrain.Mountain)).toBe(false);
    });
  });

  describe('isWater', () => {
    it('should return true for water terrains', () => {
      expect(isWater(Terrain.Coast)).toBe(true);
      expect(isWater(Terrain.Ocean)).toBe(true);
      expect(isWater(Terrain.Lake)).toBe(true);
    });

    it('should return false for land terrains', () => {
      expect(isWater(Terrain.Grassland)).toBe(false);
      expect(isWater(Terrain.Mountain)).toBe(false);
      expect(isWater(Terrain.GrasslandHill)).toBe(false);
    });
  });

  describe('isPassable', () => {
    it('should return true for flat land', () => {
      expect(isPassable(Terrain.Grassland)).toBe(true);
      expect(isPassable(Terrain.Plains)).toBe(true);
      expect(isPassable(Terrain.Desert)).toBe(true);
    });

    it('should return true for hills', () => {
      expect(isPassable(Terrain.GrasslandHill)).toBe(true);
      expect(isPassable(Terrain.PlainsHill)).toBe(true);
    });

    it('should return false for mountain', () => {
      expect(isPassable(Terrain.Mountain)).toBe(false);
    });

    it('should return false for water (requires embarkation)', () => {
      expect(isPassable(Terrain.Coast)).toBe(false);
      expect(isPassable(Terrain.Ocean)).toBe(false);
      expect(isPassable(Terrain.Lake)).toBe(false);
    });
  });
});
