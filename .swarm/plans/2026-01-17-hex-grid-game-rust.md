# Plan: Hex Grid Game Implementation in Rust (Phase 1)

**Date**: 2026-01-17
**Status**: Ready for Implementation

## Overview

This plan covers Phase 1 of building a Civilization-style 4X strategy game in Rust using Bevy ECS. Phase 1 delivers a procedurally generated hexagonal map with terrain types, biomes, tile yields, and an interactive hover information panel. This foundation enables all subsequent phases (units, cities, combat, etc.).

## Research Summary

Key findings from research documents:

- **Engine**: Bevy 0.12+ with `bevy_ecs_tilemap` for efficient rendering
- **Hex Math**: Use `hexx` crate (v0.17) for production-ready hex grid operations
- **Coordinates**: Cube coordinates for algorithms, axial storage (q, r)
- **Terrain**: 14 terrain types based on OpenCiv (grassland, plains, desert, hills, mountains, water)
- **Generation**: Multi-layer noise-based procedural generation using `noise` crate
- **UI**: `bevy_egui` for immediate-mode tile hover panel
- **Architecture**: Small focused components, single-responsibility systems, event-driven communication

## Phased Implementation

### Phase 1.1: Project Setup and Hex Math Foundation

**Goal**: Establish project structure and core hex coordinate functionality.

- [ ] Create Cargo.toml with all dependencies (bevy, hexx, noise, rand, bevy_egui, bevy_ecs_tilemap, serde)
- [ ] Set up module structure following Bevy plugin architecture
- [ ] Create `src/hex/coord.rs` - TilePosition wrapper around hexx::Hex
- [ ] Create `src/hex/layout.rs` - HexGridLayout resource for coordinate conversions
- [ ] Create `src/hex/mod.rs` - Module exports
- [ ] Write unit tests for hex coordinate operations (neighbors, distance, range, ring)
- [ ] Verify hex-to-world and world-to-hex conversions work correctly

**Success Criteria**:
- `cargo test` passes for all hex math operations
- Can convert between hex coordinates and world pixel positions
- Project compiles with all dependencies

### Phase 1.2: Tile Data Model

**Goal**: Define terrain types, features, resources, and yield calculation.

- [ ] Create `src/tile/terrain.rs` - Terrain enum with 14 variants and methods (base_food, base_production, movement_cost, is_water, is_hill)
- [ ] Create `src/tile/feature.rs` - TileFeature enum (Forest, Jungle, Marsh, Floodplains, Oasis, Ice) with modifiers
- [ ] Create `src/tile/resource.rs` - TileResource enum with bonus/strategic/luxury resources and yield bonuses
- [ ] Create `src/tile/yields.rs` - TileYields component with calculate() method combining terrain + feature + resource
- [ ] Create `src/tile/river.rs` - RiverEdges component (bitmask for 6 edges)
- [ ] Create `src/tile/bundle.rs` - TileBundle and Tile marker component
- [ ] Create `src/tile/mod.rs` - Module exports
- [ ] Add serde derives for all tile types (Serialize, Deserialize)
- [ ] Write unit tests for yield calculations

**Success Criteria**:
- All terrain types have correct base yields matching OpenCiv values
- TileYields::calculate() correctly combines terrain + feature + resource
- All types implement Serialize/Deserialize for future save/load

### Phase 1.3: Map Configuration and Procedural Generator

**Goal**: Implement noise-based terrain generation with configurable map sizes.

- [ ] Create `src/map/config.rs` - MapConfig resource with width, height, seed, thresholds
- [ ] Add map size presets (Duel 48x32, Tiny 56x36, Small 68x44, Standard 80x52, Large 104x64, Huge 128x80)
- [ ] Create `src/map/generator.rs` - MapGenerator struct with generation methods
- [ ] Implement `generate_height_map()` using Fbm noise with edge falloff
- [ ] Implement `generate_temperature_map()` using latitude-based gradient with noise
- [ ] Implement `generate_moisture_map()` using Fbm noise
- [ ] Implement `determine_terrain()` logic matching height/temp to terrain types
- [ ] Implement `determine_feature()` logic for forests, jungles, marshes based on temp/moisture
- [ ] Implement `generate()` method that spawns all tile entities
- [ ] Create `src/map/mod.rs` - Module exports
- [ ] Write integration test verifying map generates expected terrain distribution

