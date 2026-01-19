# Plan: Missing Features Implementation

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

This plan covers the remaining Phase 1 features for OpenCiv: resource placement during map generation, tile information panel (1.7), and polish items (1.9). Phase 1.6 (tile hover detection) is already complete. Implementation uses TypeScript, PixiJS 8.x, and HTML/CSS overlays for UI.

## Research Summary

Key findings from the gap analysis:

- **Phase 1.6 (Hover Detection)**: COMPLETE - HoverState, HoverSystem, and TileHighlight all implemented
- **Resource Placement**: TileResource enum (26 resources) is fully defined with categories, yields, and improved yields, but MapGenerator does not place resources during generation
- **Tile Info Panel**: HoverState correctly tracks hovered tile data, but no UI displays this information
- **Polish Items**: No seed display, no map regeneration hotkey (R), limited JSDoc documentation
- **Architecture**: Using Map-based tile storage rather than full ECS, which is adequate for Phase 1

## Implementation Priority

Based on user preference:
1. **Resource Placement** (completes map generation)
2. **Tile Information Panel** (user-visible feedback)
3. **Polish** (seed display, hotkeys, documentation)

---

## Phased Implementation

### Phase A: Resource Placement

**Goal**: Extend MapGenerator to place resources on tiles based on terrain and feature compatibility.

**Status**: NOT STARTED

#### Tasks

- [ ] Define resource-terrain compatibility rules in `TileResource.ts`
- [ ] Add `resource` field to `GeneratedTile` interface in `MapGenerator.ts`
- [ ] Implement `determineResource()` method in `MapGenerator` class
- [ ] Update `generate()` to call resource placement
- [ ] Update `HoveredTile` interface to include resource
- [ ] Update `HoverSystem` to populate resource field
- [ ] Write unit tests for resource placement
- [ ] Write tests for resource-terrain compatibility

#### Implementation Details

**Resource-Terrain Compatibility Rules**

Add to `/Users/alex/workspace/civ/src/tile/TileResource.ts`:

