# bitECS Skills

Skills for generating TypeScript ECS patterns using bitECS, honeycomb-grid, and PixiJS.

## Available Skills

| Skill | Description |
|-------|-------------|
| component | Create bitECS components with `defineComponent` and TypeScript types |
| system | Create system functions with queries and iteration patterns |
| query | Create query patterns with filters (`Not`, `hasComponent`, enter/exit) |
| module | Create game modules with init patterns and exports |
| factory | Create entity factory functions with `addEntity`/`addComponent` |
| store | Create game state storage patterns (singleton, Map, class-based) |
| event | Create event bus for decoupled pub-sub communication |
| state | Create game state machines with transitions and handlers |

## Usage

These skills are automatically triggered by keywords in prompts:
- "create a component" triggers component skill
- "create a system" triggers system skill
- "create a factory" triggers factory skill
- etc.

Invoke explicitly with `/skill bitecs/component`.

## Tech Stack

- **bitECS** - Entity Component System with Structure of Arrays (SoA) for performance
- **honeycomb-grid** - Hex grid mathematics and coordinate systems
- **PixiJS 8.x** - WebGL 2D rendering
- **TypeScript** - Type-safe JavaScript with strict mode

## Key Patterns

### Component Definition
```typescript
import { defineComponent, Types } from 'bitecs';

export const Position = defineComponent({
  q: Types.i32,
  r: Types.i32,
});
```

### System Pattern
```typescript
import { defineQuery, World } from 'bitecs';

const tileQuery = defineQuery([Position, Terrain]);

export function renderSystem(world: World): World {
  for (const eid of tileQuery(world)) {
    // Process entities
  }
  return world;
}
```

### Entity Factory
```typescript
import { addEntity, addComponent, World } from 'bitecs';

export function createTile(world: World, props: TileProps): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  Position.q[eid] = props.q;
  Position.r[eid] = props.r;
  return eid;
}
```

## Version Notes

These skills target:
- bitECS 0.3.40+
- honeycomb-grid 4.x
- PixiJS 8.x
- TypeScript 5.x with strict mode
