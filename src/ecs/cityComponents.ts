/**
 * City-related ECS components for bitECS.
 */

import { defineComponent, Types } from 'bitecs';

/**
 * Core city component - identifies an entity as a city.
 * nameIndex references the city's name in the names array.
 */
export const CityComponent = defineComponent({
  nameIndex: Types.ui16,
});

/**
 * Population component - tracks city population and food growth.
 */
export const PopulationComponent = defineComponent({
  current: Types.ui8, // Current population count
  foodStockpile: Types.i32, // Accumulated food surplus toward growth
  foodForGrowth: Types.i32, // Food needed for next population growth
});

/**
 * Production component - tracks what the city is building.
 */
export const ProductionComponent = defineComponent({
  currentItem: Types.ui16, // BuildableType enum value (0 = nothing)
  progress: Types.i32, // Accumulated production progress
  cost: Types.i32, // Total production cost of current item
});
