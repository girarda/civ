# Research: Production System Implementation

**Date**: 2026-01-18
**Status**: Complete

## Summary

Research into the Production System (Stream E from the roadmap) reveals that **the core production system is already substantially implemented**. The codebase contains a `CityProcessor` class that handles turn-based production and growth, a `ProductionComponent` ECS component for tracking current production, a `BuildableType` enum for producible items, and integration with the turn system. What remains is primarily **production queue functionality** (supporting multiple items) and **UI for selecting production items**.

## Key Discoveries

- **Production processing already exists** - `CityProcessor.processTurnEnd()` accumulates production points and spawns units when complete
- **Unit spawning is implemented** - `CityProcessor.completeProduction()` creates units using `createUnitEntity()` and notifies via callback
- **BuildableType enum exists** with Warrior, Scout, and Settler options, each mapped to corresponding `UnitType`
- **Production costs come from unit data** - `UNIT_TYPE_DATA[unitType].cost` provides production cost
- **Turn integration is complete** - `main.ts` wires `cityProcessor.processTurnEnd()` to the turn system's `onTurnEnd` hook
- **Single-item production only** - Current `ProductionComponent` supports one item at a time, no queue
- **City yields calculation works** - `calculateCityYields()` aggregates territory tile yields for production calculation
- **Spawn position is simplified** - Currently spawns on city tile (stacking allowed); finding adjacent empty tiles is TODO

## Architecture Overview

### Current Production Flow

```
Player selects production (not implemented)
         |
         v
setProduction(cityEid, buildableType)
         |
         v
[Turn End triggered by player]
         |
         v
CityProcessor.processTurnEnd()
         |
         v
For each city:
  1. processProduction(cityEid)
     - Get current item from ProductionComponent
     - Add production yield from territory
     - If progress >= cost: completeProduction()
  2. processGrowth(cityEid)
         |
         v
completeProduction(cityEid, buildableType)
         |
         v
  1. Convert buildableType to unitType
  2. Find spawn position (currently city tile)
  3. createUnitEntity(world, q, r, unitType, playerId, movement)
  4. Reset ProductionComponent
  5. Notify via onProductionCompleted callback
         |
         v
Callback in main.ts renders the new unit
```

### Current Data Model

**ProductionComponent** (`/Users/alex/workspace/civ/src/ecs/cityComponents.ts`):
```typescript
export const ProductionComponent = defineComponent({
  currentItem: Types.ui16, // BuildableType enum value (0 = nothing)
  progress: Types.i32,     // Accumulated production progress
  cost: Types.i32,         // Total production cost of current item
});
```

**BuildableType** (`/Users/alex/workspace/civ/src/city/Buildable.ts`):
```typescript
export enum BuildableType {
  None = 0,
  Warrior = 1,
  Scout = 2,
  Settler = 3,
}
```

**Unit Costs** (`/Users/alex/workspace/civ/src/unit/UnitType.ts`):
```typescript
UNIT_TYPE_DATA = {
  [UnitType.Warrior]: { cost: 40, movement: 2, strength: 8, ... },
  [UnitType.Scout]: { cost: 25, movement: 3, strength: 5, ... },
  [UnitType.Settler]: { cost: 80, movement: 2, strength: 0, ... },
}
```

### Existing Integration Points

| Component | Location | Status |
|-----------|----------|--------|
| ProductionComponent | `/Users/alex/workspace/civ/src/ecs/cityComponents.ts` | Complete |
| BuildableType enum | `/Users/alex/workspace/civ/src/city/Buildable.ts` | Complete |
| CityProcessor | `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Complete |
| Turn integration | `/Users/alex/workspace/civ/src/main.ts` (lines 261-281) | Complete |
| Unit spawning | `CityProcessor.completeProduction()` | Complete |
| Production UI | - | **Not Implemented** |
| Production queue | - | **Not Implemented** |

## Patterns Found

### 1. Production Processing Pattern

From `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:

```typescript
private processProduction(cityEid: number): void {
  const currentItem = ProductionComponent.currentItem[cityEid];
  if (currentItem === 0) return; // No production

  const yields = calculateCityYields(cityEid, this.territoryManager, this.tileMap);
  const newProgress = ProductionComponent.progress[cityEid] + yields.production;
  const cost = ProductionComponent.cost[cityEid];

  if (newProgress >= cost) {
    this.completeProduction(cityEid, currentItem);
  } else {
    ProductionComponent.progress[cityEid] = newProgress;
  }
}
```

### 2. Unit Spawning Pattern

