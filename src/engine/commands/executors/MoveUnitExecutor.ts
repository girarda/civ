/**
 * Executor for MoveUnitCommand.
 * Pure state mutation that returns events to emit.
 */

import { IWorld } from 'bitecs';
import { MoveUnitCommand } from '../types';
import { GameEventType, createEvent, UnitMovedEvent } from '../../events/types';
import { Position, MovementComponent } from '../../../ecs/world';
import { TilePosition } from '../../../hex/TilePosition';
import { Pathfinder } from '../../../pathfinding/Pathfinder';

export interface MoveUnitExecutorDeps {
  world: IWorld;
  pathfinder: Pathfinder;
}

/**
 * Execute a MoveUnitCommand.
 * Updates ECS state and returns events to emit.
 */
export function executeMoveUnit(
  command: MoveUnitCommand,
  deps: MoveUnitExecutorDeps
): GameEventType[] {
  const { pathfinder } = deps;
  const { unitEid, targetQ, targetR, playerId } = command;

  // Get current position
  const fromQ = Position.q[unitEid];
  const fromR = Position.r[unitEid];
  const currentPos = new TilePosition(fromQ, fromR);
  const targetPos = new TilePosition(targetQ, targetR);

  // Calculate path cost
  const currentMP = MovementComponent.current[unitEid];
  const result = pathfinder.findPath(currentPos, targetPos, currentMP);

  // Update Position components
  Position.q[unitEid] = targetQ;
  Position.r[unitEid] = targetR;

  // Update movement points
  const remainingMovement = currentMP - result.totalCost;
  MovementComponent.current[unitEid] = remainingMovement;

  // Return UnitMovedEvent
  const event = createEvent<UnitMovedEvent>({
    type: 'UNIT_MOVED',
    unitEid,
    fromQ,
    fromR,
    toQ: targetQ,
    toR: targetR,
    remainingMovement,
    playerId,
  });

  return [event];
}
