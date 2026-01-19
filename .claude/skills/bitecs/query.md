---
name: typescript-bitecs-query
description: Creates bitECS query patterns with filters and iteration. Use when the user asks about queries, finding entities, filtering components, accessing entity data, or ECS lookups.
user-invocable: true
---

# Create bitECS Query

## Purpose
Generate bitECS query patterns for accessing and filtering entities.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask what entities/components to query.

## Instructions

1. Use defineQuery at module level (cached, not inside functions)
2. Include required components in array
3. Use Not() for exclusion filters
4. Use hasComponent() for optional component checks
5. Use enterQuery/exitQuery for lifecycle detection
6. Show iteration pattern with component access

## Output Format

```typescript
import { defineQuery, enterQuery, exitQuery, Not, hasComponent, World } from 'bitecs';
import { Position, Terrain, Selected, Feature } from './components';

// Basic query - entities with Position component
const positionQuery = defineQuery([Position]);

// Multiple components - entities with all listed components
const tileQuery = defineQuery([Position, Terrain, Yields]);

// Exclusion filter - entities WITHOUT a component
const unselectedQuery = defineQuery([Position, Not(Selected)]);

// Lifecycle queries - detect when entities match/unmatch
const enteredTiles = enterQuery(tileQuery);
const exitedTiles = exitQuery(tileQuery);
```

## Iteration Patterns

```typescript
// Basic iteration
for (const eid of positionQuery(world)) {
  const q = Position.q[eid];
  const r = Position.r[eid];
}

// With optional component check
for (const eid of tileQuery(world)) {
  const terrain = Terrain.type[eid];

  // Check for optional component
  if (hasComponent(world, Feature, eid)) {
    const featureType = Feature.type[eid];
    // Handle feature...
  }
}

// Lifecycle - newly matched entities
for (const eid of enteredTiles(world)) {
  // Entity just gained all required components
  initializeTileSprite(eid);
}

// Lifecycle - entities that no longer match
for (const eid of exitedTiles(world)) {
  // Entity lost a required component or was removed
  cleanupTileSprite(eid);
}
```

## Query Count and Existence

```typescript
// Get all matching entity IDs as array
const entities = tileQuery(world);

// Count matching entities
const count = tileQuery(world).length;

// Check if any entities match
const hasEntities = tileQuery(world).length > 0;

// Find specific entity (manual search)
function findTileAt(world: World, targetQ: number, targetR: number): number | null {
  for (const eid of tileQuery(world)) {
    if (Position.q[eid] === targetQ && Position.r[eid] === targetR) {
      return eid;
    }
  }
  return null;
}
```

## Common Filter Combinations

| Pattern | Use Case |
|---------|----------|
| `defineQuery([A, B])` | Entities with both A and B |
| `defineQuery([A, Not(B)])` | Entities with A but not B |
| `hasComponent(world, C, eid)` | Runtime check for optional C |
| `enterQuery(q)` | Entities that just started matching |
| `exitQuery(q)` | Entities that stopped matching |

## Performance Notes

- Define queries at module scope, not inside functions
- Queries are cached and reused automatically
- enterQuery/exitQuery track changes between calls
- hasComponent() is O(1) lookup

## If unclear
- Define queries outside of functions for caching
- Use Not() sparingly (exclusion can be costly)
- Use hasComponent() for truly optional components
