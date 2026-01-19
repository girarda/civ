# Research: Production Queue System

**Date**: 2026-01-18
**Status**: Complete

## Summary

Research into implementing a production queue system for OpenCiv. The codebase already has a complete single-item production system with `CityProcessor`, `ProductionComponent`, and `ProductionUI`. The queue feature requires creating external Map-based storage (since bitECS cannot store arrays in components), extending `CityProcessor` with queue methods, implementing production overflow, and updating the UI for shift-click queueing and queue display.

## Key Discoveries

- **Single-item production fully implemented** - `CityProcessor.processProduction()` handles accumulation and completion
- **External storage pattern established** - `TerritoryManager` uses `Map<number, Set<string>>` for city territories, providing a template for queue storage
- **ProductionComponent is ECS-based** - Uses `currentItem`, `progress`, `cost` fields; cannot store arrays
- **ProductionUI already exists** - Handles button clicks and calls `cityProcessor.setProduction()`; needs extension for shift-click
- **No production overflow currently** - When production completes, progress resets to 0 (excess points lost)
- **Callback pattern in place** - `onProductionCompleted` callback notifies main.ts for unit rendering
- **State management pattern** - `CityState`, `SelectionState` provide reactive subscription model
- **Event bubbling handled** - `ProductionUI` uses `stopPropagation()` to prevent canvas click conflicts

## Architecture Overview

### Current Production Flow

```
User clicks production button
        |
        v
ProductionUI.handleClick(buildableType)
        |
        v
CityProcessor.setProduction(cityEid, buildableType)
  - Sets ProductionComponent.currentItem
  - Sets ProductionComponent.cost
  - Resets ProductionComponent.progress to 0
        |
        v
[Turn ends]
        |
        v
CityProcessor.processTurnEnd()
  |
  +-> processProduction(cityEid)
        - Reads ProductionComponent.currentItem
        - Adds yields.production to progress
        - If progress >= cost: completeProduction()
        |
        v
completeProduction(cityEid, buildableType)
  - Spawns unit via createUnitEntity()
  - Resets all ProductionComponent fields to 0
  - Calls onProductionCompleted callback
```

### Proposed Queue Architecture

```
User clicks production button (normal)
        |
        v
ProductionUI.handleClick(buildableType, shiftKey=false)
        |
        v
CityProcessor.setProduction(cityEid, buildableType)
  - Replaces current production
  - Progress resets (existing behavior)

User shift-clicks production button
        |
        v
ProductionUI.handleClick(buildableType, shiftKey=true)
        |
        v
CityProcessor.queueItem(cityEid, buildableType)
  - Adds to ProductionQueue.enqueue()
  - If no current production, auto-starts first item

[Production completes]
        |
        v
completeProduction(cityEid, buildableType)
  - Spawns unit
  - Calculates overflow = progress - cost
  - Dequeues next item from ProductionQueue
  - If next item exists:
    - Sets as current production
    - Applies overflow (capped at 50% of new cost)
  - Else: resets to idle
```

### Data Model Proposal

**External Queue Storage** (like TerritoryManager pattern):

```typescript
// src/city/ProductionQueue.ts
export class ProductionQueue {
  private queues: Map<number, BuildableType[]> = new Map();

  getQueue(cityEid: number): readonly BuildableType[] {
    return this.queues.get(cityEid) ?? [];
  }

  enqueue(cityEid: number, item: BuildableType): void {
    const queue = [...(this.queues.get(cityEid) ?? []), item];
    this.queues.set(cityEid, queue);
  }

  dequeue(cityEid: number): BuildableType | null {
    const queue = this.queues.get(cityEid);
    if (!queue || queue.length === 0) return null;
    const [first, ...rest] = queue;
    this.queues.set(cityEid, rest);
    return first;
  }

  remove(cityEid: number, index: number): void {
    const queue = this.queues.get(cityEid);
    if (!queue || index < 0 || index >= queue.length) return;
    queue.splice(index, 1);
    this.queues.set(cityEid, queue);
  }

  removeCity(cityEid: number): void {
    this.queues.delete(cityEid);
  }

  clear(): void {
    this.queues.clear();
  }

  getQueueLength(cityEid: number): number {
    return this.queues.get(cityEid)?.length ?? 0;
  }
}
```

## Patterns Found

### 1. External Map Storage Pattern (TerritoryManager)

From `/Users/alex/workspace/civ/src/city/Territory.ts`:

```typescript
export class TerritoryManager {
  /** Map from city entity ID to set of tile keys */
  private cityTerritories: Map<number, Set<string>> = new Map();

  initializeTerritory(cityEid: number, centerPosition: TilePosition): void {
    // ...
    this.cityTerritories.set(cityEid, tileKeys);
  }

  removeTerritory(cityEid: number): void {
    const tileKeys = this.cityTerritories.get(cityEid);
    // cleanup...
    this.cityTerritories.delete(cityEid);
  }

  clear(): void {
    this.cityTerritories.clear();
    this.tileOwners.clear();
  }
}
```

