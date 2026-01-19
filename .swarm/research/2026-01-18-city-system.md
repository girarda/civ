# Research: City System Implementation

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research document analyzes the OpenCiv codebase to identify the architecture, patterns, and integration points for implementing the City System. The codebase has a well-established ECS foundation using bitECS, a functional Unit System with Settler already defined, reactive state management patterns, and layered PixiJS rendering. The City System can be implemented following existing patterns with minimal architectural changes.

## Key Discoveries

- **Settler unit already exists** (`UnitType.Settler = 2`) with movement points, strength data, and full ECS integration
- **Territory calculation is trivial** via existing `TilePosition.range(1)` and `TilePosition.neighbors()` methods
- **Reactive state pattern established** in `HoverState`, `SelectionState`, and `GameState` - cities can follow same pattern
- **Turn processing hooks ready** - `TurnSystem.ts` has `processProduction()` and `updateGrowth()` stubs awaiting city implementation
- **Yield system complete** - `TileYields.ts` provides `calculateYields()`, `addYields()` for city yield aggregation
- **ECS query patterns established** - `unitQuery`, `tileQuery` show how to create city queries
- **UI panel pattern exists** - `TileInfoPanel` provides template for city info panel
- **Rendering layer hierarchy established** - tilesContainer < unitContainer < overlayContainer

## Architecture Overview

### Current Module Structure

```
src/
  ecs/
    world.ts         # ECS components, entity creation helpers
    systems.ts       # Tile queries and systems
    unitSystems.ts   # Unit queries (getUnitAtPosition, etc.)
  unit/
    UnitType.ts      # Unit types including Settler
    MovementSystem.ts # Movement execution
  hex/
    TilePosition.ts  # Hex math (neighbors, range, distance)
    HexGridLayout.ts # Hex-to-world coordinate conversion
  tile/
    Terrain.ts       # 14 terrain types with yields
    TileYields.ts    # Yield calculation and manipulation
  render/
    TileRenderer.ts  # Terrain rendering
    UnitRenderer.ts  # Unit graphics management
    SelectionHighlight.ts # Visual selection indicator
  ui/
    HoverState.ts    # Reactive hover state
    SelectionState.ts # Reactive selection state
    TileInfoPanel.ts # Tile info display panel
  game/
    GameState.ts     # Turn number, phase, current player
    TurnSystem.ts    # Turn processing with hooks
```

### Existing ECS Components

From `/Users/alex/workspace/civ/src/ecs/world.ts`:

```typescript
// Spatial
Position { q: i32, r: i32 }

// Tile data
TerrainComponent { type: ui8 }
FeatureComponent { type: ui8, hasFeature: ui8 }
ResourceComponent { type: ui8, hasResource: ui8 }
YieldsComponent { food: i32, production: i32, gold: i32, science: i32, culture: i32, faith: i32 }

// Unit data (already implemented)
UnitComponent { type: ui8 }
MovementComponent { current: ui8, max: ui8 }
OwnerComponent { playerId: ui8 }
```

### Reactive State Pattern

From `/Users/alex/workspace/civ/src/ui/SelectionState.ts`:

```typescript
type SelectionListener = (unitEid: number | null) => void;

export class SelectionState {
  private selectedUnit: number | null = null;
  private listeners: SelectionListener[] = [];

  subscribe(listener): () => void  // Returns unsubscribe function
  select(eid): void                // Notifies listeners on change
  deselect(): void
  clear(): void
}
```

This pattern should be replicated for `CityState` (selected city for UI panel).

## Patterns Found

### 1. Entity Creation Pattern

From `/Users/alex/workspace/civ/src/ecs/world.ts`:

```typescript
export function createUnitEntity(
  world: IWorld,
  q: number, r: number,
  unitType: number,
  playerId: number,
  maxMovement: number
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, UnitComponent, eid);
  addComponent(world, MovementComponent, eid);
  addComponent(world, OwnerComponent, eid);
  // Set component values...
  return eid;
}
```

**City equivalent**: `createCityEntity(world, q, r, playerId, name)`

### 2. Query Pattern

From `/Users/alex/workspace/civ/src/ecs/unitSystems.ts`:

```typescript
export function getUnitAtPosition(world: IWorld, q: number, r: number): number | null {
  const units = unitQuery(world);
  for (const eid of units) {
    if (Position.q[eid] === q && Position.r[eid] === r) {
      return eid;
    }
  }
  return null;
}
```

**City equivalent**: `getCityAtPosition(world, q, r)`, `getCitiesForPlayer(world, playerId)`

### 3. Renderer Pattern

From `/Users/alex/workspace/civ/src/render/UnitRenderer.ts`:

```typescript
export class UnitRenderer {
  private container: Container;
  private layout: HexGridLayout;
  private graphics: Map<number, Graphics> = new Map();

  createUnitGraphic(eid, position, unitType, playerId): Graphics
  updatePosition(eid, position): void
  removeUnit(eid): void
  clear(): void
}
```

**City equivalent**: `CityRenderer` with same interface, but renders city marker + name label.

### 4. UI Panel Pattern

From `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts`:

```typescript
export class TileInfoPanel {
  constructor() {
    // Get DOM elements by ID
    // Throw if not found
  }
  show(tile: HoveredTile): void {
    // Update DOM elements
    // Remove 'hidden' class
  }
  hide(): void {
    // Add 'hidden' class
  }
}
```

**City equivalent**: `CityInfoPanel` showing population, production queue, yields.

### 5. Turn Processing Pattern

From `/Users/alex/workspace/civ/src/game/TurnSystem.ts`:

```typescript
private processTurnEnd(): void {
  this.processProduction();  // TODO: Implement when city system is added
  this.updateGrowth();       // TODO: Implement when city system is added
  this.hooks.onTurnEnd?.();
}
```

The hooks are already in place for city integration.

## Key Files

| File | Purpose | Relevance to City System |
|------|---------|--------------------------|
| `/Users/alex/workspace/civ/src/ecs/world.ts` | ECS components and entity helpers | Add CityComponent, createCityEntity |
| `/Users/alex/workspace/civ/src/unit/UnitType.ts` | Unit type definitions | Settler (type=2) exists |
| `/Users/alex/workspace/civ/src/hex/TilePosition.ts` | Hex coordinate math | `range(1)` for territory, `neighbors()` |
| `/Users/alex/workspace/civ/src/tile/TileYields.ts` | Yield calculation | `calculateYields()`, `addYields()` for city totals |
| `/Users/alex/workspace/civ/src/ui/SelectionState.ts` | Reactive state pattern | Template for CityState |
| `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts` | UI panel pattern | Template for CityInfoPanel |
| `/Users/alex/workspace/civ/src/render/UnitRenderer.ts` | Graphics management | Template for CityRenderer |
| `/Users/alex/workspace/civ/src/game/TurnSystem.ts` | Turn processing | Has stubs for city production/growth |
| `/Users/alex/workspace/civ/src/main.ts` | Application entry | Integration point for city systems |
| `/Users/alex/workspace/civ/index.html` | DOM structure | Add city panel HTML |
| `/Users/alex/workspace/civ/src/style.css` | UI styling | Add city panel styles |

## Integration Points

### 1. ECS Integration (`src/ecs/`)

**New components to add to `world.ts`:**

```typescript
export const CityComponent = defineComponent({
  name: Types.ui32,        // Index into city names array (or use string ID)
});

export const PopulationComponent = defineComponent({
  current: Types.ui8,
  foodStockpile: Types.i32,
  foodForGrowth: Types.i32,
});

export const ProductionComponent = defineComponent({
  currentItem: Types.ui16,  // 0 = none, or buildable item ID
  progress: Types.i32,
  cost: Types.i32,
});

export const TerritoryComponent = defineComponent({
  // Store territory as array of tile keys (need custom storage)
  // Or use a separate Map<cityEid, Set<tileKey>>
});
```

**New file `src/ecs/citySystems.ts`:**

```typescript
export const cityQuery = defineQuery([Position, CityComponent, OwnerComponent, PopulationComponent]);
export function getCityAtPosition(world, q, r): number | null;
export function getCitiesForPlayer(world, playerId): number[];
export function getAllCities(world): number[];
```

### 2. City Founding Integration

**New file `src/city/CityFounder.ts`:**

```typescript
export class CityFounder {
  canFoundCity(settlerEid: number): boolean {
    // Check: is this a Settler?
    // Check: is position valid (not water, not mountain)?
    // Check: no existing city at position?
    // Check: minimum distance from other cities (optional)?
  }

  foundCity(world: IWorld, settlerEid: number, name: string): number {
    // Get settler position
    // Create city entity at position
    // Initialize territory (center + neighbors)
    // Remove settler entity
    // Return city entity ID
  }
}
```

**Integration with Selection/Action:**

- When Settler is selected, show "Found City" action button
- Or: keyboard shortcut (B for build/settle)
- Consume Settler on success

### 3. Territory System

**Territory initialization:**

```typescript
function initializeTerritory(cityPosition: TilePosition): TilePosition[] {
  // City owns center tile + 6 neighbors = 7 tiles initially
  return cityPosition.range(1);
}
```

