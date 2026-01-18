# Plan: Missing Features Implementation (Phases 1.5-1.9)

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

This plan covers the remaining Phase 1 features for OpenCiv: tile hover detection (1.6), tile information panel (1.7), and polish items (1.9). Phase 1.5 (tilemap rendering) is deferred as the current Graphics-based rendering is sufficient for the current scope. The implementation uses TypeScript, PixiJS 8.x, and HTML/CSS overlays for UI.

## Research Summary

Key findings from the research phase:

- **Current Rendering**: Uses individual PixiJS `Graphics` objects per tile via `TileRenderer.addTile()`. Works well for Duel-size maps (1,536 tiles).
- **Coordinate Conversion**: `HexGridLayout.worldToHex()` already exists and correctly converts screen positions to hex coordinates.
- **Tile Data**: `MapGenerator.generate()` returns `GeneratedTile[]` with position, terrain, and feature. Resources are not yet generated.
- **Camera State**: `CameraController` provides `getZoom()` and `getPosition()` for coordinate transforms.
- **ECS**: Components are defined in `/Users/alex/workspace/civ/src/ecs/world.ts` but not yet integrated into main.ts.
- **Test Coverage**: Comprehensive unit tests exist; E2E tests verify canvas rendering and camera controls.

## Phased Implementation

### Phase 1.5: Tilemap Rendering - DEFERRED

**Decision**: Skip for now. Current approach using individual `Graphics` objects performs adequately. This can be revisited if performance issues arise with larger map sizes.

**Rationale**:
- Duel map (48x32 = 1,536 tiles) renders smoothly
- PixiJS handles moderate tile counts well with GPU batching
- Optimization adds complexity without immediate benefit

---

### Phase 1.6: Tile Hover Detection

**Goal**: Detect which tile the cursor is hovering over and provide visual feedback.

#### Tasks

- [x] Create `src/ui/HoverState.ts` - State class to track hovered tile
- [x] Create `src/ui/HoverSystem.ts` - System to update hover state from mouse position
- [x] Create `src/render/TileHighlight.ts` - Highlight graphic for hovered tile
- [x] Modify `src/main.ts` - Integrate hover detection into game loop
- [x] Create `src/ui/index.ts` - Barrel export for UI module
- [x] Write unit tests for world-to-screen coordinate conversion with zoom/pan
- [x] Write E2E test for hover detection

#### Implementation Details

**HoverState.ts**
```typescript
export interface HoveredTile {
  position: TilePosition;
  terrain: Terrain;
  feature: TileFeature | null;
}

export class HoverState {
  private current: HoveredTile | null = null;
  private listeners: ((tile: HoveredTile | null) => void)[] = [];

  get(): HoveredTile | null;
  set(tile: HoveredTile | null): void;
  subscribe(listener: (tile: HoveredTile | null) => void): () => void;
}
```

**HoverSystem.ts**
```typescript
export class HoverSystem {
  constructor(
    layout: HexGridLayout,
    camera: CameraController,
    tileMap: Map<string, GeneratedTile>  // key: "q,r"
  );

  // Convert screen coords to world coords accounting for camera transform
  screenToWorld(screenX: number, screenY: number): Vec2;

  // Handle mouse move event
  handleMouseMove(event: MouseEvent): HoveredTile | null;

  // Attach to canvas element
  attach(canvas: HTMLCanvasElement): void;
  detach(): void;
}
```

**Coordinate Transform Logic**:
```typescript
screenToWorld(screenX: number, screenY: number): Vec2 {
  const cameraPos = this.camera.getPosition();
  const zoom = this.camera.getZoom();
  return {
    x: (screenX - cameraPos.x) / zoom,
    y: (screenY - cameraPos.y) / zoom
  };
}
```

**TileHighlight.ts**
```typescript
export class TileHighlight {
  private graphic: Graphics;
  private layout: HexGridLayout;

  constructor(container: Container, layout: HexGridLayout);

  show(position: TilePosition): void;  // Draw highlight at position
  hide(): void;                         // Remove highlight
  setColor(color: number): void;        // Customize highlight color
}
```

