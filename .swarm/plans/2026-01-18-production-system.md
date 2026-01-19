# Plan: Production System Completion

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Complete the production system by implementing three features: (1) a production selection UI allowing players to choose what cities build, (2) a production queue supporting multiple items, and (3) improved unit spawn positioning that finds empty adjacent tiles. The core production logic (accumulation, completion, unit spawning) already exists in `CityProcessor`.

## Research Summary

The research at `/Users/alex/workspace/civ/.swarm/research/2026-01-18-production-system.md` reveals:

- **Core production logic exists**: `CityProcessor.processTurnEnd()` accumulates production and spawns units
- **BuildableType enum**: Warrior (40), Scout (25), Settler (80) costs defined
- **ProductionComponent**: Tracks currentItem, progress, cost (single item only)
- **Turn integration complete**: Wired to `turnSystem.onTurnEnd` in main.ts
- **UI gaps**: No way for players to select production; `CityInfoPanel` only displays status
- **Spawn position simplified**: Currently spawns on city tile (stacking allowed)

Key files:
- `/Users/alex/workspace/civ/src/city/CityProcessor.ts` - Core logic, needs queue + spawn improvement
- `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` - Displays production, needs selection UI
- `/Users/alex/workspace/civ/src/city/Buildable.ts` - BuildableType enum, helper functions
- `/Users/alex/workspace/civ/index.html` - DOM structure for city panel

## Phased Implementation

### Phase 1: Production Selection UI (HIGH PRIORITY)

**Goal**: Allow players to select what a city produces via clickable buttons.

- [x] Add production button container to `index.html` inside `#city-info-panel`
- [x] Add CSS styles for production buttons in `src/style.css`
- [x] Create `src/ui/ProductionUI.ts` class to handle button clicks
- [x] Modify `CityInfoPanel.show()` to display current production item name
- [x] Wire `ProductionUI` to `CityProcessor.setProduction()` in `main.ts`
- [x] Update `CityInfoPanel` to refresh display after production changes
- [x] Add unit test for ProductionUI button handling

**Estimated effort**: 2-3 hours

### Phase 2: Production Queue (MEDIUM PRIORITY)

**Goal**: Support queuing multiple production items with UI to manage the queue.

- [ ] Create queue storage in `src/city/ProductionQueue.ts` (external Map, not ECS)
- [ ] Add `queueItem()` and `dequeueItem()` methods to CityProcessor
- [ ] Modify `completeProduction()` to auto-start next queued item
- [ ] Implement production overflow (excess points carry forward)
- [ ] Update `CityInfoPanel` to display queued items
- [ ] Add shift-click to queue (vs regular click to replace current)
- [ ] Add queue reorder/remove controls in ProductionUI
- [ ] Add unit tests for queue operations

**Estimated effort**: 3-4 hours

### Phase 3: Adjacent Spawn Position (LOW PRIORITY)

**Goal**: Spawn units on empty adjacent tiles instead of stacking on city.

- [ ] Modify `CityProcessor.findSpawnPosition()` to check for existing units
- [ ] Add `hasUnitAt()` helper using `getUnitAtPosition()` from unitSystems
- [ ] Try city tile first, then iterate neighbors for passable empty tile
- [ ] Fall back to city tile if all adjacent tiles occupied (stacking)
- [ ] Add unit test for spawn position finding

**Estimated effort**: 1-2 hours

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `/Users/alex/workspace/civ/src/ui/ProductionUI.ts` | Create | 1 |
| `/Users/alex/workspace/civ/index.html` | Modify | 1 |
| `/Users/alex/workspace/civ/src/style.css` | Modify | 1 |
| `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` | Modify | 1, 2 |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | 1 |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Modify | 1 |
| `/Users/alex/workspace/civ/src/city/ProductionQueue.ts` | Create | 2 |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Modify | 2, 3 |
| `/Users/alex/workspace/civ/src/city/index.ts` | Modify | 2 |

## Detailed Code Structure

### Phase 1: ProductionUI Class

```typescript
// src/ui/ProductionUI.ts
export class ProductionUI {
  private container: HTMLElement;
  private cityProcessor: CityProcessor;
  private cityState: CityState;
  private cityInfoPanel: CityInfoPanel;

  constructor(
    cityProcessor: CityProcessor,
    cityState: CityState,
    cityInfoPanel: CityInfoPanel
  ) { ... }

  private createButtons(): void {
    // Create button for each BuildableType
    // Display name and cost (e.g., "Warrior (40)")
  }

  private handleClick(buildableType: BuildableType): void {
    const cityEid = this.cityState.get();
    if (cityEid !== null) {
      this.cityProcessor.setProduction(cityEid, buildableType);
      // Refresh city info panel
    }
  }
}
```

### Phase 1: HTML Structure

```html
<!-- Add after city-yield-gold inside #city-info-panel -->
<div class="production-section">
  <div class="section-header">Build:</div>
  <div id="production-buttons">
    <!-- Buttons dynamically created or static -->
    <button class="production-btn" data-type="1">Warrior (40)</button>
    <button class="production-btn" data-type="2">Scout (25)</button>
    <button class="production-btn" data-type="3">Settler (80)</button>
  </div>
</div>
```

### Phase 1: CSS Styles

```css
/* Production section */
.production-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #6a8a6a;
}

.section-header {
  font-weight: 500;
  color: #a0a0b0;
  margin-bottom: 8px;
}

#production-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.production-btn {
  background: #4a4a6a;
  border: 1px solid #6a6a8a;
  border-radius: 4px;
  color: #e0e0e0;
  padding: 6px 12px;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  transition: background 0.15s ease;
}

.production-btn:hover {
  background: #5a5a7a;
}

.production-btn.active {
  background: #5a8a5a;
  border-color: #6a9a6a;
}
```