```typescript
export interface ResourcePlacement {
  validTerrains: Terrain[];
  validFeatures: (TileFeature | null)[];  // null means "no feature required"
  spawnChance: number;  // 0.0 to 1.0
}

export const RESOURCE_PLACEMENT: Record<TileResource, ResourcePlacement> = {
  // Bonus Resources
  [TileResource.Cattle]: {
    validTerrains: [Terrain.Grassland],
    validFeatures: [null],
    spawnChance: 0.08,
  },
  [TileResource.Sheep]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill, Terrain.DesertHill],
    validFeatures: [null],
    spawnChance: 0.08,
  },
  [TileResource.Fish]: {
    validTerrains: [Terrain.Coast, Terrain.Ocean],
    validFeatures: [null],
    spawnChance: 0.10,
  },
  [TileResource.Stone]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill, Terrain.Desert, Terrain.DesertHill, Terrain.Tundra],
    validFeatures: [null],
    spawnChance: 0.05,
  },
  [TileResource.Wheat]: {
    validTerrains: [Terrain.Plains],
    validFeatures: [null, TileFeature.Floodplains],
    spawnChance: 0.10,
  },
  [TileResource.Bananas]: {
    validTerrains: [Terrain.Grassland],
    validFeatures: [TileFeature.Jungle],
    spawnChance: 0.15,
  },
  [TileResource.Deer]: {
    validTerrains: [Terrain.Tundra, Terrain.TundraHill],
    validFeatures: [null, TileFeature.Forest],
    spawnChance: 0.12,
  },

  // Strategic Resources
  [TileResource.Horses]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains, Terrain.Tundra],
    validFeatures: [null],
    spawnChance: 0.04,
  },
  [TileResource.Iron]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill, Terrain.DesertHill, Terrain.TundraHill, Terrain.SnowHill],
    validFeatures: [null, TileFeature.Forest],
    spawnChance: 0.03,
  },
  [TileResource.Coal]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill],
    validFeatures: [null, TileFeature.Forest, TileFeature.Jungle],
    spawnChance: 0.03,
  },
  [TileResource.Oil]: {
    validTerrains: [Terrain.Desert, Terrain.Tundra, Terrain.Snow, Terrain.Coast, Terrain.Ocean],
    validFeatures: [null, TileFeature.Marsh],
    spawnChance: 0.02,
  },
  [TileResource.Aluminum]: {
    validTerrains: [Terrain.Plains, Terrain.PlainsHill, Terrain.Desert, Terrain.DesertHill, Terrain.Tundra],
    validFeatures: [null],
    spawnChance: 0.02,
  },
  [TileResource.Uranium]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill, Terrain.DesertHill, Terrain.TundraHill, Terrain.SnowHill, Terrain.Jungle],
    validFeatures: [null, TileFeature.Forest, TileFeature.Jungle, TileFeature.Marsh],
    spawnChance: 0.01,
  },

  // Luxury Resources
  [TileResource.Citrus]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains],
    validFeatures: [null, TileFeature.Jungle],
    spawnChance: 0.03,
  },
  [TileResource.Cotton]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains, Terrain.Desert],
    validFeatures: [null, TileFeature.Floodplains],
    spawnChance: 0.03,
  },
  [TileResource.Copper]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill, Terrain.DesertHill, Terrain.TundraHill],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Gold]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill, Terrain.DesertHill, Terrain.Grassland, Terrain.Plains, Terrain.Desert],
    validFeatures: [null],
    spawnChance: 0.02,
  },
  [TileResource.Crab]: {
    validTerrains: [Terrain.Coast],
    validFeatures: [null],
    spawnChance: 0.06,
  },
  [TileResource.Whales]: {
    validTerrains: [Terrain.Coast, Terrain.Ocean],
    validFeatures: [null],
    spawnChance: 0.04,
  },
  [TileResource.Turtles]: {
    validTerrains: [Terrain.Coast],
    validFeatures: [null],
    spawnChance: 0.04,
  },
  [TileResource.Olives]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Wine]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Silk]: {
    validTerrains: [Terrain.Grassland],
    validFeatures: [TileFeature.Forest],
    spawnChance: 0.04,
  },
  [TileResource.Spices]: {
    validTerrains: [Terrain.Grassland, Terrain.Plains],
    validFeatures: [TileFeature.Jungle],
    spawnChance: 0.05,
  },
  [TileResource.Gems]: {
    validTerrains: [Terrain.GrasslandHill, Terrain.PlainsHill, Terrain.DesertHill, Terrain.TundraHill, Terrain.Grassland],
    validFeatures: [null, TileFeature.Jungle],
    spawnChance: 0.02,
  },
  [TileResource.Marble]: {
    validTerrains: [Terrain.Grassland, Terrain.GrasslandHill, Terrain.Plains, Terrain.PlainsHill, Terrain.Desert, Terrain.DesertHill, Terrain.Tundra],
    validFeatures: [null],
    spawnChance: 0.03,
  },
  [TileResource.Ivory]: {
    validTerrains: [Terrain.Plains],
    validFeatures: [null],
    spawnChance: 0.03,
  },
};

export function canPlaceResource(
  resource: TileResource,
  terrain: Terrain,
  feature: TileFeature | null
): boolean {
  const placement = RESOURCE_PLACEMENT[resource];
  if (!placement.validTerrains.includes(terrain)) return false;
  // If validFeatures includes null, resource can spawn without feature
  // Otherwise, feature must match one in the list
  if (placement.validFeatures.includes(null) && feature === null) return true;
  if (feature !== null && placement.validFeatures.includes(feature)) return true;
  if (placement.validFeatures.includes(null)) return true;  // null means "any" including no feature
  return false;
}
```

**Update GeneratedTile Interface**

Modify `/Users/alex/workspace/civ/src/map/MapGenerator.ts`:

