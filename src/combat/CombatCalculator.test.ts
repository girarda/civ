import { describe, it, expect } from 'vitest';
import { calculateCombat, CombatContext } from './CombatCalculator';
import {
  getTerrainDefenseBonus,
  getFeatureDefenseBonus,
  getTotalDefenseModifier,
  getDefenseModifierNames,
} from './CombatModifiers';
import { Terrain } from '../tile/Terrain';
import { TileFeature } from '../tile/TileFeature';
import { TilePosition } from '../hex/TilePosition';
import { GeneratedTile } from '../map/MapGenerator';

describe('CombatModifiers', () => {
  describe('getTerrainDefenseBonus', () => {
    it('should return 0.25 for hill terrains', () => {
      expect(getTerrainDefenseBonus(Terrain.GrasslandHill)).toBe(0.25);
      expect(getTerrainDefenseBonus(Terrain.PlainsHill)).toBe(0.25);
      expect(getTerrainDefenseBonus(Terrain.DesertHill)).toBe(0.25);
      expect(getTerrainDefenseBonus(Terrain.TundraHill)).toBe(0.25);
      expect(getTerrainDefenseBonus(Terrain.SnowHill)).toBe(0.25);
    });

    it('should return 0 for flat terrains', () => {
      expect(getTerrainDefenseBonus(Terrain.Grassland)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Plains)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Desert)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Tundra)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Snow)).toBe(0);
    });

    it('should return 0 for water and mountain terrains', () => {
      expect(getTerrainDefenseBonus(Terrain.Coast)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Ocean)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Lake)).toBe(0);
      expect(getTerrainDefenseBonus(Terrain.Mountain)).toBe(0);
    });
  });

  describe('getFeatureDefenseBonus', () => {
    it('should return 0.25 for Forest', () => {
      expect(getFeatureDefenseBonus(TileFeature.Forest)).toBe(0.25);
    });

    it('should return 0.25 for Jungle', () => {
      expect(getFeatureDefenseBonus(TileFeature.Jungle)).toBe(0.25);
    });

    it('should return 0 for other features', () => {
      expect(getFeatureDefenseBonus(TileFeature.Marsh)).toBe(0);
      expect(getFeatureDefenseBonus(TileFeature.Floodplains)).toBe(0);
      expect(getFeatureDefenseBonus(TileFeature.Oasis)).toBe(0);
      expect(getFeatureDefenseBonus(TileFeature.Ice)).toBe(0);
    });

    it('should return 0 for null feature', () => {
      expect(getFeatureDefenseBonus(null)).toBe(0);
    });
  });

  describe('getTotalDefenseModifier', () => {
    it('should return 0 for flat terrain with no feature', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.Grassland,
        feature: null,
        resource: null,
      };
      expect(getTotalDefenseModifier(tile)).toBe(0);
    });

    it('should return 0.25 for hills with no feature', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.GrasslandHill,
        feature: null,
        resource: null,
      };
      expect(getTotalDefenseModifier(tile)).toBe(0.25);
    });

    it('should return 0.25 for flat terrain with Forest', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.Grassland,
        feature: TileFeature.Forest,
        resource: null,
      };
      expect(getTotalDefenseModifier(tile)).toBe(0.25);
    });

    it('should return 0.5 for hills with Forest (stacking)', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.GrasslandHill,
        feature: TileFeature.Forest,
        resource: null,
      };
      expect(getTotalDefenseModifier(tile)).toBe(0.5);
    });

    it('should return 0.5 for hills with Jungle (stacking)', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.PlainsHill,
        feature: TileFeature.Jungle,
        resource: null,
      };
      expect(getTotalDefenseModifier(tile)).toBe(0.5);
    });
  });

  describe('getDefenseModifierNames', () => {
    it('should return empty array for flat terrain with no feature', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.Grassland,
        feature: null,
        resource: null,
      };
      expect(getDefenseModifierNames(tile)).toEqual([]);
    });

    it('should return Hills modifier for hill terrain', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.GrasslandHill,
        feature: null,
        resource: null,
      };
      expect(getDefenseModifierNames(tile)).toEqual(['Hills +25%']);
    });

    it('should return Forest modifier for forest feature', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.Grassland,
        feature: TileFeature.Forest,
        resource: null,
      };
      expect(getDefenseModifierNames(tile)).toEqual(['Forest +25%']);
    });

    it('should return both modifiers for hills with forest', () => {
      const tile: GeneratedTile = {
        position: new TilePosition(0, 0),
        terrain: Terrain.GrasslandHill,
        feature: TileFeature.Forest,
        resource: null,
      };
      const modifiers = getDefenseModifierNames(tile);
      expect(modifiers).toContain('Hills +25%');
      expect(modifiers).toContain('Forest +25%');
      expect(modifiers).toHaveLength(2);
    });
  });
});

