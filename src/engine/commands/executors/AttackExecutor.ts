/**
 * Executor for AttackCommand.
 * Pure combat execution returning events, no renderer calls.
 */

import { IWorld, removeEntity } from 'bitecs';
import { AttackCommand } from '../types';
import {
  GameEventType,
  createEvent,
  CombatResolvedEvent,
  UnitDestroyedEvent,
} from '../../events/types';
import { Position, MovementComponent, UnitComponent } from '../../../ecs/world';
import { getUnitOwner, getUnitHealth, setUnitHealth } from '../../../ecs/unitSystems';
import { TilePosition } from '../../../hex/TilePosition';
import { GeneratedTile } from '../../../map/MapGenerator';
import { UNIT_TYPE_DATA, UnitType } from '../../../unit/UnitType';
import { calculateCombat, CombatContext } from '../../../combat/CombatCalculator';
import { getTotalDefenseModifier } from '../../../combat/CombatModifiers';
import { PlayerManager } from '../../../player';

export interface AttackExecutorDeps {
  world: IWorld;
  tileMap: Map<string, GeneratedTile>;
  playerManager?: PlayerManager;
}

/**
 * Execute an AttackCommand.
 * Updates ECS state and returns events to emit.
 */
export function executeAttack(command: AttackCommand, deps: AttackExecutorDeps): GameEventType[] {
  const { world, tileMap, playerManager } = deps;
  const { attackerEid, defenderEid, playerId } = command;

  const events: GameEventType[] = [];

  // Get unit stats
  const attackerType = UnitComponent.type[attackerEid] as UnitType;
  const defenderType = UnitComponent.type[defenderEid] as UnitType;
  const attackerData = UNIT_TYPE_DATA[attackerType];
  const defenderData = UNIT_TYPE_DATA[defenderType];

  // Get health
  const attackerHealth = getUnitHealth(attackerEid);
  const defenderHealth = getUnitHealth(defenderEid);

  // Get defender terrain modifier
  const defenderQ = Position.q[defenderEid];
  const defenderR = Position.r[defenderEid];
  const defenderPos = new TilePosition(defenderQ, defenderR);
  const tileKey = defenderPos.key();
  const defenderTile = tileMap.get(tileKey);
  const defenseModifier = defenderTile ? getTotalDefenseModifier(defenderTile) : 0;

  // Calculate combat
  const context: CombatContext = {
    attackerStrength: attackerData.strength,
    defenderStrength: defenderData.strength,
    attackerHealth: attackerHealth.current,
    defenderHealth: defenderHealth.current,
    defenseModifier,
  };

  const result = calculateCombat(context);

  // Apply damage
  setUnitHealth(attackerEid, attackerHealth.current - result.attackerDamage);
  setUnitHealth(defenderEid, defenderHealth.current - result.defenderDamage);

  // Consume all movement points (attacking ends turn for unit)
  MovementComponent.current[attackerEid] = 0;

  // Emit CombatResolvedEvent
  const combatEvent = createEvent<CombatResolvedEvent>({
    type: 'COMBAT_RESOLVED',
    attackerEid,
    defenderEid,
    attackerDamage: result.attackerDamage,
    defenderDamage: result.defenderDamage,
    attackerSurvives: result.attackerSurvives,
    defenderSurvives: result.defenderSurvives,
    attackerRemainingHealth: attackerHealth.current - result.attackerDamage,
    defenderRemainingHealth: defenderHealth.current - result.defenderDamage,
    playerId,
  });
  events.push(combatEvent);

  // Handle unit deaths - defender first, then attacker
  if (!result.defenderSurvives) {
    const defenderOwner = getUnitOwner(defenderEid);
    const destroyedEvent = createEvent<UnitDestroyedEvent>({
      type: 'UNIT_DESTROYED',
      unitEid: defenderEid,
      q: defenderQ,
      r: defenderR,
      playerId: defenderOwner,
    });
    events.push(destroyedEvent);

    // Remove from ECS
    removeEntity(world, defenderEid);

    // Check for player elimination
    if (playerManager) {
      playerManager.checkElimination(world, defenderOwner);
    }
  }

  if (!result.attackerSurvives) {
    const attackerOwner = getUnitOwner(attackerEid);
    const attackerQ = Position.q[attackerEid];
    const attackerR = Position.r[attackerEid];
    const destroyedEvent = createEvent<UnitDestroyedEvent>({
      type: 'UNIT_DESTROYED',
      unitEid: attackerEid,
      q: attackerQ,
      r: attackerR,
      playerId: attackerOwner,
    });
    events.push(destroyedEvent);

    // Remove from ECS
    removeEntity(world, attackerEid);

    // Check for player elimination
    if (playerManager) {
      playerManager.checkElimination(world, attackerOwner);
    }
  }

  return events;
}