```typescript
import { TileResource, canPlaceResource, RESOURCE_PLACEMENT, getAllResources } from '../tile/TileResource';

export interface GeneratedTile {
  position: TilePosition;
  terrain: Terrain;
  feature: TileFeature | null;
  resource: TileResource | null;  // NEW FIELD
}
```

**Add determineResource() Method**

```typescript
determineResource(
  terrain: Terrain,
  feature: TileFeature | null
): TileResource | null {
  // Collect all valid resources for this tile
  const candidates: TileResource[] = [];

  for (const resource of getAllResources()) {
    if (canPlaceResource(resource, terrain, feature)) {
      candidates.push(resource);
    }
  }

  if (candidates.length === 0) return null;

  // Roll for each candidate resource
  for (const resource of candidates) {
    const placement = RESOURCE_PLACEMENT[resource];
    if (this.rng() < placement.spawnChance) {
      return resource;
    }
  }

  return null;
}
```

**Update generate() Method**

```typescript
generate(): GeneratedTile[] {
  const [width, height] = this.config.getDimensions();
  const heightMap = this.generateHeightMap();
  const tempMap = this.generateTemperatureMap();
  const moistureMap = this.generateMoistureMap();

  const tiles: GeneratedTile[] = [];

  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      const terrain = this.determineTerrain(heightMap[q][r], tempMap[q][r]);
      const feature = this.determineFeature(
        terrain,
        tempMap[q][r],
        moistureMap[q][r]
      );
      const resource = this.determineResource(terrain, feature);  // NEW

      tiles.push({
        position: new TilePosition(q, r),
        terrain,
        feature,
        resource,  // NEW
      });
    }
  }

  return tiles;
}
```

**Update HoveredTile Interface**

Modify `/Users/alex/workspace/civ/src/ui/HoverState.ts`:

```typescript
import { TileResource } from '../tile/TileResource';

export interface HoveredTile {
  position: TilePosition;
  terrain: Terrain;
  feature: TileFeature | null;
  resource: TileResource | null;  // NEW FIELD
}
```

#### Success Criteria

- [ ] All 26 resources have defined placement rules
- [ ] Resources only spawn on compatible terrain/feature combinations
- [ ] Resource distribution is deterministic (same seed = same resources)
- [ ] Resource spawn rates are reasonable (not too sparse or dense)
- [ ] Unit tests verify placement rules
- [ ] Unit tests verify determinism

---

### Phase B: Tile Information Panel

**Goal**: Display detailed tile information in an HTML/CSS overlay panel when hovering.

**Status**: NOT STARTED (HoverState ready, needs UI)

#### Tasks

- [ ] Create `src/ui/TileInfoPanel.ts` - Panel component with show/hide logic
- [ ] Add panel styles to `src/style.css`
- [ ] Modify `index.html` - Add panel container element
- [ ] Integrate with HoverState subscription in `main.ts`
- [ ] Display resource name (from Phase A)
- [ ] Display calculated yields using `calculateYields()`
- [ ] Write E2E test for panel visibility and content

#### Implementation Details

**index.html additions**

Add inside `<body>`, after game-container:

```html
<div id="tile-info-panel" class="hidden">
  <div class="panel-header">Tile Info</div>
  <div class="panel-content">
    <div class="info-row"><span class="label">Position:</span> <span id="tile-coords"></span></div>
    <div class="info-row"><span class="label">Terrain:</span> <span id="tile-terrain"></span></div>
    <div class="info-row"><span class="label">Feature:</span> <span id="tile-feature"></span></div>
    <div class="info-row"><span class="label">Resource:</span> <span id="tile-resource"></span></div>
    <div class="yields-section">
      <div class="yield-item"><span class="yield-icon food"></span><span id="yield-food">0</span></div>
      <div class="yield-item"><span class="yield-icon production"></span><span id="yield-production">0</span></div>
      <div class="yield-item"><span class="yield-icon gold"></span><span id="yield-gold">0</span></div>
    </div>
  </div>
</div>
```

**style.css additions**

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

**TileInfoPanel.ts**

Create `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts`:

```typescript
import { HoveredTile } from './HoverState';
import { calculateYields } from '../tile/TileYields';
import { Terrain } from '../tile/Terrain';

/**
 * Manages the tile information panel DOM element.
 * Shows/hides and updates content based on hovered tile.
 */
export class TileInfoPanel {
  private panel: HTMLElement;
  private coordsEl: HTMLElement;
  private terrainEl: HTMLElement;
  private featureEl: HTMLElement;
  private resourceEl: HTMLElement;
  private foodEl: HTMLElement;
  private productionEl: HTMLElement;
  private goldEl: HTMLElement;

  constructor() {
    this.panel = document.getElementById('tile-info-panel')!;
    this.coordsEl = document.getElementById('tile-coords')!;
    this.terrainEl = document.getElementById('tile-terrain')!;
    this.featureEl = document.getElementById('tile-feature')!;
    this.resourceEl = document.getElementById('tile-resource')!;
    this.foodEl = document.getElementById('yield-food')!;
    this.productionEl = document.getElementById('yield-production')!;
    this.goldEl = document.getElementById('yield-gold')!;
  }

  /**
   * Show the panel with tile information.
   */
  show(tile: HoveredTile): void {
    const yields = calculateYields(tile.terrain, tile.feature, tile.resource);

    this.coordsEl.textContent = `(${tile.position.q}, ${tile.position.r})`;
    this.terrainEl.textContent = this.formatTerrain(tile.terrain);
    this.featureEl.textContent = tile.feature ?? 'None';
    this.resourceEl.textContent = tile.resource ?? 'None';
    this.foodEl.textContent = yields.food.toString();
    this.productionEl.textContent = yields.production.toString();
    this.goldEl.textContent = yields.gold.toString();

    this.panel.classList.remove('hidden');
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    this.panel.classList.add('hidden');
  }

  /**
   * Format terrain enum value for display.
   * "GrasslandHill" -> "Grassland Hill"
   */
  private formatTerrain(terrain: Terrain): string {
    return terrain.replace(/([A-Z])/g, ' $1').trim();
  }
}
```

**Integration in main.ts**

Add after hover system setup:

```typescript
import { TileInfoPanel } from './ui/TileInfoPanel';

// ... existing code ...

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
- [ ] Resource shows correctly or "None" if absent
- [ ] Yields calculate and display correctly (including resource bonuses)
- [ ] Panel does not block map interaction (positioned in corner)
- [ ] Smooth show/hide transitions

---

### Phase C: Polish (Hotkeys, Seed Display, Documentation)

**Goal**: Add quality-of-life features and cleanup.

**Status**: NOT STARTED

#### Tasks

- [ ] Add seed display in UI corner
- [ ] Add map regeneration hotkey (R key)
- [ ] Create `src/ui/MapControls.ts` for controls logic
- [ ] Add clear() method to TileRenderer for map regeneration
- [ ] Update index.html with controls container
- [ ] Update style.css with controls styles
- [ ] Add JSDoc comments to public APIs
- [ ] Update CLAUDE.md to reflect current architecture
- [ ] Verify all E2E tests pass

#### Implementation Details

**index.html additions**

Add inside `<body>`:

```html
<div id="map-controls">
  <span id="seed-display">Seed: 42</span>
  <button id="regenerate-btn" title="Press R to regenerate">Regenerate (R)</button>
</div>
```

**style.css additions**

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

**MapControls.ts**

Create `/Users/alex/workspace/civ/src/ui/MapControls.ts`:

```typescript
/**
 * Manages map controls UI and keyboard shortcuts.
 */
export class MapControls {
  private seedDisplay: HTMLElement;
  private regenerateBtn: HTMLElement;
  private currentSeed: number;
  private onRegenerate: (seed: number) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  /**
   * @param onRegenerate - Callback invoked with new seed when regeneration is triggered
   */
  constructor(onRegenerate: (seed: number) => void) {
    this.seedDisplay = document.getElementById('seed-display')!;
    this.regenerateBtn = document.getElementById('regenerate-btn')!;
    this.currentSeed = 42;
    this.onRegenerate = onRegenerate;

    this.regenerateBtn.addEventListener('click', () => this.regenerate());

    this.keyHandler = (e: KeyboardEvent) => {
      // Only handle R if not typing in an input
      if (e.code === 'KeyR' && !(e.target instanceof HTMLInputElement)) {
        this.regenerate();
      }
    };
  }

