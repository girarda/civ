/**
 * Combat damage calculation system.
 * Pure functions for calculating combat outcomes.
 */

/** Base damage dealt per combat (before modifiers) */
const BASE_DAMAGE = 30;

/** Counter-attack damage multiplier (attackers take reduced damage) */
const COUNTER_ATTACK_MULTIPLIER = 0.5;

/**
 * Context required to calculate combat outcomes.
 */
export interface CombatContext {
  attackerStrength: number;
  defenderStrength: number;
  attackerHealth: number;
  defenderHealth: number;
  defenseModifier: number; // Total defense bonus (0.0 - 0.5+)
}

/**
 * Result of combat calculation.
 */
export interface CombatResult {
  attackerDamage: number; // Damage dealt TO attacker
  defenderDamage: number; // Damage dealt TO defender
  attackerSurvives: boolean;
  defenderSurvives: boolean;
}

/**
 * Calculate combat outcome between attacker and defender.
 *
 * Formula (Civ 5 inspired):
 * - Effective attacker strength = attackerStrength * (attackerHealth / 100)
 * - Effective defender strength = defenderStrength * (defenderHealth / 100) * (1 + defenseModifier)
 * - Ratio = effectiveAttacker / effectiveDefender
 * - Defender damage = round(BASE_DAMAGE * ratio)
 * - Attacker damage = round(BASE_DAMAGE / ratio * COUNTER_ATTACK_MULTIPLIER)
 *
 * Edge cases:
 * - Zero-strength defender: instant death, no counter-damage
 * - Minimum 1 damage if attacker has strength
 * - Damage capped at current health
 */
export function calculateCombat(context: CombatContext): CombatResult {
  const { attackerStrength, defenderStrength, attackerHealth, defenderHealth, defenseModifier } =
    context;

  // Handle zero-strength defender (civilian units like Settler)
  if (defenderStrength === 0) {
    return {
      attackerDamage: 0,
      defenderDamage: defenderHealth, // Instant death
      attackerSurvives: true,
      defenderSurvives: false,
    };
  }

  // Handle zero-strength attacker (shouldn't happen in practice, but handle it)
  if (attackerStrength === 0) {
    return {
      attackerDamage: 0,
      defenderDamage: 0,
      attackerSurvives: true,
      defenderSurvives: true,
    };
  }

  // Calculate effective strengths (health affects strength proportionally)
  const effectiveAttackerStrength = attackerStrength * (attackerHealth / 100);
  const effectiveDefenderStrength =
    defenderStrength * (defenderHealth / 100) * (1 + defenseModifier);

  // Calculate strength ratio
  const ratio = effectiveAttackerStrength / effectiveDefenderStrength;

  // Calculate raw damage
  let defenderDamage = Math.round(BASE_DAMAGE * ratio);
  let attackerDamage = Math.round((BASE_DAMAGE / ratio) * COUNTER_ATTACK_MULTIPLIER);

  // Ensure minimum 1 damage if attacker has strength
  defenderDamage = Math.max(1, defenderDamage);

  // Ensure minimum 1 counter-damage if defender has strength
  attackerDamage = Math.max(1, attackerDamage);

  // Cap damage at current health
  defenderDamage = Math.min(defenderDamage, defenderHealth);
  attackerDamage = Math.min(attackerDamage, attackerHealth);

  return {
    attackerDamage,
    defenderDamage,
    attackerSurvives: attackerHealth - attackerDamage > 0,
    defenderSurvives: defenderHealth - defenderDamage > 0,
  };
}
