# Research: Hover Highlight Bug

**Date**: 2026-01-18
**Status**: Complete

## Summary

The hover highlight system is architecturally correct but fails due to a z-index/rendering order issue. The TileHighlight graphic is added to the worldContainer during initialization (line 45 in main.ts), but then the `generateMap()` function calls `tileRenderer.clear()` which removes ALL children from the worldContainer, including the highlight graphic. The highlight is never re-added after map generation.

## Key Discoveries

- **Root Cause Found**: The `tileRenderer.clear()` method (line 56 in TileRenderer.ts) calls `this.container.removeChildren()` which removes ALL children from the worldContainer, including the TileHighlight graphic
- The TileHighlight is created once (line 45 in main.ts) and added to worldContainer
- When `generateMap()` runs (lines 54-81), it calls `tileRenderer.clear()` which destroys the highlight
- The hover detection and info panel work correctly because they don't rely on the removed graphic
- The subscribe mechanism is working correctly - the issue is the graphic no longer exists in the scene

## Architecture Overview

The hover system has three interconnected components:

```
Mouse Events (canvas)
       |
       v
HoverSystem.handleMouseMove()
       |
       v
HoverState.set(tile) --> notifies listeners
       |
       +---> TileInfoPanel.show(tile)    [WORKS - DOM-based]
       |
       +---> TileHighlight.show(position) [BROKEN - graphic removed]
```

### Component Responsibilities

1. **HoverSystem** (`/Users/alex/workspace/civ/src/ui/HoverSystem.ts`):
   - Attaches mousemove/mouseleave listeners to canvas
   - Converts screen coordinates to world coordinates (accounting for camera)
   - Converts world coordinates to hex coordinates via HexGridLayout
   - Updates HoverState with hovered tile data

2. **HoverState** (`/Users/alex/workspace/civ/src/ui/HoverState.ts`):
   - Reactive state container with pub/sub pattern
   - Stores current HoveredTile or null
   - Notifies all subscribers when state changes
   - Skips updates for same position (optimization)

3. **TileHighlight** (`/Users/alex/workspace/civ/src/render/TileHighlight.ts`):
   - Creates a Graphics object for visual highlight
   - Draws semi-transparent hex with border at position
   - Controls visibility via `show(position)` and `hide()`

4. **TileInfoPanel** (`/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts`):
   - DOM-based panel showing tile information
   - Works correctly because it's not affected by container clearing

## Patterns Found

### Event Flow (in main.ts)

```typescript
// Line 45: TileHighlight created and added to worldContainer
const tileHighlight = new TileHighlight(worldContainer, layout);

// Line 54-81: generateMap() called
function generateMap(seed: number): void {
  tileRenderer.clear();  // Line 56 - REMOVES ALL CHILDREN including highlight!
  // ... generates new tiles
}

// Line 84: Initial map generation runs
generateMap(currentSeed);  // Highlight is removed here!

// Line 97-105: Subscribe sets up the connection
hoverState.subscribe((tile) => {
  if (tile) {
    tileHighlight.show(tile.position);  // Tries to show removed graphic
    tileInfoPanel.show(tile);
  } else {
    tileHighlight.hide();
    tileInfoPanel.hide();
  }
});
```

### TileRenderer.clear() Problem

```typescript
// /Users/alex/workspace/civ/src/render/TileRenderer.ts line 55-57
clear(): void {
  this.container.removeChildren();  // Removes EVERYTHING, not just tiles
}
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/main.ts` | Application entry point - orchestrates all systems |
| `/Users/alex/workspace/civ/src/ui/HoverState.ts` | Reactive state for hovered tile with pub/sub |
| `/Users/alex/workspace/civ/src/ui/HoverSystem.ts` | Mouse event handling and coordinate conversion |
| `/Users/alex/workspace/civ/src/render/TileHighlight.ts` | Visual highlight graphic rendering |
| `/Users/alex/workspace/civ/src/render/TileRenderer.ts` | Tile rendering and the problematic clear() method |
| `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts` | DOM panel for tile info (works correctly) |

## Recommendations

### Option A: Use Separate Containers (Recommended)

Create separate containers for tiles and overlays to prevent the clear operation from affecting highlights:

```typescript
// In main.ts
const tilesContainer = new Container();
const overlayContainer = new Container();
worldContainer.addChild(tilesContainer);
worldContainer.addChild(overlayContainer);

const tileRenderer = new TileRenderer(tilesContainer, layout);  // Only tiles
const tileHighlight = new TileHighlight(overlayContainer, layout);  // Separate layer
```

**Pros**: Clean separation of concerns, proper layering, highlight always on top
**Cons**: Minor refactor to main.ts

### Option B: Re-add Highlight After Clear

Modify generateMap to re-add the highlight graphic after clearing:

```typescript
function generateMap(seed: number): void {
  tileRenderer.clear();
  tileMap.clear();
  hoverState.set(null);
  tileHighlight.hide();

  // Re-add highlight to container
  worldContainer.addChild(tileHighlight.getGraphic());

  // ... rest of generation
}
```

**Pros**: Minimal code change
**Cons**: Requires exposing the internal graphic, order-dependent, fragile

### Option C: Track and Preserve Non-Tile Children

Modify TileRenderer to only remove tile graphics, not all children:

```typescript
// Store tile graphics separately
private tiles: Graphics[] = [];

clear(): void {
  for (const tile of this.tiles) {
    this.container.removeChild(tile);
    tile.destroy();
  }
  this.tiles = [];
}
```

**Pros**: TileRenderer becomes more precise
**Cons**: Additional memory tracking, still doesn't address layering

### Recommended Approach

**Option A** is the cleanest solution because:
1. Establishes proper layer hierarchy (tiles below, overlays above)
2. Follows common game rendering patterns
3. Prevents future similar issues
4. Makes z-ordering explicit and predictable

## Open Questions

1. Should there be additional overlay layers for future features (unit selection, movement range preview, etc.)?
2. Should TileHighlight expose its graphic for debugging or should it remain encapsulated?
3. Are there performance considerations with multiple containers that need testing?
