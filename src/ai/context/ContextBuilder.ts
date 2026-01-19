/**
 * Builds AIContext from game state with cached queries.
 * Used at the start of each AI decision iteration.
 */

import { IWorld } from 'bitecs';
import { AIContext } from './AIContext';
import { GameState } from '../../game/GameState';
import { GeneratedTile } from '../../map/MapGenerator';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { TerritoryManager } from '../../city/Territory';
import { PlayerManager } from '../../player/PlayerManager';
import { UnitSnapshot, CitySnapshot, TileSnapshot } from '../../engine/state/snapshots';
import { queryUnits, queryCities, queryTile } from '../../engine/state/queries';
import { TilePosition } from '../../hex/TilePosition';

/**
 * Dependencies required to build an AI context.
 */
export interface ContextBuilderDeps {
  world: IWorld;
  gameState: GameState;
  tileMap: Map<string, GeneratedTile>;
  pathfinder: Pathfinder;
  territoryManager: TerritoryManager;
  playerManager: PlayerManager;
}

/**
 * Build an AI context for the given player.
 *
 * This function creates a fresh context with cached queries for efficient
 * access to game state during AI decision-making.
 *
 * @param playerId - The player ID to build context for
 * @param deps - Dependencies required for context building
 * @returns A complete AIContext for decision-making
 */
export function buildAIContext(playerId: number, deps: ContextBuilderDeps): AIContext {
  const { world, gameState, tileMap, pathfinder, territoryManager, playerManager } = deps;

  // Query own units and cities
  const myUnits = queryUnits(world, playerId);
  const myCities = queryCities(world, territoryManager, tileMap, playerId);

  // Build enemy units and cities maps
  const enemyUnits = new Map<number, UnitSnapshot[]>();
  const enemyCities = new Map<number, CitySnapshot[]>();

  // Build position lookup for enemy units
  const enemyUnitPositions = new Map<string, UnitSnapshot>();

  // Get all active players and filter to enemies
  for (const player of playerManager.getActivePlayers()) {
    if (player.id === playerId) continue;

    const units = queryUnits(world, player.id);
    const cities = queryCities(world, territoryManager, tileMap, player.id);

    if (units.length > 0) {
      enemyUnits.set(player.id, units);
      // Build position lookup
      for (const unit of units) {
        const key = `${unit.position.q},${unit.position.r}`;
        enemyUnitPositions.set(key, unit);
      }
    }

    if (cities.length > 0) {
      enemyCities.set(player.id, cities);
    }
  }

  // Create helper methods as closures
  const getTile = (q: number, r: number): TileSnapshot | null => {
    return queryTile(tileMap, world, territoryManager, q, r);
  };

  const getEnemyUnitAt = (q: number, r: number): UnitSnapshot | null => {
    const key = `${q},${r}`;
    return enemyUnitPositions.get(key) ?? null;
  };

  const getAdjacentEnemies = (q: number, r: number): UnitSnapshot[] => {
    const position = new TilePosition(q, r);
    const neighbors = position.neighbors();
    const adjacentEnemies: UnitSnapshot[] = [];

    for (const neighbor of neighbors) {
      const key = neighbor.key();
      const enemy = enemyUnitPositions.get(key);
      if (enemy) {
        adjacentEnemies.push(enemy);
      }
    }

    return adjacentEnemies;
  };

  return {
    // Core references
    world,
    playerId,
    gameState,
    tileMap,
    pathfinder,
    territoryManager,
    playerManager,

    // Cached queries
    myUnits,
    myCities,
    enemyUnits,
    enemyCities,

    // Helper methods
    getTile,
    getEnemyUnitAt,
    getAdjacentEnemies,
  };
}