**Integration in main.ts**:
```typescript
// After map generation, build tile lookup
const tileMap = new Map<string, GeneratedTile>();
for (const tile of tiles) {
  tileMap.set(tile.position.key(), tile);
}

// Create hover system
const hoverState = new HoverState();
const hoverSystem = new HoverSystem(layout, camera, tileMap);
const tileHighlight = new TileHighlight(worldContainer, layout);

hoverSystem.attach(app.canvas);

hoverState.subscribe((tile) => {
  if (tile) {
    tileHighlight.show(tile.position);
  } else {
    tileHighlight.hide();
  }
});

app.ticker.add(() => {
  // ... existing camera update
});
```

#### Success Criteria
- [x] Mouse position correctly converts to hex coordinate at all zoom levels
- [x] Hovered tile is visually highlighted with distinct outline/glow
- [x] Highlight follows cursor smoothly during pan/zoom
- [x] HoverState updates in real-time as cursor moves
- [x] No performance degradation from hover detection

---

### Phase 1.7: Tile Information Panel

**Goal**: Display detailed tile information in an HTML/CSS overlay panel when hovering.

#### Tasks

- [ ] Create `src/ui/TileInfoPanel.ts` - Panel component with show/hide logic
- [ ] Add panel styles to `src/style.css`
- [ ] Modify `index.html` - Add panel container element
- [ ] Integrate with HoverState subscription
- [ ] Add yield calculation display
- [ ] Write E2E test for panel visibility and content

#### Implementation Details

**index.html modifications**:
```html
<body>
  <div id="game-container"></div>
  <div id="tile-info-panel" class="hidden">
    <div class="panel-header">Tile Info</div>
    <div class="panel-content">
      <div class="info-row"><span class="label">Position:</span> <span id="tile-coords"></span></div>
      <div class="info-row"><span class="label">Terrain:</span> <span id="tile-terrain"></span></div>
      <div class="info-row"><span class="label">Feature:</span> <span id="tile-feature"></span></div>
      <div class="yields-section">
        <div class="yield-item"><span class="yield-icon food"></span><span id="yield-food">0</span></div>
        <div class="yield-item"><span class="yield-icon production"></span><span id="yield-production">0</span></div>
        <div class="yield-item"><span class="yield-icon gold"></span><span id="yield-gold">0</span></div>
      </div>
    </div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
```

**style.css additions**:
```css
#tile-info-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid #4a4a6a;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 200px;
  color: #e0e0e0;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  z-index: 100;
  transition: opacity 0.15s ease;
}

#tile-info-panel.hidden {
  opacity: 0;
  pointer-events: none;
}

.panel-header {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
  color: #ffffff;
  border-bottom: 1px solid #4a4a6a;
  padding-bottom: 6px;
}

.info-row {
  margin: 4px 0;
}

.info-row .label {
  color: #a0a0b0;
}

.yields-section {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #4a4a6a;
}

.yield-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.yield-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.yield-icon.food { background: #4CAF50; }
.yield-icon.production { background: #FF9800; }
.yield-icon.gold { background: #FFD700; }
```

**TileInfoPanel.ts**:
```typescript
export class TileInfoPanel {
  private panel: HTMLElement;
  private coordsEl: HTMLElement;
  private terrainEl: HTMLElement;
  private featureEl: HTMLElement;
  private foodEl: HTMLElement;
  private productionEl: HTMLElement;
  private goldEl: HTMLElement;

  constructor();

  show(tile: HoveredTile): void {
    const yields = calculateYields(tile.terrain, tile.feature, null);

    this.coordsEl.textContent = `(${tile.position.q}, ${tile.position.r})`;
    this.terrainEl.textContent = this.formatTerrain(tile.terrain);
    this.featureEl.textContent = tile.feature ?? 'None';
    this.foodEl.textContent = yields.food.toString();
    this.productionEl.textContent = yields.production.toString();
    this.goldEl.textContent = yields.gold.toString();

    this.panel.classList.remove('hidden');
  }

  hide(): void {
    this.panel.classList.add('hidden');
  }

  private formatTerrain(terrain: Terrain): string {
    // "GrasslandHill" -> "Grassland Hill"
    return terrain.replace(/([A-Z])/g, ' $1').trim();
  }
}
```

**Integration in main.ts**:
```typescript
const tileInfoPanel = new TileInfoPanel();

hoverState.subscribe((tile) => {
  if (tile) {
    tileHighlight.show(tile.position);
    tileInfoPanel.show(tile);
  } else {
    tileHighlight.hide();
    tileInfoPanel.hide();
  }
});
```

