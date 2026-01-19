# Human Review: City System Implementation

## Overview

This PR implements the City System for OpenCiv, enabling players to found cities, manage territory, and produce units. The implementation follows the 5-phase plan outlined in `.swarm/plans/2026-01-18-city-system.md`.

## Summary of Changes

### New Files Created

| File | Purpose |
|------|---------|
| `src/city/CityData.ts` | City constants and growth threshold formula |
| `src/city/CityData.test.ts` | Unit tests for city data |
| `src/city/Territory.ts` | TerritoryManager for tracking city-owned tiles |
| `src/city/Territory.test.ts` | Unit tests for territory management |
| `src/city/CityNameGenerator.ts` | Sequential city naming system |
| `src/city/CityNameGenerator.test.ts` | Unit tests for city naming |
| `src/city/CityFounder.ts` | City founding logic with validation |
| `src/city/CityFounder.test.ts` | Unit tests for city founding |
| `src/city/Buildable.ts` | Buildable types (Warrior, Scout, Settler) |
| `src/city/Buildable.test.ts` | Unit tests for buildables |
| `src/city/CityYields.ts` | City yield calculation from territory |
| `src/city/CityProcessor.ts` | Turn processing for production and growth |
| `src/city/index.ts` | Module exports |
| `src/ecs/cityComponents.ts` | ECS components (City, Population, Production) |
| `src/ecs/citySystems.ts` | City-related ECS queries |
| `src/ecs/citySystems.test.ts` | Unit tests for city systems |
| `src/render/CityRenderer.ts` | Renders cities as house-shaped markers |
| `src/render/TerritoryRenderer.ts` | Renders territory borders/overlays |
| `src/ui/CityState.ts` | Reactive state for selected city |
| `src/ui/CityInfoPanel.ts` | DOM panel for city information |
| `tests/e2e/city.spec.ts` | E2E tests for city system |

### Modified Files

| File | Changes |
|------|---------|
| `src/main.ts` | Integrated city system, added B key handler for founding |
| `src/ecs/world.ts` | Added `createCityEntity()` helper |
| `src/ecs/index.ts` | Export city components and systems |
| `src/hex/HexGridLayout.ts` | Added `getHexPoints()` for territory rendering |
| `src/render/index.ts` | Export city and territory renderers |
| `src/ui/index.ts` | Export CityState and CityInfoPanel |
| `src/style.css` | Added city info panel styles |
| `index.html` | Added city info panel DOM elements |
| `tests/e2e/tile-info-panel.spec.ts` | Fixed selector to avoid conflict with city panel |

## Key Design Decisions

### 1. ECS Components
Three separate components for different concerns:
- **CityComponent**: Identity (nameIndex)
- **PopulationComponent**: Growth state (current, foodStockpile, foodForGrowth)
- **ProductionComponent**: Production state (currentItem, progress, cost)

### 2. Territory Management
- `TerritoryManager` class maintains bidirectional mapping: city→tiles and tile→city
- Initial territory radius of 1 (7 tiles including center)
- Uses `TilePosition` keys for efficient lookups

### 3. City Founding
- Only Settlers can found cities (validates unit type)
- Validates terrain (no water, no mountains, no existing cities)
- Removes settler on successful founding
- Auto-assigns city names sequentially per player

### 4. Turn Processing
- `CityProcessor` handles production progress and population growth
- Integrated via `TurnSystem.onTurnEnd` callback
- Production completes when progress >= cost, spawns unit on city tile
- Growth occurs when food stockpile >= threshold

### 5. UI Pattern
- `CityState` follows existing `SelectionState` reactive pattern
- `CityInfoPanel` mirrors `TileInfoPanel` structure
- City selection is mutually exclusive with unit selection

## Testing

### Unit Tests
- **451 tests passing** covering all new functionality
- Tests for edge cases (invalid terrain, non-settler units, etc.)
- Tests for growth threshold calculations

### E2E Tests
- **79 tests passing** including 16 new city system tests
- Tests for founding, selection, panel visibility, error handling

## Areas Requiring Human Review

### 1. Main.ts Complexity
`src/main.ts` has grown significantly. Consider whether the city-related setup code should be extracted to a separate module.

### 2. TerritoryRenderer Border Drawing
The territory border drawing algorithm (`updateTerritoryBorders`) uses a simple approach of drawing semi-transparent overlays. May want to verify visual appearance meets expectations.

### 3. Production Spawn Position
Currently spawns units directly on city tile (line 158 of CityProcessor.ts):
```typescript
private findSpawnPosition(cityPos: TilePosition): TilePosition | null {
  // For MVP, just spawn on city tile (stacking allowed for now)
  return cityPos;
}
```
This allows unit stacking which may need to be addressed later.

### 4. City Panel `_world` Parameter
The `CityInfoPanel.show()` method takes an `_world` parameter that's currently unused (prefixed with underscore). It's kept for API consistency with potential future needs. Verify this is acceptable.

### 5. Growth Threshold Formula
```typescript
return BASE_GROWTH_THRESHOLD + currentPopulation * GROWTH_THRESHOLD_MULTIPLIER;
// = 15 + pop * 6
```
Verify this provides desired growth pacing.

## How to Test Manually

1. Start dev server: `npm run dev`
2. A Settler spawns on map load
3. Click the Settler to select it
4. Move to a valid land tile (right-click)
5. Press B to found a city
6. City appears with territory overlay
7. Click the city to see city info panel
8. End turns (Enter key) to test production/growth processing

## Commands

```bash
cd /Users/alex/workspace/civ-2026-01-18-city-system
npm run lint     # Check linting
npm run build    # Production build
npm run test     # Unit tests
npm run test:e2e # E2E tests
npm run dev      # Development server
```

## Branch Information

- **Branch**: `feature/2026-01-18-city-system`
- **Base**: `main`
- **Worktree**: `/Users/alex/workspace/civ-2026-01-18-city-system`
