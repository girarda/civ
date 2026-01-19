---
name: typescript-bitecs-system
description: Creates a new bitECS system function with queries and iteration patterns. Use when the user asks to create, generate, or add a system, behavior, update logic, or processing function.
user-invocable: true
---

# Create bitECS System

## Purpose
Generate a well-structured bitECS system following project conventions.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the system purpose.

## Instructions

1. Parse the system name (convert to camelCase with System suffix)
2. Determine required queries using defineQuery
3. Use enterQuery/exitQuery for lifecycle events (entity added/removed)
4. Accept World as parameter, return World for chaining
5. Access component data via array syntax: Component.field[eid]
6. Add JSDoc comments explaining system purpose

## Output Format

```typescript
import { defineQuery, enterQuery, exitQuery, World } from 'bitecs';
import { Position, Terrain, Yields } from './components';

// Define queries at module level (cached, reused)
const tileQuery = defineQuery([Position, Terrain]);
const enteredTiles = enterQuery(tileQuery);
const exitedTiles = exitQuery(tileQuery);

/**
 * Renders tiles on the map.
 * Handles tile creation, updates, and removal.
 */
export function renderTilesSystem(world: World): World {
  // Handle newly added entities
  for (const eid of enteredTiles(world)) {
    const q = Position.q[eid];
    const r = Position.r[eid];
    // Create sprite, add to container, etc.
  }

  // Handle removed entities
  for (const eid of exitedTiles(world)) {
    // Remove sprite, cleanup resources
  }

  // Process all matching entities each frame
  for (const eid of tileQuery(world)) {
    const q = Position.q[eid];
    const r = Position.r[eid];
    const terrain = Terrain.type[eid];
    // Update rendering, animations, etc.
  }

  return world;
}
```

## Game Loop Integration

```typescript
import { createWorld, World } from 'bitecs';

const world = createWorld();

// System execution order matters - run in sequence
function gameLoop(delta: number) {
  inputSystem(world);
  movementSystem(world);
  renderSystem(world);
}

// Or with pipeline helper
const systems = [inputSystem, movementSystem, renderSystem];

function runSystems(world: World, systems: Array<(w: World) => World>) {
  return systems.reduce((w, system) => system(w), world);
}
```

## Common Patterns

- **Update System**: Processes entities every frame
- **Startup System**: Runs once at initialization
- **Event-driven System**: Responds to game events
- **Conditional System**: Only runs based on game state

```typescript
// Conditional system execution
function gameLoop(world: World, state: GameState) {
  if (state === GameState.Playing) {
    inputSystem(world);
    movementSystem(world);
  }
  renderSystem(world);  // Always render
}
```

## If unclear
- Define queries at module scope for performance
- Return world from every system for chaining
- Use enterQuery/exitQuery for resource management
