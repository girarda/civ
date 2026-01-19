# Research: Rust Hex Project Setup (Phase 1.1)

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research provides detailed guidance for Phase 1.1 of the OpenCiv project: establishing a Rust project with Bevy ECS for hex-grid game development. It covers compatible dependency versions, the hexx crate API for hex coordinate operations, Bevy plugin architecture patterns, and unit testing strategies. The document builds on prior research (2026-01-17-hex-grid-game-rust.md) with updated version recommendations and implementation details.

## Key Discoveries

- **Bevy 0.15** is the current stable version (released late 2024) with significant API changes from 0.12
- **hexx 0.18+** provides comprehensive hex math with Bevy integration via optional feature
- **bevy_ecs_tilemap 0.14** is compatible with Bevy 0.14/0.15
- **bevy_egui 0.30+** supports Bevy 0.15
- **TilePosition wrapper** should implement Deref to hexx::Hex for ergonomic access
- **HexLayout** in hexx provides all coordinate conversion needs
- **Unit tests** should be in the same file as the code they test, using `#[cfg(test)]` modules

## Latest Compatible Dependency Versions

### Cargo.toml (Updated January 2026)

```toml
[package]
name = "openciv"
version = "0.1.0"
edition = "2021"
rust-version = "1.80"

[dependencies]
# Game Engine - Bevy 0.15 (latest stable as of late 2024)
bevy = { version = "0.15", features = ["dynamic_linking"] }

# Hex grid math
hexx = { version = "0.18", features = ["bevy_reflect"] }

# Tilemap rendering (check for 0.15 compatibility)
bevy_ecs_tilemap = "0.14"

# UI
bevy_egui = "0.30"

# Procedural generation
noise = "0.9"
rand = { version = "0.8", features = ["small_rng"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Optional: Better error handling
thiserror = "1.0"

[dev-dependencies]
# For testing
approx = "0.5"

[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3

[features]
default = []
# Disable dynamic linking for release builds
release = []
```

### Version Compatibility Notes

| Crate | Version | Notes |
|-------|---------|-------|
| bevy | 0.15.x | Major API changes from 0.12; check migration guide |
| hexx | 0.18.x | `bevy_reflect` feature enables Bevy integration |
| bevy_ecs_tilemap | 0.14.x | May need version bump for Bevy 0.15 |
| bevy_egui | 0.30.x | Follows Bevy versioning closely |
| noise | 0.9.x | Stable API, no Bevy dependency |
| rand | 0.8.x | Stable, use `small_rng` feature for games |
| serde | 1.0.x | Industry standard, no issues |

**Important**: Always check crates.io for the latest compatible versions before starting. The ecosystem moves quickly.

## hexx Crate Deep Dive

### Core Types

```rust
use hexx::{Hex, HexLayout, HexOrientation, Direction};

// Hex is the core coordinate type (axial coordinates q, r)
// Internally uses cube coordinates for algorithms
let hex = Hex::new(3, -2);  // q=3, r=-2

// Access coordinates
let q = hex.x;  // or hex.x() - column (east)
let r = hex.y;  // or hex.y() - row (southeast)
let s = -hex.x - hex.y;  // derived cube coordinate

// Zero/origin hex
let origin = Hex::ZERO;
```

### Hex Operations (Key Methods)

