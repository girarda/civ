# Plan: Production Queue System

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement a production queue system that allows players to queue multiple items for city production. The system will use external Map-based storage (following the TerritoryManager pattern), support shift-click to queue items, implement production overflow between items, and display queued items with estimated turn counts in the city info panel.

## Research Summary

The research at `/Users/alex/workspace/civ/.swarm/research/2026-01-18-production-queue.md` reveals:

- **Single-item production fully implemented**: `CityProcessor.processProduction()` handles accumulation and completion
- **External storage pattern established**: `TerritoryManager` uses `Map<number, Set<string>>` for city territories
- **ProductionComponent is ECS-based**: Uses `currentItem`, `progress`, `cost` fields; cannot store arrays
- **ProductionUI already exists**: Handles button clicks via `onProductionSelected` callback
- **No production overflow currently**: When production completes, progress resets to 0 (excess lost)
- **Callback pattern in place**: `onProductionCompleted` notifies main.ts for unit rendering

Key patterns to follow:
- `TerritoryManager` for external Map storage with `clear()` and `removeCity()` methods
- `ProductionUICallbacks` interface for extending UI callbacks
- `CityProcessorCallbacks` interface for extending processor events

## Phased Implementation

### Phase 1: ProductionQueue Storage Class

**Goal**: Create the core queue storage class following the TerritoryManager pattern.

- [ ] Create `/Users/alex/workspace/civ/src/city/ProductionQueue.ts` with:
  - `queues: Map<number, BuildableType[]>` private storage
  - `MAX_QUEUE_SIZE = 5` configurable constant
  - `getQueue(cityEid): readonly BuildableType[]`
  - `enqueue(cityEid, item): boolean` (returns false if at limit)
  - `dequeue(cityEid): BuildableType | null`
  - `remove(cityEid, index): void`
  - `removeCity(cityEid): void`
  - `clear(): void`
  - `getQueueLength(cityEid): number`
  - `isEmpty(cityEid): boolean`
- [ ] Add unit tests in `/Users/alex/workspace/civ/src/city/ProductionQueue.test.ts`
- [ ] Export from `/Users/alex/workspace/civ/src/city/index.ts`

**Estimated effort**: 1 hour

### Phase 2: CityProcessor Queue Integration

**Goal**: Integrate queue storage into CityProcessor with overflow support.

- [ ] Add `productionQueue: ProductionQueue` to `CityProcessor` constructor
- [ ] Add `setProductionQueue(productionQueue)` for regeneration updates
- [ ] Add `queueItem(cityEid, buildable): boolean` public method
- [ ] Add `getQueue(cityEid): readonly BuildableType[]` public method
- [ ] Add `removeFromQueue(cityEid, index): void` public method
- [ ] Modify `completeProduction()` to:
  - Calculate overflow: `progress - cost`
  - Dequeue next item from `productionQueue`
  - If next item exists, call new `startProduction()` with overflow
  - If no next item, reset to idle (existing behavior)
- [ ] Add private `startProduction(cityEid, buildable, overflow)` helper:
  - Cap overflow at 50% of new item's cost
  - Set `ProductionComponent.currentItem`
  - Set `ProductionComponent.progress` to capped overflow
  - Set `ProductionComponent.cost`
- [ ] Add optional `onQueueAdvanced` callback to `CityProcessorCallbacks`
- [ ] Update unit tests in `/Users/alex/workspace/civ/src/city/CityProcessor.test.ts`

**Estimated effort**: 1.5 hours

### Phase 3: Turn Estimation Utility

**Goal**: Create utility to calculate turns-to-complete for production items.

- [ ] Create `/Users/alex/workspace/civ/src/city/ProductionTurns.ts` with:
  - `calculateTurnsToComplete(progress, cost, productionPerTurn): number`
  - `calculateQueueTurns(currentProgress, currentCost, queueItems, productionPerTurn): number[]`
    - Returns array of turn counts for current item + each queued item
    - Accounts for overflow between items (capped at 50%)
- [ ] Add unit tests in `/Users/alex/workspace/civ/src/city/ProductionTurns.test.ts`
- [ ] Export from `/Users/alex/workspace/civ/src/city/index.ts`

**Estimated effort**: 1 hour

### Phase 4: ProductionUI Queue Support

**Goal**: Extend ProductionUI to support shift-click queueing.

- [ ] Add `onProductionQueued?: (cityEid, buildableType) => void` to `ProductionUICallbacks`
- [ ] Modify button click handler to detect `e.shiftKey`:
  - If shift: call `callbacks.onProductionQueued`
  - If not shift: call `callbacks.onProductionSelected` (existing)
