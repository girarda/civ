/**
 * Combat terrain and feature modifiers.
 * Provides defense bonus calculations based on terrain and features.
 */

import { Terrain, TERRAIN_DATA } from '../tile/Terrain';
import { TileFeature } from '../tile/TileFeature';
import { GeneratedTile } from '../map/MapGenerator';

/** Defense bonus for defending on hills */
const HILL_DEFENSE_BONUS = 0.25;

/** Defense bonus for defending in forest/jungle */
const FOREST_JUNGLE_DEFENSE_BONUS = 0.25;

/**
 * Get terrain defense bonus.
 * Hills provide +25% defense bonus.
 */
export function getTerrainDefenseBonus(terrain: Terrain): number {
  const data = TERRAIN_DATA[terrain];
  return data.isHill ? HILL_DEFENSE_BONUS : 0;
}

/**
 * Get feature defense bonus.
 * Forest and Jungle provide +25% defense bonus.
 */
export function getFeatureDefenseBonus(feature: TileFeature | null): number {
  if (feature === TileFeature.Forest || feature === TileFeature.Jungle) {
    return FOREST_JUNGLE_DEFENSE_BONUS;
  }
  return 0;
}

/**
 * Get total defense modifier for a tile.
 * Combines terrain and feature bonuses (they stack).
 */
export function getTotalDefenseModifier(tile: GeneratedTile): number {
  const terrainBonus = getTerrainDefenseBonus(tile.terrain);
  const featureBonus = tile.feature ? getFeatureDefenseBonus(tile.feature) : 0;
  return terrainBonus + featureBonus;
}

/**
 * Get a list of active defense modifier names for display.
 */
export function getDefenseModifierNames(tile: GeneratedTile): string[] {
  const modifiers: string[] = [];

  const terrainBonus = getTerrainDefenseBonus(tile.terrain);
  if (terrainBonus > 0) {
    modifiers.push(`Hills +${Math.round(terrainBonus * 100)}%`);
  }

  if (tile.feature) {
    const featureBonus = getFeatureDefenseBonus(tile.feature);
    if (featureBonus > 0) {
      modifiers.push(`${tile.feature} +${Math.round(featureBonus * 100)}%`);
    }
  }

  return modifiers;
}
