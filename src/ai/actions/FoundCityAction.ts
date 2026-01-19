/**
 * FoundCity action definition.
 * Allows Settler units to found cities at valid locations.
 */

import { ActionDefinition } from '../registry/ActionDefinition';
import { FoundCityCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';
import { getActionRegistry } from '../registry/ActionRegistry';
import { canFoundCity } from '../../city/CityFounder';
import { UnitType } from '../../unit/UnitType';
import { UnitSnapshot } from '../../engine/state/snapshots';

/**
 * Found city action definition.
 *
 * This action applies to Settler units and generates a single FOUND_CITY
 * command if the unit is at a valid founding location.
 *
 * Scoring: 70 (high priority for city founding)
 */
export const FoundCityAction: ActionDefinition<FoundCityCommand> = {
  id: 'FOUND_CITY',
  commandType: COMMAND_TYPES.FOUND_CITY,
  description: 'Found a new city at the current location',
  applicableTo: ['unit'],

  generateCandidates(context: AIContext, entityEid: number): FoundCityCommand[] {
    // Find the unit in our units list
    const unit = context.myUnits.find((u) => u.eid === entityEid) as UnitSnapshot | undefined;
    if (!unit) {
      return [];
    }

    // Only Settlers can found cities
    if (unit.type !== UnitType.Settler) {
      return [];
    }

    // Check if the unit can found a city at its current position
    if (!canFoundCity(context.world, entityEid, context.tileMap)) {
      return [];
    }

    // Return a single command to found city
    return [
      {
        type: 'FOUND_CITY',
        playerId: context.playerId,
        settlerEid: entityEid,
      },
    ];
  },

  scoreCandidate(_context: AIContext, _command: FoundCityCommand): number {
    // City founding is always high priority
    return 70;
  },
};

// Auto-register on import
getActionRegistry().register(FoundCityAction);
