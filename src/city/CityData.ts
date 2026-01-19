/**
 * City data types, constants, and interfaces.
 * Defines the city system's core configuration values.
 */

/** Food consumed per population point per turn */
export const FOOD_PER_POPULATION = 2;

/** Initial territory radius (1 = center + 6 neighbors = 7 tiles) */
export const INITIAL_TERRITORY_RADIUS = 1;

/** Base food threshold for population growth */
export const BASE_GROWTH_THRESHOLD = 15;

/** Growth threshold multiplier per existing population */
export const GROWTH_THRESHOLD_MULTIPLIER = 6;

/**
 * Calculate the food required for the next population growth.
 * Formula: BASE + (currentPop * MULTIPLIER)
 */
export function calculateGrowthThreshold(currentPopulation: number): number {
  return BASE_GROWTH_THRESHOLD + currentPopulation * GROWTH_THRESHOLD_MULTIPLIER;
}

/** Default city names (Civilization-style) */
export const DEFAULT_CITY_NAMES: readonly string[] = [
  'Capital',
  'Alexandria',
  'Memphis',
  'Thebes',
  'Heliopolis',
  'Giza',
  'Abydos',
  'Karnak',
  'Luxor',
  'Edfu',
  'Aswan',
  'Saqqara',
  'Tanis',
  'Amarna',
  'Elephantine',
  'Pi-Ramesses',
];