describe('CombatCalculator', () => {
  describe('calculateCombat - equal strength', () => {
    it('should deal similar damage to both units with equal strength at full health', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // With equal strength, defender damage should be BASE_DAMAGE (30)
      // Attacker damage should be BASE_DAMAGE * 0.5 (15) due to counter-attack reduction
      expect(result.defenderDamage).toBe(30);
      expect(result.attackerDamage).toBe(15);
      expect(result.attackerSurvives).toBe(true);
      expect(result.defenderSurvives).toBe(true);
    });
  });

  describe('calculateCombat - unequal strength', () => {
    it('should deal more damage when attacker is stronger (Warrior 8 vs Scout 5)', () => {
      const context: CombatContext = {
        attackerStrength: 8, // Warrior
        defenderStrength: 5, // Scout
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // Ratio = 8/5 = 1.6
      // Defender damage = 30 * 1.6 = 48
      // Attacker damage = 30 / 1.6 * 0.5 = 9.375 ≈ 9
      expect(result.defenderDamage).toBe(48);
      expect(result.attackerDamage).toBe(9);
      expect(result.attackerSurvives).toBe(true);
      expect(result.defenderSurvives).toBe(true);
    });

    it('should deal less damage when attacker is weaker (Scout 5 vs Warrior 8)', () => {
      const context: CombatContext = {
        attackerStrength: 5, // Scout
        defenderStrength: 8, // Warrior
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // Ratio = 5/8 = 0.625
      // Defender damage = 30 * 0.625 = 18.75 ≈ 19
      // Attacker damage = 30 / 0.625 * 0.5 = 24
      expect(result.defenderDamage).toBe(19);
      expect(result.attackerDamage).toBe(24);
      expect(result.attackerSurvives).toBe(true);
      expect(result.defenderSurvives).toBe(true);
    });
  });

  describe('calculateCombat - terrain modifiers', () => {
    it('should reduce damage dealt to defender on hills (+25%)', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0.25, // Hills
      };
      const result = calculateCombat(context);

      // Effective defender strength = 8 * (1 + 0.25) = 10
      // Ratio = 8/10 = 0.8
      // Defender damage = 30 * 0.8 = 24
      // Attacker damage = 30 / 0.8 * 0.5 = 18.75 ≈ 19
      expect(result.defenderDamage).toBe(24);
      expect(result.attackerDamage).toBe(19);
    });

    it('should reduce damage dealt to defender in forest (+25%)', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0.25, // Forest
      };
      const result = calculateCombat(context);

      expect(result.defenderDamage).toBe(24);
      expect(result.attackerDamage).toBe(19);
    });

    it('should stack hills and forest bonuses (+50%)', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0.5, // Hills + Forest
      };
      const result = calculateCombat(context);

      // Effective defender strength = 8 * (1 + 0.5) = 12
      // Ratio = 8/12 = 0.667
      // Defender damage = 30 * 0.667 = 20
      // Attacker damage = 30 / 0.667 * 0.5 = 22.5 ≈ 23
      expect(result.defenderDamage).toBe(20);
      expect(result.attackerDamage).toBe(23);
    });
  });

  describe('calculateCombat - damaged units', () => {
    it('should reduce effectiveness when attacker is at 50% health', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 50,
        defenderHealth: 100,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // Effective attacker = 8 * 0.5 = 4
      // Effective defender = 8 * 1.0 = 8
      // Ratio = 4/8 = 0.5
      // Defender damage = 30 * 0.5 = 15
      // Attacker damage = 30 / 0.5 * 0.5 = 30
      expect(result.defenderDamage).toBe(15);
      expect(result.attackerDamage).toBe(30);
    });

    it('should reduce effectiveness when defender is at 50% health', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 50,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // Effective attacker = 8 * 1.0 = 8
      // Effective defender = 8 * 0.5 = 4
      // Ratio = 8/4 = 2
      // Defender damage = 30 * 2 = 60, capped at 50
      // Attacker damage = 30 / 2 * 0.5 = 7.5 ≈ 8
      expect(result.defenderDamage).toBe(50); // Capped at current health
      expect(result.attackerDamage).toBe(8);
      expect(result.defenderSurvives).toBe(false);
    });

    it('should handle both units damaged at 50% health', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 50,
        defenderHealth: 50,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // Both at half health, effective strengths are equal
      // Ratio = 1
      // Defender damage = 30
      // Attacker damage = 15
      expect(result.defenderDamage).toBe(30);
      expect(result.attackerDamage).toBe(15);
    });
  });

  describe('calculateCombat - zero-strength defender (civilian)', () => {
    it('should instant kill zero-strength defender with no counter-damage', () => {
      const context: CombatContext = {
        attackerStrength: 8, // Warrior
        defenderStrength: 0, // Settler
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      expect(result.defenderDamage).toBe(100); // Instant death
      expect(result.attackerDamage).toBe(0); // No counter-damage
      expect(result.attackerSurvives).toBe(true);
      expect(result.defenderSurvives).toBe(false);
    });

    it('should instant kill even with terrain bonus', () => {
      const context: CombatContext = {
        attackerStrength: 5, // Scout
        defenderStrength: 0, // Settler
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0.5, // Hills + Forest
      };
      const result = calculateCombat(context);

      expect(result.defenderDamage).toBe(100);
      expect(result.attackerDamage).toBe(0);
      expect(result.defenderSurvives).toBe(false);
    });
  });

  describe('calculateCombat - near-death scenarios', () => {
    it('should cap damage at current health', () => {
      const context: CombatContext = {
        attackerStrength: 8,
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 10, // Near death
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      // Ratio with damaged defender is very high
      // But damage should cap at 10
      expect(result.defenderDamage).toBeLessThanOrEqual(10);
      expect(result.defenderSurvives).toBe(false);
    });

    it('should ensure minimum 1 damage', () => {
      const context: CombatContext = {
        attackerStrength: 1,
        defenderStrength: 100, // Hypothetical super unit
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0.5,
      };
      const result = calculateCombat(context);

      // Even with massive disadvantage, should deal at least 1 damage
      expect(result.defenderDamage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateCombat - zero-strength attacker', () => {
    it('should deal no damage and receive no counter-damage', () => {
      const context: CombatContext = {
        attackerStrength: 0, // Settler (shouldn't attack in practice)
        defenderStrength: 8,
        attackerHealth: 100,
        defenderHealth: 100,
        defenseModifier: 0,
      };
      const result = calculateCombat(context);

      expect(result.defenderDamage).toBe(0);
      expect(result.attackerDamage).toBe(0);
      expect(result.attackerSurvives).toBe(true);
      expect(result.defenderSurvives).toBe(true);
    });
  });

  describe('calculateCombat - damage values are integers', () => {
    it('should always return integer damage values', () => {
      // Test various ratios that would produce fractional results
      const testCases: CombatContext[] = [
        {
          attackerStrength: 7,
          defenderStrength: 3,
          attackerHealth: 100,
          defenderHealth: 100,
          defenseModifier: 0,
        },
        {
          attackerStrength: 5,
          defenderStrength: 7,
          attackerHealth: 100,
          defenderHealth: 100,
          defenseModifier: 0.25,
        },
        {
          attackerStrength: 8,
          defenderStrength: 5,
          attackerHealth: 73,
          defenderHealth: 41,
          defenseModifier: 0.25,
        },
      ];

      for (const context of testCases) {
        const result = calculateCombat(context);
        expect(Number.isInteger(result.attackerDamage)).toBe(true);
        expect(Number.isInteger(result.defenderDamage)).toBe(true);
      }
    });

    it('should always return non-negative damage values', () => {
      const context: CombatContext = {
        attackerStrength: 1,
        defenderStrength: 100,
        attackerHealth: 1,
        defenderHealth: 100,
        defenseModifier: 0.5,
      };
      const result = calculateCombat(context);

      expect(result.attackerDamage).toBeGreaterThanOrEqual(0);
      expect(result.defenderDamage).toBeGreaterThanOrEqual(0);
    });
  });
});
