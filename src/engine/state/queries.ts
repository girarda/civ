/**
 * State query functions that produce serializable snapshots.
 * These functions read from the ECS world and produce typed snapshot objects.
 */

import { IWorld } from 'bitecs';
import {
  GameStateSnapshot,
  UnitSnapshot,
  CitySnapshot,
  TileSnapshot,
  MapSnapshot,
} from './snapshots';
import { GameState } from '../../game/GameState';
import { GeneratedTile } from '../../map/MapGenerator';
import { TerritoryManager } from '../../city/Territory';
import {
  getAllUnits,
  getUnitPosition,
  getUnitType,
  getUnitMovement,
  getUnitOwner,
  getUnitHealth,
  canUnitMove,
} from '../../ecs/unitSystems';
import { getAllCities } from '../../ecs/citySystems';
import { Position, OwnerComponent } from '../../ecs/world';
import { CityComponent, PopulationComponent, ProductionComponent } from '../../ecs/cityComponents';
import { UnitType, getUnitName, UNIT_TYPE_DATA } from '../../unit/UnitType';
import { getBuildableName, BuildableType } from '../../city/Buildable';
import { getCityNameByIndex } from '../../city/CityNameGenerator';
import { calculateCityYields } from '../../city/CityYields';
import { TERRAIN_DATA } from '../../tile/Terrain';
import { calculateYields } from '../../tile/TileYields';
import { getUnitAtPosition } from '../../ecs/unitSystems';
import { getCityAtPosition } from '../../ecs/citySystems';

/**
 * Query the current game state and return a snapshot.
 */
export function queryGameState(gameState: GameState, playerCount: number = 2): GameStateSnapshot {
  return {
    turnNumber: gameState.getTurnNumber(),
    phase: gameState.getPhase(),
    currentPlayer: gameState.getCurrentPlayer(),
    playerCount,
  };
}

/**
 * Query all units and return snapshots, optionally filtered by player.
 */
export function queryUnits(world: IWorld, playerId?: number): UnitSnapshot[] {
  const unitEids = getAllUnits(world);
  const snapshots: UnitSnapshot[] = [];

  for (const eid of unitEids) {
    const owner = getUnitOwner(eid);

    // Filter by player if specified
    if (playerId !== undefined && owner !== playerId) {
      continue;
    }

    const unitType = getUnitType(eid) as UnitType;
    const position = getUnitPosition(eid);
    const health = getUnitHealth(eid);
    const movement = getUnitMovement(eid);
    const unitData = UNIT_TYPE_DATA[unitType];

    snapshots.push({
      eid,
      type: unitType,
      typeName: getUnitName(unitType),
      owner,
      position,
      health,
      movement,
      capabilities: {
        canMove: canUnitMove(eid),
        canAttack: unitData.strength > 0 && movement.current > 0,
        canFoundCity: unitType === UnitType.Settler,
      },
    });
  }

  return snapshots;
}

/**
 * Query a single unit by entity ID.
 */
export function queryUnit(world: IWorld, eid: number): UnitSnapshot | null {
  const unitEids = getAllUnits(world);
  if (!unitEids.includes(eid)) {
    return null;
  }

  const unitType = getUnitType(eid) as UnitType;
  const position = getUnitPosition(eid);
  const health = getUnitHealth(eid);
  const movement = getUnitMovement(eid);
  const owner = getUnitOwner(eid);
  const unitData = UNIT_TYPE_DATA[unitType];

  return {
    eid,
    type: unitType,
    typeName: getUnitName(unitType),
    owner,
    position,
    health,
    movement,
    capabilities: {
      canMove: canUnitMove(eid),
      canAttack: unitData.strength > 0 && movement.current > 0,
      canFoundCity: unitType === UnitType.Settler,
    },
  };
}

/**
 * Query all cities and return snapshots, optionally filtered by player.
 */
export function queryCities(
  world: IWorld,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>,
  playerId?: number
): CitySnapshot[] {
  const cityEids = getAllCities(world);
  const snapshots: CitySnapshot[] = [];

  for (const eid of cityEids) {
    const owner = OwnerComponent.playerId[eid];

    // Filter by player if specified
    if (playerId !== undefined && owner !== playerId) {
      continue;
    }

    const q = Position.q[eid];
    const r = Position.r[eid];
    const nameIndex = CityComponent.nameIndex[eid];
    const population = PopulationComponent.current[eid];
    const foodStockpile = PopulationComponent.foodStockpile[eid];
    const foodForGrowth = PopulationComponent.foodForGrowth[eid];
    const currentItem = ProductionComponent.currentItem[eid] as BuildableType;
    const progress = ProductionComponent.progress[eid];
    const cost = ProductionComponent.cost[eid];

    // Calculate yields from territory
    const yields = calculateCityYields(eid, territoryManager, tileMap);

    // Calculate turns remaining for production
    let turnsRemaining: number | null = null;
    if (currentItem !== BuildableType.None && cost > 0 && yields.production > 0) {
      const remaining = Math.max(0, cost - progress);
      turnsRemaining = remaining > 0 ? Math.ceil(remaining / yields.production) : 0;
    }

    snapshots.push({
      eid,
      name: getCityNameByIndex(nameIndex),
      owner,
      position: { q, r },
      population,
      foodStockpile,
      foodForGrowth,
      production: {
        currentItem,
        currentItemName: getBuildableName(currentItem),
        progress,
        cost,
        turnsRemaining,
      },
      yields: {
        food: yields.food,
        production: yields.production,
        gold: yields.gold,
        science: yields.science,
        culture: yields.culture,
        faith: yields.faith,
      },
      territoryTileCount: territoryManager.getTileCount(eid),
    });
  }

  return snapshots;
}

