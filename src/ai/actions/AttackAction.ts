/**
 * Attack action definition.
 * Allows combat units to attack adjacent enemy units.
 */

import { ActionDefinition } from '../registry/ActionDefinition';
import { AttackCommand, COMMAND_TYPES } from '../../engine/commands/types';
import { AIContext } from '../context/AIContext';
import { getActionRegistry } from '../registry/ActionRegistry';
import { calculateCombat, CombatContext } from '../../combat/CombatCalculator';
import { getTotalDefenseModifier } from '../../combat/CombatModifiers';
import { UNIT_TYPE_DATA } from '../../unit/UnitType';
import { UnitSnapshot } from '../../engine/state/snapshots';

/**
 * Attack action definition.
 *
 * This action applies to combat units and generates attack commands
 * for each adjacent enemy unit.
 *
 * Scoring uses the CombatCalculator to predict outcomes:
 * - Base score: 50
 * - +30 if defender dies
 * - -40 if attacker dies
 * - +damageRatio bonus (up to 20)
 */
export const AttackAction: ActionDefinition<AttackCommand> = {
  id: 'ATTACK',
  commandType: COMMAND_TYPES.ATTACK,
  description: 'Attack an adjacent enemy unit',
  applicableTo: ['unit'],

  generateCandidates(context: AIContext, entityEid: number): AttackCommand[] {
    // Find the unit in our units list
    const unit = context.myUnits.find((u) => u.eid === entityEid) as UnitSnapshot | undefined;
    if (!unit) {
      return [];
    }

    // Check if unit can attack
    if (!unit.capabilities.canAttack) {
      return [];
    }

    // Get adjacent enemies
    const adjacentEnemies = context.getAdjacentEnemies(unit.position.q, unit.position.r);
    if (adjacentEnemies.length === 0) {
      return [];
    }

    // Generate attack command for each adjacent enemy
    return adjacentEnemies.map((enemy) => ({
      type: 'ATTACK',
      playerId: context.playerId,
      attackerEid: entityEid,
      defenderEid: enemy.eid,
    }));
  },

  scoreCandidate(context: AIContext, command: AttackCommand): number {
    // Find attacker and defender
    const attacker = context.myUnits.find((u) => u.eid === command.attackerEid);
    if (!attacker) {
      return 0;
    }

    // Find defender in all enemy units
    let defender: UnitSnapshot | undefined;
    for (const [, units] of context.enemyUnits) {
      defender = units.find((u) => u.eid === command.defenderEid);
      if (defender) break;
    }
    if (!defender) {
      return 0;
    }

    // Get defender's tile for terrain modifiers
    const tile = context.tileMap.get(`${defender.position.q},${defender.position.r}`);
    const defenseModifier = tile ? getTotalDefenseModifier(tile) : 0;

    // Get unit strengths
    const attackerData = UNIT_TYPE_DATA[attacker.type];
    const defenderData = UNIT_TYPE_DATA[defender.type];

    // Build combat context
    const combatContext: CombatContext = {
      attackerStrength: attackerData.strength,
      defenderStrength: defenderData.strength,
      attackerHealth: attacker.health.current,
      defenderHealth: defender.health.current,
      defenseModifier,
    };

    // Calculate combat outcome
    const result = calculateCombat(combatContext);

    // Score based on predicted outcome
    let score = 50; // Base score

    // Big bonus if defender dies
    if (!result.defenderSurvives) {
      score += 30;
    }

    // Big penalty if attacker dies
    if (!result.attackerSurvives) {
      score -= 40;
    }

    // Damage ratio bonus (up to 20)
    // If we deal more damage than we take, score increases
    if (result.attackerDamage > 0) {
      const damageRatio = result.defenderDamage / result.attackerDamage;
      const bonus = Math.min(20, Math.round(damageRatio * 10));
      score += bonus;
    } else {
      // No counter-damage, nice bonus
      score += 15;
    }

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, score));
  },
};

// Auto-register on import
getActionRegistry().register(AttackAction);
