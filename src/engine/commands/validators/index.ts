/**
 * Validator registry and exports.
 */

export { validateMoveUnit } from './MoveUnitValidator';
export type { MoveUnitValidatorDeps } from './MoveUnitValidator';
export { validateAttack } from './AttackValidator';
export type { AttackValidatorDeps } from './AttackValidator';
export { validateFoundCity } from './FoundCityValidator';
export type { FoundCityValidatorDeps } from './FoundCityValidator';
export { validateSetProduction } from './SetProductionValidator';
export type { SetProductionValidatorDeps } from './SetProductionValidator';
export { validateEndTurn } from './EndTurnValidator';
export type { EndTurnValidatorDeps } from './EndTurnValidator';

import { GameCommand, CommandType, COMMAND_TYPES } from '../types';
import { ValidationResult } from '../CommandResult';
import { validateMoveUnit, MoveUnitValidatorDeps } from './MoveUnitValidator';
import { validateAttack, AttackValidatorDeps } from './AttackValidator';
import { validateFoundCity, FoundCityValidatorDeps } from './FoundCityValidator';
import { validateSetProduction, SetProductionValidatorDeps } from './SetProductionValidator';
import { validateEndTurn, EndTurnValidatorDeps } from './EndTurnValidator';

/** Union type of all validator dependencies */
export type ValidatorDeps =
  | MoveUnitValidatorDeps
  | AttackValidatorDeps
  | FoundCityValidatorDeps
  | SetProductionValidatorDeps
  | EndTurnValidatorDeps;

/** Validator function type */
export type ValidatorFn<T extends GameCommand, D extends ValidatorDeps> = (
  command: T,
  deps: D
) => ValidationResult;

/**
 * Get the appropriate validator for a command type.
 * Returns a generic validator function that accepts any command and deps.
 */
export function getValidator(
  commandType: CommandType
): (command: GameCommand, deps: ValidatorDeps) => ValidationResult {
  switch (commandType) {
    case COMMAND_TYPES.MOVE_UNIT:
      return validateMoveUnit as (command: GameCommand, deps: ValidatorDeps) => ValidationResult;
    case COMMAND_TYPES.ATTACK:
      return validateAttack as (command: GameCommand, deps: ValidatorDeps) => ValidationResult;
    case COMMAND_TYPES.FOUND_CITY:
      return validateFoundCity as (command: GameCommand, deps: ValidatorDeps) => ValidationResult;
    case COMMAND_TYPES.SET_PRODUCTION:
      return validateSetProduction as (
        command: GameCommand,
        deps: ValidatorDeps
      ) => ValidationResult;
    case COMMAND_TYPES.END_TURN:
      return validateEndTurn as (command: GameCommand, deps: ValidatorDeps) => ValidationResult;
    default: {
      const _exhaustiveCheck: never = commandType;
      throw new Error(`Unknown command type: ${_exhaustiveCheck}`);
    }
  }
}