**Territory storage options:**

1. **Component-based**: Store as bitmask or array in ECS (complex for dynamic growth)
2. **Map-based**: External `Map<number, Set<string>>` keyed by city EID (simpler)
3. **Reverse lookup**: `Map<string, number>` from tile key to owning city EID

Recommendation: Use Map-based storage for flexibility, similar to `tileMap` pattern in main.ts.

### 4. Rendering Integration

**Layer position**: City markers should render above tiles but below units:
- tilesContainer (terrain)
- **cityContainer** (new - city markers)
- unitContainer (units)
- overlayContainer (highlights)

**CityRenderer responsibilities:**
- City marker graphic (house/building icon or styled circle)
- City name label (BitmapText or Text)
- Territory border rendering (optional - polygon around owned tiles)

### 5. UI Panel Integration

**DOM additions to index.html:**

```html
<div id="city-info-panel" class="hidden">
  <div class="panel-header">City: <span id="city-name"></span></div>
  <div class="panel-content">
    <div class="info-row"><span class="label">Population:</span> <span id="city-population"></span></div>
    <div class="info-row"><span class="label">Production:</span> <span id="city-production"></span></div>
    <div class="yields-section">
      <div class="yield-item"><span class="yield-icon food"></span><span id="city-food">0</span></div>
      <div class="yield-item"><span class="yield-icon production"></span><span id="city-prod">0</span></div>
      <div class="yield-item"><span class="yield-icon gold"></span><span id="city-gold">0</span></div>
    </div>
    <div class="production-queue">
      <div class="queue-header">Production Queue</div>
      <div id="queue-items"></div>
      <button id="add-to-queue-btn">Add Item</button>
    </div>
  </div>
</div>
```

### 6. Turn System Integration

**Modify `TurnSystem.ts`:**

```typescript
private processProduction(): void {
  const cities = getAllCities(this.world);
  for (const cityEid of cities) {
    const productionYield = this.calculateCityProduction(cityEid);
    ProductionComponent.progress[cityEid] += productionYield;

    if (ProductionComponent.progress[cityEid] >= ProductionComponent.cost[cityEid]) {
      this.completeProduction(cityEid);
    }
  }
}

private updateGrowth(): void {
  const cities = getAllCities(this.world);
  for (const cityEid of cities) {
    const foodYield = this.calculateCityFood(cityEid);
    // Food after consumption (2 per pop)
    const surplus = foodYield - PopulationComponent.current[cityEid] * 2;
    PopulationComponent.foodStockpile[cityEid] += surplus;

    if (PopulationComponent.foodStockpile[cityEid] >= PopulationComponent.foodForGrowth[cityEid]) {
      this.growCity(cityEid);
    }
  }
}
```

## Recommended Implementation Approach

### Phase B1: City Data Model (Day 1)

**Files to create:**
- `src/city/CityData.ts` - City interface and data types
- `src/ecs/cityComponents.ts` - ECS components for cities
- `src/ecs/citySystems.ts` - City queries

**Files to modify:**
- `src/ecs/world.ts` - Add city components and createCityEntity helper
- `src/ecs/index.ts` - Export new city systems

**Success criteria:**
- CityComponent, PopulationComponent, ProductionComponent defined
- createCityEntity helper creates valid city entity
- cityQuery returns city entities
- Unit tests pass

### Phase B2: City Founding (Day 1-2)

**Files to create:**
- `src/city/CityFounder.ts` - Founding logic
- `src/city/Territory.ts` - Territory management

**Files to modify:**
- `src/ui/SelectionState.ts` or create `src/ui/UnitActionState.ts` - Track available actions
- `src/main.ts` - Wire up "Found City" action

**Success criteria:**
- Settler can execute "Found City" action
- City entity created at Settler position
- Settler consumed (removed from world)
- Territory initialized (7 tiles)
- Unit tests pass

### Phase B3: City Rendering (Day 2)

**Files to create:**
- `src/render/CityRenderer.ts` - City graphics management
- `src/render/TerritoryRenderer.ts` - Territory border rendering (optional)

**Files to modify:**
- `src/main.ts` - Add cityContainer, initialize CityRenderer

**Success criteria:**
- City marker visible at city position
- City name displayed
- Territory borders visible (optional)
- City renders above tiles, below units

### Phase B4: City Panel UI (Day 2-3)

**Files to create:**
- `src/ui/CityState.ts` - Reactive selected city state
- `src/ui/CityInfoPanel.ts` - City information display
- `src/ui/CitySelectionSystem.ts` - Click-to-select city