- [ ] Add tooltip hint to buttons: `title="Click to build, Shift+click to queue"`
- [ ] Add `refreshQueueFull(isFull: boolean)` method to show visual feedback when queue is full

**Estimated effort**: 30 minutes

### Phase 5: Queue Display UI

**Goal**: Display queued items with turn estimates in city info panel.

- [ ] Add queue section to `/Users/alex/workspace/civ/index.html`:
  ```html
  <div class="queue-section">
    <div class="section-header">Queue:</div>
    <div id="production-queue"></div>
  </div>
  ```
- [ ] Add queue item styles to `/Users/alex/workspace/civ/src/style.css`:
  - `.queue-section` styling matching `.production-section`
  - `.queue-item` with name, turns, and remove button
  - `.queue-item-remove` (X button) styling
  - Empty state styling when no queue
- [ ] Create `/Users/alex/workspace/civ/src/ui/QueueDisplay.ts`:
  - `constructor(cityProcessor, territoryManager, tileMap)`
  - `setCityEid(cityEid)` - sets current city for display
  - `refresh()` - updates queue display with turn estimates
  - `private renderQueueItem(item, index, turns)` - creates DOM element
  - `private handleRemove(index)` - removes item from queue
- [ ] Export from `/Users/alex/workspace/civ/src/ui/index.ts`

**Estimated effort**: 2 hours

### Phase 6: Main.ts Wiring

**Goal**: Wire all queue components together in main.ts.

- [ ] Create `ProductionQueue` instance after `TerritoryManager`
- [ ] Pass `productionQueue` to `CityProcessor` constructor
- [ ] Create `QueueDisplay` instance after `CityInfoPanel`
- [ ] Extend `ProductionUI` callbacks:
  ```typescript
  const productionUI = new ProductionUI({
    onProductionSelected: (cityEid, buildableType) => {
      cityProcessor.setProduction(cityEid, buildableType);
      cityInfoPanel.refresh();
      queueDisplay.refresh();
    },
    onProductionQueued: (cityEid, buildableType) => {
      const success = cityProcessor.queueItem(cityEid, buildableType);
      if (success) {
        queueDisplay.refresh();
      } else {
        console.log('Queue is full');
      }
    },
  });
  ```
- [ ] Update city selection subscription to include `queueDisplay.setCityEid()`
- [ ] Add `productionQueue.clear()` to `generateMap()` function
- [ ] Add `cityProcessor.setProductionQueue(productionQueue)` after queue clear in `generateMap()`

**Estimated effort**: 30 minutes

### Phase 7: Testing and Polish

**Goal**: Add E2E tests and verify edge cases.

- [ ] Add E2E test: shift-click queues item
- [ ] Add E2E test: queue advances after production completes
- [ ] Add E2E test: overflow applied correctly (within 50% cap)
- [ ] Add E2E test: queue limit enforcement (max 5 items)
- [ ] Add E2E test: remove item from queue via X button
- [ ] Manual testing:
  - Queue persists across turn boundaries
  - Queue clears on map regeneration
  - Turn estimates update correctly after production changes
  - Empty queue displays correctly

**Estimated effort**: 1.5 hours

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `/Users/alex/workspace/civ/src/city/ProductionQueue.ts` | Create | 1 |
| `/Users/alex/workspace/civ/src/city/ProductionQueue.test.ts` | Create | 1 |
| `/Users/alex/workspace/civ/src/city/index.ts` | Modify | 1, 3 |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Modify | 2 |
| `/Users/alex/workspace/civ/src/city/CityProcessor.test.ts` | Modify | 2 |
| `/Users/alex/workspace/civ/src/city/ProductionTurns.ts` | Create | 3 |
| `/Users/alex/workspace/civ/src/city/ProductionTurns.test.ts` | Create | 3 |
| `/Users/alex/workspace/civ/src/ui/ProductionUI.ts` | Modify | 4 |
| `/Users/alex/workspace/civ/index.html` | Modify | 5 |
| `/Users/alex/workspace/civ/src/style.css` | Modify | 5 |
| `/Users/alex/workspace/civ/src/ui/QueueDisplay.ts` | Create | 5 |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Modify | 5 |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | 6 |
| `/Users/alex/workspace/civ/tests/e2e/production-queue.spec.ts` | Create | 7 |

## Detailed Code Structure

### Phase 1: ProductionQueue Class

