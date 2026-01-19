# Plan: City System Implementation

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement the City System for OpenCiv, enabling Settlers to found cities, managing territory and population, processing production each turn, and providing UI for city information. This follows the recommended implementation order: data model, founding, rendering, UI panel, with integration into the existing turn system.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-city-system.md`:

- **Settler unit exists**: `UnitType.Settler = 2` with movement=2, cost=80, strength=0
- **Territory calculation ready**: `TilePosition.range(1)` provides 7-tile initial territory
- **Yield aggregation ready**: `TileYields.ts` provides `calculateYields()` and `addYields()`
- **Turn processing hooks exist**: `TurnSystem.ts` has stub methods `processProduction()` and `updateGrowth()`
- **ECS patterns established**: `createUnitEntity()` and `unitQuery` patterns in `world.ts`
- **Reactive state pattern**: `SelectionState` provides template for `CityState`
- **Renderer pattern**: `UnitRenderer` provides template for `CityRenderer`
- **UI panel pattern**: `TileInfoPanel` provides template for `CityInfoPanel`

## Phased Implementation

### Phase 1: City Data Model

**Goal**: Define ECS components and entity creation for cities

- [ ] Create `src/city/CityData.ts` with city interfaces and constants
  - `CityName` type and default city name list
  - `FOOD_PER_POPULATION` constant (2 food consumed per pop)
  - `INITIAL_TERRITORY_RADIUS` constant (1 = 7 tiles)
  - `POPULATION_FOOD_THRESHOLD` base growth formula
- [ ] Create `src/ecs/cityComponents.ts` with city ECS components
  - `CityComponent { nameIndex: ui16 }`
  - `PopulationComponent { current: ui8, foodStockpile: i32, foodForGrowth: i32 }`
  - `ProductionComponent { currentItem: ui16, progress: i32, cost: i32 }`
- [ ] Create `src/ecs/citySystems.ts` with city queries
  - `cityQuery = defineQuery([Position, CityComponent, OwnerComponent, PopulationComponent])`
  - `getCityAtPosition(world, q, r): number | null`
  - `getCitiesForPlayer(world, playerId): number[]`
  - `getAllCities(world): number[]`
- [ ] Modify `src/ecs/world.ts` to add `createCityEntity()` helper
- [ ] Create `src/city/Territory.ts` for territory management
  - `TerritoryManager` class with `Map<number, Set<string>>` (cityEid -> tileKeys)
  - `initializeTerritory(cityEid, centerPosition): void`
  - `getTilesForCity(cityEid): TilePosition[]`
  - `getOwnerAtPosition(q, r): number | null`
- [ ] Create `src/city/index.ts` module exports
- [ ] Write unit tests for city components and territory

**Success Criteria**:
- [ ] `createCityEntity()` creates valid city entity with all components
- [ ] `cityQuery` returns city entities correctly
- [ ] `TerritoryManager` initializes 7-tile territory
- [ ] Unit tests pass for all new modules

### Phase 2: City Founding

**Goal**: Enable Settlers to found cities

- [ ] Create `src/city/CityFounder.ts` with founding logic
  - `canFoundCity(world, settlerEid): boolean`
    - Verify unit is Settler type
    - Verify position is valid (not water, not mountain)
    - Verify no existing city at position
  - `foundCity(world, settlerEid, name, territoryManager, onCityFounded): number`
    - Get settler position and owner
    - Create city entity at position
    - Initialize territory via TerritoryManager
    - Remove settler entity from world
    - Call callback with new city EID
    - Return city entity ID
- [ ] Create `src/city/CityNameGenerator.ts` for city naming
  - `getNextCityName(playerId, existingCityCount): string`
  - Use predefined name list (Civilization-style)
- [ ] Add "Found City" action handling in main.ts
  - Keyboard shortcut: B key when Settler is selected
  - Check `canFoundCity()` before attempting
  - Call `foundCity()` and update renderers
- [ ] Write unit tests for founding logic

**Success Criteria**:
- [ ] Pressing B with Settler selected founds city if valid
- [ ] Settler is consumed (removed from world and renderer)
- [ ] City entity created with correct position and owner
- [ ] Territory initialized (7 tiles owned by city)
- [ ] Cannot found city on water, mountain, or existing city

### Phase 3: City Rendering

**Goal**: Display cities on the map with visual markers

- [ ] Create `src/render/CityRenderer.ts` following UnitRenderer pattern
  - `createCityGraphic(eid, position, name, playerId): Graphics`
    - Draw city marker (filled rectangle/house shape)
    - Add city name label below marker
    - Apply player color from `PLAYER_COLORS`
  - `updatePosition(eid, position): void`
  - `updateName(eid, name): void`
  - `removeCity(eid): void`
  - `clear(): void`
- [ ] Create `src/render/TerritoryRenderer.ts` for territory borders (optional but recommended)
  - `updateTerritoryBorders(cityEid, tiles, playerId): void`
  - Draw semi-transparent overlay or border lines around owned tiles
  - `clear(): void`
- [ ] Modify `src/main.ts` to add city rendering layer
  - Add `cityContainer` between `tilesContainer` and `unitContainer`
  - Initialize `CityRenderer` with `cityContainer`
  - Initialize `TerritoryRenderer` with `tilesContainer` or new layer
  - Connect to founding callback to create city graphics
- [ ] Update map regeneration to clear city graphics

**Success Criteria**:
- [ ] City marker visible at city position with correct player color
- [ ] City name displayed below marker
- [ ] City renders above terrain, below units
- [ ] Territory borders visible (if implemented)
- [ ] Cities clear properly on map regeneration

### Phase 4: City UI Panel

**Goal**: Show city information when city is selected

- [ ] Create `src/ui/CityState.ts` following SelectionState pattern
  - `selectedCity: number | null`
  - `select(cityEid): void`
  - `deselect(): void`
  - `subscribe(listener): () => void`
  - `get(): number | null`
- [ ] Create `src/ui/CitySelectionSystem.ts` for city click detection
  - Similar to `SelectionSystem` but for cities
  - Click on tile with city (and no unit) selects city
  - Units take priority over cities for selection
- [ ] Create `src/ui/CityInfoPanel.ts` following TileInfoPanel pattern
  - Constructor finds DOM elements
  - `show(cityEid, world, territoryManager): void`
    - Display city name
    - Display population (current / food for growth)
    - Display production (item name, progress / cost)
    - Display total yields (aggregated from territory)
  - `hide(): void`
- [ ] Modify `index.html` to add city panel DOM structure
- [ ] Modify `src/style.css` to add city panel styles
- [ ] Modify `src/main.ts` to integrate city UI
  - Initialize CityState, CitySelectionSystem, CityInfoPanel
  - Subscribe to CityState changes to show/hide panel
  - Wire up click handling
- [ ] Modify `src/ui/index.ts` to export new modules

**Success Criteria**:
- [ ] Clicking on city (when no unit present) selects it
- [ ] City info panel appears showing population, production, yields
- [ ] Clicking elsewhere deselects city and hides panel
- [ ] Panel styling consistent with TileInfoPanel

### Phase 5: Turn Integration and Production (MVP)

**Goal**: Process city growth and production each turn

- [ ] Create `src/city/Buildable.ts` for producible items
  - `BuildableType` enum (Unit types for now)
  - `BUILDABLE_DATA` with production costs
  - Map from `BuildableType` to `UnitType` for unit production
- [ ] Create `src/city/ProductionQueue.ts` for queue management
  - For MVP: single production item (no queue)
  - `getCurrentProduction(cityEid): BuildableType | null`
  - `setProduction(cityEid, item): void`
  - `clearProduction(cityEid): void`
- [ ] Modify `src/game/TurnSystem.ts` to implement city processing
  - Inject dependencies: `world`, `territoryManager`, callbacks
  - Implement `processProduction()`:
    - Get all cities via `getAllCities()`
    - Calculate production yield from territory tiles
    - Add to `ProductionComponent.progress`
    - If progress >= cost, complete production and spawn unit
  - Implement `updateGrowth()`:
    - Calculate food yield from territory tiles
    - Subtract food consumption (2 per pop)
    - Add surplus to `PopulationComponent.foodStockpile`
    - If stockpile >= threshold, grow population
- [ ] Create `src/city/CityYields.ts` for yield aggregation
  - `calculateCityYields(world, cityEid, territoryManager, tileMap): TileYields`
  - Sum yields from all worked tiles (up to population count for MVP)
- [ ] Integrate with main.ts
  - Pass required dependencies to TurnSystem
  - Handle production completion (spawn units adjacent to city)
- [ ] Write unit tests for turn processing

**Success Criteria**:
- [ ] City yields calculated from territory each turn
- [ ] Population grows when food stockpile reaches threshold
- [ ] Production progresses each turn based on production yield
- [ ] Units spawn adjacent to city when production completes
- [ ] Turn processing integrates cleanly with existing TurnSystem

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/city/CityData.ts` | Create | City interfaces and constants |
| `src/city/CityFounder.ts` | Create | City founding logic |
| `src/city/CityNameGenerator.ts` | Create | City naming system |
| `src/city/Territory.ts` | Create | Territory management |
| `src/city/Buildable.ts` | Create | Producible item definitions |
| `src/city/ProductionQueue.ts` | Create | Production queue (single item MVP) |
| `src/city/CityYields.ts` | Create | City yield aggregation |
| `src/city/index.ts` | Create | Module exports |
| `src/ecs/cityComponents.ts` | Create | City ECS components |
| `src/ecs/citySystems.ts` | Create | City queries |
| `src/render/CityRenderer.ts` | Create | City graphics |
| `src/render/TerritoryRenderer.ts` | Create | Territory borders (optional) |
| `src/ui/CityState.ts` | Create | Reactive city selection state |
| `src/ui/CityInfoPanel.ts` | Create | City info panel |
| `src/ui/CitySelectionSystem.ts` | Create | City click selection |
| `src/ecs/world.ts` | Modify | Add createCityEntity helper |
| `src/ecs/index.ts` | Modify | Export city systems |
| `src/game/TurnSystem.ts` | Modify | Implement production/growth |
| `src/main.ts` | Modify | Integrate city systems |
| `src/ui/index.ts` | Modify | Export city UI modules |
| `index.html` | Modify | Add city panel DOM |
| `src/style.css` | Modify | Add city panel styles |

