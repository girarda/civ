import { describe, it, expect } from 'vitest';
import {
  BuildableType,
  buildableToUnitType,
  getBuildableCost,
  getBuildableName,
  getAvailableBuildables,
} from './Buildable';
import { UnitType, UNIT_TYPE_DATA } from '../unit/UnitType';

describe('Buildable', () => {
  describe('buildableToUnitType', () => {
    it('should return null for None', () => {
      expect(buildableToUnitType(BuildableType.None)).toBe(null);
    });

    it('should return Warrior for Warrior buildable', () => {
      expect(buildableToUnitType(BuildableType.Warrior)).toBe(UnitType.Warrior);
    });

    it('should return Scout for Scout buildable', () => {
      expect(buildableToUnitType(BuildableType.Scout)).toBe(UnitType.Scout);
    });

    it('should return Settler for Settler buildable', () => {
      expect(buildableToUnitType(BuildableType.Settler)).toBe(UnitType.Settler);
    });
  });

  describe('getBuildableCost', () => {
    it('should return 0 for None', () => {
      expect(getBuildableCost(BuildableType.None)).toBe(0);
    });

    it('should return Warrior cost for Warrior buildable', () => {
      expect(getBuildableCost(BuildableType.Warrior)).toBe(UNIT_TYPE_DATA[UnitType.Warrior].cost);
    });

    it('should return Scout cost for Scout buildable', () => {
      expect(getBuildableCost(BuildableType.Scout)).toBe(UNIT_TYPE_DATA[UnitType.Scout].cost);
    });

    it('should return Settler cost for Settler buildable', () => {
      expect(getBuildableCost(BuildableType.Settler)).toBe(UNIT_TYPE_DATA[UnitType.Settler].cost);
    });
  });

  describe('getBuildableName', () => {
    it('should return "None" for None', () => {
      expect(getBuildableName(BuildableType.None)).toBe('None');
    });

    it('should return "Warrior" for Warrior', () => {
      expect(getBuildableName(BuildableType.Warrior)).toBe('Warrior');
    });

    it('should return "Scout" for Scout', () => {
      expect(getBuildableName(BuildableType.Scout)).toBe('Scout');
    });

    it('should return "Settler" for Settler', () => {
      expect(getBuildableName(BuildableType.Settler)).toBe('Settler');
    });
  });

  describe('getAvailableBuildables', () => {
    it('should return array of buildable types', () => {
      const buildables = getAvailableBuildables();
      expect(buildables).toContain(BuildableType.Warrior);
      expect(buildables).toContain(BuildableType.Scout);
      expect(buildables).toContain(BuildableType.Settler);
    });

    it('should not include None', () => {
      const buildables = getAvailableBuildables();
      expect(buildables).not.toContain(BuildableType.None);
    });

    it('should return 3 items', () => {
      expect(getAvailableBuildables().length).toBe(3);
    });
  });
});