  /**
   * Update the displayed seed value.
   */
  setSeed(seed: number): void {
    this.currentSeed = seed;
    this.seedDisplay.textContent = `Seed: ${seed}`;
  }

  /**
   * Generate a new random seed.
   */
  generateNewSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Trigger map regeneration with a new random seed.
   */
  private regenerate(): void {
    const newSeed = this.generateNewSeed();
    this.setSeed(newSeed);
    this.onRegenerate(newSeed);
  }

  /**
   * Attach keyboard handler for R key.
   */
  attachKeyboardHandler(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Remove keyboard handler.
   */
  detachKeyboardHandler(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }
}
```

**Add clear() to TileRenderer**

Modify `/Users/alex/workspace/civ/src/render/TileRenderer.ts`:

```typescript
/**
 * Remove all tile graphics from the container.
 */
clear(): void {
  this.container.removeChildren();
  // If tracking tiles in a map, clear it too
}
```

**Update main.ts for regeneration**

```typescript
import { MapControls } from './ui/MapControls';

// ... existing setup ...

function regenerateMap(seed: number) {
  // Clear existing tiles
  tileRenderer.clear();
  tileMap.clear();
  hoverState.set(null);  // Clear hover state
  tileHighlight.hide();

  // Generate new map
  const newConfig = MapConfig.duel(seed);
  const generator = new MapGenerator(newConfig);
  const newTiles = generator.generate();

  // Render new tiles
  for (const tile of newTiles) {
    tileMap.set(tile.position.key(), tile);
    tileRenderer.addTile(tile.position, tile.terrain);
  }

  console.log(`Map regenerated with seed: ${seed}`);
}

const mapControls = new MapControls(regenerateMap);
mapControls.setSeed(config.seed);
mapControls.attachKeyboardHandler();
```

**CLAUDE.md Updates**

- Add `src/ui/TileInfoPanel.ts` - DOM panel for tile information
- Add `src/ui/MapControls.ts` - Seed display and regeneration
- Update module structure to reflect current state
- Note that TileFactory.ts was not created (not needed)

#### Success Criteria

- [ ] Pressing 'R' regenerates map with new random seed
- [ ] Current seed displays in top-right corner
- [ ] Regenerate button works same as R key
- [ ] New seed produces different map; same seed produces identical map
- [ ] CLAUDE.md is accurate and up to date
- [ ] Key public functions have JSDoc comments
- [ ] All existing tests pass after changes

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `/Users/alex/workspace/civ/src/tile/TileResource.ts` | Modify | Add RESOURCE_PLACEMENT and canPlaceResource() |
| `/Users/alex/workspace/civ/src/map/MapGenerator.ts` | Modify | Add resource field and determineResource() |
| `/Users/alex/workspace/civ/src/ui/HoverState.ts` | Modify | Add resource field to HoveredTile |
| `/Users/alex/workspace/civ/src/ui/HoverSystem.ts` | Modify | Populate resource field |
| `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts` | Create | HTML panel controller |
| `/Users/alex/workspace/civ/src/ui/MapControls.ts` | Create | Seed display and regeneration |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Modify | Export new modules |
| `/Users/alex/workspace/civ/src/render/TileRenderer.ts` | Modify | Add clear() method |
| `/Users/alex/workspace/civ/src/main.ts` | Modify | Integrate TileInfoPanel and MapControls |
| `/Users/alex/workspace/civ/index.html` | Modify | Add UI panel containers |
| `/Users/alex/workspace/civ/src/style.css` | Modify | Add panel and control styles |
| `/Users/alex/workspace/civ/CLAUDE.md` | Modify | Update module documentation |
| `/Users/alex/workspace/civ/src/tile/TileResource.test.ts` | Modify | Add placement rule tests |
| `/Users/alex/workspace/civ/src/map/MapGenerator.test.ts` | Modify | Add resource generation tests |

**Total: 4 files to create, 10 files to modify**

---

## Success Criteria

### Functional Requirements
- [ ] All 26 resources can spawn on compatible tiles
- [ ] Hovering over tiles shows highlight and info panel
- [ ] Panel shows correct terrain, feature, resource, and yields
- [ ] 'R' key regenerates map with new seed
- [ ] Seed is displayed and map is reproducible from seed

### Performance Requirements
- [ ] Resource generation adds negligible time to map generation
- [ ] Hover detection adds no noticeable frame drops
- [ ] Panel show/hide is smooth (CSS transitions)
- [ ] Map regeneration completes in under 1 second

### Code Quality Requirements
- [ ] New public functions have JSDoc comments
- [ ] Unit tests for resource placement rules
- [ ] Unit tests for resource generation determinism
- [ ] E2E tests for tile info panel
- [ ] No TypeScript errors or ESLint warnings

---

## Dependencies & Integration

### Depends On
- `TileResource` enum and `RESOURCE_DATA` - Already implemented
- `HexGridLayout.worldToHex()` - Already implemented
- `CameraController.getPosition()`, `getZoom()` - Already implemented
- `calculateYields()` - Already implemented, accepts resource parameter
- `TilePosition.key()` - Already implemented

### Consumed By (Future Phases)
- **Unit Selection**: Will extend HoverSystem for click detection
- **City View**: Will use TileInfoPanel pattern for city info display
- **Tech Tree**: May gate resource visibility based on tech
- **Improvements**: Resources affect which improvements are valid

### Integration Points
- **DOM Layer**: HTML panel overlays above canvas
- **PixiJS Canvas**: Mouse events from canvas element
- **Game Loop**: Ticker integration for state updates

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Resource spawn rates feel wrong | Medium | Medium | Make spawn rates configurable; tune with playtesting |
| Too many resources on small maps | Medium | Medium | Consider density limits per category |
| Panel DOM elements not found | High | Low | Defensive null checks with clear error messages |
| Keyboard conflict with camera | Low | Low | CameraController already handles WASD; R should be safe |
| Memory leak on map regeneration | Medium | Low | Ensure clear() properly removes all references |

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase A: Resource Placement | Placement rules, determineResource(), tests | 2-3 hours |
| Phase B: Tile Info Panel | HTML/CSS, TileInfoPanel, integration | 1-2 hours |
| Phase C: Polish | MapControls, CLAUDE.md, JSDoc | 1-2 hours |
| **Total** | | **4-7 hours** |

---

## Appendix: Resource Spawn Rates Summary

| Category | Resources | Typical Spawn Rate |
|----------|-----------|-------------------|
| Bonus | Cattle, Sheep, Fish, Stone, Wheat, Bananas, Deer | 5-15% |
| Strategic | Horses, Iron, Coal, Oil, Aluminum, Uranium | 1-4% |
| Luxury | All others | 2-6% |

Note: Spawn rates are per-tile checks when terrain/feature match. Actual density depends on how many tiles match the placement rules.

## Appendix: Resource-Terrain Quick Reference

| Terrain | Possible Resources |
|---------|-------------------|
| Grassland | Cattle, Sheep, Stone, Bananas, Horses, Citrus, Cotton, Gold, Olives, Wine, Silk, Gems, Marble |
| Plains | Sheep, Stone, Wheat, Horses, Citrus, Cotton, Aluminum, Gold, Olives, Wine, Ivory, Spices, Marble |
| Desert | Stone, Cotton, Aluminum, Oil, Gold |
| Tundra | Stone, Deer, Horses, Aluminum, Oil, Marble |
| Snow | Oil |
| Hills (various) | Sheep, Stone, Iron, Coal, Copper, Gold, Gems, Marble |
| Coast | Fish, Crab, Whales, Turtles, Oil |
| Ocean | Fish, Whales, Oil |