```rust
use hexx::{Hex, Direction};

let hex = Hex::new(3, -2);

// === Neighbors ===
// Get single neighbor in a direction
let east_neighbor = hex.neighbor(Direction::PointyTopRight);

// Get all 6 neighbors
let neighbors: [Hex; 6] = hex.all_neighbors();

// === Distance ===
// Unsigned distance (always positive)
let other = Hex::new(5, 0);
let dist: u32 = hex.unsigned_distance_to(other);

// Signed distance (can be negative for some algorithms)
let signed_dist: i32 = hex.distance_to(other);

// === Range (all hexes within radius) ===
// Returns iterator over all hexes within `radius` of `hex`
let radius: u32 = 2;
for coord in hex.range(radius) {
    // coord is each hex within 2 steps of `hex`
}

// Collect to vec if needed
let hexes_in_range: Vec<Hex> = hex.range(radius).collect();

// === Ring (hexes at exact distance) ===
// Returns iterator over hexes exactly `radius` away
let ring_hexes: Vec<Hex> = hex.ring(radius).collect();

// === Spiral (expands outward) ===
// Spiral from hex outward, useful for searches
for coord in hex.spiral_range(0..=radius) {
    // Visits hex, then ring 1, then ring 2, etc.
}

// === Line between two hexes ===
let start = Hex::new(0, 0);
let end = Hex::new(4, 2);
let line: Vec<Hex> = start.line_to(end).collect();

// === Rotation ===
// Rotate around origin
let rotated = hex.rotate_cw(1);  // 60 degrees clockwise
let rotated_ccw = hex.rotate_ccw(2);  // 120 degrees counter-clockwise

// Rotate around another hex
let pivot = Hex::new(1, 1);
let rotated_around = hex.rotate_cw_around(pivot, 1);

// === Reflection ===
let reflected = hex.reflect_q();  // Reflect across q-axis
let reflected_r = hex.reflect_r();  // Reflect across r-axis
```

### HexLayout for Coordinate Conversions

```rust
use hexx::{Hex, HexLayout, HexOrientation};
use bevy::prelude::Vec2;

// Create a layout for world coordinate conversions
let layout = HexLayout {
    orientation: HexOrientation::Pointy,  // Pointy-top hexes (recommended)
    origin: Vec2::ZERO,                    // World origin
    hex_size: Vec2::splat(32.0),          // Size in pixels
    invert_x: false,
    invert_y: false,
};

// Convert hex to world position (center of hex)
let hex = Hex::new(3, 2);
let world_pos: Vec2 = layout.hex_to_world_pos(hex);

// Convert world position to hex (rounds to nearest)
let cursor_world_pos = Vec2::new(150.0, 80.0);
let hovered_hex: Hex = layout.world_pos_to_hex(cursor_world_pos);

// Get hex corners for rendering custom shapes
let corners: [Vec2; 6] = layout.hex_corners(hex);

// Get edge midpoints (useful for river rendering)
let edge_midpoints: [Vec2; 6] = layout.hex_edge_midpoints(hex);
```

### Directions

```rust
use hexx::{Direction, Hex};

// Six directions for pointy-top hexes
let directions = [
    Direction::PointyTopRight,     // East
    Direction::PointyTop,          // Northeast
    Direction::PointyTopLeft,      // Northwest
    Direction::PointyBottomLeft,   // West
    Direction::PointyBottom,       // Southwest
    Direction::PointyBottomRight,  // Southeast
];

// Use direction to get neighbor
let hex = Hex::new(0, 0);
let east = hex.neighbor(Direction::PointyTopRight);

// Direction as hex offset
let dir = Direction::PointyTop;
let offset: Hex = dir.into();
```

## TilePosition Wrapper Implementation

### Recommended Design Pattern

```rust
// src/hex/coord.rs
use bevy::prelude::*;
use hexx::Hex;
use std::ops::Deref;

/// Wrapper around hexx::Hex for use as a Bevy Component.
///
/// Provides ergonomic access to hex coordinates while maintaining
/// ECS compatibility. Use Deref to access underlying Hex methods.
///
/// # Example
/// ```
/// let pos = TilePosition::new(3, -2);
/// let neighbors = pos.all_neighbors(); // Deref to Hex methods
/// let distance = pos.unsigned_distance_to(other.0);
/// ```
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
#[derive(Reflect)]  // Bevy reflection for inspector/serialization
pub struct TilePosition(pub Hex);

impl TilePosition {
    /// Create a new tile position from axial coordinates.
    #[inline]
    pub const fn new(q: i32, r: i32) -> Self {
        Self(Hex::new(q, r))
    }

    /// Create from an existing Hex.
    #[inline]
    pub const fn from_hex(hex: Hex) -> Self {
        Self(hex)
    }

    /// Origin tile at (0, 0).
    pub const ORIGIN: Self = Self(Hex::ZERO);