#### Success Criteria
- [ ] Panel appears when cursor is over a valid tile
- [ ] Panel disappears when cursor leaves all tiles
- [ ] Correct coordinates displayed in (q, r) format
- [ ] Terrain name is human-readable (spaces between words)
- [ ] Feature shows correctly or "None" if absent
- [ ] Yields calculate and display correctly
- [ ] Panel does not block map interaction (positioned in corner)
- [ ] Smooth show/hide transitions

---

### Phase 1.9: Polish (Hotkeys, Seed Display, Documentation)

**Goal**: Add quality-of-life features and cleanup.

#### Tasks

- [ ] Add map regeneration hotkey (R key)
- [ ] Add seed display in UI corner
- [ ] Add seed input field for reproducible maps
- [ ] Update CLAUDE.md to remove TileFactory reference
- [ ] Add JSDoc comments to public APIs
- [ ] Verify all E2E tests pass

#### Implementation Details

**Seed Display and Regeneration**

Add to `index.html`:
```html
<div id="map-controls">
  <span id="seed-display">Seed: 12345</span>
  <button id="regenerate-btn" title="Press R to regenerate">Regenerate</button>
</div>
```

Add to `style.css`:
```css
#map-controls {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(26, 26, 46, 0.85);
  border: 1px solid #4a4a6a;
  border-radius: 6px;
  padding: 8px 12px;
  color: #e0e0e0;
  font-family: 'Segoe UI', sans-serif;
  font-size: 12px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
}

#regenerate-btn {
  background: #4a4a6a;
  border: none;
  border-radius: 4px;
  color: #ffffff;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
}

#regenerate-btn:hover {
  background: #6a6a8a;
}
```

**MapControls.ts**:
```typescript
export class MapControls {
  private seedDisplay: HTMLElement;
  private regenerateBtn: HTMLElement;
  private currentSeed: number;
  private onRegenerate: (seed: number) => void;

  constructor(onRegenerate: (seed: number) => void);

  setSeed(seed: number): void;
  generateNewSeed(): number;

  // Attach keyboard handler for 'R' key
  attachKeyboardHandler(): void;
  detachKeyboardHandler(): void;
}
```

**Integration in main.ts**:
```typescript
let currentSeed = config.seed;

function regenerateMap(seed: number) {
  // Clear existing tiles
  tileRenderer.clear();
  tileMap.clear();

  // Generate new map
  const newConfig = MapConfig.duel(seed);
  const generator = new MapGenerator(newConfig);
  const newTiles = generator.generate();

  // Render new tiles
  for (const tile of newTiles) {
    tileRenderer.addTile(tile.position, tile.terrain);
    tileMap.set(tile.position.key(), tile);
  }

  currentSeed = seed;
  mapControls.setSeed(seed);
  console.log(`Map regenerated with seed: ${seed}`);
}

const mapControls = new MapControls(regenerateMap);
mapControls.setSeed(currentSeed);
mapControls.attachKeyboardHandler();
```

**CLAUDE.md Updates**:
- Remove reference to non-existent `TileFactory.ts`
- Add documentation for new UI modules
- Update module structure section

