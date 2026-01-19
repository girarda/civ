/**
 * Unit query systems for ECS.
 * Provides utilities for querying units by position and other criteria.
 */

import { IWorld } from 'bitecs';
import { Position, UnitComponent, MovementComponent, OwnerComponent, unitQuery } from './world';

/**
 * Get all unit entity IDs in the world.
 */
export function getAllUnits(world: IWorld): number[] {
  return unitQuery(world);
}

/**
 * Get unit at a specific hex position.
 * Returns the entity ID or null if no unit at that position.
 */
export function getUnitAtPosition(world: IWorld, q: number, r: number): number | null {
  const units = unitQuery(world);
  for (const eid of units) {
    if (Position.q[eid] === q && Position.r[eid] === r) {
      return eid;
    }
  }
  return null;
}

/**
 * Get all units owned by a specific player.
 */
export function getUnitsForPlayer(world: IWorld, playerId: number): number[] {
  const units = unitQuery(world);
  return units.filter((eid) => OwnerComponent.playerId[eid] === playerId);
}

/**
 * Get unit position as {q, r} object.
 */
export function getUnitPosition(eid: number): { q: number; r: number } {
  return {
    q: Position.q[eid],
    r: Position.r[eid],
  };
}

/**
 * Get unit type.
 */
export function getUnitType(eid: number): number {
  return UnitComponent.type[eid];
}

/**
 * Get unit movement data.
 */
export function getUnitMovement(eid: number): { current: number; max: number } {
  return {
    current: MovementComponent.current[eid],
    max: MovementComponent.max[eid],
  };
}

/**
 * Get unit owner player ID.
 */
export function getUnitOwner(eid: number): number {
  return OwnerComponent.playerId[eid];
}

/**
 * Check if a unit has movement points remaining.
 */
export function canUnitMove(eid: number): boolean {
  return MovementComponent.current[eid] > 0;
}
