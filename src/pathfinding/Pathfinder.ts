/**
 * A* Pathfinding implementation for hex grids.
 * Uses terrain and feature movement costs.
 */

import { TilePosition } from '../hex/TilePosition';
import { TERRAIN_DATA } from '../tile/Terrain';
import { FEATURE_DATA } from '../tile/TileFeature';
import { GeneratedTile } from '../map/MapGenerator';

export interface PathNode {
  position: TilePosition;
  cumulativeCost: number;
}

export interface PathResult {
  path: PathNode[];
  totalCost: number;
  reachable: boolean;
}

interface AStarNode {
  pos: TilePosition;
  g: number;
  f: number;
  parent: string | null;
}

export class Pathfinder {
  private tileMap: Map<string, GeneratedTile>;

  constructor(tileMap: Map<string, GeneratedTile>) {
    this.tileMap = tileMap;
  }

  /**
   * Update the tile map reference (e.g., after map regeneration).
   */
  setTileMap(tileMap: Map<string, GeneratedTile>): void {
    this.tileMap = tileMap;
  }

  /**
   * Get the movement cost to enter a tile.
   * Returns Infinity for impassable terrain.
   */
  getMovementCost(position: TilePosition): number {
    const tile = this.tileMap.get(position.key());
    if (!tile) return Infinity;

    const terrainData = TERRAIN_DATA[tile.terrain];
    if (!terrainData.isPassable) return Infinity;

    let cost = terrainData.movementCost;

    // Add feature movement cost modifier
    if (tile.feature) {
      const featureData = FEATURE_DATA[tile.feature];
      cost += featureData.movementModifier;
    }

    return cost;
  }

  /**
   * Check if a tile is passable.
   */
  isPassable(position: TilePosition): boolean {
    return this.getMovementCost(position) !== Infinity;
  }

  /**
   * Find the shortest path from start to end using A*.
   * @param start Starting position
   * @param end Target position
   * @param maxMovement Maximum movement budget (Infinity for no limit)
   * @returns PathResult with path, total cost, and reachability
   */
  findPath(start: TilePosition, end: TilePosition, maxMovement: number = Infinity): PathResult {
    // Same position
    if (start.equals(end)) {
      return {
        path: [{ position: start, cumulativeCost: 0 }],
        totalCost: 0,
        reachable: true,
      };
    }

    // Target is impassable
    if (!this.isPassable(end)) {
      return { path: [], totalCost: Infinity, reachable: false };
    }

    const openSet = new Map<string, AStarNode>();
    const closedSet = new Map<string, AStarNode>();

    const startKey = start.key();
    openSet.set(startKey, {
      pos: start,
      g: 0,
      f: start.distanceTo(end),
      parent: null,
    });

    while (openSet.size > 0) {
      // Find node with lowest f score
      let currentKey = '';
      let lowestF = Infinity;
      for (const [key, node] of openSet) {
        if (node.f < lowestF) {
          lowestF = node.f;
          currentKey = key;
        }
      }

      const current = openSet.get(currentKey)!;
      openSet.delete(currentKey);
      closedSet.set(currentKey, current);

      // Found the goal
      if (current.pos.equals(end)) {
        return this.reconstructPath(current, closedSet, start);
      }

      // Explore neighbors
      for (const neighbor of current.pos.neighbors()) {
        const neighborKey = neighbor.key();
        if (closedSet.has(neighborKey)) continue;

        const moveCost = this.getMovementCost(neighbor);
        if (moveCost === Infinity) continue;

        const tentativeG = current.g + moveCost;
        if (tentativeG > maxMovement) continue;

        const existing = openSet.get(neighborKey);
        if (!existing || tentativeG < existing.g) {
          openSet.set(neighborKey, {
            pos: neighbor,
            g: tentativeG,
            f: tentativeG + neighbor.distanceTo(end),
            parent: currentKey,
          });
        }
      }
    }

    // No path found
    return { path: [], totalCost: Infinity, reachable: false };
  }

  private reconstructPath(
    endNode: AStarNode,
    visited: Map<string, AStarNode>,
    start: TilePosition
  ): PathResult {
    const path: PathNode[] = [];
    let current: AStarNode | undefined = endNode;

    while (current) {
      path.unshift({
        position: current.pos,
        cumulativeCost: current.g,
      });

      if (current.parent === null) {
        break;
      }

      current = visited.get(current.parent);
    }

    // Ensure start is included
    if (path.length === 0 || !path[0].position.equals(start)) {
      path.unshift({ position: start, cumulativeCost: 0 });
    }

    return {
      path,
      totalCost: endNode.g,
      reachable: true,
    };
  }

  /**
   * Get all tiles reachable within a movement budget.
   * @param start Starting position
   * @param movement Available movement points
   * @returns Map of tile keys to cumulative movement cost
   */
  getReachableTiles(start: TilePosition, movement: number): Map<string, number> {
    const reachable = new Map<string, number>();
    const queue: { pos: TilePosition; cost: number }[] = [{ pos: start, cost: 0 }];

    reachable.set(start.key(), 0);

    while (queue.length > 0) {
      const { pos, cost } = queue.shift()!;

      for (const neighbor of pos.neighbors()) {
        const key = neighbor.key();
        if (reachable.has(key)) continue;

        const moveCost = this.getMovementCost(neighbor);
        if (moveCost === Infinity) continue;

        const totalCost = cost + moveCost;
        if (totalCost <= movement) {
          reachable.set(key, totalCost);
          queue.push({ pos: neighbor, cost: totalCost });
        }
      }
    }

    return reachable;
  }
}
