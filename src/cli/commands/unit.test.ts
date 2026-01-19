import { describe, it, expect } from 'vitest';
import { createEngine } from '../context';
import { createUnitEntity } from '../../ecs/world';
import { UnitType } from '../../unit/UnitType';
import { Terrain } from '../../tile/Terrain';
import { TilePosition } from '../../hex/TilePosition';
import { GeneratedTile } from '../../map/MapGenerator';
import { Pathfinder } from '../../pathfinding/Pathfinder';

/**
 * Helper to create a simple tile map for testing.
 */
function createTileMap(
  tiles: { q: number; r: number; terrain: Terrain }[]
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    const position = new TilePosition(tile.q, tile.r);
    map.set(position.key(), {
      position,
      terrain: tile.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}

describe('CLI Unit Commands', () => {
  describe('unit list', () => {
    it('should return all units', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();

      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Scout, 0, 3);
      createUnitEntity(world, 2, 0, UnitType.Settler, 1, 2);

      const units = engine.getUnits();
      expect(units).toHaveLength(3);
    });

    it('should filter units by player', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();

      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Scout, 0, 3);
      createUnitEntity(world, 2, 0, UnitType.Settler, 1, 2);

      const player0Units = engine.getUnits(0);
      expect(player0Units).toHaveLength(2);
      expect(player0Units.every((u) => u.owner === 0)).toBe(true);

      const player1Units = engine.getUnits(1);
      expect(player1Units).toHaveLength(1);
      expect(player1Units[0].owner).toBe(1);
    });
  });

  describe('unit show', () => {
    it('should return unit details', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();
      const eid = createUnitEntity(world, 5, 7, UnitType.Warrior, 0, 2);

      const unit = engine.getUnit(eid);

      expect(unit).not.toBeNull();
      expect(unit!.eid).toBe(eid);
      expect(unit!.typeName).toBe('Warrior');
      expect(unit!.position.q).toBe(5);
      expect(unit!.position.r).toBe(7);
      expect(unit!.owner).toBe(0);
      expect(unit!.health.current).toBeGreaterThan(0);
      expect(unit!.movement.current).toBeGreaterThan(0);
    });

    it('should return null for non-existent unit', () => {
      const engine = createEngine({ seed: 12345 });
      const unit = engine.getUnit(9999);
      expect(unit).toBeNull();
    });
  });

  describe('unit move', () => {
    it('should move unit to valid destination', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);
      engine.setPathfinder(new Pathfinder(tileMap));

      const world = engine.getWorld();
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const result = engine.executeCommand({
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid,
        targetQ: 1,
        targetR: 0,
      });

      expect(result.success).toBe(true);

      const unit = engine.getUnit(unitEid);
      expect(unit!.position.q).toBe(1);
      expect(unit!.position.r).toBe(0);
    });

    it('should fail move to impassable terrain', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Mountain }, // Impassable
      ]);
      engine.setTileMap(tileMap);
      engine.setPathfinder(new Pathfinder(tileMap));

      const world = engine.getWorld();
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const result = engine.executeCommand({
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid,
        targetQ: 1,
        targetR: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not reachable');
    });

    it('should fail move for non-existent unit', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);
      engine.setPathfinder(new Pathfinder(tileMap));

      const result = engine.executeCommand({
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid: 9999,
        targetQ: 1,
        targetR: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unit does not exist');
    });
  });

  describe('unit attack', () => {
    it('should execute attack on enemy', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);

      const result = engine.executeCommand({
        type: 'ATTACK',
        playerId: 0,
        attackerEid,
        defenderEid,
      });

      expect(result.success).toBe(true);
      expect(result.events.some((e) => e.type === 'COMBAT_RESOLVED')).toBe(true);
    });

    it('should fail attack on friendly unit', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 0, 2); // Same owner

      const result = engine.executeCommand({
        type: 'ATTACK',
        playerId: 0,
        attackerEid,
        defenderEid,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot attack friendly unit');
    });
  });

  describe('unit found-city', () => {
    it('should found city with settler', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([
        { q: 5, r: 5, terrain: Terrain.Grassland },
        { q: 6, r: 5, terrain: Terrain.Grassland },
        { q: 4, r: 5, terrain: Terrain.Grassland },
        { q: 5, r: 6, terrain: Terrain.Grassland },
        { q: 5, r: 4, terrain: Terrain.Grassland },
        { q: 6, r: 4, terrain: Terrain.Grassland },
        { q: 4, r: 6, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const settlerEid = createUnitEntity(world, 5, 5, UnitType.Settler, 0, 2);

      const result = engine.executeCommand({
        type: 'FOUND_CITY',
        playerId: 0,
        settlerEid,
      });

      expect(result.success).toBe(true);
      expect(result.events.some((e) => e.type === 'CITY_FOUNDED')).toBe(true);

      // Verify city was created
      const cities = engine.getCities();
      expect(cities).toHaveLength(1);
      expect(cities[0].position.q).toBe(5);
      expect(cities[0].position.r).toBe(5);
    });

    it('should fail for non-settler unit', () => {
      const engine = createEngine({ seed: 12345 });
      const tileMap = createTileMap([{ q: 0, r: 0, terrain: Terrain.Grassland }]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const warriorEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const result = engine.executeCommand({
        type: 'FOUND_CITY',
        playerId: 0,
        settlerEid: warriorEid,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only Settlers can found cities');
    });
  });
});
