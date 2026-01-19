# Plan: Hover Highlight Bug Fix

**Date**: 2026-01-18
**Status**: Implementation Complete

## Overview

Fix the hover highlight visual bug where the TileHighlight graphic is removed when `tileRenderer.clear()` is called during map regeneration. The solution introduces a proper container hierarchy with separate layers for tiles and overlays, following standard game rendering patterns.

## Research Summary

Key findings from research phase:
- **Root Cause**: `TileRenderer.clear()` calls `container.removeChildren()` on the worldContainer, which removes ALL children including the TileHighlight graphic
- **TileHighlight** is created once at initialization (line 45 in main.ts) and added to worldContainer
- **generateMap()** calls `tileRenderer.clear()` which destroys the highlight
- The hover detection and info panel continue to work because they are not dependent on the removed graphic
- **Recommended Fix**: Option A - Create separate containers for tiles and overlays

## Phased Implementation

### Phase 1: Create Container Hierarchy in main.ts

Update main.ts to create separate containers for tiles and overlays:

- [x] Create a `tilesContainer` for holding tile graphics
- [x] Create an `overlayContainer` for holding highlight and future overlay graphics
- [x] Add both containers to `worldContainer` in correct z-order (tiles first, overlays second)
- [x] Update `TileRenderer` instantiation to use `tilesContainer` instead of `worldContainer`
- [x] Update `TileHighlight` instantiation to use `overlayContainer` instead of `worldContainer`

**Code changes in `/Users/alex/workspace/civ/src/main.ts`:**

Lines 30-36 should change from:
```typescript
// Create world container for camera transforms
const worldContainer = new Container();
app.stage.addChild(worldContainer);

// Initialize systems
const layout = new HexGridLayout(32);
const tileRenderer = new TileRenderer(worldContainer, layout);
```

To:
```typescript
// Create world container for camera transforms
const worldContainer = new Container();
app.stage.addChild(worldContainer);

// Create layer hierarchy for proper z-ordering
const tilesContainer = new Container();
const overlayContainer = new Container();
worldContainer.addChild(tilesContainer);
worldContainer.addChild(overlayContainer);

// Initialize systems
const layout = new HexGridLayout(32);
const tileRenderer = new TileRenderer(tilesContainer, layout);
```

Line 45 should change from:
```typescript
const tileHighlight = new TileHighlight(worldContainer, layout);
```

To:
```typescript
const tileHighlight = new TileHighlight(overlayContainer, layout);
```

### Phase 2: Verify No Side Effects

- [x] Verify `CameraController` still works correctly (it operates on `worldContainer` which contains both child containers)
- [x] Verify `HoverSystem` coordinate conversion still works (uses layout and camera, not directly affected)
- [x] Verify `tileRenderer.clear()` now only clears tiles, not overlays

### Phase 3: Add Unit Tests

- [x] Create test for container hierarchy setup
- [x] Create test verifying highlight survives `tileRenderer.clear()`
- [x] Create test verifying z-order (overlay renders above tiles)

**Test file**: `/Users/alex/workspace/civ/src/render/TileHighlight.test.ts` (create or extend)

```typescript
describe('TileHighlight with container hierarchy', () => {
  it('should survive when tiles container is cleared', () => {
    const worldContainer = new Container();
    const tilesContainer = new Container();
    const overlayContainer = new Container();
    worldContainer.addChild(tilesContainer);
    worldContainer.addChild(overlayContainer);

    const layout = new HexGridLayout(32);
    const tileRenderer = new TileRenderer(tilesContainer, layout);
    const highlight = new TileHighlight(overlayContainer, layout);

    // Add some tiles
    tileRenderer.addTile(new TilePosition(0, 0), Terrain.Grassland);

    // Clear tiles
    tileRenderer.clear();

    // Highlight should still be in overlayContainer
    expect(overlayContainer.children.length).toBe(1);
  });

  it('should render above tiles (correct z-order)', () => {
    const worldContainer = new Container();
    const tilesContainer = new Container();
    const overlayContainer = new Container();
    worldContainer.addChild(tilesContainer);
    worldContainer.addChild(overlayContainer);

    // overlayContainer should have higher index than tilesContainer
    expect(worldContainer.getChildIndex(overlayContainer))
      .toBeGreaterThan(worldContainer.getChildIndex(tilesContainer));
  });
});
```

### Phase 4: E2E Verification

- [x] Run the application and test hover highlighting
- [x] Press 'R' to regenerate the map
- [x] Verify hover highlight still works after regeneration
- [x] Verify highlight appears above tiles, not behind them

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Add container hierarchy, update TileRenderer and TileHighlight instantiation |
| `/Users/alex/workspace/civ/src/render/TileHighlight.test.ts` | Create/Modify | Add tests for container hierarchy behavior |

## Success Criteria

- [x] Hover highlight is visible when hovering over tiles
- [x] Hover highlight persists after pressing 'R' to regenerate the map
- [x] Hover highlight renders above (on top of) tile graphics
- [x] No console errors related to missing graphics or null references
- [x] All existing tests continue to pass
- [x] New tests verify the container hierarchy behavior

## Dependencies & Integration

- **Depends on**: No external dependencies; uses existing PixiJS Container API
- **Consumed by**: TileHighlight, TileRenderer, any future overlay systems (unit selection, movement range preview)
- **Integration points**:
  - CameraController (unaffected - operates on parent worldContainer)
  - HoverSystem (unaffected - uses layout for coordinate conversion)
  - TileInfoPanel (unaffected - DOM-based)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing camera/zoom behavior | CameraController operates on worldContainer which still contains both child containers; transforms will cascade correctly |
| Performance impact from additional containers | PixiJS handles nested containers efficiently; no measurable impact expected for two additional empty containers |
| Future features may add to wrong container | Document the container hierarchy in code comments; consider extracting to a LayerManager class if complexity grows |

## Future Considerations

The research document raised relevant questions for future work:

1. **Additional overlay layers**: Consider whether a LayerManager pattern would be beneficial for managing: unit selection highlights, movement range previews, attack range indicators, fog of war overlays

2. **Encapsulation**: The current fix keeps TileHighlight's graphic private. If debugging becomes necessary, consider adding a `getGraphic()` method or debug mode.

3. **Performance testing**: For very large maps, benchmark the container hierarchy approach vs alternatives.

## Implementation Notes

- The fix is minimal and surgical - only 5 lines of code added/modified in main.ts
- No changes required to TileRenderer or TileHighlight classes
- The container hierarchy pattern is idiomatic for PixiJS applications
- This establishes groundwork for future overlay features
