import { Terrain } from './Terrain';
import { TileFeature } from './TileFeature';

export enum ResourceCategory {
  Bonus = 'Bonus',
  Strategic = 'Strategic',
  Luxury = 'Luxury',
}

export enum TileResource {
  // Bonus (7)
  Cattle = 'Cattle',
  Sheep = 'Sheep',
  Fish = 'Fish',
  Stone = 'Stone',
  Wheat = 'Wheat',
  Bananas = 'Bananas',
  Deer = 'Deer',
  // Strategic (6)
  Horses = 'Horses',
  Iron = 'Iron',
  Coal = 'Coal',
  Oil = 'Oil',
  Aluminum = 'Aluminum',
  Uranium = 'Uranium',
  // Luxury (13)
  Citrus = 'Citrus',
  Cotton = 'Cotton',
  Copper = 'Copper',
  Gold = 'Gold',
  Crab = 'Crab',
  Whales = 'Whales',
  Turtles = 'Turtles',
  Olives = 'Olives',
  Wine = 'Wine',
  Silk = 'Silk',
  Spices = 'Spices',
  Gems = 'Gems',
  Marble = 'Marble',
  Ivory = 'Ivory',
}

export interface ResourceData {
  category: ResourceCategory;
  food: number;
  production: number;
  gold: number;
  improvedFood: number;
  improvedProduction: number;
  improvedGold: number;
}

export const RESOURCE_DATA: Record<TileResource, ResourceData> = {
  // Bonus resources
  [TileResource.Cattle]: {
    category: ResourceCategory.Bonus,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Sheep]: {
    category: ResourceCategory.Bonus,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Fish]: {
    category: ResourceCategory.Bonus,
    food: 1,
    production: 0,
    gold: 0,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 0,
  },
  [TileResource.Stone]: {
    category: ResourceCategory.Bonus,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Wheat]: {
    category: ResourceCategory.Bonus,
    food: 1,
    production: 0,
    gold: 0,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 0,
  },
  [TileResource.Bananas]: {
    category: ResourceCategory.Bonus,
    food: 1,
    production: 0,
    gold: 0,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 0,
  },
  [TileResource.Deer]: {
    category: ResourceCategory.Bonus,
    food: 1,
    production: 0,
    gold: 0,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 0,
  },
  // Strategic resources
  [TileResource.Horses]: {
    category: ResourceCategory.Strategic,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Iron]: {
    category: ResourceCategory.Strategic,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Coal]: {
    category: ResourceCategory.Strategic,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Oil]: {
    category: ResourceCategory.Strategic,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Aluminum]: {
    category: ResourceCategory.Strategic,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  [TileResource.Uranium]: {
    category: ResourceCategory.Strategic,
    food: 0,
    production: 1,
    gold: 0,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 0,
  },
  // Luxury resources
  [TileResource.Citrus]: {
    category: ResourceCategory.Luxury,
    food: 1,
    production: 0,
    gold: 1,
    improvedFood: 1,
    improvedProduction: 0,
    improvedGold: 2,
  },
  [TileResource.Cotton]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 2,
    improvedFood: 0,
    improvedProduction: 0,
    improvedGold: 3,
  },
  [TileResource.Copper]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 2,
    improvedFood: 0,
    improvedProduction: 1,
    improvedGold: 2,
  },
  [TileResource.Gold]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 2,
    improvedFood: 0,
    improvedProduction: 0,
    improvedGold: 2,
  },
  [TileResource.Crab]: {
    category: ResourceCategory.Luxury,
    food: 1,
    production: 0,
    gold: 0,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 0,
  },
  [TileResource.Whales]: {
    category: ResourceCategory.Luxury,
    food: 1,
    production: 0,
    gold: 1,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 1,
  },
  [TileResource.Turtles]: {
    category: ResourceCategory.Luxury,
    food: 1,
    production: 0,
    gold: 1,
    improvedFood: 2,
    improvedProduction: 0,
    improvedGold: 1,
  },
  [TileResource.Olives]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 1,
    gold: 1,
    improvedFood: 0,
    improvedProduction: 1,
    improvedGold: 2,
  },
  [TileResource.Wine]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 2,
    improvedFood: 0,
    improvedProduction: 0,
    improvedGold: 3,
  },
  [TileResource.Silk]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 2,
    improvedFood: 0,
    improvedProduction: 0,
    improvedGold: 3,
  },
  [TileResource.Spices]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 2,
    improvedFood: 0,
    improvedProduction: 0,
    improvedGold: 3,
  },
  [TileResource.Gems]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 0,
    gold: 3,
    improvedFood: 0,
    improvedProduction: 0,
    improvedGold: 3,
  },
  [TileResource.Marble]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 1,
    gold: 1,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 1,
  },
  [TileResource.Ivory]: {
    category: ResourceCategory.Luxury,
    food: 0,
    production: 1,
    gold: 1,
    improvedFood: 0,
    improvedProduction: 2,
    improvedGold: 1,
  },
};