**Success Criteria**:
- Can generate maps of all preset sizes
- Same seed produces identical maps (deterministic)
- Terrain distribution looks natural (landmasses, temperature gradient from poles to equator)
- Hills/mountains appear at high elevations, water at low elevations

### Phase 1.4: Simple Sprite Rendering (Prototype)

**Goal**: Get tiles visible on screen with colored placeholders before full tilemap rendering.

- [ ] Create `src/render/camera.rs` - MainCamera component, spawn_camera(), camera_movement(), camera_zoom() systems
- [ ] Create `src/render/simple_render.rs` - spawn_simple_hexes() system using colored sprites per terrain
- [ ] Implement `terrain_to_color()` function mapping terrain to Color
- [ ] Create `src/render/mod.rs` - Module exports
- [ ] Test camera panning (WASD/Arrow keys) and zoom (mouse scroll)

**Success Criteria**:
- Map renders with distinct colors per terrain type
- Camera can pan across the entire map
- Camera zoom works smoothly (0.5x to 3.0x range)
- All tiles visible when zoomed out appropriately

### Phase 1.5: Tilemap Rendering (Production)

**Goal**: Replace prototype rendering with efficient bevy_ecs_tilemap for large maps.

- [ ] Create `src/render/tilemap.rs` - TilemapAssets resource, TerrainSpriteIndex struct
- [ ] Implement `spawn_tilemap()` system using bevy_ecs_tilemap
- [ ] Create placeholder sprite atlas (can be simple colored hexes or real sprites)
- [ ] Implement `terrain_to_sprite_index()` mapping
- [ ] Add conditional compilation or feature flag to switch between simple and tilemap rendering
- [ ] Configure HexCoordSystem::RowOdd for tilemap
- [ ] Test rendering performance with Large (104x64 = 6,656 tiles) map

**Success Criteria**:
- Large map renders at 60 FPS
- Tiles correctly display terrain sprites
- Zooming and panning remain smooth with tilemap

### Phase 1.6: Tile Hover Detection

**Goal**: Detect which tile the cursor is hovering over.

- [ ] Create `src/ui/hover.rs` - HoveredTile resource (Option<Entity>)
- [ ] Implement `update_hovered_tile()` system using cursor position and hex layout conversion
- [ ] Handle edge cases: cursor outside window, no tile at position
- [ ] Add visual feedback for hovered tile (highlight sprite or outline)
- [ ] Create `src/ui/mod.rs` - Module exports

**Success Criteria**:
- HoveredTile resource updates as cursor moves
- Correct tile entity identified at all zoom levels
- Visual feedback clearly shows which tile is hovered

### Phase 1.7: Tile Information Panel

**Goal**: Display detailed tile information in a UI panel when hovering.

- [ ] Create `src/ui/tile_info.rs` - TileHoverUI resource, tile_hover_ui() system
- [ ] Implement egui window showing: coordinates, terrain, feature, resource, river, yields
- [ ] Position panel at bottom-left (matching OpenCiv layout)
- [ ] Format yields with labels (Food, Prod, Gold, etc.)
- [ ] Only show panel when hovering over a valid tile

**Success Criteria**:
- Panel appears when cursor is over a tile
- Panel disappears when cursor is not over a tile
- All tile information displays correctly
- Panel does not interfere with map interaction

### Phase 1.8: Game Plugin Assembly

**Goal**: Wire all systems together into a working game plugin.

- [ ] Create `src/plugins/game_plugin.rs` - GamePlugin struct implementing Plugin trait
- [ ] Register all resources: HexGridLayout, MapConfig, HoveredTile, TileHoverUI
- [ ] Add EguiPlugin
- [ ] Configure startup systems: spawn_camera, generate_map, spawn_tilemap (or spawn_simple_hexes)
- [ ] Configure update systems: camera_movement, camera_zoom, update_hovered_tile, tile_hover_ui
- [ ] Create `src/plugins/mod.rs` - Module exports
- [ ] Create `src/main.rs` - Application entry point with window configuration
- [ ] Add lib.rs for library mode (enables testing)

**Success Criteria**:
- `cargo run` launches a window with the generated map
- Camera controls work
- Tile hover shows information panel
- No compile warnings or errors

### Phase 1.9: Testing and Polish

**Goal**: Ensure quality and prepare for Phase 2.

- [ ] Add comprehensive unit tests for all modules
- [ ] Add integration test that generates map, spawns entities, verifies tile count
- [ ] Document public API with doc comments
- [ ] Add seed display in UI corner (for reproducibility)
- [ ] Add map regeneration hotkey (R key) for testing
- [ ] Profile performance on Huge map size
- [ ] Fix any rendering artifacts or edge cases

