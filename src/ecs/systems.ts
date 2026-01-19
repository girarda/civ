import { defineQuery, enterQuery, exitQuery, IWorld } from 'bitecs';
import { Position, TerrainComponent, FeatureComponent, YieldsComponent } from './world';

// Query for all tiles (entities with Position and Terrain)
export const tileQuery = defineQuery([Position, TerrainComponent]);
export const tileEnterQuery = enterQuery(tileQuery);
export const tileExitQuery = exitQuery(tileQuery);

// Query for tiles with features
export const featureQuery = defineQuery([Position, TerrainComponent, FeatureComponent]);

// Query for tiles with yields
export const yieldsQuery = defineQuery([Position, YieldsComponent]);

/**
 * System to process newly added tiles.
 * Can be extended to initialize tile graphics or other setup.
 */
export function tileAddedSystem(world: IWorld): IWorld {
  // Process newly added tiles - currently a no-op placeholder
  // Could be used for initialization, debugging, or triggering render updates
  tileEnterQuery(world);
  return world;
}

/**
 * System to process removed tiles.
 * Can be extended to clean up tile graphics or other resources.
 */
export function tileRemovedSystem(world: IWorld): IWorld {
  // Process removed tiles - currently a no-op placeholder
  // Could be used for cleanup of graphics or other resources
  tileExitQuery(world);
  return world;
}

/**
 * Get all tile entity IDs in the world.
 */
export function getAllTiles(world: IWorld): number[] {
  return tileQuery(world);
}

/**
 * Get all feature tiles in the world.
 */
export function getFeatureTiles(world: IWorld): number[] {
  return featureQuery(world);
}

/**
 * System pipeline runner.
 * Runs all registered systems in order.
 */
export function runSystems(world: IWorld, systems: ((world: IWorld) => IWorld)[]): IWorld {
  for (const system of systems) {
    world = system(world);
  }
  return world;
}
