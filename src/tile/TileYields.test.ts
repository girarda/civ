import { describe, it, expect } from 'vitest';
import {
  ZERO_YIELDS,
  createYields,
  calculateYields,
  calculateImprovedYields,
  totalYields,
  addYields,
  subtractYields,
  multiplyYields,
  yieldsEqual,
} from './TileYields';
import { Terrain } from './Terrain';
import { TileFeature } from './TileFeature';
import { TileResource } from './TileResource';

describe('TileYields', () => {
  describe('ZERO_YIELDS', () => {
    it('should have all values at zero', () => {
      expect(ZERO_YIELDS.food).toBe(0);
      expect(ZERO_YIELDS.production).toBe(0);
      expect(ZERO_YIELDS.gold).toBe(0);
      expect(ZERO_YIELDS.science).toBe(0);
      expect(ZERO_YIELDS.culture).toBe(0);
      expect(ZERO_YIELDS.faith).toBe(0);
    });
  });

  describe('createYields', () => {
    it('should create yields with specified values', () => {
      const yields = createYields(2, 1, 3);
      expect(yields.food).toBe(2);
      expect(yields.production).toBe(1);
      expect(yields.gold).toBe(3);
      expect(yields.science).toBe(0);
      expect(yields.culture).toBe(0);
      expect(yields.faith).toBe(0);
    });

    it('should create yields with all values', () => {
      const yields = createYields(1, 2, 3, 4, 5, 6);
      expect(yields.food).toBe(1);
      expect(yields.production).toBe(2);
      expect(yields.gold).toBe(3);
      expect(yields.science).toBe(4);
      expect(yields.culture).toBe(5);
      expect(yields.faith).toBe(6);
    });

    it('should default to zero for missing values', () => {
      const yields = createYields();
      expect(yieldsEqual(yields, ZERO_YIELDS)).toBe(true);
    });
  });

  describe('calculateYields', () => {
    it('should calculate base yields for Grassland', () => {
      const yields = calculateYields(Terrain.Grassland, null, null);
      expect(yields.food).toBe(2);
      expect(yields.production).toBe(0);
      expect(yields.gold).toBe(0);
    });

    it('should calculate base yields for Plains', () => {
      const yields = calculateYields(Terrain.Plains, null, null);
      expect(yields.food).toBe(1);
      expect(yields.production).toBe(1);
      expect(yields.gold).toBe(0);
    });

    it('should calculate base yields for Desert', () => {
      const yields = calculateYields(Terrain.Desert, null, null);
      expect(yields.food).toBe(0);
      expect(yields.production).toBe(0);
      expect(yields.gold).toBe(0);
    });

    it('should apply Forest production bonus', () => {
      const yields = calculateYields(Terrain.Grassland, TileFeature.Forest, null);
      expect(yields.food).toBe(2);
      expect(yields.production).toBe(1);
    });

    it('should apply Jungle production penalty', () => {
      const yields = calculateYields(Terrain.Plains, TileFeature.Jungle, null);
      // Plains: 1 food, 1 prod. Jungle: -1 prod
      expect(yields.food).toBe(1);
      expect(yields.production).toBe(0); // Clamped to 0
    });

    it('should apply Marsh food penalty', () => {
      const yields = calculateYields(Terrain.Grassland, TileFeature.Marsh, null);
      // Grassland: 2 food. Marsh: -1 food
      expect(yields.food).toBe(1);
    });

    it('should apply Floodplains food bonus', () => {
      const yields = calculateYields(Terrain.Desert, TileFeature.Floodplains, null);
      // Desert: 0 food. Floodplains: +2 food
      expect(yields.food).toBe(2);
    });

    it('should apply Oasis food and gold bonus', () => {
      const yields = calculateYields(Terrain.Desert, TileFeature.Oasis, null);
      // Desert: 0 food, 0 gold. Oasis: +3 food, +1 gold
      expect(yields.food).toBe(3);
      expect(yields.gold).toBe(1);
    });

    it('should apply resource bonuses', () => {
      const yields = calculateYields(Terrain.Grassland, null, TileResource.Wheat);
      // Grassland: 2 food. Wheat: +1 food
      expect(yields.food).toBe(3);
    });

    it('should apply feature and resource together', () => {
      const yields = calculateYields(Terrain.Grassland, TileFeature.Forest, TileResource.Deer);
      // Grassland: 2 food, 0 prod. Forest: +1 prod. Deer: +1 food
      expect(yields.food).toBe(3);
      expect(yields.production).toBe(1);
    });

    it('should clamp negative values to zero', () => {
      const yields = calculateYields(Terrain.Plains, TileFeature.Jungle, null);
      expect(yields.production).toBe(0);
      expect(yields.production).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateImprovedYields', () => {
    it('should apply improved resource bonuses', () => {
      const base = calculateYields(Terrain.Grassland, null, TileResource.Wheat);
      const improved = calculateImprovedYields(Terrain.Grassland, null, TileResource.Wheat);
      // Wheat improved: +2 food instead of +1
      expect(improved.food).toBeGreaterThan(base.food);
    });

    it('should have same result as base when no resource', () => {
      const base = calculateYields(Terrain.Grassland, TileFeature.Forest, null);
      const improved = calculateImprovedYields(Terrain.Grassland, TileFeature.Forest, null);
      expect(yieldsEqual(base, improved)).toBe(true);
    });

    it('should apply improved Iron bonus', () => {
      const improved = calculateImprovedYields(Terrain.GrasslandHill, null, TileResource.Iron);
      // GrasslandHill: 2 prod. Iron improved: +2 prod
      expect(improved.production).toBe(4);
    });
  });

  describe('totalYields', () => {
    it('should sum all yield values', () => {
      const yields = createYields(2, 3, 1, 0, 0, 0);
      expect(totalYields(yields)).toBe(6);
    });

    it('should return 0 for zero yields', () => {
      expect(totalYields(ZERO_YIELDS)).toBe(0);
    });

    it('should include all yield types', () => {
      const yields = createYields(1, 1, 1, 1, 1, 1);
      expect(totalYields(yields)).toBe(6);
    });
  });

  describe('addYields', () => {
    it('should add two yield objects', () => {
      const a = createYields(2, 1, 0);
      const b = createYields(1, 2, 3);
      const result = addYields(a, b);
      expect(result.food).toBe(3);
      expect(result.production).toBe(3);
      expect(result.gold).toBe(3);
    });

    it('should handle adding zero yields', () => {
      const a = createYields(2, 1, 3);
      const result = addYields(a, ZERO_YIELDS);
      expect(yieldsEqual(result, a)).toBe(true);
    });
  });

  describe('subtractYields', () => {
    it('should subtract two yield objects', () => {
      const a = createYields(3, 3, 3);
      const b = createYields(1, 2, 3);
      const result = subtractYields(a, b);
      expect(result.food).toBe(2);
      expect(result.production).toBe(1);
      expect(result.gold).toBe(0);
    });

    it('should allow negative results', () => {
      const a = createYields(1, 1, 1);
      const b = createYields(2, 2, 2);
      const result = subtractYields(a, b);
      expect(result.food).toBe(-1);
      expect(result.production).toBe(-1);
      expect(result.gold).toBe(-1);
    });
  });

  describe('multiplyYields', () => {
    it('should multiply all yields by factor', () => {
      const yields = createYields(2, 3, 1);
      const result = multiplyYields(yields, 2);
      expect(result.food).toBe(4);
      expect(result.production).toBe(6);
      expect(result.gold).toBe(2);
    });

    it('should handle zero factor', () => {
      const yields = createYields(2, 3, 1);
      const result = multiplyYields(yields, 0);
      expect(yieldsEqual(result, ZERO_YIELDS)).toBe(true);
    });

    it('should handle fractional factor', () => {
      const yields = createYields(4, 4, 4);
      const result = multiplyYields(yields, 0.5);
      expect(result.food).toBe(2);
      expect(result.production).toBe(2);
      expect(result.gold).toBe(2);
    });
  });

  describe('yieldsEqual', () => {
    it('should return true for equal yields', () => {
      const a = createYields(2, 1, 3);
      const b = createYields(2, 1, 3);
      expect(yieldsEqual(a, b)).toBe(true);
    });

    it('should return false for different yields', () => {
      const a = createYields(2, 1, 3);
      const b = createYields(2, 1, 4);
      expect(yieldsEqual(a, b)).toBe(false);
    });

    it('should compare all fields', () => {
      const a = createYields(1, 1, 1, 1, 1, 1);
      const b = createYields(1, 1, 1, 1, 1, 2);
      expect(yieldsEqual(a, b)).toBe(false);
    });
  });
});
