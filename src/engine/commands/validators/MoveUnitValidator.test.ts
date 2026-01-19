import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, MovementComponent } from '../../../ecs/world';
import { validateMoveUnit, MoveUnitValidatorDeps } from './MoveUnitValidator';
import { MoveUnitCommand } from '../types';
import { Pathfinder } from '../../../pathfinding/Pathfinder';
import { TilePosition } from '../../../hex/TilePosition';
import { GeneratedTile } from '../../../map/MapGenerator';
import { Terrain } from '../../../tile/Terrain';
import { UnitType } from '../../../unit/UnitType';

/**
 * Helper to create a simple tile map for testing.
 */
function createTileMap(tiles: { q: number; r: number; terrain: Terrain }[]): Map<string, GeneratedTile> {
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

/**
 * Create a MoveUnitCommand for testing.
 */
function createMoveCommand(
  unitEid: number,
  targetQ: number,
  targetR: number,
  playerId: number = 0
): MoveUnitCommand {
  return {
    type: 'MOVE_UNIT',
    playerId,
    unitEid,
    targetQ,
    targetR,
  };
}

describe('MoveUnitValidator', () => {
  let world: IWorld;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let deps: MoveUnitValidatorDeps;

  beforeEach(() => {
    world = createGameWorld();
    // Create a simple 3x3 grid of passable tiles
    tileMap = createTileMap([
      { q: 0, r: 0, terrain: Terrain.Grassland },
      { q: 1, r: 0, terrain: Terrain.Grassland },
      { q: 2, r: 0, terrain: Terrain.Grassland },
      { q: 0, r: 1, terrain: Terrain.Grassland },
      { q: 1, r: 1, terrain: Terrain.Grassland },
      { q: 2, r: 1, terrain: Terrain.Grassland },
      { q: 0, r: 2, terrain: Terrain.Grassland },
      { q: 1, r: 2, terrain: Terrain.Grassland },
      { q: 2, r: 2, terrain: Terrain.Grassland },
    ]);
    pathfinder = new Pathfinder(tileMap);
    deps = { world, pathfinder };
  });

  describe('valid moves', () => {
    it('should pass validation for valid move to adjacent tile', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 1, 0);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass validation for valid move within movement range', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 2, 0);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(true);
    });
  });

  describe('unit existence', () => {
    it('should fail validation when unit does not exist', () => {
      const command = createMoveCommand(999, 1, 0);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unit does not exist');
    });
  });

  describe('movement points', () => {
    it('should fail validation when unit has no movement points remaining', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[unitEid] = 0;
      const command = createMoveCommand(unitEid, 1, 0);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unit has no movement points remaining');
    });
  });

  describe('same position', () => {
    it('should fail validation when moving to same position', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 0, 0);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unit is already at target position');
    });
  });

  describe('reachability', () => {
    it('should fail validation when target position is not reachable (impassable)', () => {
      // Add a mountain tile that is impassable
      tileMap.set(new TilePosition(3, 0).key(), {
        position: new TilePosition(3, 0),
        terrain: Terrain.Mountain,
        feature: null,
        resource: null,
      });
      pathfinder = new Pathfinder(tileMap);
      deps = { world, pathfinder };

      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 3, 0);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target position is not reachable');
    });

    it('should fail validation when target is outside map', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      // Try to move to a tile that doesn't exist in our small map
      const command = createMoveCommand(unitEid, 99, 99);

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target position is not reachable');
    });

    it('should fail validation when target is too far for movement points', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 1); // Only 1 MP
      const command = createMoveCommand(unitEid, 2, 2); // 4 tiles away

      const result = validateMoveUnit(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Target position is not reachable');
    });
  });
});
