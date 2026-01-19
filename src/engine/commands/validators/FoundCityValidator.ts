/**
 * Validator for FoundCityCommand.
 * Delegates to existing validation logic in CityFounder.
 */

import { IWorld } from 'bitecs';
import { FoundCityCommand } from '../types';
import { ValidationResult, validationSuccess, validationError } from '../CommandResult';
import { getFoundCityBlockReason } from '../../../city/CityFounder';
import { GeneratedTile } from '../../../map/MapGenerator';
import { unitQuery } from '../../../ecs/world';

export interface FoundCityValidatorDeps {
  world: IWorld;
  tileMap: Map<string, GeneratedTile>;
}

/**
 * Check if unit entity exists in the world.
 */
function unitExists(world: IWorld, unitEid: number): boolean {
  const units = unitQuery(world);
  return units.includes(unitEid);
}

/**
 * Validate a FoundCityCommand.
 */
export function validateFoundCity(
  command: FoundCityCommand,
  deps: FoundCityValidatorDeps
): ValidationResult {
  const { world, tileMap } = deps;
  const { settlerEid } = command;

  // Check settler exists
  if (!unitExists(world, settlerEid)) {
    return validationError('Settler does not exist');
  }

  // Delegate to existing validation logic
  const blockReason = getFoundCityBlockReason(world, settlerEid, tileMap);
  if (blockReason) {
    return validationError(blockReason);
  }

  return validationSuccess();
}
