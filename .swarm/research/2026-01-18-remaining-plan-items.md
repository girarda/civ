# Research: Remaining Plan Items - Gap Analysis

**Date**: 2026-01-18
**Status**: Complete

## Summary

This document analyzes the original Rust/Bevy plan from `.swarm/plans/2026-01-17-hex-grid-game-rust.md` against the current TypeScript/PixiJS implementation. The codebase has successfully implemented most Phase 1 features with equivalent functionality, though using different technologies. Key gaps include the tile information UI panel, resource generation, map regeneration hotkey, and some documentation items.

## Key Discoveries

- Core hex math, terrain system, and map generation are **fully implemented** with comprehensive tests
- Camera controls and tile hover detection are **fully implemented** with visual highlighting
- ECS components are defined but **not actively used** in the main game loop (rendering uses a simpler approach)
- **Tile information panel (Phase 1.7)** is **not implemented** - no UI showing tile details on hover
- **Resource placement** during map generation is **not implemented** (TileResource exists but not used)
- **Seed display and map regeneration hotkey** are **not implemented**
- TypeScript implementation achieves feature parity with planned Rust features using equivalent patterns

## Architecture Overview

### Technology Mapping (Plan vs Implementation)

| Planned (Rust) | Implemented (TypeScript) | Status |
|----------------|-------------------------|--------|
| Bevy ECS | bitECS | Defined but underutilized |
| bevy_ecs_tilemap | PixiJS Graphics | Using simpler approach |
| hexx crate | Custom TilePosition + honeycomb-grid | Equivalent functionality |
| noise crate | simplex-noise | Equivalent functionality |
| rand crate | seedrandom | Equivalent functionality |
| bevy_egui | Not implemented | Gap - no UI framework |
| serde | Not needed (in-memory only) | Deferred to future phases |

### Current Module Structure

```
src/
  main.ts              - Entry point, game initialization
  hex/
    TilePosition.ts    - Hex coordinate wrapper (equivalent to planned coord.rs)
    HexGridLayout.ts   - Coordinate conversions (equivalent to planned layout.rs)
  tile/
    Terrain.ts         - 14 terrain types with yields
    TileFeature.ts     - 6 feature types with modifiers
    TileResource.ts    - 26 resources (defined but not used in generation)
    TileYields.ts      - Yield calculation
    RiverEdges.ts      - River edge bitmask
  map/
    MapConfig.ts       - Map sizes and parameters
    MapGenerator.ts    - Procedural generation
  render/
    TileRenderer.ts    - Terrain color mapping
    CameraController.ts - Pan and zoom
    TileHighlight.ts   - Hover visual feedback
  ui/
    HoverState.ts      - Reactive hover state
    HoverSystem.ts     - Mouse-to-hex detection
  ecs/
    world.ts           - ECS components (Position, Terrain, Feature, Resource, Yields, River)
    systems.ts         - ECS queries and system runners
```

## Phase-by-Phase Analysis

### Phase 1.1: Project Setup and Hex Math Foundation
**Status: FULLY IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| Project dependencies | Done | package.json with PixiJS, bitECS, honeycomb-grid, simplex-noise, seedrandom |
| Module structure | Done | Well-organized src/ with hex/, tile/, map/, render/, ui/, ecs/ modules |
| TilePosition wrapper | Done | `/Users/alex/workspace/civ/src/hex/TilePosition.ts` with neighbors, range, ring, distance |
| HexGridLayout | Done | `/Users/alex/workspace/civ/src/hex/HexGridLayout.ts` with hex-to-world and world-to-hex |
| Unit tests for hex math | Done | `/Users/alex/workspace/civ/src/hex/TilePosition.test.ts` - comprehensive coverage |
| Coordinate conversion tests | Done | `/Users/alex/workspace/civ/src/hex/HexGridLayout.test.ts` |

### Phase 1.2: Tile Data Model
**Status: FULLY IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| Terrain enum (14 variants) | Done | `/Users/alex/workspace/civ/src/tile/Terrain.ts` - all 14 types with yields |
| Terrain methods (food, prod, movement) | Done | `TERRAIN_DATA` with complete yield and attribute data |
| TileFeature enum (6 types) | Done | `/Users/alex/workspace/civ/src/tile/TileFeature.ts` with modifiers and valid terrains |
| TileResource enum (26 resources) | Done | `/Users/alex/workspace/civ/src/tile/TileResource.ts` with categories and bonuses |
| TileYields calculation | Done | `/Users/alex/workspace/civ/src/tile/TileYields.ts` - calculateYields() combining terrain+feature+resource |
| RiverEdges bitmask | Done | `/Users/alex/workspace/civ/src/tile/RiverEdges.ts` - 6-edge bitmask operations |
| TileBundle (ECS) | Partial | Components defined in world.ts but no formal bundle pattern |
| Serde serialization | Not Done | Not needed yet (TypeScript equivalent would be JSON serialization) |
| Unit tests for yields | Done | `/Users/alex/workspace/civ/src/tile/TileYields.test.ts` |