**Files to modify:**
- `index.html` - Add city panel DOM
- `src/style.css` - Add city panel styles
- `src/ui/index.ts` - Export new UI modules
- `src/main.ts` - Initialize city UI systems

**Success criteria:**
- Clicking city selects it
- City info panel shows when city selected
- Panel displays population, yields, production
- Panel hides when clicking elsewhere

### Phase B5: Production Queue (Day 3-4)

**Files to create:**
- `src/city/ProductionQueue.ts` - Queue data structure
- `src/city/Buildable.ts` - Unit/building definitions
- `src/ui/ProductionQueueUI.ts` - Queue display and controls

**Files to modify:**
- `src/game/TurnSystem.ts` - Implement processProduction()
- `src/main.ts` - Wire up production completion (spawn units)

**Success criteria:**
- Can add units to production queue
- Production progresses each turn
- Unit spawns adjacent to city when complete
- Production queue UI updates

## Dependencies and Risks

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Settler unit type | Complete | UnitType.Settler = 2 |
| TilePosition.range() | Complete | Returns tiles within radius |
| TileYields calculation | Complete | calculateYields() exists |
| ECS world and queries | Complete | bitECS configured |
| Reactive state pattern | Complete | SelectionState as template |
| Turn system hooks | Complete | Stubs in TurnSystem.ts |
| Unit rendering | Complete | UnitRenderer as template |
| UI panel pattern | Complete | TileInfoPanel as template |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Territory storage complexity | Medium | Medium | Use external Map, not ECS component |
| Production queue UI complexity | Medium | Low | Start with simple list, iterate |
| City selection conflicts with unit selection | Medium | Medium | Prioritize unit selection; city only if no unit at position |
| Performance with many cities | Low | Medium | Use spatial indexing if needed |
| Settler action UX unclear | Medium | Low | Add clear button/hotkey (B for build) |

### Integration Risks

1. **Unit vs City selection priority**: When both unit and city are at same position, which takes priority?
   - **Recommendation**: Units take priority; click on tile without unit to select city.

2. **Territory overlap**: What happens when two cities' territory would overlap?
   - **Recommendation**: First-come-first-served; tiles belong to founding city. Culture system (later) can change this.

3. **Production completion with no adjacent tiles**: What if city is surrounded by water/mountains?
   - **Recommendation**: Spawn unit on city tile itself; stacking rules to be defined.

## Open Questions

1. **City names**: Should names come from a predefined list, be randomly generated, or player-entered?
   - Recommendation: Predefined list initially (like Civ), player can rename.

2. **Maximum cities per player**: Any limit for MVP?
   - Recommendation: No limit for MVP; add later if balance needed.

3. **Worked tile assignment**: Automatic or manual?
   - Recommendation: Automatic for MVP (assign highest-yield tiles up to population count).

4. **Production options for MVP**: Just units, or buildings too?
   - Recommendation: Just units for MVP (Warrior, Settler). Buildings add complexity.

5. **City capture vs destroy**: When enemy takes city, does it become theirs or get destroyed?
   - Recommendation: Defer to Combat phase; not needed for initial City System.

6. **Territory expansion**: Should territory grow over time (culture)?
   - Recommendation: Defer to later phase; initial territory of 7 tiles is sufficient for MVP.

## File Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/city/CityData.ts` | City type definitions and data |
| `src/city/CityFounder.ts` | City founding logic |
| `src/city/Territory.ts` | Territory management |
| `src/city/ProductionQueue.ts` | Production queue data structure |
| `src/city/Buildable.ts` | Buildable items (units/buildings) |
| `src/city/index.ts` | Module exports |
| `src/ecs/cityComponents.ts` | City ECS components |
| `src/ecs/citySystems.ts` | City queries |
| `src/render/CityRenderer.ts` | City graphics |
| `src/render/TerritoryRenderer.ts` | Territory borders (optional) |
| `src/ui/CityState.ts` | Reactive city selection state |
| `src/ui/CityInfoPanel.ts` | City info display |
| `src/ui/CitySelectionSystem.ts` | City click selection |
| `src/ui/ProductionQueueUI.ts` | Production queue interface |

### Files to Modify

| File | Changes |
|------|---------|
| `src/ecs/world.ts` | Add city components, createCityEntity helper |
| `src/ecs/index.ts` | Export city systems |
| `src/game/TurnSystem.ts` | Implement processProduction(), updateGrowth() |
| `src/main.ts` | Initialize city systems, add container layer |
| `src/ui/index.ts` | Export city UI modules |
| `index.html` | Add city panel DOM elements |
| `src/style.css` | Add city panel styles |
| `CLAUDE.md` | Document new city module |

**Total: ~14 files to create, ~8 files to modify**
