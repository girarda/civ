/**
 * Validator for MoveUnitCommand.
 * Checks if a unit can move to the target position.
 */

import { IWorld } from 'bitecs';
import { MoveUnitCommand } from '../types';
import { ValidationResult, validationSuccess, validationError } from '../CommandResult';
import { Position, MovementComponent, unitQuery } from '../../../ecs/world';
import { TilePosition } from '../../../hex/TilePosition';
import { Pathfinder } from '../../../pathfinding/Pathfinder';

export interface MoveUnitValidatorDeps {
  world: IWorld;
  pathfinder: Pathfinder;
}

/**
 * Check if unit entity exists in the world.
 */
function unitExists(world: IWorld, unitEid: number): boolean {
  const units = unitQuery(world);
  return units.includes(unitEid);
}

/**
 * Validate a MoveUnitCommand.
 */
export function validateMoveUnit(
  command: MoveUnitCommand,
  deps: MoveUnitValidatorDeps
): ValidationResult {
  const { world, pathfinder } = deps;
  const { unitEid, targetQ, targetR } = command;

  // Check unit exists
  if (!unitExists(world, unitEid)) {
    return validationError('Unit does not exist');
  }

  // Check movement points > 0
  const currentMP = MovementComponent.current[unitEid];
  if (currentMP <= 0) {
    return validationError('Unit has no movement points remaining');
  }

  // Get current position
  const currentQ = Position.q[unitEid];
  const currentR = Position.r[unitEid];
  const currentPos = new TilePosition(currentQ, currentR);
  const targetPos = new TilePosition(targetQ, targetR);

  // Check not moving to same position
  if (currentPos.equals(targetPos)) {
    return validationError('Unit is already at target position');
  }

  // Check target is reachable via pathfinder
  const result = pathfinder.findPath(currentPos, targetPos, currentMP);
  if (!result.reachable) {
    return validationError('Target position is not reachable');
  }

  return validationSuccess();
}