### Phase 1.3: Map Configuration and Procedural Generator
**Status: MOSTLY IMPLEMENTED (missing resource generation)**

| Item | Status | Notes |
|------|--------|-------|
| MapConfig with width/height/seed | Done | `/Users/alex/workspace/civ/src/map/MapConfig.ts` |
| Map size presets (Duel to Huge) | Done | All 6 sizes defined with correct dimensions |
| generate_height_map() with Fbm | Done | Multi-octave noise in MapGenerator.ts |
| Edge falloff | Done | Circular falloff implemented |
| generate_temperature_map() | Done | Latitude-based gradient with noise |
| generate_moisture_map() | Done | Fbm noise implementation |
| determine_terrain() | Done | Height/temperature mapping to 14 terrain types |
| determine_feature() | Done | Forest, jungle, marsh, oasis placement |
| Resource placement | **NOT DONE** | TileResource defined but not generated |
| Deterministic generation tests | Done | Same seed produces identical maps |
| Terrain distribution tests | Done | Comprehensive tests in MapGenerator.test.ts |

### Phase 1.4: Simple Sprite Rendering (Prototype)
**Status: FULLY IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| Camera component and spawn | Done | CameraController creates PixiJS container transforms |
| Camera movement (WASD/Arrow) | Done | Keyboard input handling in update() loop |
| Camera zoom (mouse wheel) | Done | Zoom 0.5x to 3.0x range |
| Terrain color mapping | Done | `/Users/alex/workspace/civ/src/render/TileRenderer.ts` with TERRAIN_COLORS |
| spawn_simple_hexes() | Done | Graphics-based hex rendering |

### Phase 1.5: Tilemap Rendering (Production)
**Status: INTENTIONALLY SKIPPED**

| Item | Status | Notes |
|------|--------|-------|
| bevy_ecs_tilemap integration | N/A | Using PixiJS Graphics instead |
| Sprite atlas | Not Done | Using colored graphics primitives |
| Feature flag for render mode | Not Done | Only one render mode |
| Performance optimization | Acceptable | Simple rendering adequate for current map sizes |

The TypeScript implementation uses PixiJS Graphics primitives directly rather than a tilemap approach. This is adequate for Phase 1 and can be optimized later if needed.

### Phase 1.6: Tile Hover Detection
**Status: FULLY IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| HoveredTile resource | Done | `/Users/alex/workspace/civ/src/ui/HoverState.ts` - reactive state with subscriptions |
| update_hovered_tile() system | Done | `/Users/alex/workspace/civ/src/ui/HoverSystem.ts` - screen-to-world-to-hex conversion |
| Edge cases (outside window) | Done | mouseLeave handler clears hover state |
| Visual feedback (highlight) | Done | `/Users/alex/workspace/civ/src/render/TileHighlight.ts` - semi-transparent overlay |
| Tests for hover detection | Done | HoverState.test.ts, HoverSystem.test.ts |

### Phase 1.7: Tile Information Panel
**Status: NOT IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| TileHoverUI resource | **NOT DONE** | No UI panel system |
| tile_hover_ui() system | **NOT DONE** | No egui or equivalent |
| Display coordinates | **NOT DONE** | |
| Display terrain/feature/resource | **NOT DONE** | Data available in HoverState but not displayed |
| Display yields | **NOT DONE** | calculateYields() ready but not wired to UI |
| Panel positioning | **NOT DONE** | |

**This is a significant gap.** The hover system correctly identifies tiles and stores data, but there is no UI to display this information to the user.

### Phase 1.8: Game Plugin Assembly
**Status: PARTIALLY IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| Main entry point | Done | `/Users/alex/workspace/civ/src/main.ts` |
| Resource registration | Partial | Resources created but ECS not used for game state |
| Startup systems | Done | Camera spawn, map generation, tile rendering |
| Update systems | Done | Camera movement in game loop |
| Window configuration | Done | Fullscreen with resize handling |
| lib.rs for testing | N/A | TypeScript uses Vitest directly |

The game runs but uses a simpler architecture than the planned ECS-centric approach.

### Phase 1.9: Testing and Polish
**Status: PARTIALLY IMPLEMENTED**

