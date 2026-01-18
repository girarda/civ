export enum MapSize {
  Duel = 'Duel',
  Tiny = 'Tiny',
  Small = 'Small',
  Standard = 'Standard',
  Large = 'Large',
  Huge = 'Huge',
}

export const MAP_DIMENSIONS: Record<MapSize, [number, number]> = {
  [MapSize.Duel]: [48, 32],
  [MapSize.Tiny]: [56, 36],
  [MapSize.Small]: [68, 44],
  [MapSize.Standard]: [80, 52],
  [MapSize.Large]: [104, 64],
  [MapSize.Huge]: [128, 80],
};

export interface MapConfigOptions {
  size?: MapSize;
  seed?: number;
  landCoverage?: number;
  oceanThreshold?: number;
  hillThreshold?: number;
  mountainThreshold?: number;
}

export class MapConfig {
  readonly size: MapSize;
  readonly seed: number;
  readonly landCoverage: number;
  readonly oceanThreshold: number;
  readonly hillThreshold: number;
  readonly mountainThreshold: number;

  constructor(options: MapConfigOptions = {}) {
    this.size = options.size ?? MapSize.Standard;
    this.seed = options.seed ?? 42;
    this.landCoverage = options.landCoverage ?? 0.4;
    this.oceanThreshold = options.oceanThreshold ?? 0.35;
    this.hillThreshold = options.hillThreshold ?? 0.55;
    this.mountainThreshold = options.mountainThreshold ?? 0.75;
  }

  static duel(seed?: number): MapConfig {
    return new MapConfig({ size: MapSize.Duel, seed });
  }

  static tiny(seed?: number): MapConfig {
    return new MapConfig({ size: MapSize.Tiny, seed });
  }

  static small(seed?: number): MapConfig {
    return new MapConfig({ size: MapSize.Small, seed });
  }

  static standard(seed?: number): MapConfig {
    return new MapConfig({ size: MapSize.Standard, seed });
  }

  static large(seed?: number): MapConfig {
    return new MapConfig({ size: MapSize.Large, seed });
  }

  static huge(seed?: number): MapConfig {
    return new MapConfig({ size: MapSize.Huge, seed });
  }

  withSeed(seed: number): MapConfig {
    return new MapConfig({
      size: this.size,
      seed,
      landCoverage: this.landCoverage,
      oceanThreshold: this.oceanThreshold,
      hillThreshold: this.hillThreshold,
      mountainThreshold: this.mountainThreshold,
    });
  }

  getDimensions(): [number, number] {
    return MAP_DIMENSIONS[this.size];
  }

  getTotalTiles(): number {
    const [w, h] = this.getDimensions();
    return w * h;
  }
}
