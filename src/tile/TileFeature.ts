import { Terrain } from './Terrain';

export enum TileFeature {
  Forest = 'Forest',
  Jungle = 'Jungle',
  Marsh = 'Marsh',
  Floodplains = 'Floodplains',
  Oasis = 'Oasis',
  Ice = 'Ice',
}

export interface FeatureData {
  foodModifier: number;
  productionModifier: number;
  goldModifier: number;
  movementModifier: number;
  validTerrains: Terrain[];
}

export const FEATURE_DATA: Record<TileFeature, FeatureData> = {
  [TileFeature.Forest]: {
    foodModifier: 0,
    productionModifier: 1,
    goldModifier: 0,
    movementModifier: 1,
    validTerrains: [
      Terrain.Grassland,
      Terrain.Plains,
      Terrain.Tundra,
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.TundraHill,
    ],
  },
  [TileFeature.Jungle]: {
    foodModifier: 0,
    productionModifier: -1,
    goldModifier: 0,
    movementModifier: 1,
    validTerrains: [Terrain.Grassland, Terrain.Plains, Terrain.GrasslandHill, Terrain.PlainsHill],
  },
  [TileFeature.Marsh]: {
    foodModifier: -1,
    productionModifier: 0,
    goldModifier: 0,
    movementModifier: 1,
    validTerrains: [Terrain.Grassland],
  },
  [TileFeature.Floodplains]: {
    foodModifier: 2,
    productionModifier: 0,
    goldModifier: 0,
    movementModifier: 0,
    validTerrains: [Terrain.Desert],
  },
  [TileFeature.Oasis]: {
    foodModifier: 3,
    productionModifier: 0,
    goldModifier: 1,
    movementModifier: 0,
    validTerrains: [Terrain.Desert],
  },
  [TileFeature.Ice]: {
    foodModifier: 0,
    productionModifier: 0,
    goldModifier: 0,
    movementModifier: 0,
    validTerrains: [Terrain.Coast, Terrain.Ocean],
  },
};

export function canPlaceFeature(feature: TileFeature, terrain: Terrain): boolean {
  return FEATURE_DATA[feature].validTerrains.includes(terrain);
}

export function getFeatureData(feature: TileFeature): FeatureData {
  return FEATURE_DATA[feature];
}

export function getAllFeatures(): TileFeature[] {
  return Object.values(TileFeature);
}
