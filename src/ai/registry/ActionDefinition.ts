/**
 * Core ActionDefinition interface for the AI extensibility system.
 * Actions self-register with the registry and provide candidate generation and scoring logic.
 */

import { CommandType, GameCommand } from '../../engine/commands/types';
import type { AIContext } from '../context/AIContext';

/**
 * Entity types that can perform actions.
 */
export type EntityType = 'unit' | 'city' | 'player';

// Re-export AIContext type for convenience
export type { AIContext };

/**
 * Definition of an AI action that can generate and score command candidates.
 *
 * Actions are self-describing and register themselves with the ActionRegistry.
 * The AI controller uses these definitions to generate all possible actions
 * and score them to select the best one.
 *
 * @template TCommand - The specific command type this action generates
 */
export interface ActionDefinition<TCommand extends GameCommand = GameCommand> {
  /**
   * Unique identifier for this action.
   * Should match the command type for 1:1 mappings (e.g., 'MOVE_UNIT').
   */
  readonly id: string;

  /**
   * The command type this action generates.
   * Maps to COMMAND_TYPES values.
   */
  readonly commandType: CommandType;

  /**
   * Human-readable description of what this action does.
   */
  readonly description: string;

  /**
   * Entity types that can perform this action.
   * - 'unit': Action is available for unit entities
   * - 'city': Action is available for city entities
   * - 'player': Action is available at the player level (e.g., END_TURN)
   */
  readonly applicableTo: readonly EntityType[];

  /**
   * Generate all valid command candidates for this action.
   *
   * @param context - The AI context with game state and helper methods
   * @param entityEid - Entity ID of the unit/city, or -1 for player-level actions
   * @returns Array of valid commands that could be executed
   */
  generateCandidates(context: AIContext, entityEid: number): TCommand[];

  /**
   * Score a candidate command to determine its priority.
   *
   * @param context - The AI context with game state and helper methods
   * @param command - The command to score
   * @returns Score from 0-100, where higher is more desirable
   */
  scoreCandidate(context: AIContext, command: TCommand): number;
}
