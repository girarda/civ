/**
 * SetProduction action definition.
 * Sets production for cities, choosing from available buildable items.
 */

import { ActionDefinition } from '../registry/ActionDefinition';
import { SetProductionCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';
import { getActionRegistry } from '../registry/ActionRegistry';
import { getAvailableBuildables, BuildableType } from '../../city/Buildable';

/**
 * Set production action definition.
 *
 * This action applies to cities and generates candidates for each buildable type.
 * Scoring is based on simple heuristics:
 * - Settler: 80 if < 3 cities, else 40
 * - Warrior: 50
 * - Scout: 30
 */
export const SetProductionAction: ActionDefinition<SetProductionCommand> = {
  id: 'SET_PRODUCTION',
  commandType: COMMAND_TYPES.SET_PRODUCTION,
  description: 'Set production for a city',
  applicableTo: ['city'],

  generateCandidates(context: AIContext, entityEid: number): SetProductionCommand[] {
    // Get available buildables
    const buildables = getAvailableBuildables();

    // Generate a command for each buildable
    return buildables.map((buildableType) => ({
      type: 'SET_PRODUCTION',
      playerId: context.playerId,
      cityEid: entityEid,
      buildableType,
    }));
  },

  scoreCandidate(context: AIContext, command: SetProductionCommand): number {
    const cityCount = context.myCities.length;

    switch (command.buildableType) {
      case BuildableType.Settler:
        // Prioritize settlers when we have few cities
        return cityCount < 3 ? 80 : 40;

      case BuildableType.Warrior:
        // Warriors are generally useful
        return 50;

      case BuildableType.Scout:
        // Scouts are lower priority
        return 30;

      default:
        return 10;
    }
  },
};

// Auto-register on import
getActionRegistry().register(SetProductionAction);