/**
 * Query a single city by entity ID.
 */
export function queryCity(
  world: IWorld,
  eid: number,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>
): CitySnapshot | null {
  const cityEids = getAllCities(world);
  if (!cityEids.includes(eid)) {
    return null;
  }

  const owner = OwnerComponent.playerId[eid];
  const q = Position.q[eid];
  const r = Position.r[eid];
  const nameIndex = CityComponent.nameIndex[eid];
  const population = PopulationComponent.current[eid];
  const foodStockpile = PopulationComponent.foodStockpile[eid];
  const foodForGrowth = PopulationComponent.foodForGrowth[eid];
  const currentItem = ProductionComponent.currentItem[eid] as BuildableType;
  const progress = ProductionComponent.progress[eid];
  const cost = ProductionComponent.cost[eid];

  const yields = calculateCityYields(eid, territoryManager, tileMap);

  let turnsRemaining: number | null = null;
  if (currentItem !== BuildableType.None && cost > 0 && yields.production > 0) {
    const remaining = Math.max(0, cost - progress);
    turnsRemaining = remaining > 0 ? Math.ceil(remaining / yields.production) : 0;
  }

  return {
    eid,
    name: getCityNameByIndex(nameIndex),
    owner,
    position: { q, r },
    population,
    foodStockpile,
    foodForGrowth,
    production: {
      currentItem,
      currentItemName: getBuildableName(currentItem),
      progress,
      cost,
      turnsRemaining,
    },
    yields: {
      food: yields.food,
      production: yields.production,
      gold: yields.gold,
      science: yields.science,
      culture: yields.culture,
      faith: yields.faith,
    },
    territoryTileCount: territoryManager.getTileCount(eid),
  };
}

/**
 * Query a single tile and return its snapshot.
 */
export function queryTile(
  tileMap: Map<string, GeneratedTile>,
  world: IWorld,
  territoryManager: TerritoryManager,
  q: number,
  r: number
): TileSnapshot | null {
  const key = `${q},${r}`;
  const tile = tileMap.get(key);
  if (!tile) {
    return null;
  }

  const terrainData = TERRAIN_DATA[tile.terrain];
  const yields = calculateYields(tile.terrain, tile.feature, tile.resource);
  const owner = territoryManager.getOwnerAtPosition(q, r);
  const unitEid = getUnitAtPosition(world, q, r);
  const cityEid = getCityAtPosition(world, q, r);

  return {
    position: { q, r },
    terrain: tile.terrain,
    terrainName: tile.terrain as string,
    feature: tile.feature,
    featureName: tile.feature ? (tile.feature as string) : null,
    resource: tile.resource,
    resourceName: tile.resource ? (tile.resource as string) : null,
    yields: {
      food: yields.food,
      production: yields.production,
      gold: yields.gold,
      science: yields.science,
      culture: yields.culture,
      faith: yields.faith,
    },
    isPassable: terrainData.isPassable,
    isWater: terrainData.isWater,
    isHill: terrainData.isHill,
    movementCost: terrainData.movementCost,
    owner,
    hasUnit: unitEid !== null,
    hasCity: cityEid !== null,
  };
}

/**
 * Query the entire map and return a snapshot.
 */
export function queryMap(
  tileMap: Map<string, GeneratedTile>,
  world: IWorld,
  territoryManager: TerritoryManager,
  mapConfig: { width: number; height: number; seed: number }
): MapSnapshot {
  const tiles: TileSnapshot[] = [];

  for (const key of tileMap.keys()) {
    const [q, r] = key.split(',').map(Number);
    const tileSnapshot = queryTile(tileMap, world, territoryManager, q, r);
    if (tileSnapshot) {
      tiles.push(tileSnapshot);
    }
  }

  return {
    width: mapConfig.width,
    height: mapConfig.height,
    seed: mapConfig.seed,
    tileCount: tiles.length,
    tiles,
  };
}

/**
 * Query units at a specific position.
 */
export function queryUnitsAtPosition(world: IWorld, q: number, r: number): UnitSnapshot | null {
  const unitEid = getUnitAtPosition(world, q, r);
  if (unitEid === null) {
    return null;
  }
  return queryUnit(world, unitEid);
}

/**
 * Query city at a specific position.
 */
export function queryCityAtPosition(
  world: IWorld,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>,
  q: number,
  r: number
): CitySnapshot | null {
  const cityEid = getCityAtPosition(world, q, r);
  if (cityEid === null) {
    return null;
  }
  return queryCity(world, cityEid, territoryManager, tileMap);
}