#### Success Criteria
- [ ] Pressing 'R' regenerates map with new random seed
- [ ] Current seed displays in top-right corner
- [ ] Regenerate button works same as R key
- [ ] New seed produces different map; same seed produces identical map
- [ ] CLAUDE.md is accurate (no phantom file references)
- [ ] All existing tests pass after changes

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/ui/HoverState.ts` | Create | Reactive hover state management |
| `/Users/alex/workspace/civ/src/ui/HoverSystem.ts` | Create | Mouse-to-hex detection system |
| `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts` | Create | HTML panel controller |
| `/Users/alex/workspace/civ/src/ui/MapControls.ts` | Create | Seed display and regeneration |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Create | UI module barrel export |
| `/Users/alex/workspace/civ/src/render/TileHighlight.ts` | Create | Hover highlight graphic |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Integrate all new systems |
| `/Users/alex/workspace/civ/index.html` | Modify | Add UI panel containers |
| `/Users/alex/workspace/civ/src/style.css` | Modify | Add panel and control styles |
| `/Users/alex/workspace/civ/CLAUDE.md` | Modify | Update module documentation |
| `/Users/alex/workspace/civ/tests/e2e/hover.spec.ts` | Create | E2E tests for hover and panel |

**Total: 9 files to create, 3 files to modify**

## Success Criteria

### Functional Requirements
- [ ] Hovering over tiles shows highlight and info panel
- [ ] Moving cursor away hides panel
- [ ] Panel shows correct terrain, feature, and yields
- [ ] 'R' key regenerates map with new seed
- [ ] Seed is displayed and map is reproducible from seed

### Performance Requirements
- [ ] Hover detection adds no noticeable frame drops
- [ ] Panel show/hide is smooth (CSS transitions)
- [ ] Map regeneration completes in under 1 second

### Code Quality Requirements
- [ ] All new public functions have JSDoc comments
- [ ] Unit tests for HoverSystem coordinate conversion
- [ ] E2E tests for hover detection and panel display
- [ ] No TypeScript errors or ESLint warnings

## Dependencies & Integration

### Depends On
- `HexGridLayout.worldToHex()` - Already implemented
- `CameraController.getPosition()`, `getZoom()` - Already implemented
- `calculateYields()` - Already implemented in `/Users/alex/workspace/civ/src/tile/TileYields.ts`
- `TilePosition.key()` - Already implemented for map lookups

### Consumed By (Future Phases)
- **Unit Selection**: Will extend HoverSystem for click detection
- **City View**: Will use TileInfoPanel pattern for city info display
- **Multiplayer**: MapControls seed sharing for synchronized maps

### Integration Points
- **DOM Layer**: HTML panel overlays above canvas
- **PixiJS Canvas**: Mouse events from canvas element
- **Game Loop**: Ticker integration for state updates

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Coordinate conversion at extreme zoom | High | Medium | Test at min (0.5x) and max (3.0x) zoom levels |
| Panel updates causing frame drops | Low | Low | Debounce updates if needed; CSS-only transitions |
| Hover detection near tile edges | Medium | Medium | Use honeycomb-grid's proven rounding algorithm |
| Keyboard event conflicts | Low | Low | Check for input focus before processing hotkeys |
| Memory leaks from event listeners | Medium | Medium | Implement proper cleanup with destroy() methods |

## Implementation Order

Recommended implementation sequence:

1. **HoverState + HoverSystem** (Phase 1.6 core)
   - Get coordinate conversion working first
   - Test with console.log before visual feedback

2. **TileHighlight** (Phase 1.6 visual)
   - Add highlight graphic
   - Verify follows cursor at all zoom levels

3. **TileInfoPanel** (Phase 1.7)
   - Add HTML structure and CSS
   - Connect to HoverState

4. **MapControls** (Phase 1.9)
   - Add seed display
   - Implement regeneration

5. **Documentation + Tests** (Phase 1.9)
   - Update CLAUDE.md
   - Add E2E tests
   - Add JSDoc comments

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 1.6 Hover Detection | HoverState, HoverSystem, TileHighlight, integration | 2-3 hours |
| 1.7 Tile Info Panel | HTML/CSS, TileInfoPanel, integration | 1-2 hours |
| 1.9 Polish | MapControls, CLAUDE.md, tests | 1-2 hours |
| **Total** | | **4-7 hours** |

## Appendix: Terrain Display Names

| Enum Value | Display Name |
|------------|--------------|
| Grassland | Grassland |
| GrasslandHill | Grassland Hill |
| Plains | Plains |
| PlainsHill | Plains Hill |
| Desert | Desert |
| DesertHill | Desert Hill |
| Tundra | Tundra |
| TundraHill | Tundra Hill |
| Snow | Snow |
| SnowHill | Snow Hill |
| Mountain | Mountain |
| Coast | Coast |
| Ocean | Ocean |
| Lake | Lake |

## Appendix: Yield Icon Colors

| Yield Type | Color (Hex) | CSS Class |
|------------|-------------|-----------|
| Food | #4CAF50 (Green) | `.yield-icon.food` |
| Production | #FF9800 (Orange) | `.yield-icon.production` |
| Gold | #FFD700 (Gold) | `.yield-icon.gold` |
| Science | #2196F3 (Blue) | `.yield-icon.science` |
| Culture | #9C27B0 (Purple) | `.yield-icon.culture` |
| Faith | #FFFFFF (White) | `.yield-icon.faith` |
