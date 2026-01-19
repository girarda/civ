/**
 * City yield calculation utilities.
 * Aggregates yields from territory tiles.
 */

import { TileYields, ZERO_YIELDS, addYields, calculateYields } from '../tile/TileYields';
import { TerritoryManager } from './Territory';
import { GeneratedTile } from '../map/MapGenerator';

/**
 * Calculate total yields from a city's territory.
 * For MVP, all tiles in territory contribute (no worker assignment).
 */
export function calculateCityYields(
  cityEid: number,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>
): TileYields {
  const tiles = territoryManager.getTilesForCity(cityEid);
  let totalYields: TileYields = { ...ZERO_YIELDS };

  for (const position of tiles) {
    const tile = tileMap.get(position.key());
    if (tile) {
      const tileYields = calculateYields(tile.terrain, tile.feature, tile.resource);
      totalYields = addYields(totalYields, tileYields);
    }
  }

  return totalYields;
}

/**
 * Calculate net food for a city (food yield - consumption).
 * @param foodYield - Total food produced by territory
 * @param population - Current city population
 * @param foodPerPop - Food consumed per population (default 2)
 */
export function calculateNetFood(
  foodYield: number,
  population: number,
  foodPerPop: number = 2
): number {
  return foodYield - population * foodPerPop;
}
