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
  RESOURCE_PLACEMENT,
  canPlaceResource,
} from './TileResource';
import { Terrain } from './Terrain';
import { TileFeature } from './TileFeature';

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

  describe('RESOURCE_PLACEMENT', () => {
    it('should have placement rules for all 26 resources', () => {
      const resources = getAllResources();
      for (const resource of resources) {
        expect(RESOURCE_PLACEMENT[resource]).toBeDefined();
        expect(RESOURCE_PLACEMENT[resource].validTerrains.length).toBeGreaterThan(0);
        expect(RESOURCE_PLACEMENT[resource].validFeatures.length).toBeGreaterThan(0);
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeGreaterThan(0);
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeLessThanOrEqual(1);
      }
    });

    it('should have reasonable spawn rates by category', () => {
      // Bonus resources should have higher spawn rates (5-15%)
      const bonusResources = getResourcesByCategory(ResourceCategory.Bonus);
      for (const resource of bonusResources) {
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeGreaterThanOrEqual(0.05);
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeLessThanOrEqual(0.15);
      }

      // Strategic resources should have lower spawn rates (1-4%)
      const strategicResources = getResourcesByCategory(ResourceCategory.Strategic);
      for (const resource of strategicResources) {
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeGreaterThanOrEqual(0.01);
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeLessThanOrEqual(0.04);
      }

      // Luxury resources should have moderate spawn rates (2-6%)
      const luxuryResources = getResourcesByCategory(ResourceCategory.Luxury);
      for (const resource of luxuryResources) {
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeGreaterThanOrEqual(0.02);
        expect(RESOURCE_PLACEMENT[resource].spawnChance).toBeLessThanOrEqual(0.06);
      }
    });
  });

  describe('canPlaceResource', () => {
    it('should allow Cattle on Grassland without feature', () => {
      expect(canPlaceResource(TileResource.Cattle, Terrain.Grassland, null)).toBe(true);
    });

    it('should not allow Cattle on Plains', () => {
      expect(canPlaceResource(TileResource.Cattle, Terrain.Plains, null)).toBe(false);
    });

    it('should not allow Cattle on Grassland with Forest', () => {
      // Cattle requires no feature (validFeatures: [null])
      expect(canPlaceResource(TileResource.Cattle, Terrain.Grassland, TileFeature.Forest)).toBe(
        false
      );
    });

    it('should allow Fish on Coast and Ocean', () => {
      expect(canPlaceResource(TileResource.Fish, Terrain.Coast, null)).toBe(true);
      expect(canPlaceResource(TileResource.Fish, Terrain.Ocean, null)).toBe(true);
    });

    it('should not allow Fish on land terrain', () => {
      expect(canPlaceResource(TileResource.Fish, Terrain.Grassland, null)).toBe(false);
      expect(canPlaceResource(TileResource.Fish, Terrain.Plains, null)).toBe(false);
    });

    it('should allow Bananas only on Grassland with Jungle', () => {
      expect(canPlaceResource(TileResource.Bananas, Terrain.Grassland, TileFeature.Jungle)).toBe(
        true
      );
      expect(canPlaceResource(TileResource.Bananas, Terrain.Grassland, null)).toBe(false);
      expect(canPlaceResource(TileResource.Bananas, Terrain.Plains, TileFeature.Jungle)).toBe(
        false
      );
    });

    it('should allow Deer on Tundra with or without Forest', () => {
      expect(canPlaceResource(TileResource.Deer, Terrain.Tundra, null)).toBe(true);
      expect(canPlaceResource(TileResource.Deer, Terrain.Tundra, TileFeature.Forest)).toBe(true);
      expect(canPlaceResource(TileResource.Deer, Terrain.TundraHill, null)).toBe(true);
    });

    it('should allow Iron on hills with optional Forest', () => {
      expect(canPlaceResource(TileResource.Iron, Terrain.GrasslandHill, null)).toBe(true);
      expect(canPlaceResource(TileResource.Iron, Terrain.GrasslandHill, TileFeature.Forest)).toBe(
        true
      );
      expect(canPlaceResource(TileResource.Iron, Terrain.Grassland, null)).toBe(false);
    });

    it('should allow Silk only on Grassland with Forest', () => {
      expect(canPlaceResource(TileResource.Silk, Terrain.Grassland, TileFeature.Forest)).toBe(true);
      expect(canPlaceResource(TileResource.Silk, Terrain.Grassland, null)).toBe(false);
      expect(canPlaceResource(TileResource.Silk, Terrain.Plains, TileFeature.Forest)).toBe(false);
    });

    it('should allow Oil on water and cold/desert terrain', () => {
      expect(canPlaceResource(TileResource.Oil, Terrain.Coast, null)).toBe(true);
      expect(canPlaceResource(TileResource.Oil, Terrain.Ocean, null)).toBe(true);
      expect(canPlaceResource(TileResource.Oil, Terrain.Desert, null)).toBe(true);
      expect(canPlaceResource(TileResource.Oil, Terrain.Tundra, null)).toBe(true);
      expect(canPlaceResource(TileResource.Oil, Terrain.Snow, null)).toBe(true);
    });

    it('should not allow resources on Mountain', () => {
      const resources = getAllResources();
      for (const resource of resources) {
        expect(canPlaceResource(resource, Terrain.Mountain, null)).toBe(false);
      }
    });
  });
});
