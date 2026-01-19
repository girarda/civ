/**
 * Combat system module exports.
 */

export {
  getTerrainDefenseBonus,
  getFeatureDefenseBonus,
  getTotalDefenseModifier,
  getDefenseModifierNames,
} from './CombatModifiers';

export { calculateCombat, type CombatContext, type CombatResult } from './CombatCalculator';

export { CombatExecutor } from './CombatSystem';

export { CombatPreviewState, type CombatPreviewData } from './CombatPreview';
