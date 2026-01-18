import { describe, it, expect } from 'vitest';
import {
  ResourceCategory,
  TileResource,
  RESOURCE_DATA,
  getResourceData,
  isBonus,
  isStrategic,
  isLuxury,
  getAllResources,
  getResourcesByCategory,
} from './TileResource';

describe('TileResource', () => {
  describe('enum values', () => {
    it('should have 27 resource types', () => {
      const resources = Object.values(TileResource);
      expect(resources).toHaveLength(27);
    });

    it('should have 7 bonus resources', () => {
      const bonus = getResourcesByCategory(ResourceCategory.Bonus);
      expect(bonus).toHaveLength(7);
    });

    it('should have 6 strategic resources', () => {
      const strategic = getResourcesByCategory(ResourceCategory.Strategic);
      expect(strategic).toHaveLength(6);
    });

    it('should have 14 luxury resources', () => {
      const luxury = getResourcesByCategory(ResourceCategory.Luxury);
      expect(luxury).toHaveLength(14);
    });
  });

  describe('RESOURCE_DATA', () => {
    it('should have data for all resource types', () => {
      const resources = Object.values(TileResource);
      for (const resource of resources) {
        expect(RESOURCE_DATA[resource]).toBeDefined();
      }
    });

    it('should have correct data for Cattle (bonus)', () => {
      const data = RESOURCE_DATA[TileResource.Cattle];
      expect(data.category).toBe(ResourceCategory.Bonus);
      expect(data.food).toBe(0);
      expect(data.production).toBe(1);
      expect(data.gold).toBe(0);
      expect(data.improvedProduction).toBe(2);
    });

    it('should have correct data for Iron (strategic)', () => {
      const data = RESOURCE_DATA[TileResource.Iron];
      expect(data.category).toBe(ResourceCategory.Strategic);
      expect(data.food).toBe(0);
      expect(data.production).toBe(1);
      expect(data.gold).toBe(0);
      expect(data.improvedProduction).toBe(2);
    });

    it('should have correct data for Gems (luxury with high gold)', () => {
      const data = RESOURCE_DATA[TileResource.Gems];
      expect(data.category).toBe(ResourceCategory.Luxury);
      expect(data.gold).toBe(3);
      expect(data.improvedGold).toBe(3);
    });

    it('should have correct data for Fish (bonus food)', () => {
      const data = RESOURCE_DATA[TileResource.Fish];
      expect(data.category).toBe(ResourceCategory.Bonus);
      expect(data.food).toBe(1);
      expect(data.improvedFood).toBe(2);
    });

    it('should have correct data for Oasis (luxury food+gold)', () => {
      const data = RESOURCE_DATA[TileResource.Citrus];
      expect(data.category).toBe(ResourceCategory.Luxury);
      expect(data.food).toBe(1);
      expect(data.gold).toBe(1);
    });
  });

  describe('getResourceData', () => {
    it('should return correct data for any resource', () => {
      const data = getResourceData(TileResource.Wheat);
      expect(data).toEqual(RESOURCE_DATA[TileResource.Wheat]);
    });
  });

  describe('category checks', () => {
    describe('isBonus', () => {
      it('should return true for bonus resources', () => {
        expect(isBonus(TileResource.Cattle)).toBe(true);
        expect(isBonus(TileResource.Sheep)).toBe(true);
        expect(isBonus(TileResource.Fish)).toBe(true);
        expect(isBonus(TileResource.Stone)).toBe(true);
        expect(isBonus(TileResource.Wheat)).toBe(true);
        expect(isBonus(TileResource.Bananas)).toBe(true);
        expect(isBonus(TileResource.Deer)).toBe(true);
      });

      it('should return false for non-bonus resources', () => {
        expect(isBonus(TileResource.Iron)).toBe(false);
        expect(isBonus(TileResource.Gold)).toBe(false);
      });
    });

    describe('isStrategic', () => {
      it('should return true for strategic resources', () => {
        expect(isStrategic(TileResource.Horses)).toBe(true);
        expect(isStrategic(TileResource.Iron)).toBe(true);
        expect(isStrategic(TileResource.Coal)).toBe(true);
        expect(isStrategic(TileResource.Oil)).toBe(true);
        expect(isStrategic(TileResource.Aluminum)).toBe(true);
        expect(isStrategic(TileResource.Uranium)).toBe(true);
      });

      it('should return false for non-strategic resources', () => {
        expect(isStrategic(TileResource.Cattle)).toBe(false);
        expect(isStrategic(TileResource.Gold)).toBe(false);
      });
    });

    describe('isLuxury', () => {
      it('should return true for luxury resources', () => {
        expect(isLuxury(TileResource.Gold)).toBe(true);
        expect(isLuxury(TileResource.Gems)).toBe(true);
        expect(isLuxury(TileResource.Silk)).toBe(true);
        expect(isLuxury(TileResource.Wine)).toBe(true);
      });

      it('should return false for non-luxury resources', () => {
        expect(isLuxury(TileResource.Cattle)).toBe(false);
        expect(isLuxury(TileResource.Iron)).toBe(false);
      });
    });
  });

  describe('getAllResources', () => {
    it('should return all 27 resources', () => {
      const resources = getAllResources();
      expect(resources).toHaveLength(27);
    });
  });

  describe('getResourcesByCategory', () => {
    it('should return correct bonus resources', () => {
      const bonus = getResourcesByCategory(ResourceCategory.Bonus);
      expect(bonus).toContain(TileResource.Cattle);
      expect(bonus).toContain(TileResource.Sheep);
      expect(bonus).toContain(TileResource.Fish);
      expect(bonus).not.toContain(TileResource.Iron);
    });

    it('should return correct strategic resources', () => {
      const strategic = getResourcesByCategory(ResourceCategory.Strategic);
      expect(strategic).toContain(TileResource.Horses);
      expect(strategic).toContain(TileResource.Iron);
      expect(strategic).toContain(TileResource.Uranium);
      expect(strategic).not.toContain(TileResource.Gold);
    });

    it('should return correct luxury resources', () => {
      const luxury = getResourcesByCategory(ResourceCategory.Luxury);
      expect(luxury).toContain(TileResource.Gold);
      expect(luxury).toContain(TileResource.Gems);
      expect(luxury).toContain(TileResource.Ivory);
      expect(luxury).not.toContain(TileResource.Cattle);
    });
  });

  describe('improved yields', () => {
    it('should have improved yields greater or equal to base for all resources', () => {
      const resources = getAllResources();
      for (const resource of resources) {
        const data = RESOURCE_DATA[resource];
        expect(data.improvedFood).toBeGreaterThanOrEqual(data.food);
        expect(data.improvedProduction).toBeGreaterThanOrEqual(data.production);
        expect(data.improvedGold).toBeGreaterThanOrEqual(data.gold);
      }
    });
  });
});
