import { describe, it, expect, beforeEach } from 'vitest';
import { MapGenerator } from './MapGenerator';
import { MapConfig, MapSize } from './MapConfig';
import { Terrain } from '../tile/Terrain';
import { TileFeature } from '../tile/TileFeature';

describe('MapConfig', () => {
  describe('constructor', () => {
    it('should create config with default values', () => {
      const config = new MapConfig();
      expect(config.size).toBe(MapSize.Standard);
      expect(config.seed).toBe(42);
      expect(config.landCoverage).toBe(0.4);
      expect(config.oceanThreshold).toBe(0.35);
      expect(config.hillThreshold).toBe(0.55);
      expect(config.mountainThreshold).toBe(0.75);
    });

    it('should accept custom options', () => {
      const config = new MapConfig({
        size: MapSize.Large,
        seed: 123,
        landCoverage: 0.5,
      });
      expect(config.size).toBe(MapSize.Large);
      expect(config.seed).toBe(123);
      expect(config.landCoverage).toBe(0.5);
    });
  });

  describe('static factory methods', () => {
    it('should create duel config', () => {
      const config = MapConfig.duel();
      expect(config.size).toBe(MapSize.Duel);
      expect(config.getDimensions()).toEqual([48, 32]);
    });

    it('should create tiny config', () => {
      const config = MapConfig.tiny();
      expect(config.size).toBe(MapSize.Tiny);
      expect(config.getDimensions()).toEqual([56, 36]);
    });

    it('should create small config', () => {
      const config = MapConfig.small();
      expect(config.size).toBe(MapSize.Small);
      expect(config.getDimensions()).toEqual([68, 44]);
    });

    it('should create standard config', () => {
      const config = MapConfig.standard();
      expect(config.size).toBe(MapSize.Standard);
      expect(config.getDimensions()).toEqual([80, 52]);
    });

    it('should create large config', () => {
      const config = MapConfig.large();
      expect(config.size).toBe(MapSize.Large);
      expect(config.getDimensions()).toEqual([104, 64]);
    });

    it('should create huge config', () => {
      const config = MapConfig.huge();
      expect(config.size).toBe(MapSize.Huge);
      expect(config.getDimensions()).toEqual([128, 80]);
    });

    it('should accept seed in factory methods', () => {
      const config = MapConfig.duel(999);
      expect(config.seed).toBe(999);
    });
  });

  describe('withSeed', () => {
    it('should create new config with different seed', () => {
      const original = MapConfig.standard();
      const modified = original.withSeed(123);
      expect(modified.seed).toBe(123);
      expect(modified.size).toBe(original.size);
      expect(original.seed).toBe(42); // Original unchanged
    });
  });

  describe('getTotalTiles', () => {
    it('should calculate total tiles correctly', () => {
      expect(MapConfig.duel().getTotalTiles()).toBe(48 * 32);
      expect(MapConfig.standard().getTotalTiles()).toBe(80 * 52);
      expect(MapConfig.huge().getTotalTiles()).toBe(128 * 80);
    });
  });
});