**Success Criteria**:
- `cargo test` passes all tests
- `cargo doc` generates documentation
- Huge map (128x80 = 10,240 tiles) runs at 60 FPS
- Code is clean and well-documented

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `Cargo.toml` | Create | Project manifest with dependencies |
| `src/main.rs` | Create | Application entry point |
| `src/lib.rs` | Create | Library root for testing |
| `src/hex/mod.rs` | Create | Hex module exports |
| `src/hex/coord.rs` | Create | TilePosition wrapper |
| `src/hex/layout.rs` | Create | HexGridLayout resource |
| `src/tile/mod.rs` | Create | Tile module exports |
| `src/tile/terrain.rs` | Create | Terrain enum and methods |
| `src/tile/feature.rs` | Create | TileFeature enum |
| `src/tile/resource.rs` | Create | TileResource enum |
| `src/tile/yields.rs` | Create | TileYields component |
| `src/tile/river.rs` | Create | RiverEdges component |
| `src/tile/bundle.rs` | Create | TileBundle definition |
| `src/map/mod.rs` | Create | Map module exports |
| `src/map/config.rs` | Create | MapConfig resource |
| `src/map/generator.rs` | Create | MapGenerator implementation |
| `src/render/mod.rs` | Create | Render module exports |
| `src/render/camera.rs` | Create | Camera systems |
| `src/render/simple_render.rs` | Create | Prototype colored rendering |
| `src/render/tilemap.rs` | Create | Production tilemap rendering |
| `src/ui/mod.rs` | Create | UI module exports |
| `src/ui/hover.rs` | Create | Tile hover detection |
| `src/ui/tile_info.rs` | Create | Tile information panel |
| `src/plugins/mod.rs` | Create | Plugin module exports |
| `src/plugins/game_plugin.rs` | Create | Main game plugin |
| `assets/terrain.png` | Create | Terrain sprite atlas (optional for Phase 1) |

**Total: 26 files to create**

## Module Dependency Graph

```
main.rs
  |
  +-> plugins/game_plugin.rs
        |
        +-> hex/ (coord.rs, layout.rs)
        |     |
        |     +-> hexx crate
        |
        +-> tile/ (terrain.rs, feature.rs, resource.rs, yields.rs, river.rs, bundle.rs)
        |     |
        |     +-> hex/coord.rs (TilePosition)
        |
        +-> map/ (config.rs, generator.rs)
        |     |
        |     +-> tile/ (all)
        |     +-> noise crate
        |     +-> rand crate
        |
        +-> render/ (camera.rs, simple_render.rs, tilemap.rs)
        |     |
        |     +-> hex/layout.rs
        |     +-> tile/terrain.rs
        |     +-> bevy_ecs_tilemap crate
        |
        +-> ui/ (hover.rs, tile_info.rs)
              |
              +-> hex/layout.rs
              +-> tile/ (all)
              +-> bevy_egui crate
```

## Success Criteria

### Functional Requirements
- [ ] Map generates procedurally with configurable seed and size
- [ ] Terrain types match OpenCiv (grassland, plains, desert, tundra, snow, hills, mountains, water)
- [ ] Features (forests, jungles) spawn in appropriate biomes
- [ ] Tile yields calculate correctly from terrain + feature
- [ ] Camera pans and zooms smoothly
- [ ] Hovering over tiles displays information panel
- [ ] Same seed produces identical maps

### Performance Requirements
- [ ] Standard map (80x52 = 4,160 tiles) renders at 60 FPS
- [ ] Large map (104x64 = 6,656 tiles) renders at 60 FPS
- [ ] Huge map (128x80 = 10,240 tiles) renders at 60 FPS
- [ ] Map generation completes in under 1 second

### Code Quality Requirements
- [ ] All public types and functions have doc comments
- [ ] No compiler warnings
- [ ] Unit tests cover hex math, yield calculations, and terrain determination
- [ ] Code follows Rust/Bevy conventions from research document

## Dependencies & Integration

### Depends On
- Rust 1.70+ (for Bevy 0.12 compatibility)
- Research documents:
  - `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-hex-grid-game-rust.md`
  - `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-rust-architecture-patterns.md`
  - `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-openciv-game-mechanics.md`

