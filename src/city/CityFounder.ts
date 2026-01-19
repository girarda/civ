/**
 * City founding logic.
 * Handles validation and creation of cities from Settler units.
 */

import { IWorld, removeEntity } from 'bitecs';
import {
  Position,
  UnitComponent,
  OwnerComponent,
  createCityEntity,
} from '../ecs/world';
import { hasCityAtPosition, getCityCountForPlayer } from '../ecs/citySystems';
import { TerritoryManager } from './Territory';
import { TilePosition } from '../hex/TilePosition';
import { UnitType } from '../unit/UnitType';
import { GeneratedTile } from '../map/MapGenerator';
import { isWater, isPassable } from '../tile/Terrain';

export interface FoundCityResult {
  success: boolean;
  cityEid?: number;
  error?: string;
}

/**
 * Check if a Settler unit can found a city at its current position.
 * @param world - The ECS world
 * @param settlerEid - Entity ID of the Settler unit
 * @param tileMap - Map of tile data for terrain checks
 * @returns true if the city can be founded
 */
export function canFoundCity(
  world: IWorld,
  settlerEid: number,
  tileMap: Map<string, GeneratedTile>
): boolean {
  // Verify unit is a Settler
  const unitType = UnitComponent.type[settlerEid];
  if (unitType !== UnitType.Settler) {
    return false;
  }

  // Get position
  const q = Position.q[settlerEid];
  const r = Position.r[settlerEid];
  const key = `${q},${r}`;

  // Check if tile exists and is valid terrain
  const tile = tileMap.get(key);
  if (!tile) {
    return false;
  }

  // Cannot found on water
  if (isWater(tile.terrain)) {
    return false;
  }

  // Cannot found on impassable terrain (mountains)
  if (!isPassable(tile.terrain)) {
    return false;
  }

  // Cannot found where a city already exists
  if (hasCityAtPosition(world, q, r)) {
    return false;
  }

  return true;
}

/**
 * Get a detailed reason why a city cannot be founded.
 */
export function getFoundCityBlockReason(
  world: IWorld,
  settlerEid: number,
  tileMap: Map<string, GeneratedTile>
): string | null {
  const unitType = UnitComponent.type[settlerEid];
  if (unitType !== UnitType.Settler) {
    return 'Only Settlers can found cities';
  }

  const q = Position.q[settlerEid];
  const r = Position.r[settlerEid];
  const key = `${q},${r}`;

  const tile = tileMap.get(key);
  if (!tile) {
    return 'Invalid tile position';
  }

  if (isWater(tile.terrain)) {
    return 'Cannot found city on water';
  }

  if (!isPassable(tile.terrain)) {
    return 'Cannot found city on impassable terrain';
  }

  if (hasCityAtPosition(world, q, r)) {
    return 'A city already exists here';
  }

  return null;
}

/**
 * Found a city at the Settler's position.
 * @param world - The ECS world
 * @param settlerEid - Entity ID of the Settler unit
 * @param nameIndex - Index of the city name to use
 * @param territoryManager - Territory manager for claiming tiles
 * @param onCityFounded - Optional callback when city is created
 * @returns Result with city entity ID if successful
 */
export function foundCity(
  world: IWorld,
  settlerEid: number,
  nameIndex: number,
  territoryManager: TerritoryManager,
  onCityFounded?: (cityEid: number, position: TilePosition) => void
): FoundCityResult {
  // Get settler position and owner
  const q = Position.q[settlerEid];
  const r = Position.r[settlerEid];
  const playerId = OwnerComponent.playerId[settlerEid];
  const position = new TilePosition(q, r);

  // Create city entity
  const cityEid = createCityEntity(world, q, r, playerId, nameIndex);

  // Initialize territory
  territoryManager.initializeTerritory(cityEid, position);

  // Remove the settler
  removeEntity(world, settlerEid);

  // Call callback if provided
  if (onCityFounded) {
    onCityFounded(cityEid, position);
  }

  return {
    success: true,
    cityEid,
  };
}

/**
 * Attempt to found a city, validating first.
 * Combines canFoundCity check with foundCity action.
 */
export function tryFoundCity(
  world: IWorld,
  settlerEid: number,
  tileMap: Map<string, GeneratedTile>,
  territoryManager: TerritoryManager,
  onCityFounded?: (cityEid: number, position: TilePosition) => void
): FoundCityResult {
  // Validate first
  const blockReason = getFoundCityBlockReason(world, settlerEid, tileMap);
  if (blockReason) {
    return {
      success: false,
      error: blockReason,
    };
  }

  // Get name index based on player's existing city count
  const playerId = OwnerComponent.playerId[settlerEid];
  const existingCityCount = getCityCountForPlayer(world, playerId);

  return foundCity(world, settlerEid, existingCityCount, territoryManager, onCityFounded);
}
