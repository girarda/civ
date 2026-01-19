/**
 * Command module exports.
 * Provides types, validators, and executors for the command layer.
 */

// Command types
export type {
  Command,
  MoveUnitCommand,
  AttackCommand,
  FoundCityCommand,
  SetProductionCommand,
  EndTurnCommand,
  GameCommand,
  CommandType,
} from './types';

export {
  COMMAND_TYPES,
  isMoveUnitCommand,
  isAttackCommand,
  isFoundCityCommand,
  isSetProductionCommand,
  isEndTurnCommand,
} from './types';

// Result types
export type { ValidationResult, CommandResult } from './CommandResult';

export { validationSuccess, validationError, commandSuccess, commandError } from './CommandResult';

// Validators
export {
  validateMoveUnit,
  validateAttack,
  validateFoundCity,
  validateSetProduction,
  validateEndTurn,
  getValidator,
} from './validators';

export type {
  MoveUnitValidatorDeps,
  AttackValidatorDeps,
  FoundCityValidatorDeps,
  SetProductionValidatorDeps,
  EndTurnValidatorDeps,
  ValidatorDeps,
} from './validators';

// Executors
export {
  executeMoveUnit,
  executeAttack,
  executeFoundCity,
  executeSetProduction,
  executeEndTurn,
  getExecutor,
} from './executors';

export type {
  MoveUnitExecutorDeps,
  AttackExecutorDeps,
  FoundCityExecutorDeps,
  SetProductionExecutorDeps,
  EndTurnExecutorDeps,
  ExecutorDeps,
} from './executors';
