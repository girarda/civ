import { Terrain, getTerrainData } from './Terrain';
import { TileFeature, getFeatureData } from './TileFeature';
import { TileResource, getResourceData } from './TileResource';

export interface TileYields {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

export const ZERO_YIELDS: TileYields = {
  food: 0,
  production: 0,
  gold: 0,
  science: 0,
  culture: 0,
  faith: 0,
};

export function createYields(
  food: number = 0,
  production: number = 0,
  gold: number = 0,
  science: number = 0,
  culture: number = 0,
  faith: number = 0
): TileYields {
  return { food, production, gold, science, culture, faith };
}

export function calculateYields(
  terrain: Terrain,
  feature: TileFeature | null,
  resource: TileResource | null,
  _hasRiver: boolean = false
): TileYields {
  const terrainData = getTerrainData(terrain);
  let food = terrainData.food;
  let production = terrainData.production;
  let gold = terrainData.gold;

  // Apply feature modifiers
  if (feature) {
    const featureData = getFeatureData(feature);
    food += featureData.foodModifier;
    production += featureData.productionModifier;
    gold += featureData.goldModifier;
  }

  // Apply resource bonuses (unimproved)
  if (resource) {
    const resourceData = getResourceData(resource);
    food += resourceData.food;
    production += resourceData.production;
    gold += resourceData.gold;
  }

  // Clamp to non-negative
  return {
    food: Math.max(0, food),
    production: Math.max(0, production),
    gold: Math.max(0, gold),
    science: 0,
    culture: 0,
    faith: 0,
  };
}

export function calculateImprovedYields(
  terrain: Terrain,
  feature: TileFeature | null,
  resource: TileResource | null,
  _hasRiver: boolean = false
): TileYields {
  const terrainData = getTerrainData(terrain);
  let food = terrainData.food;
  let production = terrainData.production;
  let gold = terrainData.gold;

  // Apply feature modifiers
  if (feature) {
    const featureData = getFeatureData(feature);
    food += featureData.foodModifier;
    production += featureData.productionModifier;
    gold += featureData.goldModifier;
  }

  // Apply improved resource bonuses
  if (resource) {
    const resourceData = getResourceData(resource);
    food += resourceData.improvedFood;
    production += resourceData.improvedProduction;
    gold += resourceData.improvedGold;
  }

  // Clamp to non-negative
  return {
    food: Math.max(0, food),
    production: Math.max(0, production),
    gold: Math.max(0, gold),
    science: 0,
    culture: 0,
    faith: 0,
  };
}

export function totalYields(yields: TileYields): number {
  return (
    yields.food + yields.production + yields.gold + yields.science + yields.culture + yields.faith
  );
}

export function addYields(a: TileYields, b: TileYields): TileYields {
  return {
    food: a.food + b.food,
    production: a.production + b.production,
    gold: a.gold + b.gold,
    science: a.science + b.science,
    culture: a.culture + b.culture,
    faith: a.faith + b.faith,
  };
}

export function subtractYields(a: TileYields, b: TileYields): TileYields {
  return {
    food: a.food - b.food,
    production: a.production - b.production,
    gold: a.gold - b.gold,
    science: a.science - b.science,
    culture: a.culture - b.culture,
    faith: a.faith - b.faith,
  };
}

export function multiplyYields(yields: TileYields, factor: number): TileYields {
  return {
    food: yields.food * factor,
    production: yields.production * factor,
    gold: yields.gold * factor,
    science: yields.science * factor,
    culture: yields.culture * factor,
    faith: yields.faith * factor,
  };
}

export function yieldsEqual(a: TileYields, b: TileYields): boolean {
  return (
    a.food === b.food &&
    a.production === b.production &&
    a.gold === b.gold &&
    a.science === b.science &&
    a.culture === b.culture &&
    a.faith === b.faith
  );
}