| Item | Status | Notes |
|------|--------|-------|
| Unit tests for all modules | Mostly Done | 11 test files covering major functionality |
| Integration tests | Done | Map generation verification in MapGenerator.test.ts |
| API documentation | **NOT DONE** | No JSDoc comments on most functions |
| Seed display in UI | **NOT DONE** | |
| Map regeneration hotkey (R) | **NOT DONE** | No way to regenerate map at runtime |
| Performance profiling | Not Done | No formal profiling completed |
| Edge case fixes | Unknown | No known issues documented |

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/main.ts` | Application entry point, initializes PixiJS and game loop |
| `/Users/alex/workspace/civ/src/hex/TilePosition.ts` | Hex coordinate wrapper with neighbor/range/ring operations |
| `/Users/alex/workspace/civ/src/hex/HexGridLayout.ts` | Hex-to-world and world-to-hex coordinate conversions |
| `/Users/alex/workspace/civ/src/tile/Terrain.ts` | 14 terrain types with base yields and properties |
| `/Users/alex/workspace/civ/src/tile/TileFeature.ts` | 6 feature types with yield modifiers |
| `/Users/alex/workspace/civ/src/tile/TileResource.ts` | 26 resources (defined but unused in generation) |
| `/Users/alex/workspace/civ/src/tile/TileYields.ts` | Yield calculation combining terrain+feature+resource |
| `/Users/alex/workspace/civ/src/map/MapConfig.ts` | Map size presets and generation parameters |
| `/Users/alex/workspace/civ/src/map/MapGenerator.ts` | Procedural terrain and feature generation |
| `/Users/alex/workspace/civ/src/render/TileRenderer.ts` | Terrain color mapping and hex graphics |
| `/Users/alex/workspace/civ/src/render/CameraController.ts` | Pan and zoom controls |
| `/Users/alex/workspace/civ/src/render/TileHighlight.ts` | Visual feedback for hovered tile |
| `/Users/alex/workspace/civ/src/ui/HoverState.ts` | Reactive state management for hover |
| `/Users/alex/workspace/civ/src/ui/HoverSystem.ts` | Screen-to-hex hover detection |
| `/Users/alex/workspace/civ/src/ecs/world.ts` | bitECS component definitions |
| `/Users/alex/workspace/civ/src/ecs/systems.ts` | ECS queries and system utilities |

## Recommendations

### High Priority (Core Functionality Gaps)

1. **Implement Tile Information Panel (Phase 1.7)**
   - Add a UI framework or build custom DOM-based panel
   - Display: coordinates, terrain name, feature, resource, yields
   - Position at bottom-left, show only when hovering a tile
   - Options: Custom HTML/CSS overlay, or integrate a library like lil-gui

2. **Implement Resource Generation**
   - Extend MapGenerator to place resources based on terrain
   - Resources are already defined in TileResource.ts
   - Add resource to GeneratedTile interface
   - Implement placement rules based on terrain compatibility

### Medium Priority (Polish)

3. **Add Seed Display and Map Regeneration**
   - Display current seed in UI corner
   - Add 'R' key handler to regenerate map with new random seed
   - Consider UI input for custom seed

4. **Integrate ECS with Rendering**
   - Currently tiles are stored in a Map and rendered directly
   - Consider using bitECS for tile storage if planning multiplayer or save/load
   - Current approach is adequate for single-player prototype

5. **Add JSDoc Documentation**
   - Document public functions and classes
   - Especially: TilePosition, HexGridLayout, MapGenerator, TileRenderer

### Lower Priority (Future Phases)

6. **Performance Optimization**
   - Profile with Huge map (128x80 = 10,240 tiles)
   - Consider batch rendering or tilemap approach if needed
   - Current approach likely adequate for Phase 1

7. **Save/Load Preparation**
   - Add JSON serialization methods to tile types
   - Plan save file format for future phases

## Summary of Implementation Status

| Phase | Status | Completeness |
|-------|--------|--------------|
| 1.1 Project Setup + Hex Math | COMPLETE | 100% |
| 1.2 Tile Data Model | COMPLETE | 95% (missing serde) |
| 1.3 Procedural Generator | MOSTLY COMPLETE | 85% (missing resources) |
| 1.4 Simple Rendering | COMPLETE | 100% |
| 1.5 Tilemap Rendering | SKIPPED | N/A (using simpler approach) |
| 1.6 Hover Detection | COMPLETE | 100% |
| 1.7 Info Panel | **NOT STARTED** | 0% |
| 1.8 Plugin Assembly | COMPLETE | 90% |
| 1.9 Testing + Polish | PARTIAL | 60% |

**Overall Phase 1 Completion: ~80%**

The major gap is the tile information panel (Phase 1.7), which is critical for gameplay feedback. Secondary gaps include resource generation and some polish items.

## Open Questions

1. Should the tile info panel use HTML/CSS overlay or integrate a UI library?
2. Is the current rendering approach (Graphics per tile) adequate for performance, or should tilemap/batching be implemented?
3. Should ECS be used more actively, or is the current Map-based tile storage sufficient?
4. What is the priority of resource generation vs moving to Phase 2 (units)?
5. Is serialization needed for Phase 1, or can it wait for save/load implementation?
