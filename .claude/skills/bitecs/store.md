---
name: typescript-game-store
description: Creates game state storage patterns for resources and configuration. Use when the user asks to create, generate, or add a store, resource, global state, config, or shared data.
user-invocable: true
---

# Create Game Store

## Purpose
Generate state management patterns for global game data outside the ECS.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the store name and what data it holds.

## Instructions

1. Parse the store/resource name
2. Choose appropriate pattern:
   - Module singleton for simple state
   - World-keyed Map for per-world resources
   - Class instance for complex state
3. Include TypeScript interface for type safety
4. Add getter/setter functions with validation
5. Consider initialization and reset patterns

## Output Format

### Option 1: Module Singleton (Simple State)

```typescript
// stores/mapConfig.ts

export interface MapConfig {
  width: number;
  height: number;
  seed: number;
  waterLevel: number;
  temperatureRange: [number, number];
}

let mapConfig: MapConfig | null = null;

/**
 * Gets the current map configuration.
 * @throws Error if not initialized
 */
export function getMapConfig(): MapConfig {
  if (!mapConfig) {
    throw new Error('MapConfig not initialized. Call setMapConfig first.');
  }
  return mapConfig;
}

/**
 * Sets the map configuration.
 * Should be called during game setup.
 */
export function setMapConfig(config: MapConfig): void {
  mapConfig = Object.freeze({ ...config });  // Immutable
}

/**
 * Resets map configuration (for cleanup/testing).
 */
export function resetMapConfig(): void {
  mapConfig = null;
}
```

### Option 2: World-Keyed Map (Multiple Worlds)

```typescript
// stores/worldResources.ts

import { World } from 'bitecs';
import { HexGridLayout } from '../hex/HexGridLayout';
import { EventBus } from './eventBus';

export interface GameResources {
  layout: HexGridLayout;
  events: EventBus;
  deltaTime: number;
}

const worldResources = new Map<World, GameResources>();

/**
 * Initializes resources for a world.
 */
export function initResources(world: World, resources: GameResources): void {
  if (worldResources.has(world)) {
    throw new Error('Resources already initialized for this world');
  }
  worldResources.set(world, resources);
}

/**
 * Gets resources for a world.
 * @throws Error if not initialized
 */
export function getResources(world: World): GameResources {
  const resources = worldResources.get(world);
  if (!resources) {
    throw new Error('Resources not initialized for world');
  }
  return resources;
}

/**
 * Updates delta time each frame.
 */
export function updateDeltaTime(world: World, dt: number): void {
  const resources = getResources(world);
  resources.deltaTime = dt;
}

/**
 * Cleans up resources for a world.
 */
export function destroyResources(world: World): void {
  worldResources.delete(world);
}
```

### Option 3: Class-Based Store (Complex State)

```typescript
// stores/GameStore.ts

import { World } from 'bitecs';

export interface GameState {
  turn: number;
  phase: 'player' | 'ai' | 'environment';
  selectedEntity: number | null;
  hoveredTile: { q: number; r: number } | null;
}

export class GameStore {
  private state: GameState;
  private listeners = new Set<(state: GameState) => void>();

  constructor() {
    this.state = {
      turn: 1,
      phase: 'player',
      selectedEntity: null,
      hoveredTile: null,
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Updates state and notifies listeners.
   */
  setState(partial: Partial<GameState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  /**
   * Subscribes to state changes.
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  /**
   * Advances to next turn.
   */
  nextTurn(): void {
    this.setState({
      turn: this.state.turn + 1,
      phase: 'player',
      selectedEntity: null,
    });
  }
}

// Singleton instance
export const gameStore = new GameStore();
```

## Usage in Systems

```typescript
import { getResources } from '../stores/worldResources';
import { gameStore } from '../stores/GameStore';

export function movementSystem(world: World): World {
  const { deltaTime } = getResources(world);
  const { phase } = gameStore.getState();

  if (phase !== 'player') return world;

  for (const eid of movingQuery(world)) {
    // Use deltaTime for smooth movement
    Position.x[eid] += Velocity.x[eid] * deltaTime;
    Position.y[eid] += Velocity.y[eid] * deltaTime;
  }

  return world;
}
```

## Common Patterns

| Pattern | Use Case |
|---------|----------|
| Module singleton | Simple config, rarely changes |
| World-keyed Map | Per-world resources, multiple worlds |
| Class store | Complex state with subscriptions |
| Zustand store | Reactive UI bindings (optional) |

## If unclear
- Start with module singleton (simplest)
- Use Map pattern if testing needs isolated worlds
- Use class pattern if UI needs to react to changes
