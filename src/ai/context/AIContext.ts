/**
 * AIContext interface providing all data needed for AI decision-making.
 * Built fresh each decision iteration with cached queries for efficiency.
 */

import { IWorld } from 'bitecs';
import { GameState } from '../../game/GameState';
import { GeneratedTile } from '../../map/MapGenerator';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { TerritoryManager } from '../../city/Territory';
import { PlayerManager } from '../../player/PlayerManager';
import { UnitSnapshot, CitySnapshot, TileSnapshot } from '../../engine/state/snapshots';

/**
 * Context for AI decision-making, providing access to game state and helper methods.
 *
 * This interface is built by the ContextBuilder and provides:
 * - References to core game systems
 * - Cached queries for the current player's units and cities
 * - Maps of enemy units and cities by player ID
 * - Helper methods for common lookups
 */
export interface AIContext {
  // --- Core References ---

  /** The ECS world containing all entities */
  readonly world: IWorld;

  /** Current player ID making decisions */
  readonly playerId: number;

  /** Game state with turn number, phase, etc. */
  readonly gameState: GameState;

  /** Tile map for terrain lookups */
  readonly tileMap: Map<string, GeneratedTile>;

  /** Pathfinder for movement calculations */
  readonly pathfinder: Pathfinder;

  /** Territory manager for ownership checks */
  readonly territoryManager: TerritoryManager;

  /** Player manager for player queries */
  readonly playerManager: PlayerManager;

  // --- Cached Queries ---

  /** All units belonging to the current player */
  readonly myUnits: readonly UnitSnapshot[];

  /** All cities belonging to the current player */
  readonly myCities: readonly CitySnapshot[];

  /** Enemy units grouped by player ID */
  readonly enemyUnits: ReadonlyMap<number, readonly UnitSnapshot[]>;

  /** Enemy cities grouped by player ID */
  readonly enemyCities: ReadonlyMap<number, readonly CitySnapshot[]>;

  // --- Helper Methods ---

  /**
   * Get tile data at a position.
   * @param q - Axial q coordinate
   * @param r - Axial r coordinate
   * @returns TileSnapshot or null if position is invalid
   */
  getTile(q: number, r: number): TileSnapshot | null;

  /**
   * Get an enemy unit at a specific position.
   * @param q - Axial q coordinate
   * @param r - Axial r coordinate
   * @returns UnitSnapshot of enemy unit or null if none
   */
  getEnemyUnitAt(q: number, r: number): UnitSnapshot | null;

  /**
   * Get all enemy units adjacent to a position.
   * @param q - Axial q coordinate
   * @param r - Axial r coordinate
   * @returns Array of adjacent enemy UnitSnapshots
   */
  getAdjacentEnemies(q: number, r: number): UnitSnapshot[];
}