export function getResourceData(resource: TileResource): ResourceData {
  return RESOURCE_DATA[resource];
}

export function isBonus(resource: TileResource): boolean {
  return RESOURCE_DATA[resource].category === ResourceCategory.Bonus;
}

export function isStrategic(resource: TileResource): boolean {
  return RESOURCE_DATA[resource].category === ResourceCategory.Strategic;
}

export function isLuxury(resource: TileResource): boolean {
  return RESOURCE_DATA[resource].category === ResourceCategory.Luxury;
}

export function getAllResources(): TileResource[] {
  return Object.values(TileResource);
}

export function getResourcesByCategory(category: ResourceCategory): TileResource[] {
  return Object.values(TileResource).filter((r) => RESOURCE_DATA[r].category === category);
}

// Resource placement rules

export interface ResourcePlacement {
  validTerrains: Terrain[];
  validFeatures: (TileFeature | null)[]; // null means "no feature required"
  spawnChance: number; // 0.0 to 1.0
}

export const RESOURCE_PLACEMENT: Record<TileResource, ResourcePlacement> = {
  // Bonus Resources
  [TileResource.Cattle]: {
    validTerrains: [Terrain.Grassland],
    validFeatures: [null],
    spawnChance: 0.08,
  },
  [TileResource.Sheep]: {
    validTerrains: [
      Terrain.Grassland,
      Terrain.GrasslandHill,
      Terrain.Plains,
      Terrain.PlainsHill,
      Terrain.DesertHill,
    ],
    validFeatures: [null],
    spawnChance: 0.08,
  },
  [TileResource.Fish]: {
    validTerrains: [Terrain.Coast, Terrain.Ocean, Terrain.Lake],
    validFeatures: [null],
    spawnChance: 0.1,
  },
  [TileResource.Stone]: {
    validTerrains: [
      Terrain.Grassland,
      Terrain.GrasslandHill,
      Terrain.Plains,
      Terrain.PlainsHill,
      Terrain.Desert,
      Terrain.DesertHill,
      Terrain.Tundra,
    ],
    validFeatures: [null],
    spawnChance: 0.05,
  },
  [TileResource.Wheat]: {
    validTerrains: [Terrain.Plains],
    validFeatures: [null, TileFeature.Floodplains],
    spawnChance: 0.1,
  },
  [TileResource.Bananas]: {
    validTerrains: [Terrain.Grassland],
    validFeatures: [TileFeature.Jungle],
    spawnChance: 0.15,
  },
  [TileResource.Deer]: {
    validTerrains: [Terrain.Tundra, Terrain.TundraHill],
    validFeatures: [null, TileFeature.Forest],
    spawnChance: 0.12,
  },

  // Strategic Resources
  [TileResource.Horses]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains, Terrain.Tundra],
    validFeatures: [null],
    spawnChance: 0.04,
  },
  [TileResource.Iron]: {
    validTerrains: [
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.DesertHill,
      Terrain.TundraHill,
      Terrain.SnowHill,
    ],
    validFeatures: [null, TileFeature.Forest],
    spawnChance: 0.03,
  },
  [TileResource.Coal]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill],
    validFeatures: [null, TileFeature.Forest, TileFeature.Jungle],
    spawnChance: 0.03,
  },
  [TileResource.Oil]: {
    validTerrains: [Terrain.Desert, Terrain.Tundra, Terrain.Snow, Terrain.Coast, Terrain.Ocean],
    validFeatures: [null, TileFeature.Marsh],
    spawnChance: 0.02,
  },
  [TileResource.Aluminum]: {
    validTerrains: [
      Terrain.Plains,
      Terrain.PlainsHill,
      Terrain.Desert,
      Terrain.DesertHill,
      Terrain.Tundra,
    ],
    validFeatures: [null],
    spawnChance: 0.02,
  },
  [TileResource.Uranium]: {
    validTerrains: [
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.DesertHill,
      Terrain.TundraHill,
      Terrain.SnowHill,
    ],
    validFeatures: [null, TileFeature.Forest, TileFeature.Jungle, TileFeature.Marsh],
    spawnChance: 0.01,
  },

  // Luxury Resources
  [TileResource.Citrus]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains],
    validFeatures: [null, TileFeature.Jungle],
    spawnChance: 0.03,
  },
  [TileResource.Cotton]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains, Terrain.Desert],
    validFeatures: [null, TileFeature.Floodplains],
    spawnChance: 0.03,
  },
  [TileResource.Copper]: {
    validTerrains: [
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.DesertHill,
      Terrain.TundraHill,
    ],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Gold]: {
    validTerrains: [
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.DesertHill,
      Terrain.Grassland,
      Terrain.Plains,
      Terrain.Desert,
    ],
    validFeatures: [null],
    spawnChance: 0.02,
  },
  [TileResource.Crab]: {
    validTerrains: [Terrain.Coast],
    validFeatures: [null],
    spawnChance: 0.06,
  },
  [TileResource.Whales]: {
    validTerrains: [Terrain.Coast, Terrain.Ocean],
    validFeatures: [null],
    spawnChance: 0.04,
  },
  [TileResource.Turtles]: {
    validTerrains: [Terrain.Coast],
    validFeatures: [null],
    spawnChance: 0.04,
  },
  [TileResource.Olives]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Wine]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Silk]: {
    validTerrains: [Terrain.Grassland],
    validFeatures: [TileFeature.Forest],
    spawnChance: 0.04,
  },
  [TileResource.Spices]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains],
    validFeatures: [TileFeature.Jungle],
    spawnChance: 0.05,
  },
  [TileResource.Gems]: {
    validTerrains: [
      Terrain.GrasslandHill,
      Terrain.PlainsHill,
      Terrain.DesertHill,
      Terrain.TundraHill,
      Terrain.Grassland,
    ],
    validFeatures: [null, TileFeature.Jungle],
    spawnChance: 0.02,
  },
  [TileResource.Marble]: {
    validTerrains: [
      Terrain.Grassland,
      Terrain.GrasslandHill,
      Terrain.Plains,
      Terrain.PlainsHill,
      Terrain.Desert,
      Terrain.DesertHill,
      Terrain.Tundra,
    ],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Ivory]: {
    validTerrains: [Terrain.Plains],
    validFeatures: [null],
    spawnChance: 0.03,
  },
};

/**
 * Check if a resource can be placed on a given terrain/feature combination.
 */
export function canPlaceResource(
  resource: TileResource,
  terrain: Terrain,
  feature: TileFeature | null
): boolean {
  const placement = RESOURCE_PLACEMENT[resource];
  if (!placement.validTerrains.includes(terrain)) return false;

  // If validFeatures includes null, resource can spawn without feature
  // If feature is present, it must match one in the validFeatures list
  if (feature === null) {
    return placement.validFeatures.includes(null);
  }
  return placement.validFeatures.includes(feature);
}
