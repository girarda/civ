/**
 * Territory management for cities.
 * Uses Map-based storage for dynamic territory tracking.
 */

import { TilePosition } from '../hex/TilePosition';
import { INITIAL_TERRITORY_RADIUS } from './CityData';

/**
 * Manages territory ownership for cities.
 * Tracks which tiles belong to which city using tile keys.
 */
export class TerritoryManager {
  /** Map from city entity ID to set of tile keys */
  private cityTerritories: Map<number, Set<string>> = new Map();

  /** Map from tile key to owning city entity ID */
  private tileOwners: Map<string, number> = new Map();

  /**
   * Initialize territory for a new city.
   * Assigns all tiles within the initial radius to the city.
   */
  initializeTerritory(cityEid: number, centerPosition: TilePosition): void {
    const tiles = centerPosition.range(INITIAL_TERRITORY_RADIUS);
    const tileKeys = new Set<string>();

    for (const tile of tiles) {
      const key = tile.key();
      // Only claim unclaimed tiles
      if (!this.tileOwners.has(key)) {
        tileKeys.add(key);
        this.tileOwners.set(key, cityEid);
      }
    }

    this.cityTerritories.set(cityEid, tileKeys);
  }

  /**
   * Get all tiles owned by a city.
   */
  getTilesForCity(cityEid: number): TilePosition[] {
    const tileKeys = this.cityTerritories.get(cityEid);
    if (!tileKeys) return [];

    return Array.from(tileKeys).map((key) => {
      const [q, r] = key.split(',').map(Number);
      return new TilePosition(q, r);
    });
  }

  /**
   * Get the city entity ID that owns a tile, if any.
   */
  getOwnerAtPosition(q: number, r: number): number | null {
    const key = `${q},${r}`;
    return this.tileOwners.get(key) ?? null;
  }

  /**
   * Check if a tile is owned by any city.
   */
  isOwned(q: number, r: number): boolean {
    return this.getOwnerAtPosition(q, r) !== null;
  }

  /**
   * Check if a tile is owned by a specific city.
   */
  isOwnedBy(q: number, r: number, cityEid: number): boolean {
    return this.getOwnerAtPosition(q, r) === cityEid;
  }

  /**
   * Get the total number of tiles owned by a city.
   */
  getTileCount(cityEid: number): number {
    return this.cityTerritories.get(cityEid)?.size ?? 0;
  }

  /**
   * Remove a city's territory (e.g., when city is captured/destroyed).
   */
  removeTerritory(cityEid: number): void {
    const tileKeys = this.cityTerritories.get(cityEid);
    if (tileKeys) {
      for (const key of tileKeys) {
        this.tileOwners.delete(key);
      }
      this.cityTerritories.delete(cityEid);
    }
  }

  /**
   * Clear all territory data.
   */
  clear(): void {
    this.cityTerritories.clear();
    this.tileOwners.clear();
  }

  /**
   * Get all city entity IDs that have territory.
   */
  getCityIds(): number[] {
    return Array.from(this.cityTerritories.keys());
  }

  /**
   * Get the number of cities with territory.
   */
  getCityCount(): number {
    return this.cityTerritories.size;
  }
}