```typescript
// src/city/ProductionQueue.ts
import { BuildableType } from './Buildable';

/** Maximum number of items that can be queued per city */
export const MAX_QUEUE_SIZE = 5;

/**
 * External storage for city production queues.
 * Uses Map-based storage since bitECS components cannot store arrays.
 */
export class ProductionQueue {
  private queues: Map<number, BuildableType[]> = new Map();

  /**
   * Get the production queue for a city.
   * Returns empty array if city has no queue.
   */
  getQueue(cityEid: number): readonly BuildableType[] {
    return this.queues.get(cityEid) ?? [];
  }

  /**
   * Add an item to a city's production queue.
   * Returns false if queue is at maximum capacity.
   */
  enqueue(cityEid: number, item: BuildableType): boolean {
    const queue = this.queues.get(cityEid) ?? [];
    if (queue.length >= MAX_QUEUE_SIZE) {
      return false;
    }
    this.queues.set(cityEid, [...queue, item]);
    return true;
  }

  /**
   * Remove and return the first item from a city's queue.
   * Returns null if queue is empty.
   */
  dequeue(cityEid: number): BuildableType | null {
    const queue = this.queues.get(cityEid);
    if (!queue || queue.length === 0) return null;
    const [first, ...rest] = queue;
    this.queues.set(cityEid, rest);
    return first;
  }

  /**
   * Remove an item at a specific index from a city's queue.
   */
  remove(cityEid: number, index: number): void {
    const queue = this.queues.get(cityEid);
    if (!queue || index < 0 || index >= queue.length) return;
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    this.queues.set(cityEid, newQueue);
  }

  /**
   * Remove all queue data for a city.
   * Call when city is destroyed.
   */
  removeCity(cityEid: number): void {
    this.queues.delete(cityEid);
  }

  /**
   * Clear all queue data.
   * Call on map regeneration.
   */
  clear(): void {
    this.queues.clear();
  }

  /**
   * Get the number of items queued for a city.
   */
  getQueueLength(cityEid: number): number {
    return this.queues.get(cityEid)?.length ?? 0;
  }

  /**
   * Check if a city's queue is empty.
   */
  isEmpty(cityEid: number): boolean {
    return this.getQueueLength(cityEid) === 0;
  }

  /**
   * Check if a city's queue is at maximum capacity.
   */
  isFull(cityEid: number): boolean {
    return this.getQueueLength(cityEid) >= MAX_QUEUE_SIZE;
  }
}
```

### Phase 2: CityProcessor Modifications

```typescript
// Additions to CityProcessor.ts

/** Overflow cap as percentage of next item's cost */
const OVERFLOW_CAP_PERCENT = 0.5;

export interface QueueAdvancedEvent {
  cityEid: number;
  nextItem: BuildableType;
  remainingQueue: number;
  overflowApplied: number;
}

export interface CityProcessorCallbacks {
  onProductionCompleted?: (event: ProductionCompletedEvent) => void;
  onPopulationGrowth?: (event: PopulationGrowthEvent) => void;
  onQueueAdvanced?: (event: QueueAdvancedEvent) => void;
}

// Add to constructor
private productionQueue: ProductionQueue;

constructor(
  world: IWorld,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>,
  productionQueue: ProductionQueue,
  callbacks: CityProcessorCallbacks = {}
) {
  // ... existing ...
  this.productionQueue = productionQueue;
}

setProductionQueue(productionQueue: ProductionQueue): void {
  this.productionQueue = productionQueue;
}

/**
 * Add an item to a city's production queue.
 * If city has no current production, starts the item immediately.
 */
queueItem(cityEid: number, buildable: BuildableType): boolean {
  // If no current production, start immediately
  if (ProductionComponent.currentItem[cityEid] === 0) {
    this.setProduction(cityEid, buildable);
    return true;
  }
  return this.productionQueue.enqueue(cityEid, buildable);
}

/**
 * Get the production queue for a city.
 */
getQueue(cityEid: number): readonly BuildableType[] {
  return this.productionQueue.getQueue(cityEid);
}

/**
 * Remove an item from a city's production queue.
 */
removeFromQueue(cityEid: number, index: number): void {
  this.productionQueue.remove(cityEid, index);
}

/**
 * Check if a city's queue is full.
 */
isQueueFull(cityEid: number): boolean {
  return this.productionQueue.isFull(cityEid);
}

// Modified completeProduction
private completeProduction(cityEid: number, buildableType: number): void {
  const unitType = buildableToUnitType(buildableType);
  if (unitType === null) return;

  // Calculate overflow before spawning
  const progress = ProductionComponent.progress[cityEid];
  const cost = ProductionComponent.cost[cityEid];
  const overflow = Math.max(0, progress - cost);

  // ... existing unit spawning code ...

  // Notify completion callback
  if (this.callbacks.onProductionCompleted) {
    this.callbacks.onProductionCompleted({ /* ... */ });
  }

  // Advance queue
  const nextItem = this.productionQueue.dequeue(cityEid);
  if (nextItem !== null) {
    const overflowApplied = this.startProduction(cityEid, nextItem, overflow);

    if (this.callbacks.onQueueAdvanced) {
      this.callbacks.onQueueAdvanced({
        cityEid,
        nextItem,
        remainingQueue: this.productionQueue.getQueueLength(cityEid),
        overflowApplied,
      });
    }
  } else {
    // Reset to idle
    ProductionComponent.currentItem[cityEid] = 0;
    ProductionComponent.progress[cityEid] = 0;
    ProductionComponent.cost[cityEid] = 0;
  }
}

/**
 * Start production of an item with optional overflow from previous item.
 * Returns the amount of overflow actually applied.
 */
private startProduction(cityEid: number, buildable: BuildableType, overflow: number = 0): number {
  const cost = getBuildableCost(buildable);
  const maxOverflow = Math.floor(cost * OVERFLOW_CAP_PERCENT);
  const cappedOverflow = Math.min(overflow, maxOverflow);

  ProductionComponent.currentItem[cityEid] = buildable;
  ProductionComponent.progress[cityEid] = cappedOverflow;
  ProductionComponent.cost[cityEid] = cost;

  return cappedOverflow;
}
```

