import { describe, it, expect } from 'vitest';
import {
  TileFeature,
  FEATURE_DATA,
  canPlaceFeature,
  getFeatureData,
  getAllFeatures,
} from './TileFeature';
import { Terrain } from './Terrain';

describe('TileFeature', () => {
  describe('enum values', () => {
    it('should have 6 feature types', () => {
      const features = Object.values(TileFeature);
      expect(features).toHaveLength(6);
    });

    it('should have all features defined', () => {
      expect(TileFeature.Forest).toBe('Forest');
      expect(TileFeature.Jungle).toBe('Jungle');
      expect(TileFeature.Marsh).toBe('Marsh');
      expect(TileFeature.Floodplains).toBe('Floodplains');
      expect(TileFeature.Oasis).toBe('Oasis');
      expect(TileFeature.Ice).toBe('Ice');
    });
  });

  describe('FEATURE_DATA', () => {
    it('should have data for all feature types', () => {
      const features = Object.values(TileFeature);
      for (const feature of features) {
        expect(FEATURE_DATA[feature]).toBeDefined();
      }
    });

    it('should have correct modifiers for Forest', () => {
      const data = FEATURE_DATA[TileFeature.Forest];
      expect(data.foodModifier).toBe(0);
      expect(data.productionModifier).toBe(1);
      expect(data.goldModifier).toBe(0);
      expect(data.movementModifier).toBe(1);
    });

    it('should have correct modifiers for Jungle (negative production)', () => {
      const data = FEATURE_DATA[TileFeature.Jungle];
      expect(data.foodModifier).toBe(0);
      expect(data.productionModifier).toBe(-1);
      expect(data.goldModifier).toBe(0);
      expect(data.movementModifier).toBe(1);
    });

    it('should have correct modifiers for Marsh (negative food)', () => {
      const data = FEATURE_DATA[TileFeature.Marsh];
      expect(data.foodModifier).toBe(-1);
      expect(data.productionModifier).toBe(0);
      expect(data.goldModifier).toBe(0);
    });

    it('should have correct modifiers for Floodplains (bonus food)', () => {
      const data = FEATURE_DATA[TileFeature.Floodplains];
      expect(data.foodModifier).toBe(2);
      expect(data.productionModifier).toBe(0);
      expect(data.goldModifier).toBe(0);
    });

    it('should have correct modifiers for Oasis (food and gold)', () => {
      const data = FEATURE_DATA[TileFeature.Oasis];
      expect(data.foodModifier).toBe(3);
      expect(data.productionModifier).toBe(0);
      expect(data.goldModifier).toBe(1);
    });

    it('should have correct modifiers for Ice (no bonuses)', () => {
      const data = FEATURE_DATA[TileFeature.Ice];
      expect(data.foodModifier).toBe(0);
      expect(data.productionModifier).toBe(0);
      expect(data.goldModifier).toBe(0);
    });
  });

  describe('valid terrains', () => {
    it('should allow Forest on appropriate terrains', () => {
      const validTerrains = FEATURE_DATA[TileFeature.Forest].validTerrains;
      expect(validTerrains).toContain(Terrain.Grassland);
      expect(validTerrains).toContain(Terrain.Plains);
      expect(validTerrains).toContain(Terrain.Tundra);
      expect(validTerrains).toContain(Terrain.GrasslandHill);
      expect(validTerrains).toContain(Terrain.PlainsHill);
      expect(validTerrains).toContain(Terrain.TundraHill);
    });

    it('should not allow Forest on desert or snow', () => {
      const validTerrains = FEATURE_DATA[TileFeature.Forest].validTerrains;
      expect(validTerrains).not.toContain(Terrain.Desert);
      expect(validTerrains).not.toContain(Terrain.Snow);
    });

    it('should only allow Marsh on Grassland', () => {
      const validTerrains = FEATURE_DATA[TileFeature.Marsh].validTerrains;
      expect(validTerrains).toEqual([Terrain.Grassland]);
    });

    it('should only allow Floodplains on Desert', () => {
      const validTerrains = FEATURE_DATA[TileFeature.Floodplains].validTerrains;
      expect(validTerrains).toEqual([Terrain.Desert]);
    });

    it('should only allow Oasis on Desert', () => {
      const validTerrains = FEATURE_DATA[TileFeature.Oasis].validTerrains;
      expect(validTerrains).toEqual([Terrain.Desert]);
    });

    it('should only allow Ice on water', () => {
      const validTerrains = FEATURE_DATA[TileFeature.Ice].validTerrains;
      expect(validTerrains).toContain(Terrain.Coast);
      expect(validTerrains).toContain(Terrain.Ocean);
      expect(validTerrains).not.toContain(Terrain.Lake);
    });
  });

  describe('canPlaceFeature', () => {
    it('should return true for valid terrain/feature combinations', () => {
      expect(canPlaceFeature(TileFeature.Forest, Terrain.Grassland)).toBe(true);
      expect(canPlaceFeature(TileFeature.Forest, Terrain.Plains)).toBe(true);
      expect(canPlaceFeature(TileFeature.Jungle, Terrain.Grassland)).toBe(true);
      expect(canPlaceFeature(TileFeature.Marsh, Terrain.Grassland)).toBe(true);
      expect(canPlaceFeature(TileFeature.Floodplains, Terrain.Desert)).toBe(
        true
      );
      expect(canPlaceFeature(TileFeature.Oasis, Terrain.Desert)).toBe(true);
      expect(canPlaceFeature(TileFeature.Ice, Terrain.Ocean)).toBe(true);
    });

    it('should return false for invalid terrain/feature combinations', () => {
      expect(canPlaceFeature(TileFeature.Forest, Terrain.Desert)).toBe(false);
      expect(canPlaceFeature(TileFeature.Jungle, Terrain.Tundra)).toBe(false);
      expect(canPlaceFeature(TileFeature.Marsh, Terrain.Plains)).toBe(false);
      expect(canPlaceFeature(TileFeature.Floodplains, Terrain.Grassland)).toBe(
        false
      );
      expect(canPlaceFeature(TileFeature.Oasis, Terrain.Grassland)).toBe(false);
      expect(canPlaceFeature(TileFeature.Ice, Terrain.Mountain)).toBe(false);
    });

    it('should not allow features on mountains', () => {
      const features = Object.values(TileFeature);
      for (const feature of features) {
        expect(canPlaceFeature(feature, Terrain.Mountain)).toBe(false);
      }
    });
  });

  describe('getFeatureData', () => {
    it('should return correct data for any feature', () => {
      const data = getFeatureData(TileFeature.Forest);
      expect(data).toEqual(FEATURE_DATA[TileFeature.Forest]);
    });
  });

  describe('getAllFeatures', () => {
    it('should return all 6 features', () => {
      const features = getAllFeatures();
      expect(features).toHaveLength(6);
      expect(features).toContain(TileFeature.Forest);
      expect(features).toContain(TileFeature.Jungle);
      expect(features).toContain(TileFeature.Marsh);
      expect(features).toContain(TileFeature.Floodplains);
      expect(features).toContain(TileFeature.Oasis);
      expect(features).toContain(TileFeature.Ice);
    });
  });
});