    /// Get all 6 neighboring tile positions.
    pub fn neighbors(&self) -> [TilePosition; 6] {
        self.0.all_neighbors().map(TilePosition)
    }

    /// Get tiles in range (within radius, inclusive).
    pub fn range(&self, radius: u32) -> impl Iterator<Item = TilePosition> {
        self.0.range(radius).map(TilePosition)
    }

    /// Get tiles in ring (exactly at radius).
    pub fn ring(&self, radius: u32) -> impl Iterator<Item = TilePosition> {
        self.0.ring(radius).map(TilePosition)
    }

    /// Distance to another tile.
    pub fn distance_to(&self, other: TilePosition) -> u32 {
        self.0.unsigned_distance_to(other.0)
    }

    /// Line of tiles from self to other.
    pub fn line_to(&self, other: TilePosition) -> impl Iterator<Item = TilePosition> {
        self.0.line_to(other.0).map(TilePosition)
    }
}

// Deref allows calling Hex methods directly on TilePosition
impl Deref for TilePosition {
    type Target = Hex;

    #[inline]
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

// From/Into conversions
impl From<Hex> for TilePosition {
    fn from(hex: Hex) -> Self {
        Self(hex)
    }
}

impl From<TilePosition> for Hex {
    fn from(pos: TilePosition) -> Self {
        pos.0
    }
}

impl From<(i32, i32)> for TilePosition {
    fn from((q, r): (i32, i32)) -> Self {
        Self::new(q, r)
    }
}

// Arithmetic operations
impl std::ops::Add for TilePosition {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0)
    }
}

impl std::ops::Sub for TilePosition {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        Self(self.0 - other.0)
    }
}

// Display for debugging
impl std::fmt::Display for TilePosition {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {})", self.0.x, self.0.y)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let pos = TilePosition::new(3, -2);
        assert_eq!(pos.0.x, 3);
        assert_eq!(pos.0.y, -2);
    }

    #[test]
    fn test_neighbors() {
        let pos = TilePosition::ORIGIN;
        let neighbors = pos.neighbors();
        assert_eq!(neighbors.len(), 6);

        // All neighbors should be distance 1
        for neighbor in neighbors {
            assert_eq!(pos.distance_to(neighbor), 1);
        }
    }

    #[test]
    fn test_distance() {
        let a = TilePosition::new(0, 0);
        let b = TilePosition::new(3, 0);
        assert_eq!(a.distance_to(b), 3);

        let c = TilePosition::new(2, -2);
        assert_eq!(a.distance_to(c), 2);
    }

    #[test]
    fn test_range() {
        let pos = TilePosition::ORIGIN;
        let range: Vec<_> = pos.range(1).collect();

        // Range 1 = center + 6 neighbors = 7 hexes
        assert_eq!(range.len(), 7);
    }

    #[test]
    fn test_ring() {
        let pos = TilePosition::ORIGIN;

        // Ring 0 = just the center
        let ring0: Vec<_> = pos.ring(0).collect();
        assert_eq!(ring0.len(), 1);

        // Ring 1 = 6 neighbors
        let ring1: Vec<_> = pos.ring(1).collect();
        assert_eq!(ring1.len(), 6);

        // Ring 2 = 12 hexes
        let ring2: Vec<_> = pos.ring(2).collect();
        assert_eq!(ring2.len(), 12);
    }

    #[test]
    fn test_deref() {
        let pos = TilePosition::new(1, 2);
        // Can access Hex fields via Deref
        assert_eq!(pos.x, 1);
        assert_eq!(pos.y, 2);
    }
}
```

## HexGridLayout Resource

### Implementation

```rust
// src/hex/layout.rs
use bevy::prelude::*;
use hexx::{Hex, HexLayout, HexOrientation};
use super::coord::TilePosition;

/// Resource containing the hex grid layout configuration.
///
/// Used for converting between hex coordinates and world pixel positions.
/// Should be initialized once at startup and used throughout the game.
#[derive(Resource, Clone, Debug)]
pub struct HexGridLayout {
    /// The underlying hexx layout for coordinate math.
    pub layout: HexLayout,
}