### Consumed By (Future Phases)
- **Phase 2**: Unit movement (needs `HexCoord::neighbors()`, `HexCoord::distance()`, `Terrain::movement_cost()`)
- **Phase 3**: City founding (needs tile ownership, territory via `HexCoord::range()`)
- **Phase 4**: Fog of war (needs tile visibility tracking)
- **Phase 5**: Combat (needs terrain defense modifiers)
- **Phase 6**: Save/load (needs serde serialization on all tile types)

### Integration Points
- **Bevy ECS**: All game data stored in components, processed by systems
- **Asset System**: Sprite atlas loaded via Bevy asset server
- **Input System**: Bevy input resources for keyboard/mouse
- **Windowing**: Bevy window plugin for display

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| bevy_ecs_tilemap incompatibility with Bevy 0.12 | High | Low | Fall back to simple sprite rendering; check crate compatibility before starting |
| Noise generation too slow for huge maps | Medium | Low | Profile early; consider multi-threaded generation or chunk-based loading |
| Hex coordinate conversion bugs | High | Medium | Write extensive unit tests; use proven hexx crate rather than custom implementation |
| Performance issues with large tile counts | Medium | Medium | Use bevy_ecs_tilemap with GPU instancing; implement frustum culling |
| egui panel blocks map interaction | Low | Medium | Position panel in corner; make panel semi-transparent or dismissible |
| Tileset art assets not available | Low | High | Start with colored placeholder sprites; art can be added later |

## Implementation Notes

### Coordinate System Choice
Using **pointy-top hexes** with **odd-row offset** for visual consistency with OpenCiv. The `hexx` crate handles conversions internally.

### Rendering Strategy
Start with simple colored sprites (Phase 1.4) to validate game logic quickly. Switch to tilemap rendering (Phase 1.5) once basic functionality is confirmed. This allows rapid iteration without asset dependencies.

### Testing Strategy
- **Unit tests**: Hex math, yield calculations, terrain determination
- **Integration tests**: Map generation produces expected tile counts and terrain distribution
- **Manual testing**: Visual inspection of generated maps, camera controls, hover panel

### Performance Targets
Based on OpenCiv reference (80x52 standard map), targeting similar or larger map sizes. Bevy's ECS and bevy_ecs_tilemap should handle 10,000+ tiles easily.

## Estimated Effort

| Phase | Estimated Time | Complexity |
|-------|----------------|------------|
| 1.1 Project Setup + Hex Math | 1-2 hours | Low |
| 1.2 Tile Data Model | 2-3 hours | Low |
| 1.3 Procedural Generator | 3-4 hours | Medium |
| 1.4 Simple Rendering | 1-2 hours | Low |
| 1.5 Tilemap Rendering | 2-3 hours | Medium |
| 1.6 Hover Detection | 1-2 hours | Low |
| 1.7 Info Panel | 1-2 hours | Low |
| 1.8 Plugin Assembly | 1 hour | Low |
| 1.9 Testing + Polish | 2-3 hours | Low |
| **Total** | **14-22 hours** | |

## Related Documents

- Research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-hex-grid-game-rust.md`
- Architecture: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-rust-architecture-patterns.md`
- Game Mechanics: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-openciv-game-mechanics.md`
- Partitioning: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-game-architecture-partitioning.md`

## Appendix: Cargo.toml Template

```toml
[package]
name = "openciv"
version = "0.1.0"
edition = "2021"

[dependencies]
bevy = { version = "0.12", features = ["dynamic_linking"] }
bevy_egui = "0.24"
bevy_ecs_tilemap = "0.12"
hexx = "0.17"
noise = "0.8"
rand = "0.8"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3
```

## Appendix: Terrain Yield Reference

| Terrain | Food | Prod | Gold | Movement |
|---------|------|------|------|----------|
| Grassland | 2 | 0 | 0 | 1 |
| Plains | 1 | 1 | 0 | 1 |
| Desert | 0 | 0 | 0 | 1 |
| Tundra | 1 | 0 | 0 | 1 |
| Snow | 0 | 0 | 0 | 1 |
| Grassland Hill | 2 | 2 | 0 | 2 |
| Plains Hill | 0 | 2 | 0 | 2 |
| Desert Hill | 0 | 2 | 0 | 2 |
| Tundra Hill | 0 | 2 | 0 | 2 |
| Snow Hill | 0 | 2 | 0 | 2 |
| Mountain | 0 | 0 | 0 | Impassable |
| Coast | 1 | 0 | 0 | Water |
| Ocean | 1 | 0 | 0 | Water |
| Lake | 2 | 0 | 0 | Water |
