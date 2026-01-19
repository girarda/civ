import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import {
  createGameWorld,
  createUnitEntity,
  Position,
  MovementComponent,
} from '../../../ecs/world';
import { executeMoveUnit, MoveUnitExecutorDeps } from './MoveUnitExecutor';
import { MoveUnitCommand } from '../types';
import { Pathfinder } from '../../../pathfinding/Pathfinder';
import { TilePosition } from '../../../hex/TilePosition';
import { GeneratedTile } from '../../../map/MapGenerator';
import { Terrain } from '../../../tile/Terrain';
import { UnitType } from '../../../unit/UnitType';
import { UnitMovedEvent } from '../../events/types';

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

describe('MoveUnitExecutor', () => {
  let world: IWorld;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let deps: MoveUnitExecutorDeps;

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

  describe('event emission', () => {
    it('should emit UnitMovedEvent with correct fields', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 1, 0, 0);

      const events = executeMoveUnit(command, deps);

      expect(events).toHaveLength(1);
      const event = events[0] as UnitMovedEvent;
      expect(event.type).toBe('UNIT_MOVED');
      expect(event.unitEid).toBe(unitEid);
      expect(event.fromQ).toBe(0);
      expect(event.fromR).toBe(0);
      expect(event.toQ).toBe(1);
      expect(event.toR).toBe(0);
      expect(event.playerId).toBe(0);
      expect(event.timestamp).toBeDefined();
    });

    it('should include remaining movement in event', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 3);
      const command = createMoveCommand(unitEid, 1, 0, 0);

      const events = executeMoveUnit(command, deps);

      const event = events[0] as UnitMovedEvent;
      // Movement cost of 1 for Grassland, started with 3 MP
      expect(event.remainingMovement).toBe(2);
    });
  });

  describe('state changes', () => {
    it('should update unit position in ECS', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 1, 0, 0);

      executeMoveUnit(command, deps);

      expect(Position.q[unitEid]).toBe(1);
      expect(Position.r[unitEid]).toBe(0);
    });

    it('should deduct movement points correctly for single tile move', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createMoveCommand(unitEid, 1, 0, 0);

      executeMoveUnit(command, deps);

      // Grassland costs 1 MP
      expect(MovementComponent.current[unitEid]).toBe(1);
    });

    it('should deduct movement points correctly for multi-tile path', () => {
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 3);
      const command = createMoveCommand(unitEid, 2, 0, 0);

      executeMoveUnit(command, deps);

      // Moving 2 tiles on Grassland costs 2 MP
      expect(MovementComponent.current[unitEid]).toBe(1);
    });
  });

  describe('movement cost calculations', () => {
    it('should handle rough terrain movement cost', () => {
      // Create a map with higher cost terrain
      tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.GrasslandHill }, // Hills cost 2 MP
      ]);
      pathfinder = new Pathfinder(tileMap);
      deps = { world, pathfinder };

      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 3);
      const command = createMoveCommand(unitEid, 1, 0, 0);

      executeMoveUnit(command, deps);

      // Hills cost 2 MP
      expect(MovementComponent.current[unitEid]).toBe(1);
    });
  });
});
