---
name: typescript-game-module
description: Creates a game module with init function and exports. Use when the user asks to create, generate, or add a module, feature, subsystem, or game domain.
user-invocable: true
---

# Create Game Module

## Purpose
Generate a TypeScript module pattern for organizing game features with initialization.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the module name and purpose.

## Instructions

1. Parse the module name (use kebab-case for directory, PascalCase for types)
2. Create module directory with index.ts for exports
3. Define configuration interface for module setup
4. Create init function that returns systems and resources
5. Export all public types, components, and functions
6. Keep internal implementation details private

## Output Format

```typescript
// hex/index.ts - Module entry point and exports

import { World } from 'bitecs';
import { HexGridLayout } from './HexGridLayout';
import { hexRenderSystem } from './systems/hexRenderSystem';
import { hexInteractionSystem } from './systems/hexInteractionSystem';

// Configuration interface
export interface HexModuleConfig {
  hexSize: number;
  orientation: 'pointy' | 'flat';
}

// Module resources (created during init)
export interface HexModuleResources {
  layout: HexGridLayout;
}

// Module systems (registered with game loop)
export type HexModuleSystems = [(world: World) => World, (world: World) => World];

/**
 * Initialize the hex module.
 * Call during game setup to get systems and resources.
 */
export function initHexModule(
  world: World,
  config: HexModuleConfig
): { systems: HexModuleSystems; resources: HexModuleResources } {
  const layout = new HexGridLayout(config.hexSize, config.orientation);

  return {
    systems: [hexRenderSystem, hexInteractionSystem],
    resources: { layout },
  };
}

// Re-export public types
export { HexGridLayout } from './HexGridLayout';
export { TilePosition } from './TilePosition';
export type { Hex } from 'honeycomb-grid';
```

## Module Directory Structure

```
src/hex/
  index.ts           # Public exports and init
  HexGridLayout.ts   # Core class
  TilePosition.ts    # Data types
  components.ts      # ECS components
  systems/
    hexRenderSystem.ts
    hexInteractionSystem.ts
```

## Integration Pattern

```typescript
// main.ts - Game initialization
import { createWorld } from 'bitecs';
import { initHexModule } from './hex';
import { initMapModule } from './map';
import { initRenderModule } from './render';

const world = createWorld();

// Initialize modules with dependencies
const hexModule = initHexModule(world, { hexSize: 32, orientation: 'pointy' });
const mapModule = initMapModule(world, { width: 80, height: 50 });
const renderModule = initRenderModule(world, { canvas: document.getElementById('game') });

// Collect all systems
const systems = [
  ...hexModule.systems,
  ...mapModule.systems,
  ...renderModule.systems,
];

// Collect all resources
const resources = {
  ...hexModule.resources,
  ...mapModule.resources,
  ...renderModule.resources,
};

// Game loop
function gameLoop() {
  for (const system of systems) {
    system(world);
  }
  requestAnimationFrame(gameLoop);
}
```

## Common Patterns

- **Feature Module**: Encapsulates a game feature (hex grid, map, units)
- **Service Module**: Provides utilities (events, state, assets)
- **Domain Module**: Groups related types and logic (tiles, terrain)

## If unclear
- Each module should have one clear responsibility
- Export only what other modules need
- Keep init function pure (returns data, no side effects)
