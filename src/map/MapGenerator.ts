import { createNoise2D } from 'simplex-noise';
import seedrandom from 'seedrandom';
import { MapConfig } from './MapConfig';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { TileFeature, canPlaceFeature } from '../tile/TileFeature';

export interface GeneratedTile {
  position: TilePosition;
  terrain: Terrain;
  feature: TileFeature | null;
}

export class MapGenerator {
  private config: MapConfig;
  private rng: () => number;

  constructor(config: MapConfig) {
    this.config = config;
    this.rng = seedrandom(config.seed.toString());
  }

  private normalizeMap(map: number[][]): void {
    let min = Infinity;
    let max = -Infinity;
    for (const row of map) {
      for (const val of row) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    const range = max - min;
    if (range > 0.0001) {
      for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map[x].length; y++) {
          map[x][y] = (map[x][y] - min) / range;
        }
      }
    }
  }

  generateHeightMap(): number[][] {
    const [width, height] = this.config.getDimensions();
    const noise2D = createNoise2D(() => this.rng());
    const map: number[][] = Array.from({ length: width }, () =>
      Array(height).fill(0)
    );

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Multi-octave noise (Fbm)
        let h = 0;
        let amplitude = 1;
        let frequency = 0.02;
        for (let octave = 0; octave < 6; octave++) {
          h += noise2D(x * frequency, y * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }

        // Edge falloff
        const edgeX = Math.abs(x / width - 0.5) * 2;
        const edgeY = Math.abs(y / height - 0.5) * 2;
        const edgeFalloff = 1 - Math.min(1, Math.sqrt(edgeX ** 2 + edgeY ** 2));

        map[x][y] = h * edgeFalloff;
      }
    }

    this.normalizeMap(map);
    return map;
  }

  generateTemperatureMap(): number[][] {
    const [width, height] = this.config.getDimensions();
    const noise2D = createNoise2D(() => this.rng());
    const map: number[][] = Array.from({ length: width }, () =>
      Array(height).fill(0)
    );

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const latitudeFactor = Math.abs(y / height - 0.5) * 2;
        const baseTemp = 1 - latitudeFactor;
        const noiseVal = noise2D(x * 0.05, y * 0.05) * 0.2;
        map[x][y] = Math.max(0, Math.min(1, baseTemp + noiseVal));
      }
    }

    return map;
  }

  generateMoistureMap(): number[][] {
    const [width, height] = this.config.getDimensions();
    const noise2D = createNoise2D(() => this.rng());
    const map: number[][] = Array.from({ length: width }, () =>
      Array(height).fill(0)
    );

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let m = 0;
        let amplitude = 1;
        let frequency = 0.03;
        for (let octave = 0; octave < 4; octave++) {
          m += noise2D(x * frequency, y * frequency) * amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }
        map[x][y] = m;
      }
    }

    this.normalizeMap(map);
    return map;
  }

  determineTerrain(height: number, temp: number): Terrain {
    if (height < this.config.oceanThreshold) {
      return height < this.config.oceanThreshold * 0.6
        ? Terrain.Ocean
        : Terrain.Coast;
    }
    if (height > this.config.mountainThreshold) {
      return Terrain.Mountain;
    }

    const isHill = height > this.config.hillThreshold;

    if (temp < 0.15) return isHill ? Terrain.SnowHill : Terrain.Snow;
    if (temp < 0.3) return isHill ? Terrain.TundraHill : Terrain.Tundra;
    if (temp < 0.5) return isHill ? Terrain.GrasslandHill : Terrain.Grassland;
    if (temp < 0.8) return isHill ? Terrain.PlainsHill : Terrain.Plains;
    return isHill ? Terrain.DesertHill : Terrain.Desert;
  }

  determineFeature(
    terrain: Terrain,
    temp: number,
    moisture: number
  ): TileFeature | null {
    // No features on water, mountains, or snow
    if (
      [
        Terrain.Ocean,
        Terrain.Coast,
        Terrain.Lake,
        Terrain.Mountain,
        Terrain.Snow,
        Terrain.SnowHill,
      ].includes(terrain)
    ) {
      return null;
    }

    const isHill = [
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.DesertHill,
      Terrain.TundraHill,
      Terrain.SnowHill,
    ].includes(terrain);

    // Oasis
    if (
      terrain === Terrain.Desert &&
      moisture > 0.4 &&
      this.rng() < 0.05
    ) {
      return TileFeature.Oasis;
    }

    // Marsh
    if (
      !isHill &&
      moisture > 0.7 &&
      this.rng() < 0.2 &&
      canPlaceFeature(TileFeature.Marsh, terrain)
    ) {
      return TileFeature.Marsh;
    }

    // Jungle
    if (
      temp > 0.7 &&
      moisture > 0.6 &&
      this.rng() < 0.5 &&
      canPlaceFeature(TileFeature.Jungle, terrain)
    ) {
      return TileFeature.Jungle;
    }

    // Forest
    if (
      temp < 0.6 &&
      moisture > 0.5 &&
      this.rng() < 0.4 &&
      canPlaceFeature(TileFeature.Forest, terrain)
    ) {
      return TileFeature.Forest;
    }

    return null;
  }

  generate(): GeneratedTile[] {
    const [width, height] = this.config.getDimensions();
    const heightMap = this.generateHeightMap();
    const tempMap = this.generateTemperatureMap();
    const moistureMap = this.generateMoistureMap();

    const tiles: GeneratedTile[] = [];

    for (let q = 0; q < width; q++) {
      for (let r = 0; r < height; r++) {
        const terrain = this.determineTerrain(heightMap[q][r], tempMap[q][r]);
        const feature = this.determineFeature(
          terrain,
          tempMap[q][r],
          moistureMap[q][r]
        );

        tiles.push({
          position: new TilePosition(q, r),
          terrain,
          feature,
        });
      }
    }

    return tiles;
  }
}