### Phase 3: Turn Estimation

```typescript
// src/city/ProductionTurns.ts

/**
 * Calculate turns remaining to complete production.
 * @param progress Current accumulated progress
 * @param cost Total cost to complete
 * @param productionPerTurn Production yield per turn
 * @returns Number of turns remaining (minimum 1 if any progress needed)
 */
export function calculateTurnsToComplete(
  progress: number,
  cost: number,
  productionPerTurn: number
): number {
  if (productionPerTurn <= 0) return Infinity;
  const remaining = cost - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / productionPerTurn);
}

/** Overflow cap as percentage of next item's cost */
const OVERFLOW_CAP_PERCENT = 0.5;

/**
 * Calculate turns to complete for current production and all queued items.
 * Accounts for overflow between items (capped at 50%).
 *
 * @param currentProgress Progress on current item
 * @param currentCost Cost of current item
 * @param queueCosts Array of costs for queued items
 * @param productionPerTurn Production yield per turn
 * @returns Array of turn counts [currentTurns, queue0Turns, queue1Turns, ...]
 */
export function calculateQueueTurns(
  currentProgress: number,
  currentCost: number,
  queueCosts: number[],
  productionPerTurn: number
): number[] {
  if (productionPerTurn <= 0) {
    return [Infinity, ...queueCosts.map(() => Infinity)];
  }

  const results: number[] = [];
  let accumulatedTurns = 0;
  let overflow = 0;

  // Current item
  const currentRemaining = currentCost - currentProgress;
  const currentTurns = Math.ceil(currentRemaining / productionPerTurn);
  results.push(currentTurns);
  accumulatedTurns = currentTurns;

  // Calculate overflow from current item
  const totalProduced = currentProgress + currentTurns * productionPerTurn;
  overflow = totalProduced - currentCost;

  // Queue items
  for (const cost of queueCosts) {
    const cappedOverflow = Math.min(overflow, Math.floor(cost * OVERFLOW_CAP_PERCENT));
    const startingProgress = cappedOverflow;
    const remaining = cost - startingProgress;
    const turns = Math.ceil(remaining / productionPerTurn);

    // Store cumulative turn count for display purposes
    accumulatedTurns += turns;
    results.push(accumulatedTurns);

    // Calculate overflow for next item
    const totalProducedForItem = startingProgress + turns * productionPerTurn;
    overflow = totalProducedForItem - cost;
  }

  return results;
}
```

### Phase 5: Queue Display