From `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:

```typescript
private completeProduction(cityEid: number, buildableType: number): void {
  const unitType = buildableToUnitType(buildableType);
  if (unitType === null) return;

  const q = Position.q[cityEid];
  const r = Position.r[cityEid];
  const playerId = OwnerComponent.playerId[cityEid];
  const position = new TilePosition(q, r);

  const spawnPos = this.findSpawnPosition(position);
  if (!spawnPos) return;

  const unitData = UNIT_TYPE_DATA[unitType];
  const unitEid = createUnitEntity(
    this.world, spawnPos.q, spawnPos.r, unitType, playerId, unitData.movement
  );

  // Reset production
  ProductionComponent.currentItem[cityEid] = 0;
  ProductionComponent.progress[cityEid] = 0;
  ProductionComponent.cost[cityEid] = 0;

  // Notify callback for rendering
  if (this.callbacks.onProductionCompleted) {
    this.callbacks.onProductionCompleted({ cityEid, unitEid, unitType, position: spawnPos, playerId });
  }
}
```

### 3. Callback Pattern for Rendering

From `/Users/alex/workspace/civ/src/main.ts`:

```typescript
const cityProcessor = new CityProcessor(world, territoryManager, tileMap, {
  onProductionCompleted: (event) => {
    unitRenderer.createUnitGraphic(event.unitEid, event.position, event.unitType, event.playerId);
    console.log(`Production completed in city ${event.cityEid}: unit ${event.unitEid} spawned`);
  },
  onPopulationGrowth: (event) => {
    console.log(`City ${event.cityEid} grew to population ${event.newPopulation}`);
  },
});
```

### 4. City Info Panel Pattern

From `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts`:

The panel currently displays production status but has no interaction:
```typescript
if (currentItem > 0) {
  this.productionEl.textContent = `Building (${progress}/${cost})`;
} else {
  this.productionEl.textContent = 'None';
}
```

## Key Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Core production logic | Main implementation - already complete |
| `/Users/alex/workspace/civ/src/city/Buildable.ts` | Buildable types and costs | Complete - defines units |
| `/Users/alex/workspace/civ/src/ecs/cityComponents.ts` | ProductionComponent | Complete - single item only |
| `/Users/alex/workspace/civ/src/unit/UnitType.ts` | Unit costs and stats | Complete - source of costs |
| `/Users/alex/workspace/civ/src/main.ts` | Integration point | Turn hook wired (lines 276-280) |
| `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` | Production display | Shows progress, no selection UI |
| `/Users/alex/workspace/civ/index.html` | DOM structure | Has city panel, needs production buttons |
| `/Users/alex/workspace/civ/src/city/CityYields.ts` | Yield aggregation | Used for production calculation |

## What Already Exists vs What Needs to Be Built

### Already Implemented (Stream E1/E2 Partial)

1. **Production data model** - `ProductionComponent` with currentItem, progress, cost
2. **Buildable types** - `BuildableType` enum with Warrior, Scout, Settler
3. **Cost calculation** - `getBuildableCost()` retrieves from unit data
4. **Turn processing** - `CityProcessor.processTurnEnd()` accumulates production
5. **Completion detection** - Checks progress >= cost
6. **Unit creation** - `createUnitEntity()` called with proper stats
7. **Render notification** - Callback pattern for UI updates
8. **Integration** - Wired to turn system in main.ts

### Not Yet Implemented

1. **Production selection UI** - No way for player to choose what to build
2. **Production queue** - Only single item supported, no queue
3. **Adjacent spawn position** - Currently spawns on city tile (stacking)
4. **Cancel production** - `clearProduction()` exists but not exposed to UI
5. **Change production** - Overwriting current item loses progress
6. **Production overflow** - Excess production not carried to next item
7. **Building production** - Only units, no buildings yet

## Recommendations

### E1. Production Queue Enhancement

**Priority: Medium** (Single-item production works, queue is nice-to-have)

To add a proper queue, modify the data model:

```typescript
// Option 1: Simple array component (bitECS limitation)
// Store as comma-separated string in external Map
const productionQueues: Map<number, BuildableType[]> = new Map();

// Option 2: Keep single item, auto-assign next from queue on completion
export const ProductionComponent = defineComponent({
  currentItem: Types.ui16,
  progress: Types.i32,
  cost: Types.i32,
  queueLength: Types.ui8, // New: track queue depth
});
```

**Recommendation**: Keep single-item for MVP. Add queue as future enhancement.

### E2. Production Selection UI

**Priority: High** (Required for playable game)

Add production buttons to city panel:

```html
<!-- Add to index.html inside #city-info-panel -->
<div class="production-selection">
  <div class="production-header">Select Production:</div>
  <button class="production-btn" data-type="1">Warrior (40)</button>
  <button class="production-btn" data-type="2">Scout (25)</button>
  <button class="production-btn" data-type="3">Settler (80)</button>
