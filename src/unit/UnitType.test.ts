import { describe, it, expect } from 'vitest';
import {
  UnitType,
  UNIT_TYPE_DATA,
  getUnitName,
  getUnitLetter,
  getUnitMovement,
  getUnitTypeData,
} from './UnitType';

describe('UnitType', () => {
  describe('enum values', () => {
    it('should have 3 unit types', () => {
      expect(
        Object.keys(UnitType).filter(
          (k) => typeof UnitType[k as keyof typeof UnitType] === 'number'
        )
      ).toHaveLength(3);
    });

    it('should have numeric values for units', () => {
      expect(UnitType.Warrior).toBe(0);
      expect(UnitType.Scout).toBe(1);
      expect(UnitType.Settler).toBe(2);
    });
  });

  describe('UNIT_TYPE_DATA', () => {
    it('should have data for all unit types', () => {
      expect(UNIT_TYPE_DATA[UnitType.Warrior]).toBeDefined();
      expect(UNIT_TYPE_DATA[UnitType.Scout]).toBeDefined();
      expect(UNIT_TYPE_DATA[UnitType.Settler]).toBeDefined();
    });

    it('should have correct data for Warrior', () => {
      const data = UNIT_TYPE_DATA[UnitType.Warrior];
      expect(data.name).toBe('Warrior');
      expect(data.movement).toBe(2);
      expect(data.strength).toBe(8);
      expect(data.rangedStrength).toBe(0);
      expect(data.range).toBe(0);
      expect(data.cost).toBe(40);
    });

    it('should have correct data for Scout', () => {
      const data = UNIT_TYPE_DATA[UnitType.Scout];
      expect(data.name).toBe('Scout');
      expect(data.movement).toBe(3);
      expect(data.strength).toBe(5);
      expect(data.cost).toBe(25);
    });

    it('should have correct data for Settler', () => {
      const data = UNIT_TYPE_DATA[UnitType.Settler];
      expect(data.name).toBe('Settler');
      expect(data.movement).toBe(2);
      expect(data.strength).toBe(0);
      expect(data.cost).toBe(80);
    });
  });

  describe('getUnitName', () => {
    it('should return correct name for each unit type', () => {
      expect(getUnitName(UnitType.Warrior)).toBe('Warrior');
      expect(getUnitName(UnitType.Scout)).toBe('Scout');
      expect(getUnitName(UnitType.Settler)).toBe('Settler');
    });
  });

  describe('getUnitLetter', () => {
    it('should return first letter of unit name', () => {
      expect(getUnitLetter(UnitType.Warrior)).toBe('W');
      expect(getUnitLetter(UnitType.Scout)).toBe('S');
      expect(getUnitLetter(UnitType.Settler)).toBe('S');
    });
  });

  describe('getUnitMovement', () => {
    it('should return correct movement for each unit type', () => {
      expect(getUnitMovement(UnitType.Warrior)).toBe(2);
      expect(getUnitMovement(UnitType.Scout)).toBe(3);
      expect(getUnitMovement(UnitType.Settler)).toBe(2);
    });
  });

  describe('getUnitTypeData', () => {
    it('should return complete unit data', () => {
      const data = getUnitTypeData(UnitType.Warrior);
      expect(data).toEqual(UNIT_TYPE_DATA[UnitType.Warrior]);
    });
  });
});