### Phase 2: ProductionQueue Storage

```typescript
// src/city/ProductionQueue.ts
export class ProductionQueue {
  private queues: Map<number, BuildableType[]> = new Map();

  getQueue(cityEid: number): BuildableType[] {
    return this.queues.get(cityEid) ?? [];
  }

  enqueue(cityEid: number, item: BuildableType): void {
    const queue = this.getQueue(cityEid);
    queue.push(item);
    this.queues.set(cityEid, queue);
  }

  dequeue(cityEid: number): BuildableType | null {
    const queue = this.getQueue(cityEid);
    if (queue.length === 0) return null;
    const item = queue.shift()!;
    this.queues.set(cityEid, queue);
    return item;
  }

  remove(cityEid: number, index: number): void { ... }
  reorder(cityEid: number, fromIndex: number, toIndex: number): void { ... }
  clear(): void { this.queues.clear(); }
}
```

### Phase 3: Improved Spawn Position

```typescript
// In CityProcessor.ts
private findSpawnPosition(cityPos: TilePosition): TilePosition | null {
  // First try city tile if no unit there
  if (!this.hasUnitAt(cityPos)) {
    return cityPos;
  }

  // Then try adjacent tiles
  for (const neighbor of cityPos.neighbors()) {
    const tile = this.tileMap.get(neighbor.key());
    if (tile && isPassable(tile.terrain) && !this.hasUnitAt(neighbor)) {
      return neighbor;
    }
  }

  // Fallback: stack on city tile
  return cityPos;
}

private hasUnitAt(pos: TilePosition): boolean {
  return getUnitAtPosition(this.world, pos.q, pos.r) !== null;
}
```

## Success Criteria

### Phase 1
- [x] Player can select a city by clicking on it
- [x] City info panel shows production buttons (Warrior, Scout, Settler)
- [x] Clicking a button sets that item as current production
- [x] City info panel updates to show item name and progress
- [x] Production accumulates correctly over turns
- [x] Unit spawns when production completes

### Phase 2
- [ ] Shift-click adds item to queue instead of replacing current
- [ ] Queue displays in city panel (up to 5 items visible)
- [ ] Next queued item auto-starts when current completes
- [ ] Excess production points carry to next item
- [ ] Queue items can be removed by clicking X
- [ ] Queue persists across turn boundaries

### Phase 3
- [ ] Completed units spawn on city tile if empty
- [ ] If city tile occupied, unit spawns on first passable adjacent tile
- [ ] Impassable tiles (water, mountain) are skipped
- [ ] If all tiles occupied, falls back to stacking on city

## Dependencies & Integration

- **Depends on**:
  - `CityProcessor.setProduction()` - already exists
  - `CityState` - already exists for city selection
  - `BuildableType` enum and helpers - already exist
  - `getUnitAtPosition()` from unitSystems - already exists

- **Consumed by**:
  - Game loop via `CityProcessor.processTurnEnd()`
  - UI via `CityInfoPanel` and new `ProductionUI`

- **Integration points**:
  - `main.ts` initialization section (line ~98-99 area)
  - City click handler (line ~427-451)
  - City state subscription (line ~418-424)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| UI layout conflicts with existing city panel | Use flex layout; test panel at various window sizes |
| Queue storage lost on map regeneration | Clear queue in `generateMap()`; add `productionQueue.clear()` call |
| Production overflow creates exploits | Cap overflow at 50% of next item's cost (Civ-style) |
| Button click event bubbling to canvas | Use `stopPropagation()` on button handlers |
| bitECS cannot store arrays in components | Use external `Map<cityEid, BuildableType[]>` for queue |

## Testing Strategy

### Unit Tests

```typescript
// src/ui/ProductionUI.test.ts
describe('ProductionUI', () => {
  it('should call setProduction when button clicked');
  it('should highlight active production button');
  it('should disable buttons when no city selected');
});

// src/city/ProductionQueue.test.ts
describe('ProductionQueue', () => {
  it('should enqueue items in order');
  it('should dequeue first item');
  it('should return empty array for unknown city');
  it('should remove item at index');
});

// Addition to src/city/CityProcessor.test.ts
describe('findSpawnPosition', () => {
  it('should return city tile if empty');
  it('should return adjacent tile if city occupied');
  it('should skip impassable tiles');
  it('should fallback to city tile if all occupied');
});
```

### E2E Tests

```typescript
// tests/e2e/production.spec.ts
test('player can set city production via UI', async ({ page }) => {
  // Found city with settler
  // Select city
  // Click Warrior button
  // Verify panel shows "Warrior (0/40)"
});

test('production completes and spawns unit', async ({ page }) => {
  // Set production, end turns until complete
  // Verify unit appears on map
  // Verify production resets
});

test('queue advances after completion', async ({ page }) => {
  // Set Warrior, shift-click Scout to queue
  // Complete Warrior
  // Verify Scout is now current production
});
```

## Open Decisions

1. **Production switching penalty**: Should changing production lose accumulated progress?
   - Recommendation: Yes for MVP (simplest). Consider 50% loss later.

2. **Queue length limit**: How many items can be queued?
   - Recommendation: Cap at 10 items to prevent UI clutter.

3. **Cancel production**: Should clearing production refund any progress?
   - Recommendation: No refund for MVP.

4. **Turns to complete display**: Show estimated turns in button tooltip?
   - Recommendation: Defer to later; requires yield calculation in UI.
