/**
 * EndTurn action definition.
 * Ends the current player's turn when no other actions are available.
 */

import { ActionDefinition } from '../registry/ActionDefinition';
import { EndTurnCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';
import { getActionRegistry } from '../registry/ActionRegistry';

/**
 * End turn action definition.
 *
 * This action is always available at the player level and generates a single
 * END_TURN command. It scores high (100) when no units have remaining actions,
 * and low (1) when units still have actions available.
 */
export const EndTurnAction: ActionDefinition<EndTurnCommand> = {
  id: 'END_TURN',
  commandType: COMMAND_TYPES.END_TURN,
  description: 'End the current turn and pass to the next player',
  applicableTo: ['player'],

  generateCandidates(context: AIContext, _entityEid: number): EndTurnCommand[] {
    // Always generate exactly one END_TURN candidate
    return [
      {
        type: 'END_TURN',
        playerId: context.playerId,
      },
    ];
  },

  scoreCandidate(context: AIContext, _command: EndTurnCommand): number {
    // Check if any units have remaining actions
    const hasUnitsWithActions = context.myUnits.some(
      (unit) => unit.capabilities.canMove || unit.capabilities.canAttack || unit.capabilities.canFoundCity
    );

    // Score 100 if no units can act, 1 otherwise
    // This ensures end turn is picked only when nothing else can be done
    return hasUnitsWithActions ? 1 : 100;
  },
};

// Auto-register on import
getActionRegistry().register(EndTurnAction);
