/**
 * Unit types and their static data.
 * Defines the available unit types and their base stats.
 */

export enum UnitType {
  Warrior = 0,
  Scout = 1,
  Settler = 2,
}

export interface UnitTypeData {
  name: string;
  movement: number;
  strength: number;
  rangedStrength: number;
  range: number;
  cost: number;
}

export const UNIT_TYPE_DATA: Record<UnitType, UnitTypeData> = {
  [UnitType.Warrior]: {
    name: 'Warrior',
    movement: 2,
    strength: 8,
    rangedStrength: 0,
    range: 0,
    cost: 40,
  },
  [UnitType.Scout]: {
    name: 'Scout',
    movement: 3,
    strength: 5,
    rangedStrength: 0,
    range: 0,
    cost: 25,
  },
  [UnitType.Settler]: {
    name: 'Settler',
    movement: 2,
    strength: 0,
    rangedStrength: 0,
    range: 0,
    cost: 80,
  },
};

/**
 * Get the display name for a unit type.
 */
export function getUnitName(type: UnitType): string {
  return UNIT_TYPE_DATA[type].name;
}

/**
 * Get the letter abbreviation for a unit type (first letter).
 */
export function getUnitLetter(type: UnitType): string {
  return UNIT_TYPE_DATA[type].name.charAt(0);
}

/**
 * Get the base movement points for a unit type.
 */
export function getUnitMovement(type: UnitType): number {
  return UNIT_TYPE_DATA[type].movement;
}

/**
 * Get complete data for a unit type.
 */
export function getUnitTypeData(type: UnitType): UnitTypeData {
  return UNIT_TYPE_DATA[type];
}
