/**
 * AIController - Coordinates action generation, scoring, and execution.
 * Main entry point for AI turn execution.
 */

import { GameEngine } from '../../engine/GameEngine';
import { GameCommand } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';
import { buildAIContext, ContextBuilderDeps } from '../context/ContextBuilder';
import { getActionRegistry } from '../registry/ActionRegistry';

/**
 * A command with its calculated score and action source.
 */
export interface ScoredAction {
  /** The command to execute */
  command: GameCommand;
  /** Score from 0-100 indicating desirability */
  score: number;
  /** ID of the action definition that generated this command */
  actionId: string;
}

/** Maximum iterations to prevent infinite loops */
const MAX_ITERATIONS = 100;

/**
 * AI Controller that coordinates turn execution.
 *
 * The controller:
 * 1. Builds an AIContext from current game state
 * 2. Queries registered actions for candidates
 * 3. Scores all candidates
 * 4. Executes the highest-scoring action
 * 5. Repeats until END_TURN or no valid actions
 */
export class AIController {
  private engine: GameEngine;
  private deps: ContextBuilderDeps;

  /**
   * Create a new AI controller.
   * @param engine - The game engine for command execution
   * @param deps - Dependencies for building AI context
   */
  constructor(engine: GameEngine, deps: ContextBuilderDeps) {
    this.engine = engine;
    this.deps = deps;
  }

  /**
   * Execute a complete AI turn for the given player.
   *
   * Loops through action selection and execution until:
   * - END_TURN action is selected
   * - No valid actions are available
   * - Safety limit is reached
   *
   * @param playerId - The player ID to execute turn for
   */
  executeTurn(playerId: number): void {
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Build fresh context each iteration to reflect state changes
      const context = buildAIContext(playerId, this.deps);

      // Select the best action
      const best = this.selectBestAction(context);

      if (!best) {
        // No valid actions, end turn implicitly
        console.log(`[AI] No valid actions for player ${playerId}, ending turn`);
        break;
      }

      // Check for END_TURN - execute and stop
      if (best.actionId === 'END_TURN') {
        const result = this.engine.executeCommand(best.command);
        if (!result.success) {
          console.warn(`[AI] END_TURN failed: ${result.error}`);
        }
        break;
      }

      // Execute the action
      const result = this.engine.executeCommand(best.command);

      if (!result.success) {
        // Log warning but continue - try other actions
        console.warn(`[AI] Command ${best.actionId} failed: ${result.error}`);
        // Note: In a production system, we might want to track failed commands
        // to avoid retrying the same invalid action. For now, context refresh
        // should provide updated state that may invalidate the failed action.
      }
    }

    if (iterations >= MAX_ITERATIONS) {
      console.warn(`[AI] Player ${playerId} hit safety limit of ${MAX_ITERATIONS} iterations`);
    }
  }

  /**
   * Select the best action from all available candidates.
   *
   * @param context - The current AI context
   * @returns The highest-scoring action, or null if no valid actions
   */
  selectBestAction(context: AIContext): ScoredAction | null {
    const allScored = this.getAllScoredActions(context);

    if (allScored.length === 0) {
      return null;
    }

    // Return the highest-scoring action (already sorted)
    return allScored[0];
  }

  /**
   * Generate and score all possible actions.
   * Useful for debugging and visualization.
   *
   * @param context - The current AI context
   * @returns All scored actions, sorted by score descending
   */
  getAllScoredActions(context: AIContext): ScoredAction[] {
    const registry = getActionRegistry();
    const scoredActions: ScoredAction[] = [];

    // Get unit actions for each unit
    const unitActions = registry.getActionsFor('unit');
    for (const unit of context.myUnits) {
      for (const action of unitActions) {
        const candidates = action.generateCandidates(context, unit.eid);
        for (const command of candidates) {
          const score = action.scoreCandidate(context, command);
          scoredActions.push({
            command,
            score,
            actionId: action.id,
          });
        }
      }
    }

    // Get city actions for each city
    const cityActions = registry.getActionsFor('city');
    for (const city of context.myCities) {
      for (const action of cityActions) {
        const candidates = action.generateCandidates(context, city.eid);
        for (const command of candidates) {
          const score = action.scoreCandidate(context, command);
          scoredActions.push({
            command,
            score,
            actionId: action.id,
          });
        }
      }
    }

    // Get player-level actions (END_TURN)
    const playerActions = registry.getActionsFor('player');
    for (const action of playerActions) {
      // entityEid is -1 for player-level actions
      const candidates = action.generateCandidates(context, -1);
      for (const command of candidates) {
        const score = action.scoreCandidate(context, command);
        scoredActions.push({
          command,
          score,
          actionId: action.id,
        });
      }
    }

    // Sort by score descending
    scoredActions.sort((a, b) => b.score - a.score);

    return scoredActions;
  }
}