describe('MapGenerator', () => {
  let generator: MapGenerator;
  let config: MapConfig;

  beforeEach(() => {
    config = MapConfig.duel(42);
    generator = new MapGenerator(config);
  });

  describe('determineTerrain', () => {
    it('should return Ocean for very low height', () => {
      const terrain = generator.determineTerrain(0.1, 0.5);
      expect(terrain).toBe(Terrain.Ocean);
    });

    it('should return Coast for low height', () => {
      const terrain = generator.determineTerrain(0.3, 0.5);
      expect(terrain).toBe(Terrain.Coast);
    });

    it('should return Mountain for very high height', () => {
      const terrain = generator.determineTerrain(0.85, 0.5);
      expect(terrain).toBe(Terrain.Mountain);
    });

    it('should return Snow for cold temperature', () => {
      const terrain = generator.determineTerrain(0.5, 0.1);
      expect(terrain).toBe(Terrain.Snow);
    });

    it('should return SnowHill for cold temperature with high elevation', () => {
      const terrain = generator.determineTerrain(0.65, 0.1);
      expect(terrain).toBe(Terrain.SnowHill);
    });

    it('should return Tundra for cool temperature', () => {
      const terrain = generator.determineTerrain(0.5, 0.25);
      expect(terrain).toBe(Terrain.Tundra);
    });

    it('should return TundraHill for cool temperature with high elevation', () => {
      const terrain = generator.determineTerrain(0.65, 0.25);
      expect(terrain).toBe(Terrain.TundraHill);
    });

    it('should return Grassland for moderate temperature', () => {
      const terrain = generator.determineTerrain(0.5, 0.4);
      expect(terrain).toBe(Terrain.Grassland);
    });

    it('should return GrasslandHill for moderate temperature with high elevation', () => {
      const terrain = generator.determineTerrain(0.65, 0.4);
      expect(terrain).toBe(Terrain.GrasslandHill);
    });

    it('should return Plains for warm temperature', () => {
      const terrain = generator.determineTerrain(0.5, 0.65);
      expect(terrain).toBe(Terrain.Plains);
    });

    it('should return PlainsHill for warm temperature with high elevation', () => {
      const terrain = generator.determineTerrain(0.65, 0.65);
      expect(terrain).toBe(Terrain.PlainsHill);
    });

    it('should return Desert for hot temperature', () => {
      const terrain = generator.determineTerrain(0.5, 0.9);
      expect(terrain).toBe(Terrain.Desert);
    });

    it('should return DesertHill for hot temperature with high elevation', () => {
      const terrain = generator.determineTerrain(0.65, 0.9);
      expect(terrain).toBe(Terrain.DesertHill);
    });
  });

  describe('determineFeature', () => {
    it('should return null for water terrain', () => {
      expect(generator.determineFeature(Terrain.Ocean, 0.5, 0.5)).toBeNull();
      expect(generator.determineFeature(Terrain.Coast, 0.5, 0.5)).toBeNull();
      expect(generator.determineFeature(Terrain.Lake, 0.5, 0.5)).toBeNull();
    });

    it('should return null for mountains', () => {
      expect(generator.determineFeature(Terrain.Mountain, 0.5, 0.5)).toBeNull();
    });

    it('should return null for snow terrain', () => {
      expect(generator.determineFeature(Terrain.Snow, 0.5, 0.5)).toBeNull();
      expect(generator.determineFeature(Terrain.SnowHill, 0.5, 0.5)).toBeNull();
    });
  });

  describe('generateHeightMap', () => {
    it('should generate map with correct dimensions', () => {
      const heightMap = generator.generateHeightMap();
      const [width, height] = config.getDimensions();
      expect(heightMap.length).toBe(width);
      expect(heightMap[0].length).toBe(height);
    });

    it('should generate values between 0 and 1', () => {
      const heightMap = generator.generateHeightMap();
      for (const row of heightMap) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('generateTemperatureMap', () => {
    it('should generate map with correct dimensions', () => {
      const tempMap = generator.generateTemperatureMap();
      const [width, height] = config.getDimensions();
      expect(tempMap.length).toBe(width);
      expect(tempMap[0].length).toBe(height);
    });

    it('should generate values between 0 and 1', () => {
      const tempMap = generator.generateTemperatureMap();
      for (const row of tempMap) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('generateMoistureMap', () => {
    it('should generate map with correct dimensions', () => {
      const moistureMap = generator.generateMoistureMap();
      const [width, height] = config.getDimensions();
      expect(moistureMap.length).toBe(width);
      expect(moistureMap[0].length).toBe(height);
    });

    it('should generate values between 0 and 1', () => {
      const moistureMap = generator.generateMoistureMap();
      for (const row of moistureMap) {
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('generate', () => {
    it('should generate correct number of tiles', () => {
      const tiles = generator.generate();
      expect(tiles.length).toBe(config.getTotalTiles());
    });

    it('should generate tiles with valid terrain types', () => {
      const tiles = generator.generate();
      const validTerrains = Object.values(Terrain);
      for (const tile of tiles) {
        expect(validTerrains).toContain(tile.terrain);
      }
    });

    it('should generate tiles with valid or null features', () => {
      const tiles = generator.generate();
      const validFeatures = Object.values(TileFeature);
      for (const tile of tiles) {
        if (tile.feature !== null) {
          expect(validFeatures).toContain(tile.feature);
        }
      }
    });

    it('should generate tiles with unique positions', () => {
      const tiles = generator.generate();
      const positions = new Set(tiles.map((t) => t.position.key()));
      expect(positions.size).toBe(tiles.length);
    });
  });

  describe('deterministic generation', () => {
    it('should produce same map with same seed', () => {
      const config1 = MapConfig.duel(42);
      const config2 = MapConfig.duel(42);
      const gen1 = new MapGenerator(config1);
      const gen2 = new MapGenerator(config2);

      const tiles1 = gen1.generate();
      const tiles2 = gen2.generate();

      expect(tiles1.length).toBe(tiles2.length);
      for (let i = 0; i < tiles1.length; i++) {
        expect(tiles1[i].position.q).toBe(tiles2[i].position.q);
        expect(tiles1[i].position.r).toBe(tiles2[i].position.r);
        expect(tiles1[i].terrain).toBe(tiles2[i].terrain);
        expect(tiles1[i].feature).toBe(tiles2[i].feature);
      }
    });

    it('should produce different maps with different seeds', () => {
      const config1 = MapConfig.duel(42);
      const config2 = MapConfig.duel(999);
      const gen1 = new MapGenerator(config1);
      const gen2 = new MapGenerator(config2);

      const tiles1 = gen1.generate();
      const tiles2 = gen2.generate();

      // At least some tiles should be different
      let differences = 0;
      for (let i = 0; i < tiles1.length; i++) {
        if (tiles1[i].terrain !== tiles2[i].terrain) {
          differences++;
        }
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('terrain distribution', () => {
    it('should have a mix of terrain types', () => {
      const tiles = generator.generate();
      const terrainCounts = new Map<Terrain, number>();

      for (const tile of tiles) {
        terrainCounts.set(
          tile.terrain,
          (terrainCounts.get(tile.terrain) || 0) + 1
        );
      }

      // Should have at least 5 different terrain types
      expect(terrainCounts.size).toBeGreaterThanOrEqual(5);
    });

    it('should have water terrain at edges', () => {
      const tiles = generator.generate();
      const [width, height] = config.getDimensions();
      const waterTerrains = [Terrain.Ocean, Terrain.Coast, Terrain.Lake];

      // Check corners and edges have more water
      const edgeTiles = tiles.filter(
        (t) =>
          t.position.q < 3 ||
          t.position.q >= width - 3 ||
          t.position.r < 3 ||
          t.position.r >= height - 3
      );

      const waterCount = edgeTiles.filter((t) =>
        waterTerrains.includes(t.terrain)
      ).length;
      const waterRatio = waterCount / edgeTiles.length;

      // At least 30% water at edges due to falloff
      expect(waterRatio).toBeGreaterThan(0.3);
    });
  });

  describe('feature placement', () => {
    it('should not place features on invalid terrain', () => {
      const tiles = generator.generate();
      const invalidTerrains = [
        Terrain.Ocean,
        Terrain.Coast,
        Terrain.Lake,
        Terrain.Mountain,
        Terrain.Snow,
        Terrain.SnowHill,
      ];

      for (const tile of tiles) {
        if (invalidTerrains.includes(tile.terrain)) {
          expect(tile.feature).toBeNull();
        }
      }
    });

    it('should place some features when conditions are met', () => {
      // Use a seed known to produce some features
      const featureConfig = MapConfig.standard(12345);
      const featureGen = new MapGenerator(featureConfig);
      const tiles = featureGen.generate();

      const featuredTiles = tiles.filter((t) => t.feature !== null);
      // Should have at least some features
      expect(featuredTiles.length).toBeGreaterThan(0);
    });
  });
});
