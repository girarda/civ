---
name: typescript-entity-factory
description: Creates entity factory functions with addEntity and addComponent. Use when the user asks to create, generate, or add a factory, entity creator, spawner, or prefab.
user-invocable: true
---

# Create Entity Factory

## Purpose
Generate factory functions for creating entities with predefined component sets.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the entity type and components.

## Instructions

1. Parse the entity name (PascalCase for types, camelCase for function)
2. Define props interface for required and optional parameters
3. Use addEntity() to create new entity
4. Use addComponent() to attach each component
5. Set component values via array access
6. Return entity ID for further manipulation
7. Add JSDoc with usage example

## Output Format

```typescript
import { addEntity, addComponent, World } from 'bitecs';
import { Position, Terrain, Yields, Feature, RiverEdges } from './components';
import { TerrainType, FeatureType } from './types';

/**
 * Properties for creating a tile entity.
 */
export interface TileProps {
  // Required
  q: number;
  r: number;
  terrain: TerrainType;

  // Optional
  feature?: FeatureType;
  riverEdges?: number;  // Bitmask
}

/**
 * Creates a new tile entity with the given properties.
 *
 * @example
 * const tileId = createTile(world, {
 *   q: 0, r: 0,
 *   terrain: TerrainType.Grassland,
 *   feature: FeatureType.Forest,
 * });
 */
export function createTile(world: World, props: TileProps): number {
  const eid = addEntity(world);

  // Required components
  addComponent(world, Position, eid);
  Position.q[eid] = props.q;
  Position.r[eid] = props.r;

  addComponent(world, Terrain, eid);
  Terrain.type[eid] = props.terrain;

  // Yields calculated from terrain
  addComponent(world, Yields, eid);
  const baseYields = getTerrainYields(props.terrain);
  Yields.food[eid] = baseYields.food;
  Yields.production[eid] = baseYields.production;
  Yields.gold[eid] = baseYields.gold;

  // Optional feature
  if (props.feature !== undefined) {
    addComponent(world, Feature, eid);
    Feature.type[eid] = props.feature;

    // Modify yields based on feature
    const featureYields = getFeatureYields(props.feature);
    Yields.food[eid] += featureYields.food;
    Yields.production[eid] += featureYields.production;
  }

  // Optional river edges
  if (props.riverEdges !== undefined && props.riverEdges > 0) {
    addComponent(world, RiverEdges, eid);
    RiverEdges.mask[eid] = props.riverEdges;
  }

  return eid;
}
```

## Batch Creation Pattern

```typescript
/**
 * Creates multiple tiles efficiently.
 */
export function createTiles(
  world: World,
  tileDataArray: TileProps[]
): number[] {
  return tileDataArray.map(props => createTile(world, props));
}

// Usage with map generator
const mapData = generateMapData(config);
const tileEntities = createTiles(world, mapData);
```

## Factory with Defaults

```typescript
/**
 * Default tile properties.
 */
const DEFAULT_TILE_PROPS: Partial<TileProps> = {
  terrain: TerrainType.Grassland,
};

/**
 * Creates a tile with sensible defaults.
 */
export function createTileWithDefaults(
  world: World,
  props: Partial<TileProps> & { q: number; r: number }
): number {
  return createTile(world, {
    ...DEFAULT_TILE_PROPS,
    ...props,
  } as TileProps);
}
```

## Entity Removal

```typescript
import { removeEntity, removeComponent } from 'bitecs';

/**
 * Removes a tile entity and cleans up resources.
 */
export function removeTile(world: World, eid: number): void {
  // Optional: cleanup before removal (e.g., notify systems)
  removeEntity(world, eid);
}

/**
 * Strips a feature from a tile without removing the tile.
 */
export function removeFeature(world: World, eid: number): void {
  removeComponent(world, Feature, eid);
  // Recalculate yields...
}
```

## Common Patterns

- **Simple Factory**: Creates entity with fixed component set
- **Configurable Factory**: Uses props interface for flexibility
- **Composite Factory**: Combines multiple factories (unit + equipment)
- **Clone Factory**: Duplicates an existing entity

## If unclear
- Always return entity ID for reference
- Use TypeScript interfaces for props
- Include optional components via conditional logic
