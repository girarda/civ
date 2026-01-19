import { describe, it, expect, beforeEach } from 'vitest';
import { Pathfinder } from './Pathfinder';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { TileFeature } from '../tile/TileFeature';
import { GeneratedTile } from '../map/MapGenerator';

function createTile(
  q: number,
  r: number,
  terrain: Terrain,
  feature: TileFeature | null = null
): GeneratedTile {
  return {
    position: new TilePosition(q, r),
    terrain,
    feature,
    resource: null,
  };
}

describe('Pathfinder', () => {
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;

  beforeEach(() => {
    tileMap = new Map();
  });

  describe('getMovementCost', () => {
    it('should return Infinity for tiles not in map', () => {
      pathfinder = new Pathfinder(tileMap);
      const cost = pathfinder.getMovementCost(new TilePosition(0, 0));
      expect(cost).toBe(Infinity);
    });

    it('should return 1 for flat terrain', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.getMovementCost(new TilePosition(0, 0))).toBe(1);
    });

    it('should return 2 for hills', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.GrasslandHill));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.getMovementCost(new TilePosition(0, 0))).toBe(2);
    });

    it('should return Infinity for mountains', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Mountain));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.getMovementCost(new TilePosition(0, 0))).toBe(Infinity);
    });

    it('should return Infinity for water', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Ocean));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.getMovementCost(new TilePosition(0, 0))).toBe(Infinity);
    });

    it('should add feature movement modifier', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland, TileFeature.Forest));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.getMovementCost(new TilePosition(0, 0))).toBe(2); // 1 + 1 for forest
    });

    it('should handle jungle correctly', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland, TileFeature.Jungle));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.getMovementCost(new TilePosition(0, 0))).toBe(2); // 1 + 1 for jungle
    });
  });

  describe('isPassable', () => {
    it('should return true for passable terrain', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.isPassable(new TilePosition(0, 0))).toBe(true);
    });

    it('should return false for impassable terrain', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Mountain));
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.isPassable(new TilePosition(0, 0))).toBe(false);
    });

    it('should return false for tiles not in map', () => {
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.isPassable(new TilePosition(0, 0))).toBe(false);
    });
  });

  describe('findPath', () => {
    it('should return same position when start equals end', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(0, 0));

      expect(result.reachable).toBe(true);
      expect(result.totalCost).toBe(0);
      expect(result.path).toHaveLength(1);
    });

    it('should find path between adjacent tiles', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(1, 0));

      expect(result.reachable).toBe(true);
      expect(result.totalCost).toBe(1);
      expect(result.path).toHaveLength(2);
    });

    it('should find shortest path through multiple tiles', () => {
      // Create a line of tiles
      for (let q = 0; q <= 3; q++) {
        tileMap.set(`${q},0`, createTile(q, 0, Terrain.Grassland));
      }
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(3, 0));

      expect(result.reachable).toBe(true);
      expect(result.totalCost).toBe(3);
    });

    it('should avoid impassable terrain', () => {
      // Create tiles with mountain blocking direct path
      // Path from (0,0) to (1,-1): (0,0) neighbors include (1,-1)
      // Path from (1,-1) to (2,0): neighbors of (1,-1) don't include (2,0), so we need intermediate tiles
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.Mountain)); // Block direct path
      tileMap.set('1,-1', createTile(1, -1, Terrain.Grassland)); // (0,0)'s neighbor
      tileMap.set('2,-1', createTile(2, -1, Terrain.Grassland)); // (1,-1)'s neighbor
      tileMap.set('2,0', createTile(2, 0, Terrain.Grassland)); // (2,-1)'s neighbor, the destination
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(2, 0));

      expect(result.reachable).toBe(true);
      expect(result.path.some((n) => n.position.equals(new TilePosition(1, 0)))).toBe(false);
    });

    it('should return unreachable when path is blocked', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.Mountain));
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(1, 0));

      expect(result.reachable).toBe(false);
      expect(result.path).toHaveLength(0);
    });

    it('should respect maxMovement constraint', () => {
      for (let q = 0; q <= 5; q++) {
        tileMap.set(`${q},0`, createTile(q, 0, Terrain.Grassland));
      }
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(5, 0), 2);

      expect(result.reachable).toBe(false);
    });

    it('should prefer lower cost terrain', () => {
      // Flat path vs hilly path
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.GrasslandHill)); // Hilly route
      tileMap.set('0,1', createTile(0, 1, Terrain.Grassland)); // Flat route
      tileMap.set('1,1', createTile(1, 1, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);

      const result = pathfinder.findPath(new TilePosition(0, 0), new TilePosition(1, 1));

      expect(result.reachable).toBe(true);
      // Should avoid the hill
      expect(result.path.some((n) => n.position.equals(new TilePosition(1, 0)))).toBe(false);
    });
  });

  describe('getReachableTiles', () => {
    it('should include start position with cost 0', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);

      const reachable = pathfinder.getReachableTiles(new TilePosition(0, 0), 2);

      expect(reachable.get('0,0')).toBe(0);
    });

    it('should include adjacent tiles within movement budget', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.Grassland));
      tileMap.set('0,1', createTile(0, 1, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);

      const reachable = pathfinder.getReachableTiles(new TilePosition(0, 0), 1);

      expect(reachable.has('1,0')).toBe(true);
      expect(reachable.has('0,1')).toBe(true);
    });

    it('should not include tiles beyond movement budget', () => {
      for (let q = 0; q <= 3; q++) {
        tileMap.set(`${q},0`, createTile(q, 0, Terrain.Grassland));
      }
      pathfinder = new Pathfinder(tileMap);

      const reachable = pathfinder.getReachableTiles(new TilePosition(0, 0), 2);

      expect(reachable.has('0,0')).toBe(true);
      expect(reachable.has('1,0')).toBe(true);
      expect(reachable.has('2,0')).toBe(true);
      expect(reachable.has('3,0')).toBe(false);
    });

    it('should not include impassable tiles', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.Mountain));
      pathfinder = new Pathfinder(tileMap);

      const reachable = pathfinder.getReachableTiles(new TilePosition(0, 0), 5);

      expect(reachable.has('1,0')).toBe(false);
    });

    it('should account for terrain costs in reachability', () => {
      tileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      tileMap.set('1,0', createTile(1, 0, Terrain.GrasslandHill)); // Costs 2
      tileMap.set('2,0', createTile(2, 0, Terrain.Grassland));
      pathfinder = new Pathfinder(tileMap);

      // With movement 2, can only reach the hill, not beyond
      const reachable = pathfinder.getReachableTiles(new TilePosition(0, 0), 2);

      expect(reachable.has('1,0')).toBe(true);
      expect(reachable.has('2,0')).toBe(false);
    });
  });

  describe('setTileMap', () => {
    it('should update the tile map reference', () => {
      pathfinder = new Pathfinder(tileMap);
      expect(pathfinder.isPassable(new TilePosition(0, 0))).toBe(false);

      const newTileMap = new Map<string, GeneratedTile>();
      newTileMap.set('0,0', createTile(0, 0, Terrain.Grassland));
      pathfinder.setTileMap(newTileMap);

      expect(pathfinder.isPassable(new TilePosition(0, 0))).toBe(true);
    });
  });
});