**Key takeaways for ProductionQueue**:
- Use `Map<number, BuildableType[]>` keyed by city entity ID
- Provide `clear()` method for map regeneration
- Provide `removeCity()` for city destruction

### 2. Reactive State with Subscriptions (CityState/SelectionState)

From `/Users/alex/workspace/civ/src/ui/CityState.ts`:

```typescript
type CitySelectionListener = (cityEid: number | null) => void;

export class CityState {
  private selectedCity: number | null = null;
  private listeners: CitySelectionListener[] = [];

  select(cityEid: number | null): void {
    if (this.selectedCity === cityEid) return;
    this.selectedCity = cityEid;
    for (const listener of this.listeners) {
      listener(cityEid);
    }
  }

  subscribe(listener: CitySelectionListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }
}
```

**Consideration**: ProductionQueue could optionally emit events when queue changes, but simpler approach is to have UI poll/refresh when needed (current pattern for CityInfoPanel).

### 3. Callback Pattern for Processor Events

From `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:

```typescript
export interface CityProcessorCallbacks {
  onProductionCompleted?: (event: ProductionCompletedEvent) => void;
  onPopulationGrowth?: (event: PopulationGrowthEvent) => void;
}
```

**Extension for queue**:

```typescript
export interface CityProcessorCallbacks {
  onProductionCompleted?: (event: ProductionCompletedEvent) => void;
  onPopulationGrowth?: (event: PopulationGrowthEvent) => void;
  onQueueAdvanced?: (event: QueueAdvancedEvent) => void; // New
}

export interface QueueAdvancedEvent {
  cityEid: number;
  nextItem: BuildableType;
  remainingQueue: number;
  overflowApplied: number;
}
```

### 4. UI Button Click Handling with Event Data

From `/Users/alex/workspace/civ/src/ui/ProductionUI.ts`:

```typescript
button.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent click from bubbling to canvas
  this.handleClick(buildable);
});
```

**Extension for shift-click**:

```typescript
button.addEventListener('click', (e) => {
  e.stopPropagation();
  if (e.shiftKey) {
    this.handleQueueClick(buildable);
  } else {
    this.handleClick(buildable);
  }
});
```

### 5. Production Completion Flow

From `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:

```typescript
private completeProduction(cityEid: number, buildableType: number): void {
  const unitType = buildableToUnitType(buildableType);
  if (unitType === null) return;

  // ... spawn unit ...

  // Reset production (NO OVERFLOW CURRENTLY)
  ProductionComponent.currentItem[cityEid] = 0;
  ProductionComponent.progress[cityEid] = 0;
  ProductionComponent.cost[cityEid] = 0;

  // Notify callback
  if (this.callbacks.onProductionCompleted) {
    this.callbacks.onProductionCompleted({ ... });
  }
}
```

**Modified for queue support**:

```typescript
private completeProduction(cityEid: number, buildableType: number): void {
  const unitType = buildableToUnitType(buildableType);
  if (unitType === null) return;

  // ... spawn unit ...

  // Calculate overflow
  const progress = ProductionComponent.progress[cityEid];
  const cost = ProductionComponent.cost[cityEid];
  const overflow = Math.max(0, progress - cost);

  // Notify completion
  if (this.callbacks.onProductionCompleted) {
    this.callbacks.onProductionCompleted({ ... });
  }

  // Advance queue
  const nextItem = this.productionQueue.dequeue(cityEid);
  if (nextItem !== null) {
    this.startProduction(cityEid, nextItem, overflow);
  } else {
    // Reset to idle
    ProductionComponent.currentItem[cityEid] = 0;
    ProductionComponent.progress[cityEid] = 0;
    ProductionComponent.cost[cityEid] = 0;
  }
}

private startProduction(cityEid: number, buildable: BuildableType, overflow: number = 0): void {
  const cost = getBuildableCost(buildable);
  const cappedOverflow = Math.min(overflow, Math.floor(cost * 0.5));

  ProductionComponent.currentItem[cityEid] = buildable;
  ProductionComponent.progress[cityEid] = cappedOverflow;
  ProductionComponent.cost[cityEid] = cost;
}
```

## Key Files

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Core production logic | Add queue methods, overflow, queue advance |
| `/Users/alex/workspace/civ/src/city/ProductionQueue.ts` | **NEW** Queue storage | Create with Map-based storage |
| `/Users/alex/workspace/civ/src/ui/ProductionUI.ts` | Production buttons | Add shift-click handler, queue display |
| `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` | City info display | Add queue items display |
| `/Users/alex/workspace/civ/src/city/index.ts` | City module exports | Export ProductionQueue |
| `/Users/alex/workspace/civ/src/main.ts` | App initialization | Initialize ProductionQueue, wire to regeneration |
| `/Users/alex/workspace/civ/src/style.css` | UI styles | Add queue display styles |
| `/Users/alex/workspace/civ/index.html` | DOM structure | Add queue container element |

