---
name: typescript-bitecs-component
description: Creates a new bitECS component with defineComponent and TypeScript types. Use when the user asks to create, generate, or add a component, entity data, or game object property.
user-invocable: true
---

# Create bitECS Component

## Purpose
Generate a well-structured bitECS component with TypeScript type safety.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the component name and purpose.

## Instructions

1. Parse the component name (convert to PascalCase)
2. Determine data types needed:
   - `Types.i8/i16/i32` for signed integers
   - `Types.ui8/ui16/ui32` for unsigned integers
   - `Types.f32/f64` for floats
   - `Types.eid` for entity references
3. For enums, store as number (ui8) and create separate TypeScript enum
4. For marker components, use empty defineComponent()
5. Generate TypeScript interface alongside for external code

## Output Format

```typescript
import { defineComponent, Types } from 'bitecs';

// Data component with multiple fields
export const Position = defineComponent({
  q: Types.i32,  // Hex coordinate q
  r: Types.i32,  // Hex coordinate r
});

// Marker component (tag) - no data, just for filtering
export const Selected = defineComponent();

// Component with enum (store as number)
export enum TerrainType {
  Grassland = 0,
  Plains = 1,
  Desert = 2,
  // ...
}

export const Terrain = defineComponent({
  type: Types.ui8,  // TerrainType enum index
});

// TypeScript interface for external code
export interface PositionData {
  q: number;
  r: number;
}

// Helper to read component data
export function getPosition(eid: number): PositionData {
  return {
    q: Position.q[eid],
    r: Position.r[eid],
  };
}
```

## Array Access Pattern

bitECS uses Structure of Arrays (SoA) for performance:

```typescript
// Setting values
Position.q[eid] = 5;
Position.r[eid] = -3;

// Reading values
const q = Position.q[eid];
const r = Position.r[eid];

// In systems
for (const eid of query(world)) {
  const terrain = Terrain.type[eid] as TerrainType;
  // ...
}
```

## Common Patterns

- **Marker Component**: Empty `defineComponent()` for tagging entities
- **Data Component**: Fields for entity state with typed arrays
- **Enum Component**: Store enum index as ui8, define TypeScript enum separately
- **Reference Component**: Use `Types.eid` for entity references

## If unclear
- Default to `Types.f32` for game values (coordinates, health, etc.)
- Use `Types.ui8` for enums (supports up to 256 values)
- Ask at most 1 question if component purpose is ambiguous
