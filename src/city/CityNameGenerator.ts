/**
 * City name generator.
 * Provides sequential city names from predefined lists.
 */

import { DEFAULT_CITY_NAMES } from './CityData';

/**
 * Get the next city name for a player.
 * Uses the default name list, cycling through if all names are used.
 * @param existingCityCount - Number of cities the player already has
 * @returns The name for the new city
 */
export function getNextCityName(existingCityCount: number): string {
  const index = existingCityCount % DEFAULT_CITY_NAMES.length;
  return DEFAULT_CITY_NAMES[index];
}

/**
 * Get a city name by index.
 * @param nameIndex - Index into the names array
 * @returns The city name at that index
 */
export function getCityNameByIndex(nameIndex: number): string {
  return DEFAULT_CITY_NAMES[nameIndex % DEFAULT_CITY_NAMES.length];
}

/**
 * Get the total number of available city names.
 */
export function getCityNameCount(): number {
  return DEFAULT_CITY_NAMES.length;
}
