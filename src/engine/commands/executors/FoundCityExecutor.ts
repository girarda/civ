/**
 * Executor for FoundCityCommand.
 * Pure city founding returning events.
 */

import { IWorld, removeEntity } from 'bitecs';
import { FoundCityCommand } from '../types';
import {
  GameEventType,
  createEvent,
  CityFoundedEvent,
  UnitDestroyedEvent,
} from '../../events/types';
import { Position, OwnerComponent, createCityEntity } from '../../../ecs/world';
import { getCityCountForPlayer } from '../../../ecs/citySystems';
import { TilePosition } from '../../../hex/TilePosition';
import { TerritoryManager } from '../../../city/Territory';
import { DEFAULT_CITY_NAMES } from '../../../city/CityData';

export interface FoundCityExecutorDeps {
  world: IWorld;
  territoryManager: TerritoryManager;
}

/**
 * Execute a FoundCityCommand.
 * Updates ECS state and returns events to emit.
 */
export function executeFoundCity(
  command: FoundCityCommand,
  deps: FoundCityExecutorDeps
): GameEventType[] {
  const { world, territoryManager } = deps;
  const { settlerEid, cityName } = command;

  const events: GameEventType[] = [];

  // Get settler position and owner
  const q = Position.q[settlerEid];
  const r = Position.r[settlerEid];
  const settlerOwner = OwnerComponent.playerId[settlerEid];
  const position = new TilePosition(q, r);

  // Get name index based on player's existing city count
  const existingCityCount = getCityCountForPlayer(world, settlerOwner);
  const nameIndex = existingCityCount;

  // Resolve city name
  const resolvedName =
    cityName ?? DEFAULT_CITY_NAMES[nameIndex % DEFAULT_CITY_NAMES.length] ?? `City ${nameIndex}`;

  // Create city entity
  const cityEid = createCityEntity(world, q, r, settlerOwner, nameIndex);

  // Initialize territory
  territoryManager.initializeTerritory(cityEid, position);

  // Get territory tiles for event
  const territoryTiles = territoryManager.getTilesForCity(cityEid).map((pos) => ({
    q: pos.q,
    r: pos.r,
  }));

  // Emit UnitDestroyedEvent for settler (consumed)
  const settlerDestroyedEvent = createEvent<UnitDestroyedEvent>({
    type: 'UNIT_DESTROYED',
    unitEid: settlerEid,
    q,
    r,
    playerId: settlerOwner,
  });
  events.push(settlerDestroyedEvent);

  // Remove the settler from ECS
  removeEntity(world, settlerEid);

  // Emit CityFoundedEvent
  const cityFoundedEvent = createEvent<CityFoundedEvent>({
    type: 'CITY_FOUNDED',
    cityEid,
    settlerEid,
    q,
    r,
    cityName: resolvedName,
    playerId: settlerOwner,
    territoryTiles,
  });
  events.push(cityFoundedEvent);

  return events;
}