impl Default for HexGridLayout {
    fn default() -> Self {
        Self {
            layout: HexLayout {
                orientation: HexOrientation::Pointy,
                origin: Vec2::ZERO,
                hex_size: Vec2::splat(32.0),  // 32x32 pixel hexes
                invert_x: false,
                invert_y: false,
            },
        }
    }
}

impl HexGridLayout {
    /// Create a new layout with custom hex size.
    pub fn new(hex_size: f32) -> Self {
        Self {
            layout: HexLayout {
                hex_size: Vec2::splat(hex_size),
                ..Default::default()
            },
        }
    }

    /// Create a layout with specified origin offset.
    pub fn with_origin(hex_size: f32, origin: Vec2) -> Self {
        Self {
            layout: HexLayout {
                orientation: HexOrientation::Pointy,
                origin,
                hex_size: Vec2::splat(hex_size),
                invert_x: false,
                invert_y: false,
            },
        }
    }

    /// Convert hex coordinate to world position (center of hex).
    #[inline]
    pub fn hex_to_world(&self, hex: Hex) -> Vec2 {
        self.layout.hex_to_world_pos(hex)
    }

    /// Convert tile position to world position.
    #[inline]
    pub fn tile_to_world(&self, tile: TilePosition) -> Vec2 {
        self.hex_to_world(tile.0)
    }

    /// Convert world position to hex coordinate (nearest hex).
    #[inline]
    pub fn world_to_hex(&self, world_pos: Vec2) -> Hex {
        self.layout.world_pos_to_hex(world_pos)
    }

    /// Convert world position to tile position (nearest tile).
    #[inline]
    pub fn world_to_tile(&self, world_pos: Vec2) -> TilePosition {
        TilePosition(self.world_to_hex(world_pos))
    }

    /// Get the 6 corner positions of a hex in world coordinates.
    pub fn hex_corners(&self, hex: Hex) -> [Vec2; 6] {
        self.layout.hex_corners(hex)
    }

    /// Get the 6 edge midpoint positions (useful for rivers).
    pub fn hex_edge_midpoints(&self, hex: Hex) -> [Vec2; 6] {
        self.layout.hex_edge_midpoints(hex)
    }

    /// Get the size of hexes in this layout.
    pub fn hex_size(&self) -> Vec2 {
        self.layout.hex_size
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_default_layout() {
        let layout = HexGridLayout::default();
        assert_eq!(layout.hex_size(), Vec2::splat(32.0));
    }

    #[test]
    fn test_origin_conversion() {
        let layout = HexGridLayout::default();
        let origin_hex = Hex::ZERO;
        let world_pos = layout.hex_to_world(origin_hex);

        // Origin hex should be at world origin
        assert_relative_eq!(world_pos.x, 0.0, epsilon = 0.001);
        assert_relative_eq!(world_pos.y, 0.0, epsilon = 0.001);
    }

    #[test]
    fn test_roundtrip_conversion() {
        let layout = HexGridLayout::default();

        // Test several hexes
        let test_hexes = [
            Hex::new(0, 0),
            Hex::new(1, 0),
            Hex::new(0, 1),
            Hex::new(-1, 1),
            Hex::new(5, -3),
        ];

        for original in test_hexes {
            let world = layout.hex_to_world(original);
            let back = layout.world_to_hex(world);
            assert_eq!(original, back, "Roundtrip failed for {:?}", original);
        }
    }

    #[test]
    fn test_world_to_hex_rounding() {
        let layout = HexGridLayout::default();

        // Test that nearby world positions round to the correct hex
        let hex = Hex::new(2, 1);
        let center = layout.hex_to_world(hex);

        // Slightly offset positions should still resolve to same hex
        let offsets = [
            Vec2::new(1.0, 0.0),
            Vec2::new(0.0, 1.0),
            Vec2::new(-1.0, 0.0),
            Vec2::new(0.0, -1.0),
        ];

        for offset in offsets {
            let nearby = center + offset;
            let resolved = layout.world_to_hex(nearby);
            assert_eq!(hex, resolved, "Rounding failed for offset {:?}", offset);
        }
    }
}
```

## Module Structure (src/hex/mod.rs)

```rust
// src/hex/mod.rs
//! Hex coordinate system module.
//!
//! Provides hex grid coordinate types and layout utilities built on the `hexx` crate.
//!
//! # Example
//! ```
//! use crate::hex::{TilePosition, HexGridLayout};
//!
//! let tile = TilePosition::new(3, -2);
//! let layout = HexGridLayout::default();
//! let world_pos = layout.tile_to_world(tile);
//! ```

mod coord;
mod layout;

pub use coord::TilePosition;
pub use layout::HexGridLayout;

// Re-export hexx types that users might need
pub use hexx::{Hex, Direction, HexOrientation};
```

## Bevy Plugin Architecture Best Practices

### Plugin Pattern

```rust
// src/plugins/hex_plugin.rs
use bevy::prelude::*;
use crate::hex::HexGridLayout;

/// Plugin that sets up the hex grid system.
pub struct HexPlugin;

impl Plugin for HexPlugin {
    fn build(&self, app: &mut App) {
        app
            // Register types for reflection (inspector, serialization)
            .register_type::<crate::hex::TilePosition>()

            // Initialize resources
            .init_resource::<HexGridLayout>();
    }
}
```

### Main Plugin Composition

```rust
// src/plugins/game_plugin.rs
use bevy::prelude::*;
use bevy_egui::EguiPlugin;

use super::hex_plugin::HexPlugin;
// Future: use super::tile_plugin::TilePlugin;
// Future: use super::map_plugin::MapPlugin;

/// Main game plugin that composes all sub-plugins.
pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app
            // Third-party plugins
            .add_plugins(EguiPlugin)

