/**
 * Buildable item definitions for city production.
 * For MVP, only unit types are buildable.
 */

import { UnitType, UNIT_TYPE_DATA } from '../unit/UnitType';

/**
 * Types of items that can be produced in cities.
 * For MVP, these map directly to UnitType values.
 * Value 0 means "nothing" (no production selected).
 */
export enum BuildableType {
  None = 0,
  Warrior = 1,
  Scout = 2,
  Settler = 3,
}

/**
 * Map BuildableType to UnitType for unit production.
 */
export function buildableToUnitType(buildable: BuildableType): UnitType | null {
  switch (buildable) {
    case BuildableType.Warrior:
      return UnitType.Warrior;
    case BuildableType.Scout:
      return UnitType.Scout;
    case BuildableType.Settler:
      return UnitType.Settler;
    default:
      return null;
  }
}

/**
 * Get the production cost for a buildable item.
 */
export function getBuildableCost(buildable: BuildableType): number {
  const unitType = buildableToUnitType(buildable);
  if (unitType === null) return 0;
  return UNIT_TYPE_DATA[unitType].cost;
}

/**
 * Get the display name for a buildable item.
 */
export function getBuildableName(buildable: BuildableType): string {
  switch (buildable) {
    case BuildableType.None:
      return 'None';
    case BuildableType.Warrior:
      return 'Warrior';
    case BuildableType.Scout:
      return 'Scout';
    case BuildableType.Settler:
      return 'Settler';
  }
}

/**
 * Get all available buildable items (excluding None).
 */
export function getAvailableBuildables(): BuildableType[] {
  return [BuildableType.Warrior, BuildableType.Scout, BuildableType.Settler];
}
