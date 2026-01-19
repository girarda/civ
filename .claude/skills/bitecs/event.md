---
name: typescript-event-bus
description: Creates an event bus for decoupled communication between systems. Use when the user asks to create, generate, or add an event, message, signal, notification, or pub-sub pattern.
user-invocable: true
---

# Create Event Bus

## Purpose
Generate a type-safe event system for decoupled communication between game systems.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the event types needed.

## Instructions

1. Define event type interfaces with payload data
2. Create EventBus class with emit/on methods
3. Use TypeScript generics for type safety
4. Return unsubscribe function from on()
5. Optionally include event queue for deferred processing
6. Add clear/reset for cleanup

## Output Format

### Event Type Definitions

```typescript
// events/types.ts

export interface TileSelectedEvent {
  q: number;
  r: number;
  entity: number;
}

export interface TileHoveredEvent {
  q: number;
  r: number;
  entity: number | null;
}

export interface TurnEndedEvent {
  turn: number;
  player: string;
}

export interface UnitMovedEvent {
  entity: number;
  from: { q: number; r: number };
  to: { q: number; r: number };
}

// Union type for all events
export type GameEvent =
  | { type: 'tile:selected'; data: TileSelectedEvent }
  | { type: 'tile:hovered'; data: TileHoveredEvent }
  | { type: 'turn:ended'; data: TurnEndedEvent }
  | { type: 'unit:moved'; data: UnitMovedEvent };
```

### EventBus Implementation

```typescript
// events/EventBus.ts

type EventCallback<T> = (data: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback<unknown>>>();

  /**
   * Emits an event to all subscribers.
   */
  emit<T>(event: string, data: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }

  /**
   * Subscribes to an event type.
   * @returns Unsubscribe function
   */
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  /**
   * Subscribes to an event, automatically unsubscribes after first call.
   */
  once<T>(event: string, callback: EventCallback<T>): () => void {
    const unsubscribe = this.on<T>(event, (data) => {
      unsubscribe();
      callback(data);
    });
    return unsubscribe;
  }

  /**
   * Removes all listeners for an event type.
   */
  clear(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Removes all listeners.
   */
  reset(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const events = new EventBus();
```

## Usage Examples

```typescript
import { events } from './events/EventBus';
import type { TileSelectedEvent, UnitMovedEvent } from './events/types';

// Subscribe to events
const unsubscribeTile = events.on<TileSelectedEvent>('tile:selected', (e) => {
  console.log(`Selected tile at ${e.q}, ${e.r}`);
  highlightTile(e.entity);
});

const unsubscribeUnit = events.on<UnitMovedEvent>('unit:moved', (e) => {
  console.log(`Unit moved from (${e.from.q}, ${e.from.r}) to (${e.to.q}, ${e.to.r})`);
  updateFogOfWar(e.entity);
});

// Emit events from systems
function inputSystem(world: World): World {
  if (tileClicked) {
    events.emit<TileSelectedEvent>('tile:selected', {
      q: clickedQ,
      r: clickedR,
      entity: findTileEntity(world, clickedQ, clickedR),
    });
  }
  return world;
}

// Cleanup when done
function cleanup() {
  unsubscribeTile();
  unsubscribeUnit();
  // Or clear all
  events.reset();
}
```

## Queued Events Pattern

```typescript
// For events that should be processed at specific times

export class QueuedEventBus extends EventBus {
  private queue: Array<{ event: string; data: unknown }> = [];

  /**
   * Queues an event for later processing.
   */
  enqueue<T>(event: string, data: T): void {
    this.queue.push({ event, data });
  }

  /**
   * Processes all queued events.
   * Call at end of frame or specific phase.
   */
  flush(): void {
    const toProcess = this.queue.splice(0);
    for (const { event, data } of toProcess) {
      this.emit(event, data);
    }
  }
}
```

## Common Patterns

| Pattern | Use Case |
|---------|----------|
| Direct emit | Immediate response needed |
| Queued emit | Batch processing at frame end |
| once() | One-time setup or transitions |
| Namespaced events | Group related events (tile:*, unit:*) |

## If unclear
- Use string event names with namespaces (e.g., 'tile:selected')
- Define event data interfaces for type safety
- Always provide unsubscribe mechanism
