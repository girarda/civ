/**
 * Serializable snapshot types for game state.
 * These types represent the game state at a point in time and are JSON-serializable.
 */

import { TurnPhase } from '../../game/TurnPhase';
import { Terrain } from '../../tile/Terrain';
import { TileFeature } from '../../tile/TileFeature';
import { TileResource } from '../../tile/TileResource';
import { UnitType } from '../../unit/UnitType';
import { BuildableType } from '../../city/Buildable';

/** Snapshot of the overall game state */
export interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: number;
  playerCount: number;
}

/** Snapshot of a single unit */
export interface UnitSnapshot {
  eid: number;
  type: UnitType;
  typeName: string;
  owner: number;
  position: { q: number; r: number };
  health: { current: number; max: number };
  movement: { current: number; max: number };
  capabilities: {
    canMove: boolean;
    canAttack: boolean;
    canFoundCity: boolean;
  };
}

/** Yields for a tile or city */
export interface YieldsSnapshot {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

/** Production queue item snapshot */
export interface ProductionSnapshot {
  currentItem: BuildableType;
  currentItemName: string;
  progress: number;
  cost: number;
  turnsRemaining: number | null;
}

/** Snapshot of a single city */
export interface CitySnapshot {
  eid: number;
  name: string;
  owner: number;
  position: { q: number; r: number };
  population: number;
  foodStockpile: number;
  foodForGrowth: number;
  production: ProductionSnapshot;
  yields: YieldsSnapshot;
  territoryTileCount: number;
}

/** Snapshot of a single tile */
export interface TileSnapshot {
  position: { q: number; r: number };
  terrain: Terrain;
  terrainName: string;
  feature: TileFeature | null;
  featureName: string | null;
  resource: TileResource | null;
  resourceName: string | null;
  yields: YieldsSnapshot;
  isPassable: boolean;
  isWater: boolean;
  isHill: boolean;
  movementCost: number;
  owner: number | null;
  hasUnit: boolean;
  hasCity: boolean;
}

/** Snapshot of the entire map */
export interface MapSnapshot {
  width: number;
  height: number;
  seed: number;
  tileCount: number;
  tiles: TileSnapshot[];
}

/** Complete game snapshot - useful for save/load or debugging */
export interface CompleteGameSnapshot {
  gameState: GameStateSnapshot;
  map: MapSnapshot;
  units: UnitSnapshot[];
  cities: CitySnapshot[];
  timestamp: number;
}

/** Serialization helpers */
export function serializeSnapshot<T>(snapshot: T): string {
  return JSON.stringify(snapshot);
}

export function deserializeSnapshot<T>(json: string): T {
  return JSON.parse(json) as T;
}

/** Validate that a snapshot is JSON-serializable */
export function isSerializable(obj: unknown): boolean {
  try {
    JSON.stringify(obj);
    return true;
  } catch {
    return false;
  }
}
