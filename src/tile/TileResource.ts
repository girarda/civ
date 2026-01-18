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

export function getResourcesByCategory(
  category: ResourceCategory
): TileResource[] {
  return Object.values(TileResource).filter(
    (r) => RESOURCE_DATA[r].category === category
  );
}
