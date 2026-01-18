export enum Terrain {
  // Flat terrain
  Grassland = 'Grassland',
  Plains = 'Plains',
  Desert = 'Desert',
  Tundra = 'Tundra',
  Snow = 'Snow',

  // Hill variants
  GrasslandHill = 'GrasslandHill',
  PlainsHill = 'PlainsHill',
  DesertHill = 'DesertHill',
  TundraHill = 'TundraHill',
  SnowHill = 'SnowHill',

  // Special terrain
  Mountain = 'Mountain',

  // Water terrain
  Coast = 'Coast',
  Ocean = 'Ocean',
  Lake = 'Lake',
}

export interface TerrainData {
  food: number;
  production: number;
  gold: number;
  movementCost: number;
  isWater: boolean;
  isHill: boolean;
  isPassable: boolean;
}

export const TERRAIN_DATA: Record<Terrain, TerrainData> = {
  [Terrain.Grassland]: {
    food: 2,
    production: 0,
    gold: 0,
    movementCost: 1,
    isWater: false,
    isHill: false,
    isPassable: true,
  },
  [Terrain.Plains]: {
    food: 1,
    production: 1,
    gold: 0,
    movementCost: 1,
    isWater: false,
    isHill: false,
    isPassable: true,
  },
  [Terrain.Desert]: {
    food: 0,
    production: 0,
    gold: 0,
    movementCost: 1,
    isWater: false,
    isHill: false,
    isPassable: true,
  },
  [Terrain.Tundra]: {
    food: 1,
    production: 0,
    gold: 0,
    movementCost: 1,
    isWater: false,
    isHill: false,
    isPassable: true,
  },
  [Terrain.Snow]: {
    food: 0,
    production: 0,
    gold: 0,
    movementCost: 1,
    isWater: false,
    isHill: false,
    isPassable: true,
  },

  [Terrain.GrasslandHill]: {
    food: 0,
    production: 2,
    gold: 0,
    movementCost: 2,
    isWater: false,
    isHill: true,
    isPassable: true,
  },
  [Terrain.PlainsHill]: {
    food: 0,
    production: 2,
    gold: 0,
    movementCost: 2,
    isWater: false,
    isHill: true,
    isPassable: true,
  },
  [Terrain.DesertHill]: {
    food: 0,
    production: 2,
    gold: 0,
    movementCost: 2,
    isWater: false,
    isHill: true,
    isPassable: true,
  },
  [Terrain.TundraHill]: {
    food: 0,
    production: 2,
    gold: 0,
    movementCost: 2,
    isWater: false,
    isHill: true,
    isPassable: true,
  },
  [Terrain.SnowHill]: {
    food: 0,
    production: 2,
    gold: 0,
    movementCost: 2,
    isWater: false,
    isHill: true,
    isPassable: true,
  },

  [Terrain.Mountain]: {
    food: 0,
    production: 0,
    gold: 0,
    movementCost: 9999,
    isWater: false,
    isHill: false,
    isPassable: false,
  },

  [Terrain.Coast]: {
    food: 1,
    production: 0,
    gold: 0,
    movementCost: 9999,
    isWater: true,
    isHill: false,
    isPassable: false,
  },
  [Terrain.Ocean]: {
    food: 1,
    production: 0,
    gold: 0,
    movementCost: 9999,
    isWater: true,
    isHill: false,
    isPassable: false,
  },
  [Terrain.Lake]: {
    food: 2,
    production: 0,
    gold: 0,
    movementCost: 9999,
    isWater: true,
    isHill: false,
    isPassable: false,
  },
};

export function getTerrainData(terrain: Terrain): TerrainData {
  return TERRAIN_DATA[terrain];
}

export function isFlatLand(terrain: Terrain): boolean {
  return [
    Terrain.Grassland,
    Terrain.Plains,
    Terrain.Desert,
    Terrain.Tundra,
    Terrain.Snow,
  ].includes(terrain);
}

export function isHill(terrain: Terrain): boolean {
  return TERRAIN_DATA[terrain].isHill;
}

export function isWater(terrain: Terrain): boolean {
  return TERRAIN_DATA[terrain].isWater;
}

export function isPassable(terrain: Terrain): boolean {
  return TERRAIN_DATA[terrain].isPassable;
}
