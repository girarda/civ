/**
 * Validator for SetProductionCommand.
 * Validates city exists and buildable type is valid.
 */

import { IWorld } from 'bitecs';
import { SetProductionCommand } from '../types';
import { ValidationResult, validationSuccess, validationError } from '../CommandResult';
import { cityQuery } from '../../../ecs/citySystems';
import { BuildableType } from '../../../city/Buildable';

export interface SetProductionValidatorDeps {
  world: IWorld;
}

/**
 * Check if city entity exists in the world.
 */
function cityExists(world: IWorld, cityEid: number): boolean {
  const cities = cityQuery(world);
  return cities.includes(cityEid);
}

/**
 * Check if buildable type is valid.
 */
function isValidBuildableType(buildableType: number): boolean {
  return buildableType >= BuildableType.None && buildableType <= BuildableType.Settler;
}

/**
 * Validate a SetProductionCommand.
 */
export function validateSetProduction(
  command: SetProductionCommand,
  deps: SetProductionValidatorDeps
): ValidationResult {
  const { world } = deps;
  const { cityEid, buildableType } = command;

  // Check city exists
  if (!cityExists(world, cityEid)) {
    return validationError('City does not exist');
  }

  // Check buildable type is valid
  if (!isValidBuildableType(buildableType)) {
    return validationError('Invalid buildable type');
  }

  return validationSuccess();
}