## Success Criteria

- [ ] Settlers can found cities (B key) consuming the Settler
- [ ] Cities have 7-tile initial territory (center + neighbors)
- [ ] City markers render on map with name labels
- [ ] City info panel shows population, production, yields
- [ ] Population grows based on food surplus each turn
- [ ] Production progresses each turn, spawning units when complete
- [ ] All existing tests continue to pass
- [ ] New unit tests cover city functionality

## Dependencies & Integration

- **Depends on**:
  - Turn system (complete) - provides processing hooks
  - ECS world and components (complete) - entity/component patterns
  - TileYields system (complete) - yield calculation
  - Unit system (complete) - Settler type, spawning patterns

- **Consumed by**:
  - Combat system (future) - city capture mechanics
  - AI system (future) - city management decisions
  - Victory conditions (future) - domination/score tracking

- **Integration points**:
  - `TurnSystem.ts` - production/growth processing
  - `main.ts` - initialization and event wiring
  - `SelectionSystem` - coordinate with unit selection priority

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Selection conflict: unit vs city | Medium | Medium | Units take priority; city selects only if no unit at position |
| Territory overlap between cities | Low | Low | First-come-first-served; defer culture system to later |
| No valid spawn tile for produced units | Low | Medium | Spawn on city tile itself; handle stacking later |
| TurnSystem coupling complexity | Medium | Medium | Use callback injection rather than direct dependencies |
| City panel DOM complexity | Low | Low | Follow TileInfoPanel pattern exactly |
| Production UI complexity | Medium | Low | Start with simple dropdown; iterate later |

## Open Questions (Resolved)

1. **City names**: Use predefined list (Civ-style), player can rename later
2. **Maximum cities**: No limit for MVP
3. **Worked tile assignment**: Automatic for MVP (highest-yield tiles up to pop count)
4. **Production options**: Units only for MVP (Warrior, Settler, Scout)
5. **City capture**: Defer to Combat phase
6. **Territory expansion**: Defer to Culture phase

## Notes

- Follow existing codebase patterns strictly (SelectionState, UnitRenderer, TileInfoPanel)
- Use Map-based territory storage, not ECS components (simpler for dynamic territories)
- City rendering layer should be between tiles and units in z-order
- B key for founding matches Civilization convention
- Integration with turn system uses existing hook mechanism plus callback injection
