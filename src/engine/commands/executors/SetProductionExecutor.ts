/**
 * Executor for SetProductionCommand.
 * Pure production setting returning events.
 */

import { SetProductionCommand } from '../types';
import { GameEventType, createEvent, ProductionChangedEvent } from '../../events/types';
import { ProductionComponent } from '../../../ecs/citySystems';
import { getBuildableCost } from '../../../city/Buildable';

export interface SetProductionExecutorDeps {
  // No deps needed for set production
}

/**
 * Execute a SetProductionCommand.
 * Updates ECS state and returns events to emit.
 */
export function executeSetProduction(
  command: SetProductionCommand,
  _deps: SetProductionExecutorDeps
): GameEventType[] {
  const { cityEid, buildableType, playerId } = command;

  // Update production component
  const cost = getBuildableCost(buildableType);
  ProductionComponent.currentItem[cityEid] = buildableType;
  ProductionComponent.progress[cityEid] = 0;
  ProductionComponent.cost[cityEid] = cost;

  // Emit ProductionChangedEvent
  const event = createEvent<ProductionChangedEvent>({
    type: 'PRODUCTION_CHANGED',
    cityEid,
    newItem: buildableType,
    playerId,
  });

  return [event];
}