```typescript
// src/ui/QueueDisplay.ts
import { BuildableType, getBuildableName, getBuildableCost } from '../city/Buildable';
import { CityProcessor } from '../city/CityProcessor';
import { ProductionComponent } from '../ecs/cityComponents';
import { TerritoryManager, calculateCityYields } from '../city';
import { GeneratedTile } from '../map/MapGenerator';
import { calculateQueueTurns } from '../city/ProductionTurns';

export class QueueDisplay {
  private container: HTMLElement;
  private cityProcessor: CityProcessor;
  private territoryManager: TerritoryManager;
  private tileMap: Map<string, GeneratedTile>;
  private currentCityEid: number | null = null;

  constructor(
    cityProcessor: CityProcessor,
    territoryManager: TerritoryManager,
    tileMap: Map<string, GeneratedTile>
  ) {
    const container = document.getElementById('production-queue');
    if (!container) {
      throw new Error('QueueDisplay: production-queue container not found');
    }
    this.container = container;
    this.cityProcessor = cityProcessor;
    this.territoryManager = territoryManager;
    this.tileMap = tileMap;
  }

  setCityEid(cityEid: number | null): void {
    this.currentCityEid = cityEid;
    this.refresh();
  }

  setTerritoryManager(territoryManager: TerritoryManager): void {
    this.territoryManager = territoryManager;
  }

  setTileMap(tileMap: Map<string, GeneratedTile>): void {
    this.tileMap = tileMap;
  }

  refresh(): void {
    this.container.innerHTML = '';

    if (this.currentCityEid === null) return;

    const queue = this.cityProcessor.getQueue(this.currentCityEid);
    if (queue.length === 0) {
      this.container.innerHTML = '<div class="queue-empty">No items queued</div>';
      return;
    }

    // Calculate turn estimates
    const currentProgress = ProductionComponent.progress[this.currentCityEid];
    const currentCost = ProductionComponent.cost[this.currentCityEid];
    const yields = calculateCityYields(
      this.currentCityEid,
      this.territoryManager,
      this.tileMap
    );
    const queueCosts = queue.map((item) => getBuildableCost(item));

    // Skip first element (current production turns) since we only show queue
    const turnEstimates = calculateQueueTurns(
      currentProgress,
      currentCost,
      queueCosts,
      yields.production
    ).slice(1);

    queue.forEach((item, index) => {
      const element = this.renderQueueItem(item, index, turnEstimates[index]);
      this.container.appendChild(element);
    });
  }

  private renderQueueItem(item: BuildableType, index: number, turns: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'queue-item';

    const name = getBuildableName(item);
    const cost = getBuildableCost(item);
    const turnsText = turns === Infinity ? '?' : turns.toString();

    div.innerHTML = `
      <span class="queue-item-name">${name} (${cost})</span>
      <span class="queue-item-turns">${turnsText} turns</span>
      <button class="queue-item-remove" title="Remove from queue">&times;</button>
    `;

    const removeBtn = div.querySelector('.queue-item-remove') as HTMLButtonElement;
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleRemove(index);
    });

    return div;
  }

  private handleRemove(index: number): void {
    if (this.currentCityEid === null) return;
    this.cityProcessor.removeFromQueue(this.currentCityEid, index);
    this.refresh();
  }
}
```

### Phase 5: CSS Styles

```css
/* Queue Section - add after .production-section styles */
.queue-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #6a8a6a;
}

#production-queue {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-empty {
  color: #808090;
  font-size: 12px;
  font-style: italic;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: #3a3a5a;
  border-radius: 4px;
  font-size: 12px;
}

.queue-item-name {
  flex: 1;
  color: #e0e0e0;
}

.queue-item-turns {
  color: #a0a0b0;
  font-size: 11px;
}

.queue-item-remove {
  background: transparent;
  border: none;
  color: #ff6b6b;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.queue-item-remove:hover {
  color: #ff4444;
}
```

## Success Criteria

### Phase 1
- [ ] `ProductionQueue` class can enqueue, dequeue, and remove items
- [ ] Queue respects `MAX_QUEUE_SIZE` limit (5 items)
- [ ] `clear()` removes all queue data
- [ ] Unit tests pass for all queue operations

### Phase 2
- [ ] `CityProcessor.queueItem()` adds to queue (or starts if idle)
- [ ] Production overflow calculated correctly on completion
- [ ] Overflow capped at 50% of next item's cost
- [ ] Queue auto-advances when production completes
- [ ] `onQueueAdvanced` callback fires with correct data
- [ ] Unit tests pass for overflow and queue integration

### Phase 3
- [ ] `calculateTurnsToComplete()` returns correct turn counts
- [ ] `calculateQueueTurns()` accounts for overflow between items
- [ ] Edge cases handled (zero production, already complete)
- [ ] Unit tests pass for turn estimation

