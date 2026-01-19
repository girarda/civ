import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, Position, MovementComponent } from '../ecs/world';
import { MovementExecutor } from './MovementSystem';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { UnitRenderer } from '../render/UnitRenderer';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { GeneratedTile } from '../map/MapGenerator';
import { UnitType } from './UnitType';

function createTile(q: number, r: number, terrain: Terrain): GeneratedTile {
  return {
    position: new TilePosition(q, r),
    terrain,
    feature: null,
    resource: null,
  };
}

// Mock UnitRenderer
const mockUnitRenderer = {
  updatePosition: vi.fn(),
} as unknown as UnitRenderer;

describe('MovementExecutor', () => {
  let world: IWorld;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let executor: MovementExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    world = createGameWorld();
    tileMap = new Map();

    // Create a simple grid of passable tiles
    for (let q = 0; q <= 5; q++) {
      for (let r = 0; r <= 5; r++) {
        tileMap.set(`${q},${r}`, createTile(q, r, Terrain.Grassland));
      }
    }

    pathfinder = new Pathfinder(tileMap);
    executor = new MovementExecutor(world, pathfinder, mockUnitRenderer);
  });

  describe('getUnitPosition', () => {
    it('should return the unit position', () => {
      const eid = createUnitEntity(world, 3, 2, UnitType.Warrior, 0, 2);

      const pos = executor.getUnitPosition(eid);

      expect(pos.q).toBe(3);
      expect(pos.r).toBe(2);
    });
  });

  describe('getMovementPoints', () => {
    it('should return current movement points', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);

      expect(executor.getMovementPoints(eid)).toBe(3);
    });

    it('should reflect spent movement', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 1;

      expect(executor.getMovementPoints(eid)).toBe(1);
    });
  });

  describe('canMove', () => {
    it('should return true when move is valid', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      expect(executor.canMove(eid, new TilePosition(1, 0))).toBe(true);
    });

    it('should return false when no movement points', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 0;

      expect(executor.canMove(eid, new TilePosition(1, 0))).toBe(false);
    });

    it('should return false when target is same position', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      expect(executor.canMove(eid, new TilePosition(0, 0))).toBe(false);
    });

    it('should return false when target is out of range', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      expect(executor.canMove(eid, new TilePosition(5, 0))).toBe(false);
    });

    it('should return false when path is blocked', () => {
      // Add a mountain to block
      tileMap.set('1,0', createTile(1, 0, Terrain.Mountain));
      pathfinder = new Pathfinder(tileMap);
      executor.setPathfinder(pathfinder);

      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      expect(executor.canMove(eid, new TilePosition(1, 0))).toBe(false);
    });
  });

  describe('executeMove', () => {
    it('should update position and movement points', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const result = executor.executeMove(eid, new TilePosition(1, 0));

      expect(result).toBe(true);
      expect(Position.q[eid]).toBe(1);
      expect(Position.r[eid]).toBe(0);
      expect(MovementComponent.current[eid]).toBe(1); // 2 - 1 = 1
    });

    it('should call renderer updatePosition', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      executor.executeMove(eid, new TilePosition(1, 0));

      expect(mockUnitRenderer.updatePosition).toHaveBeenCalledWith(
        eid,
        expect.objectContaining({ q: 1, r: 0 })
      );
    });

    it('should return false for invalid move', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 0;

      const result = executor.executeMove(eid, new TilePosition(1, 0));

      expect(result).toBe(false);
      expect(Position.q[eid]).toBe(0); // Position unchanged
    });

    it('should deduct correct cost for longer path', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);

      executor.executeMove(eid, new TilePosition(2, 0));

      expect(MovementComponent.current[eid]).toBe(1); // 3 - 2 = 1
    });
  });

  describe('resetMovementPoints', () => {
    it('should reset current to max', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 0;

      executor.resetMovementPoints(eid);

      expect(MovementComponent.current[eid]).toBe(2);
    });
  });
});