## Recommendations

### 1. Implement ProductionQueue as Standalone Class

Following the TerritoryManager pattern, create a simple class with Map storage:

```typescript
// src/city/ProductionQueue.ts
import { BuildableType } from './Buildable';

export class ProductionQueue {
  private queues: Map<number, BuildableType[]> = new Map();

  // Core operations
  getQueue(cityEid: number): readonly BuildableType[];
  enqueue(cityEid: number, item: BuildableType): void;
  dequeue(cityEid: number): BuildableType | null;

  // Management
  remove(cityEid: number, index: number): void;
  removeCity(cityEid: number): void;
  clear(): void;

  // Queries
  getQueueLength(cityEid: number): number;
  isEmpty(cityEid: number): boolean;
}
```

### 2. Extend CityProcessor with Queue Methods

Add to CityProcessor:

```typescript
class CityProcessor {
  private productionQueue: ProductionQueue;

  // New methods
  queueItem(cityEid: number, buildable: BuildableType): void;
  getQueue(cityEid: number): readonly BuildableType[];
  removeFromQueue(cityEid: number, index: number): void;

  // Modify existing
  setProduction(cityEid: number, buildable: BuildableType): void; // Keep existing
  private completeProduction(...): void; // Add overflow + queue advance
}
```

### 3. Implement Production Overflow with Cap

When production completes:
1. Calculate overflow: `progress - cost`
2. Cap overflow at 50% of next item's cost (standard Civ behavior)
3. Apply capped overflow to next item's starting progress

### 4. Add Shift-Click Queue Support to ProductionUI

```typescript
// In ProductionUI
button.addEventListener('click', (e) => {
  e.stopPropagation();
  if (e.shiftKey) {
    // Queue mode: add to queue
    this.callbacks.onProductionQueued?.(this.currentCityEid!, buildable);
  } else {
    // Normal mode: replace current
    this.callbacks.onProductionSelected(this.currentCityEid!, buildable);
  }
});
```

### 5. Display Queue in CityInfoPanel

Add a queue section below the current production:

```html
<div class="queue-section">
  <div class="section-header">Queue:</div>
  <div id="production-queue">
    <!-- Queue items rendered dynamically -->
  </div>
</div>
```

### 6. Wire Queue to Map Regeneration

In main.ts's `generateMap()` function, add:

```typescript
// Clear queues on map regeneration
productionQueue.clear();
```

## Implementation Approach

### Phase 2A: Core Queue Storage (1-2 hours)

1. Create `/Users/alex/workspace/civ/src/city/ProductionQueue.ts`
2. Add unit tests for queue operations
3. Export from `/Users/alex/workspace/civ/src/city/index.ts`

### Phase 2B: CityProcessor Integration (1-2 hours)

1. Inject ProductionQueue into CityProcessor constructor
2. Add `queueItem()` and `getQueue()` methods
3. Modify `completeProduction()` for overflow and queue advance
4. Add `startProduction()` helper for overflow application
5. Update unit tests

### Phase 2C: UI Integration (2-3 hours)

1. Extend ProductionUI callbacks for `onProductionQueued`
2. Add shift-click detection in button handlers
3. Add queue display to CityInfoPanel
4. Add remove button for queue items
5. Style queue display in CSS
6. Wire to main.ts initialization

### Phase 2D: Testing and Polish (1 hour)

1. Add E2E test for shift-click queueing
2. Add E2E test for queue advancement
3. Add E2E test for overflow application
4. Manual testing of edge cases

## Open Questions

1. **Queue limit**: Should there be a max queue size?
   - Recommendation: Cap at 10 items to prevent UI overflow.

2. **Queue persistence on production switch**: If player changes current production, should queued items remain?
   - Recommendation: Yes, queue persists. Only current production changes.

3. **Empty current production + queue**: If no current production but queue has items, should first item auto-start?
   - Recommendation: Yes, when queueing to an idle city, first item becomes current.

4. **Overflow cap percentage**: 50% is Civ standard, but is this desired?
   - Recommendation: 50% is reasonable. Consider making configurable later.

5. **Queue reordering**: Should players be able to drag/reorder queue items?
   - Recommendation: Defer. Remove-only is sufficient for MVP.

6. **Visual feedback for shift-click**: Should buttons show "add to queue" tooltip on hover with shift?
   - Recommendation: Nice-to-have. Add tooltip text "(Shift-click to queue)" to button title.

7. **Queue display format**: Show just names, or names with turns-to-complete?
   - Recommendation: Show names and costs. Turn calculation requires yield data, defer to later.
