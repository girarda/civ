/**
 * Command type definitions for the command layer.
 * All commands are JSON-serializable for potential replay/networking.
 */

/** Base interface for all commands */
export interface Command {
  type: string;
  playerId: number;
  timestamp?: number;
}

/** Move a unit to a target hex */
export interface MoveUnitCommand extends Command {
  type: 'MOVE_UNIT';
  unitEid: number;
  targetQ: number;
  targetR: number;
}

/** Attack an enemy unit */
export interface AttackCommand extends Command {
  type: 'ATTACK';
  attackerEid: number;
  defenderEid: number;
}

/** Found a city with the selected settler */
export interface FoundCityCommand extends Command {
  type: 'FOUND_CITY';
  settlerEid: number;
  cityName?: string;
}

/** Set production for a city */
export interface SetProductionCommand extends Command {
  type: 'SET_PRODUCTION';
  cityEid: number;
  buildableType: number;
}

/** End the current player's turn */
export interface EndTurnCommand extends Command {
  type: 'END_TURN';
}

/** Union type of all game commands */
export type GameCommand =
  | MoveUnitCommand
  | AttackCommand
  | FoundCityCommand
  | SetProductionCommand
  | EndTurnCommand;

/** Command type literals for type guards */
export const COMMAND_TYPES = {
  MOVE_UNIT: 'MOVE_UNIT',
  ATTACK: 'ATTACK',
  FOUND_CITY: 'FOUND_CITY',
  SET_PRODUCTION: 'SET_PRODUCTION',
  END_TURN: 'END_TURN',
} as const;

export type CommandType = (typeof COMMAND_TYPES)[keyof typeof COMMAND_TYPES];

/** Type guard for MoveUnitCommand */
export function isMoveUnitCommand(command: GameCommand): command is MoveUnitCommand {
  return command.type === 'MOVE_UNIT';
}

/** Type guard for AttackCommand */
export function isAttackCommand(command: GameCommand): command is AttackCommand {
  return command.type === 'ATTACK';
}

/** Type guard for FoundCityCommand */
export function isFoundCityCommand(command: GameCommand): command is FoundCityCommand {
  return command.type === 'FOUND_CITY';
}

/** Type guard for SetProductionCommand */
export function isSetProductionCommand(command: GameCommand): command is SetProductionCommand {
  return command.type === 'SET_PRODUCTION';
}

/** Type guard for EndTurnCommand */
export function isEndTurnCommand(command: GameCommand): command is EndTurnCommand {
  return command.type === 'END_TURN';
}