            // Our plugins (order can matter for resource dependencies)
            .add_plugins(HexPlugin);
            // Future: .add_plugins(TilePlugin)
            // Future: .add_plugins(MapPlugin)
    }
}
```

### Recommended Module Structure

```
src/
  main.rs                    # App entry point
  lib.rs                     # Library exports (enables testing)

  hex/
    mod.rs                   # Module exports
    coord.rs                 # TilePosition wrapper
    layout.rs                # HexGridLayout resource

  tile/                      # (Phase 1.2)
    mod.rs
    terrain.rs
    feature.rs
    resource.rs
    yields.rs
    river.rs
    bundle.rs

  map/                       # (Phase 1.3)
    mod.rs
    config.rs
    generator.rs

  render/                    # (Phase 1.4-1.5)
    mod.rs
    camera.rs
    tilemap.rs

  ui/                        # (Phase 1.6-1.7)
    mod.rs
    hover.rs
    tile_info.rs

  plugins/
    mod.rs
    game_plugin.rs           # Main plugin
    hex_plugin.rs            # Hex system plugin
```

## Unit Testing Patterns

### In-Module Tests (Recommended)

```rust
// Place tests in the same file as the code
pub struct MyStruct { /* ... */ }

impl MyStruct {
    pub fn some_method(&self) -> i32 { /* ... */ }
}

// Tests at the bottom of the file
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_some_method() {
        let s = MyStruct::default();
        assert_eq!(s.some_method(), expected_value);
    }
}
```

### Testing Bevy Systems

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use bevy::prelude::*;

    /// Helper to create a minimal Bevy App for testing
    fn test_app() -> App {
        let mut app = App::new();
        app.add_plugins(MinimalPlugins);
        app
    }

    #[test]
    fn test_system_with_app() {
        let mut app = test_app();

        // Add resources/components your system needs
        app.init_resource::<HexGridLayout>();
        app.add_systems(Update, your_system);

        // Spawn test entities
        let entity = app.world.spawn(TilePosition::new(0, 0)).id();

        // Run the app for one frame
        app.update();

        // Assert on the results
        let pos = app.world.get::<TilePosition>(entity).unwrap();
        assert_eq!(*pos, TilePosition::ORIGIN);
    }

    #[test]
    fn test_resource_queries() {
        let mut app = test_app();

        // Insert test resource
        app.insert_resource(HexGridLayout::new(64.0));

        // Access world directly for assertions
        let layout = app.world.resource::<HexGridLayout>();
        assert_eq!(layout.hex_size(), Vec2::splat(64.0));
    }
}
```

