/**
 * Move action definition.
 * Allows units to move to reachable tiles.
 */

import { ActionDefinition } from '../registry/ActionDefinition';
import { MoveUnitCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';
import { getActionRegistry } from '../registry/ActionRegistry';
import { TilePosition } from '../../hex/TilePosition';
import { UnitSnapshot } from '../../engine/state/snapshots';

/**
 * Move unit action definition.
 *
 * This action applies to units and generates movement commands for all
 * tiles reachable within the unit's remaining movement points.
 *
 * The current position is excluded from candidates (no-op move).
 *
 * Scoring: 10 (base score, will be refined in Phase 2)
 */
export const MoveAction: ActionDefinition<MoveUnitCommand> = {
  id: 'MOVE_UNIT',
  commandType: COMMAND_TYPES.MOVE_UNIT,
  description: 'Move a unit to a reachable tile',
  applicableTo: ['unit'],

  generateCandidates(context: AIContext, entityEid: number): MoveUnitCommand[] {
    // Find the unit in our units list
    const unit = context.myUnits.find((u) => u.eid === entityEid) as UnitSnapshot | undefined;
    if (!unit) {
      return [];
    }

    // Check if unit can move
    if (!unit.capabilities.canMove) {
      return [];
    }

    // Get current position
    const currentPos = new TilePosition(unit.position.q, unit.position.r);

    // Get all reachable tiles using pathfinder
    const reachable = context.pathfinder.getReachableTiles(currentPos, unit.movement.current);

    // Generate commands for each reachable tile except current position
    const commands: MoveUnitCommand[] = [];
    for (const [key] of reachable) {
      // Skip current position (no-op)
      if (key === currentPos.key()) {
        continue;
      }

      // Parse position from key
      const [q, r] = key.split(',').map(Number);

      commands.push({
        type: 'MOVE_UNIT',
        playerId: context.playerId,
        unitEid: entityEid,
        targetQ: q,
        targetR: r,
      });
    }

    return commands;
  },

  scoreCandidate(_context: AIContext, _command: MoveUnitCommand): number {
    // Base score for movement - will be refined in Phase 2
    return 10;
  },
};

// Auto-register on import
getActionRegistry().register(MoveAction);