### Phase 4
- [ ] Shift-click calls `onProductionQueued` callback
- [ ] Normal click still calls `onProductionSelected`
- [ ] Buttons have tooltip explaining shift-click

### Phase 5
- [ ] Queue section displays in city info panel
- [ ] Each queued item shows name, cost, and turn estimate
- [ ] Remove button (X) removes item from queue
- [ ] Empty queue shows "No items queued" message
- [ ] Display updates when queue changes

### Phase 6
- [ ] All components wired together in main.ts
- [ ] Queue clears on map regeneration
- [ ] Queue display updates on city selection
- [ ] Shift-click successfully queues items

### Phase 7
- [ ] E2E tests pass for queue operations
- [ ] Manual testing confirms all edge cases work

## Dependencies & Integration

- **Depends on**:
  - `CityProcessor` - existing production logic
  - `ProductionUI` - existing button click handling
  - `CityInfoPanel` - existing city display panel
  - `TerritoryManager` pattern - for external Map storage
  - `calculateCityYields()` - for turn estimation

- **Consumed by**:
  - `CityProcessor.processTurnEnd()` - queue auto-advance
  - `ProductionUI` - shift-click queueing
  - `QueueDisplay` - queue visualization
  - `main.ts` - component wiring

- **Integration points**:
  - `/Users/alex/workspace/civ/src/main.ts` lines 127-137 (ProductionUI creation)
  - `/Users/alex/workspace/civ/src/main.ts` lines 167-176 (CityProcessor creation)
  - `/Users/alex/workspace/civ/src/main.ts` lines 259-323 (generateMap function)
  - `/Users/alex/workspace/civ/src/main.ts` lines 495-503 (city selection subscription)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Queue storage lost on map regeneration | Add `productionQueue.clear()` to `generateMap()` |
| Production overflow creates exploits | Cap overflow at 50% of next item's cost |
| Queue UI clutters city panel | Limit to 5 items; compact styling |
| Turn estimates incorrect with overflow | Write comprehensive unit tests for edge cases |
| Button click bubbles to canvas | Use `e.stopPropagation()` (already in place) |
| bitECS cannot store arrays | Use external `Map<cityEid, BuildableType[]>` |

## Testing Strategy

### Unit Tests

```typescript
// src/city/ProductionQueue.test.ts
describe('ProductionQueue', () => {
  it('should enqueue items in order');
  it('should dequeue first item (FIFO)');
  it('should enforce MAX_QUEUE_SIZE limit');
  it('should return false when queue is full');
  it('should remove item at specific index');
  it('should clear all queues');
  it('should remove city queue data');
});

// src/city/ProductionTurns.test.ts
describe('calculateTurnsToComplete', () => {
  it('should calculate turns for partial progress');
  it('should return 0 for completed production');
  it('should return Infinity for zero production yield');
});

describe('calculateQueueTurns', () => {
  it('should calculate turns for current and queued items');
  it('should apply overflow capped at 50%');
  it('should return cumulative turn counts');
});

// Additions to src/city/CityProcessor.test.ts
describe('production queue', () => {
  it('should start production if city is idle when queueing');
  it('should add to queue if city has production');
  it('should advance queue on production complete');
  it('should apply capped overflow to next item');
  it('should reset to idle when queue empty');
});
```

### E2E Tests

```typescript
// tests/e2e/production-queue.spec.ts
import { test, expect } from '@playwright/test';

test('shift-click queues production item', async ({ page }) => {
  await page.goto('/');
  // Found city, select it
  // Shift+click Scout button
  // Verify queue displays Scout
});

test('queue advances after production completes', async ({ page }) => {
  // Set Warrior production
  // Shift-click Scout to queue
  // End turns until Warrior completes
  // Verify Scout is now current production
});

test('overflow applies to next queued item', async ({ page }) => {
  // Set up city with high production
  // Queue items
  // Complete first item with overflow
  // Verify second item has progress > 0 (capped at 50%)
});

test('queue limit prevents over-queueing', async ({ page }) => {
  // Queue 5 items
  // Try to shift-click 6th item
  // Verify queue still has 5 items
});

test('remove button removes item from queue', async ({ page }) => {
  // Queue multiple items
  // Click X on middle item
  // Verify item removed, others reorder
});
```

## Configuration

The queue limit is defined as a constant that can be easily modified:

```typescript
// src/city/ProductionQueue.ts
/** Maximum number of items that can be queued per city */
export const MAX_QUEUE_SIZE = 5;
```

To change the limit, simply modify this constant. In the future, this could be made configurable via game settings or city improvements.
