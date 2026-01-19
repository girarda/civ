# Human Review: Unit Spawning + Movement

## Summary

This PR implements the foundational unit system for OpenCiv, including:
- Unit data model with 3 unit types (Warrior, Scout, Settler)
- ECS components for unit state management
- Unit rendering with player colors and letter indicators
- Click-to-select unit selection system
- A* pathfinding with terrain-aware movement costs
- Movement preview showing reachable tiles and path
- Right-click movement execution

## Changes

### New Files (16)
- `src/unit/UnitType.ts` - Unit types enum and data
- `src/unit/MovementSystem.ts` - Movement execution logic
- `src/unit/index.ts` - Module exports
- `src/ecs/unitSystems.ts` - Unit query helpers
- `src/pathfinding/Pathfinder.ts` - A* implementation
- `src/pathfinding/index.ts` - Module exports
- `src/render/UnitRenderer.ts` - Unit graphics rendering
- `src/render/SelectionHighlight.ts` - Selection visual
- `src/render/MovementPreview.ts` - Movement range/path visualization
- `src/ui/SelectionState.ts` - Selection state management
- `src/ui/SelectionSystem.ts` - Click handling for selection

### Test Files (4)
- `src/unit/UnitType.test.ts` - 10 unit type tests
- `src/unit/MovementSystem.test.ts` - 13 movement tests
- `src/ecs/unitSystems.test.ts` - 15 ECS unit query tests
- `src/pathfinding/Pathfinder.test.ts` - 23 pathfinding tests
- `tests/e2e/unit.spec.ts` - 7 E2E integration tests

### Modified Files (4)
- `src/ecs/world.ts` - Added unit components and createUnitEntity
- `src/ecs/systems.ts` - Fixed existing lint issues
- `src/main.ts` - Integrated all unit systems
- `src/ui/index.ts` - Exported new UI modules

## Testing Instructions

### Manual Testing
1. Start dev server: `npm run dev`
2. Load the game - a Warrior unit should appear on the map
3. Click on the unit - should show yellow selection ring and green movement range
4. Hover over tiles - should show white path line to reachable tiles
5. Right-click on a reachable tile - unit should move
6. Press Escape - should deselect unit
7. Press R to regenerate map - unit should respawn

### Automated Testing
```bash
npm run test        # 322 unit tests pass
npm run test:e2e    # 53 E2E tests pass
npm run lint        # No errors
npm run build       # Builds successfully
```

## Architecture Decisions

1. **ECS Pattern**: Used bitECS components for unit state to match existing tile system
2. **Layered Rendering**: Units render above tiles, overlays (selection/preview) above units
3. **A* Pathfinding**: Simple heap-less implementation suitable for small maps
4. **Movement Cost**: Terrain base cost + feature modifier (forest/jungle add +1)
5. **Selection Model**: Single unit selection with Escape to deselect

## Known Limitations

1. Only spawns one test unit (Warrior) - multi-unit management coming later
2. No turn-end movement point reset (resetAllMovementPoints exists but unused)
3. Movement preview draws all reachable hexes individually (could optimize)
4. No unit stacking - units can occupy same tile (validation coming later)

## Merge Instructions

```bash
# In main repo directory
git worktree list                    # Verify worktree exists
cd ../civ-2026-01-18-unit-spawning-movement
git push -u origin feature/2026-01-18-unit-spawning-movement

# Create PR via GitHub CLI
gh pr create --title "feat: implement unit spawning and movement system" \
  --body "Implements foundational unit system with selection, pathfinding, and movement."

# After merge, cleanup worktree
cd ..
git worktree remove civ-2026-01-18-unit-spawning-movement
```

## Worktree Location

```
/Users/alex/workspace/civ-2026-01-18-unit-spawning-movement
```

Branch: `feature/2026-01-18-unit-spawning-movement`
