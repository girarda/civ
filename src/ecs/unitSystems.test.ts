import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import {
  createGameWorld,
  createUnitEntity,
  Position,
  UnitComponent,
  MovementComponent,
  OwnerComponent,
} from './world';
import {
  getAllUnits,
  getUnitAtPosition,
  getUnitsForPlayer,
  getUnitPosition,
  getUnitType,
  getUnitMovement,
  getUnitOwner,
  canUnitMove,
} from './unitSystems';
import { UnitType } from '../unit/UnitType';

describe('unitSystems', () => {
  let world: IWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe('createUnitEntity', () => {
    it('should create a unit entity with correct components', () => {
      const eid = createUnitEntity(world, 5, 3, UnitType.Warrior, 0, 2);

      expect(eid).toBeGreaterThanOrEqual(0);
      expect(Position.q[eid]).toBe(5);
      expect(Position.r[eid]).toBe(3);
      expect(UnitComponent.type[eid]).toBe(UnitType.Warrior);
      expect(MovementComponent.current[eid]).toBe(2);
      expect(MovementComponent.max[eid]).toBe(2);
      expect(OwnerComponent.playerId[eid]).toBe(0);
    });

    it('should create multiple units with unique IDs', () => {
      const eid1 = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const eid2 = createUnitEntity(world, 1, 1, UnitType.Scout, 1, 3);

      expect(eid1).not.toBe(eid2);
    });
  });

  describe('getAllUnits', () => {
    it('should return empty array when no units', () => {
      const units = getAllUnits(world);
      expect(units).toHaveLength(0);
    });

    it('should return all units', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 1, UnitType.Scout, 0, 3);
      createUnitEntity(world, 2, 2, UnitType.Settler, 1, 2);

      const units = getAllUnits(world);
      expect(units).toHaveLength(3);
    });
  });

  describe('getUnitAtPosition', () => {
    it('should return null when no unit at position', () => {
      const result = getUnitAtPosition(world, 5, 5);
      expect(result).toBeNull();
    });

    it('should return unit at specified position', () => {
      const eid = createUnitEntity(world, 5, 3, UnitType.Warrior, 0, 2);

      const result = getUnitAtPosition(world, 5, 3);
      expect(result).toBe(eid);
    });

    it('should return null when unit at different position', () => {
      createUnitEntity(world, 5, 3, UnitType.Warrior, 0, 2);

      const result = getUnitAtPosition(world, 5, 4);
      expect(result).toBeNull();
    });
  });

  describe('getUnitsForPlayer', () => {
    it('should return empty array when player has no units', () => {
      const units = getUnitsForPlayer(world, 0);
      expect(units).toHaveLength(0);
    });

    it('should return only units for specified player', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 1, UnitType.Scout, 0, 3);
      createUnitEntity(world, 2, 2, UnitType.Settler, 1, 2);

      const player0Units = getUnitsForPlayer(world, 0);
      const player1Units = getUnitsForPlayer(world, 1);

      expect(player0Units).toHaveLength(2);
      expect(player1Units).toHaveLength(1);
    });
  });

  describe('getUnitPosition', () => {
    it('should return unit position', () => {
      const eid = createUnitEntity(world, 5, 3, UnitType.Warrior, 0, 2);

      const pos = getUnitPosition(eid);
      expect(pos.q).toBe(5);
      expect(pos.r).toBe(3);
    });
  });

  describe('getUnitType', () => {
    it('should return unit type', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);

      expect(getUnitType(eid)).toBe(UnitType.Scout);
    });
  });

  describe('getUnitMovement', () => {
    it('should return current and max movement', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);
      MovementComponent.current[eid] = 1; // simulate movement spent

      const movement = getUnitMovement(eid);
      expect(movement.current).toBe(1);
      expect(movement.max).toBe(3);
    });
  });

  describe('getUnitOwner', () => {
    it('should return owner player ID', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 2, 2);

      expect(getUnitOwner(eid)).toBe(2);
    });
  });

  describe('canUnitMove', () => {
    it('should return true when unit has movement points', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      expect(canUnitMove(eid)).toBe(true);
    });

    it('should return false when unit has no movement points', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 0;

      expect(canUnitMove(eid)).toBe(false);
    });
  });
});
