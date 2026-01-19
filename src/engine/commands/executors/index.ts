/**
 * Executor registry and exports.
 */

export { executeMoveUnit } from './MoveUnitExecutor';
export type { MoveUnitExecutorDeps } from './MoveUnitExecutor';
export { executeAttack } from './AttackExecutor';
export type { AttackExecutorDeps } from './AttackExecutor';
export { executeFoundCity } from './FoundCityExecutor';
export type { FoundCityExecutorDeps } from './FoundCityExecutor';
export { executeSetProduction } from './SetProductionExecutor';
export type { SetProductionExecutorDeps } from './SetProductionExecutor';
export { executeEndTurn } from './EndTurnExecutor';
export type { EndTurnExecutorDeps } from './EndTurnExecutor';

import { GameCommand, CommandType, COMMAND_TYPES } from '../types';
import { GameEventType } from '../../events/types';
import { executeMoveUnit, MoveUnitExecutorDeps } from './MoveUnitExecutor';
import { executeAttack, AttackExecutorDeps } from './AttackExecutor';
import { executeFoundCity, FoundCityExecutorDeps } from './FoundCityExecutor';
import { executeSetProduction, SetProductionExecutorDeps } from './SetProductionExecutor';
import { executeEndTurn, EndTurnExecutorDeps } from './EndTurnExecutor';

/** Union type of all executor dependencies */
export type ExecutorDeps =
  | MoveUnitExecutorDeps
  | AttackExecutorDeps
  | FoundCityExecutorDeps
  | SetProductionExecutorDeps
  | EndTurnExecutorDeps;

/** Executor function type */
export type ExecutorFn<T extends GameCommand, D extends ExecutorDeps> = (
  command: T,
  deps: D
) => GameEventType[];

/**
 * Get the appropriate executor for a command type.
 * Returns a generic executor function that accepts any command and deps.
 */
export function getExecutor(
  commandType: CommandType
): (command: GameCommand, deps: ExecutorDeps) => GameEventType[] {
  switch (commandType) {
    case COMMAND_TYPES.MOVE_UNIT:
      return executeMoveUnit as (command: GameCommand, deps: ExecutorDeps) => GameEventType[];
    case COMMAND_TYPES.ATTACK:
      return executeAttack as (command: GameCommand, deps: ExecutorDeps) => GameEventType[];
    case COMMAND_TYPES.FOUND_CITY:
      return executeFoundCity as (command: GameCommand, deps: ExecutorDeps) => GameEventType[];
    case COMMAND_TYPES.SET_PRODUCTION:
      return executeSetProduction as (command: GameCommand, deps: ExecutorDeps) => GameEventType[];
    case COMMAND_TYPES.END_TURN:
      return executeEndTurn as (command: GameCommand, deps: ExecutorDeps) => GameEventType[];
    default: {
      const _exhaustiveCheck: never = commandType;
      throw new Error(`Unknown command type: ${_exhaustiveCheck}`);
    }
  }
}
