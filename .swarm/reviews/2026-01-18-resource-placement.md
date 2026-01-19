# Human Review: Resource Placement (Phase A)

**Date**: 2026-01-18
**Branch**: `feature/2026-01-18-missing-features`
**Worktree**: `/Users/alex/workspace/civ-2026-01-18-missing-features`

## Summary

This PR implements Phase A of the missing features plan: Resource Placement. The map generator now places resources on tiles based on terrain and feature compatibility rules, matching Civilization game mechanics.

## Changes Made

### Core Implementation

| File | Changes |
|------|---------|
| `src/tile/TileResource.ts` | Added `RESOURCE_PLACEMENT` map (26 resources), `ResourcePlacement` interface, and `canPlaceResource()` function |
| `src/map/MapGenerator.ts` | Added `resource` field to `GeneratedTile`, implemented `determineResource()` method |
| `src/ui/HoverState.ts` | Added `resource: TileResource \| null` to `HoveredTile` interface |
| `src/ui/HoverSystem.ts` | Updated to populate resource field in hovered tile data |

### Test Coverage

| File | Changes |
|------|---------|
| `src/tile/TileResource.test.ts` | Added 16 tests for placement rules and `canPlaceResource()` |
| `src/map/MapGenerator.test.ts` | Added 8 tests for resource generation and determinism |
| `src/ui/HoverState.test.ts` | Updated mock tiles to include resource field |
| `src/ui/HoverSystem.test.ts` | Updated mock tiles to include resource field |
| `tests/e2e/resource.spec.ts` | New E2E tests for resource generation |

## Key Decisions Made

### 1. Resource Spawn Algorithm

**Decision**: Sequential independent roll for each candidate resource.

**Rationale**: The current algorithm iterates through all valid resources for a tile and gives each an independent chance to spawn (based on `spawnChance`). The first resource to pass its roll wins. This creates behavior similar to Civilization games where rarer resources have lower spawn chances.

**Alternative considered**: Weighted random selection where all candidates compete equally. This was not implemented because it would change the spawn distribution significantly and doesn't match Civ game feel.

### 2. Fish on Lake Terrain

**Decision**: Added `Terrain.Lake` to Fish's valid terrains.

**Rationale**: The original implementation omitted Lake terrain, but in Civilization games Fish can spawn on lakes. This was identified in code review and fixed.

### 3. Wheat + Floodplains

**Decision**: Left Floodplains in Wheat's valid features despite Floodplains only existing on Desert terrain.

**Rationale**: In actual Civilization games, Wheat can spawn on Desert Floodplains. Our `TileFeature.ts` restricts Floodplains to Desert only, so this combination is valid. The fact that Wheat's terrain list doesn't include Desert (only Plains) means Wheat will never spawn on Floodplains with current rules - but this is actually correct behavior since standard Wheat spawns on Plains, not Desert.

## Items for Human Review

### 1. Resource Probability Distribution

The current algorithm may create non-uniform distribution favoring resources that appear earlier in iteration order. Consider whether this needs balancing.

**Current behavior**:
- Cattle has 8% spawn chance on Grassland
- Horses has 4% spawn chance on Grassland
- If both are valid, Cattle is checked first and has higher effective spawn rate

**Severity**: Low - affects balance but not functionality

### 2. Spawn Rate Tuning

Spawn rates are reasonable estimates based on Civ games but may need tuning based on playtesting:
- Bonus resources: 5-15%
- Strategic resources: 1-4%
- Luxury resources: 2-6%

### 3. Pre-existing Lint Errors

Two pre-existing lint errors in `src/ecs/systems.ts` (unused `_eid` parameters) were not fixed as they are unrelated to this PR.

## Testing Instructions

```bash
# Navigate to worktree
cd /Users/alex/workspace/civ-2026-01-18-missing-features

# Run all tests
npm run test        # 261 unit tests
npm run test:e2e    # 23 E2E tests
npm run build       # Production build

# Visual inspection
npm run dev         # Start dev server
# Open browser and generate maps with different seeds
# Verify resources appear on appropriate terrain types
```

## Verification Checklist

- [x] Unit tests pass (261/261)
- [x] E2E tests pass (23/23)
- [x] Build succeeds
- [x] All 26 resources have placement rules
- [x] Resources only spawn on compatible terrain/feature
- [x] Resource generation is deterministic (same seed = same resources)
- [x] Fish can spawn on Lake terrain
- [x] HoverSystem exposes resource in tile data

## Merge Instructions

```bash
# From the worktree
cd /Users/alex/workspace/civ-2026-01-18-missing-features

# Commit all changes
git add -A
git commit -m "feat: implement resource placement (Phase A)

- Add RESOURCE_PLACEMENT rules for all 26 resources
- Implement determineResource() in MapGenerator
- Add resource field to GeneratedTile and HoveredTile
- Add comprehensive unit and E2E tests

Phase A of the missing features implementation plan."

# Push and create PR (if desired)
git push -u origin feature/2026-01-18-missing-features
gh pr create --title "feat: Resource Placement (Phase A)" --body "See .swarm/reviews/2026-01-18-resource-placement.md"

# After merge, cleanup worktree from main repo
cd /Users/alex/workspace/civ
git worktree remove /Users/alex/workspace/civ-2026-01-18-missing-features
```

## Files Added/Modified (Summary)

```
Modified:
  .swarm/plans/2026-01-18-missing-features.md
  src/map/MapGenerator.ts
  src/map/MapGenerator.test.ts
  src/tile/TileResource.ts
  src/tile/TileResource.test.ts
  src/ui/HoverState.ts
  src/ui/HoverState.test.ts
  src/ui/HoverSystem.ts
  src/ui/HoverSystem.test.ts

Added:
  .swarm/checkpoints/2026-01-18-missing-features-phase-A.md
  .swarm/reviews/2026-01-18-resource-placement.md
  tests/e2e/resource.spec.ts
```