### Integration Tests (tests/ directory)

```rust
// tests/hex_integration.rs
use openciv::hex::{TilePosition, HexGridLayout};

#[test]
fn test_hex_coordinate_system() {
    let layout = HexGridLayout::default();

    // Test that coordinate conversions work across the map
    for q in -10..=10 {
        for r in -10..=10 {
            let tile = TilePosition::new(q, r);
            let world = layout.tile_to_world(tile);
            let back = layout.world_to_tile(world);
            assert_eq!(tile, back);
        }
    }
}
```

## Key Files Summary

| File | Purpose |
|------|---------|
| `/Users/alex/gt/civ/crew/alex/Cargo.toml` | Project manifest (to create) |
| `/Users/alex/gt/civ/crew/alex/src/main.rs` | Application entry point (to create) |
| `/Users/alex/gt/civ/crew/alex/src/lib.rs` | Library root for testing (to create) |
| `/Users/alex/gt/civ/crew/alex/src/hex/mod.rs` | Hex module exports (to create) |
| `/Users/alex/gt/civ/crew/alex/src/hex/coord.rs` | TilePosition wrapper (to create) |
| `/Users/alex/gt/civ/crew/alex/src/hex/layout.rs` | HexGridLayout resource (to create) |
| `/Users/alex/gt/civ/crew/alex/src/plugins/mod.rs` | Plugin module exports (to create) |
| `/Users/alex/gt/civ/crew/alex/src/plugins/hex_plugin.rs` | Hex system plugin (to create) |
| `/Users/alex/gt/civ/crew/alex/src/plugins/game_plugin.rs` | Main game plugin (to create) |

## Recommendations

### For Phase 1.1 Implementation

1. **Start with Cargo.toml**: Create the project manifest with all dependencies. Run `cargo check` to verify compatibility before writing code.

2. **Create hex module first**: The hex coordinate system is foundational. Complete `coord.rs` and `layout.rs` with full test coverage before proceeding.

3. **Write tests as you go**: Each new function should have corresponding tests. This catches issues early and provides documentation.

4. **Use `cargo clippy`**: Run clippy regularly to catch common Rust issues and maintain code quality.

5. **Consider feature flags**: Use Cargo features to conditionally include heavy dependencies like `bevy_ecs_tilemap` during development.

### For AI Agent Development

1. **Keep files under 200 lines**: Smaller files are easier for AI to understand and modify correctly.

2. **Document public APIs**: Use doc comments (`///`) to explain intent, which helps AI understand how to use types.

3. **Prefer explicit types**: Avoid relying on type inference for complex expressions. AI generates more correct code with explicit types.

4. **Follow established patterns**: The patterns in this document (Deref wrapper, Resource pattern) should be followed consistently.

### Testing Strategy

1. **Unit tests**: In-module tests for all coordinate math, conversion functions
2. **Property tests**: Consider `proptest` for fuzz testing coordinate conversions
3. **Integration tests**: Verify systems work together in a Bevy App context

## Open Questions

1. **Bevy 0.15 API Changes**: Need to verify exact API for systems, queries, and plugins. Migration guide should be consulted.

2. **bevy_ecs_tilemap Compatibility**: May need to wait for 0.15-compatible release or use alternative rendering approach initially.

3. **Reflect Derive**: Verify that `#[derive(Reflect)]` works correctly with hexx types or if manual implementation is needed.

4. **Serialization**: Should TilePosition implement Serialize/Deserialize directly, or rely on Bevy's reflection-based serialization?

5. **Performance**: Should TilePosition be `#[repr(transparent)]` for zero-cost abstraction?

## Related Documents

- Previous research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-hex-grid-game-rust.md`
- Implementation plan: `/Users/alex/gt/civ/crew/alex/.swarm/plans/2026-01-17-hex-grid-game-rust.md`
- Architecture patterns: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-rust-architecture-patterns.md`