</div>
```

New file `src/ui/ProductionUI.ts`:

```typescript
export class ProductionUI {
  constructor(
    private cityProcessor: CityProcessor,
    private cityState: CityState
  ) {
    this.attachHandlers();
  }

  private attachHandlers(): void {
    document.querySelectorAll('.production-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = parseInt((e.target as HTMLElement).dataset.type!);
        const cityEid = this.cityState.get();
        if (cityEid !== null) {
          this.cityProcessor.setProduction(cityEid, type);
          // Update UI to show new production
        }
      });
    });
  }
}
```

### E3. Adjacent Spawn Position

**Priority: Low** (Current stacking behavior works for MVP)

Improve `findSpawnPosition()` in CityProcessor:

```typescript
private findSpawnPosition(cityPos: TilePosition): TilePosition | null {
  // First, try city tile if no unit there
  const cityKey = `${cityPos.q},${cityPos.r}`;
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

  // All tiles occupied - stack on city tile
  return cityPos;
}

private hasUnitAt(pos: TilePosition): boolean {
  return getUnitAtPosition(this.world, pos.q, pos.r) !== null;
}
```

## Implementation Plan for Remaining Work

### Phase 1: Production Selection UI (Estimated: 2-3 hours)

**Files to create:**
- `src/ui/ProductionUI.ts` - Production button handlers

**Files to modify:**
- `index.html` - Add production buttons to city panel
- `src/style.css` - Style production buttons
- `src/ui/CityInfoPanel.ts` - Update to show selected item name
- `src/main.ts` - Initialize ProductionUI

**Success criteria:**
- Player can click production buttons when city is selected
- Clicking a button calls `cityProcessor.setProduction()`
- City panel shows current production item name
- E2E test: select city, choose Warrior, end turn, see progress

### Phase 2: Production Queue (Optional - Future)

**Files to modify:**
- `src/city/CityProcessor.ts` - Add queue management
- `src/ecs/cityComponents.ts` - Add queue storage (or use external Map)
- `src/ui/CityInfoPanel.ts` - Display queue
- `src/ui/ProductionUI.ts` - Queue manipulation controls

### Phase 3: Adjacent Spawning (Optional - Future)

**Files to modify:**
- `src/city/CityProcessor.ts` - Improve `findSpawnPosition()`
- Need to add `getUnitAtPosition` import

## Testing Strategy

### Unit Tests to Add

```typescript
// src/city/CityProcessor.test.ts additions
describe('processProduction', () => {
  it('should accumulate production points each turn');
  it('should complete production when progress >= cost');
  it('should reset production after completion');
  it('should spawn unit at city position');
  it('should call onProductionCompleted callback');
});

describe('setProduction', () => {
  it('should set currentItem, reset progress, set cost');
  it('should overwrite existing production');
});
```

### E2E Tests to Add

```typescript
// tests/e2e/production.spec.ts
test('player can set city production', async () => {
  // Found a city
  // Select city
  // Click Warrior button
  // Verify ProductionComponent updated
});

test('production completes after enough turns', async () => {
  // Set production to Warrior (cost 40)
  // End turns until production >= 40
  // Verify unit spawned
  // Verify production reset
});
```

## Open Questions

1. **Production overflow**: When production completes with excess points (e.g., 45/40), should remainder carry to next item?
   - Recommendation: Yes, standard Civ behavior. Easy to implement.

2. **Rushable production**: Should gold/population be spendable to complete production instantly?
   - Recommendation: Defer to later. Adds UI complexity.

3. **Production switching penalty**: Should changing production mid-way lose accumulated progress?
   - Recommendation: Yes for MVP (simplest). Classic Civ had 50% loss on switch.

4. **Building production**: When to add buildings?
   - Recommendation: After E2 is complete and tested. Buildings need effect system.

5. **Production modifiers**: Terrain, buildings, and other bonuses?
   - Recommendation: Currently uses raw tile yields. Modifier system is future work.

## Conclusion

The Production System is **largely complete** at the core logic level. The main missing piece is the **production selection UI** that allows players to choose what to build. This is a straightforward UI addition following existing patterns in the codebase.

**Immediate next steps:**
1. Add production buttons to city info panel in `index.html`
2. Create `ProductionUI.ts` to handle button clicks
3. Wire up to `CityProcessor.setProduction()`
4. Test end-to-end flow

**Estimated effort for MVP completion**: 2-4 hours

The production queue and adjacent spawning improvements are optional enhancements that can be deferred until after the core E2E game loop is playable.
