/**
 * City-related ECS queries and systems.
 */

import { defineQuery, IWorld } from 'bitecs';
import { Position, OwnerComponent } from './world';
import { CityComponent, PopulationComponent, ProductionComponent } from './cityComponents';

/**
 * Query for all city entities.
 */
export const cityQuery = defineQuery([Position, CityComponent, OwnerComponent, PopulationComponent]);

/**
 * Get the city entity at a specific position, if any.
 */
export function getCityAtPosition(world: IWorld, q: number, r: number): number | null {
  const cities = cityQuery(world);
  for (const eid of cities) {
    if (Position.q[eid] === q && Position.r[eid] === r) {
      return eid;
    }
  }
  return null;
}

/**
 * Get all city entities owned by a specific player.
 */
export function getCitiesForPlayer(world: IWorld, playerId: number): number[] {
  const cities = cityQuery(world);
  return cities.filter((eid) => OwnerComponent.playerId[eid] === playerId);
}

/**
 * Get all city entities in the world.
 */
export function getAllCities(world: IWorld): number[] {
  return [...cityQuery(world)];
}

/**
 * Check if there is a city at the given position.
 */
export function hasCityAtPosition(world: IWorld, q: number, r: number): boolean {
  return getCityAtPosition(world, q, r) !== null;
}

/**
 * Get city count for a player.
 */
export function getCityCountForPlayer(world: IWorld, playerId: number): number {
  return getCitiesForPlayer(world, playerId).length;
}

export { CityComponent, PopulationComponent, ProductionComponent };
