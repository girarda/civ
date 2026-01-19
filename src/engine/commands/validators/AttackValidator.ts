/**
 * Validator for AttackCommand.
 * Checks if an attack is valid based on game rules.
 */

import { IWorld } from 'bitecs';
import { AttackCommand } from '../types';
import { ValidationResult, validationSuccess, validationError } from '../CommandResult';
import { Position, MovementComponent, UnitComponent, unitQuery } from '../../../ecs/world';
import { getUnitOwner } from '../../../ecs/unitSystems';
import { TilePosition } from '../../../hex/TilePosition';
import { GameState } from '../../../game/GameState';
import { TurnPhase } from '../../../game/TurnPhase';
import { UNIT_TYPE_DATA, UnitType } from '../../../unit/UnitType';

export interface AttackValidatorDeps {
  world: IWorld;
  gameState: GameState;
}

/**
 * Check if unit entity exists in the world.
 */
function unitExists(world: IWorld, unitEid: number): boolean {
  const units = unitQuery(world);
  return units.includes(unitEid);
}

/**
 * Validate an AttackCommand.
 */
export function validateAttack(command: AttackCommand, deps: AttackValidatorDeps): ValidationResult {
  const { world, gameState } = deps;
  const { attackerEid, defenderEid } = command;

  // Check game phase is PlayerAction
  if (gameState.getPhase() !== TurnPhase.PlayerAction) {
    return validationError('Can only attack during PlayerAction phase');
  }

  // Check attacker exists
  if (!unitExists(world, attackerEid)) {
    return validationError('Attacker does not exist');
  }

  // Check defender exists
  if (!unitExists(world, defenderEid)) {
    return validationError('Defender does not exist');
  }

  // Check attacker has movement points
  if (MovementComponent.current[attackerEid] <= 0) {
    return validationError('Attacker has no movement points remaining');
  }

  // Check attacker has combat strength
  const attackerType = UnitComponent.type[attackerEid] as UnitType;
  const attackerData = UNIT_TYPE_DATA[attackerType];
  if (attackerData.strength <= 0) {
    return validationError('Attacker has no combat strength');
  }

  // Check defender is adjacent (melee range = 1)
  const attackerPos = new TilePosition(Position.q[attackerEid], Position.r[attackerEid]);
  const defenderPos = new TilePosition(Position.q[defenderEid], Position.r[defenderEid]);
  if (attackerPos.distanceTo(defenderPos) !== 1) {
    return validationError('Defender is not adjacent to attacker');
  }

  // Check different owners (enemy)
  const attackerOwner = getUnitOwner(attackerEid);
  const defenderOwner = getUnitOwner(defenderEid);
  if (attackerOwner === defenderOwner) {
    return validationError('Cannot attack friendly unit');
  }

  return validationSuccess();
}
