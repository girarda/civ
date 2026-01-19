# Research: Hex Grid Game Implementation in Rust (Phase 1)

**Date**: 2026-01-17
**Status**: Complete

## Summary

This research provides a comprehensive implementation guide for Phase 1 of the OpenCiv game in Rust: Hex Grid + Map Display. The phase delivers a procedural hexagonal map with terrain types, biomes, tile yields, and hover information. Building on the established Rust architecture patterns (Bevy ECS) and game mechanics from OpenCiv, this document covers hex math libraries, tile data structures, procedural generation algorithms, and rendering approaches optimized for AI agent development.

## Key Discoveries

- **Bevy 0.12+** is the recommended game engine with mature hex grid support
- **Cube coordinates** are preferred for hex math due to simpler algorithms
- **`hexx` crate** provides production-ready hex grid math, avoiding custom implementation
- **Noise-based generation** (via `noise` crate) creates natural-looking terrain
- **Tilemap rendering** via `bevy_ecs_tilemap` handles large maps efficiently
- **Component-per-concern** pattern keeps tile data modular and AI-agent friendly
- **Configuration-driven terrain** enables balance iteration without code changes

## Phase 1 Deliverables Mapping

| Component | Rust Implementation |
|-----------|---------------------|
| Hex math library | `hexx` crate + custom wrapper module |
| Tile data model | Bevy Components: `Terrain`, `TileYields`, `TileFeature` |
| Procedural generator | `noise` crate with multi-layer terrain algorithm |
| Map renderer | `bevy_ecs_tilemap` with sprite atlas |
| Tile hover info | `bevy_egui` panel with raycast-based tile detection |

## Hex Coordinate Systems

### Coordinate System Comparison

| System | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Cube (q, r, s)** | Simple algorithms, symmetry, easy distance | 3 values (q+r+s=0 constraint) | **Primary** |
| **Axial (q, r)** | 2 values, derived from cube | Slightly complex algorithms | Storage format |
| **Offset (col, row)** | Intuitive for arrays | Different for odd/even rows, complex algorithms | Avoid |

### Recommended Approach: Cube Coordinates with Axial Storage

Use cube coordinates for algorithms but store axial (q, r) since s = -q - r:

```rust
use bevy::prelude::*;

/// Hexagonal coordinate using axial representation
/// Cube coordinate s is derived: s = -q - r
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
pub struct HexCoord {
    pub q: i32,  // Column (east direction)
    pub r: i32,  // Row (southeast direction)
}

impl HexCoord {
    pub const ZERO: HexCoord = HexCoord { q: 0, r: 0 };

    /// Create new hex coordinate
    pub fn new(q: i32, r: i32) -> Self {
        Self { q, r }
    }

    /// Get cube coordinate s (derived)
    #[inline]
    pub fn s(&self) -> i32 {
        -self.q - self.r
    }

    /// Six cardinal directions in hex space
    pub const DIRECTIONS: [HexCoord; 6] = [
        HexCoord { q: 1, r: 0 },   // East
        HexCoord { q: 1, r: -1 },  // Northeast
        HexCoord { q: 0, r: -1 },  // Northwest
        HexCoord { q: -1, r: 0 },  // West
        HexCoord { q: -1, r: 1 },  // Southwest
        HexCoord { q: 0, r: 1 },   // Southeast
    ];

    /// Get all 6 adjacent hex coordinates
    pub fn neighbors(&self) -> [HexCoord; 6] {
        Self::DIRECTIONS.map(|d| HexCoord {
            q: self.q + d.q,
            r: self.r + d.r,
        })
    }

    /// Distance between two hex coordinates (cube distance / 2)
    pub fn distance(&self, other: &HexCoord) -> i32 {
        let dq = (self.q - other.q).abs();
        let dr = (self.r - other.r).abs();
        let ds = (self.s() - other.s()).abs();
        (dq + dr + ds) / 2
    }

    /// Get all hexes within radius (inclusive)
    pub fn range(&self, radius: i32) -> Vec<HexCoord> {
        let mut results = Vec::new();
        for q in -radius..=radius {
            for r in (-radius).max(-q - radius)..=radius.min(-q + radius) {
                results.push(HexCoord {
                    q: self.q + q,
                    r: self.r + r,
                });
            }
        }
        results
    }

    /// Get hexes in ring at exact distance
    pub fn ring(&self, radius: i32) -> Vec<HexCoord> {
        if radius == 0 {
            return vec![*self];
        }

        let mut results = Vec::with_capacity(6 * radius as usize);
        let mut current = HexCoord {
            q: self.q - radius,
            r: self.r + radius,
        };

        for dir in 0..6 {
            for _ in 0..radius {
                results.push(current);
                current = HexCoord {
                    q: current.q + Self::DIRECTIONS[dir].q,
                    r: current.r + Self::DIRECTIONS[dir].r,
                };
            }
        }
        results
    }

    /// Convert to world pixel coordinates (pointy-top hexes)
    pub fn to_world(&self, hex_size: f32) -> Vec2 {
        let x = hex_size * (3.0_f32.sqrt() * self.q as f32
            + 3.0_f32.sqrt() / 2.0 * self.r as f32);
        let y = hex_size * (3.0 / 2.0 * self.r as f32);
        Vec2::new(x, y)
    }

    /// Convert from world pixel coordinates to hex (rounds to nearest)
    pub fn from_world(pos: Vec2, hex_size: f32) -> HexCoord {
        let q = (3.0_f32.sqrt() / 3.0 * pos.x - 1.0 / 3.0 * pos.y) / hex_size;
        let r = (2.0 / 3.0 * pos.y) / hex_size;
        Self::round(q, r)
    }

    /// Round fractional cube coordinates to nearest hex
    fn round(q: f32, r: f32) -> HexCoord {
        let s = -q - r;

        let mut rq = q.round();
        let mut rr = r.round();
        let rs = s.round();

        let q_diff = (rq - q).abs();
        let r_diff = (rr - r).abs();
        let s_diff = (rs - s).abs();

        if q_diff > r_diff && q_diff > s_diff {
            rq = -rr - rs;
        } else if r_diff > s_diff {
            rr = -rq - rs;
        }

        HexCoord {
            q: rq as i32,
            r: rr as i32,
        }
    }
}

impl std::ops::Add for HexCoord {
    type Output = Self;
    fn add(self, other: Self) -> Self {
        HexCoord {
            q: self.q + other.q,
            r: self.r + other.r,
        }
    }
}

impl std::ops::Sub for HexCoord {
    type Output = Self;
    fn sub(self, other: Self) -> Self {
        HexCoord {
            q: self.q - other.q,
            r: self.r - other.r,
        }
    }
}
```

### Using the `hexx` Crate (Recommended)

Rather than implementing all hex math from scratch, use the `hexx` crate which is well-tested and Bevy-compatible:

```toml
# Cargo.toml
[dependencies]
hexx = "0.17"
```

```rust
use hexx::{Hex, HexLayout, HexOrientation};
use bevy::prelude::*;

// Convert hexx::Hex to our internal representation
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub struct TilePosition(pub Hex);

impl TilePosition {
    pub fn new(q: i32, r: i32) -> Self {
        Self(Hex::new(q, r))
    }

    pub fn neighbors(&self) -> [TilePosition; 6] {
        self.0.all_neighbors().map(TilePosition)
    }

    pub fn distance(&self, other: &TilePosition) -> u32 {
        self.0.unsigned_distance_to(other.0)
    }

    pub fn range(&self, radius: u32) -> impl Iterator<Item = TilePosition> {
        self.0.range(radius).map(TilePosition)
    }
}

// Hex layout for coordinate conversion
#[derive(Resource)]
pub struct HexGridLayout {
    pub layout: HexLayout,
}

impl Default for HexGridLayout {
    fn default() -> Self {
        Self {
            layout: HexLayout {
                orientation: HexOrientation::Pointy,
                origin: Vec2::ZERO,
                hex_size: Vec2::splat(32.0), // 32 pixel hexes
                invert_x: false,
                invert_y: false,
            },
        }
    }
}

impl HexGridLayout {
    pub fn hex_to_world(&self, hex: Hex) -> Vec2 {
        self.layout.hex_to_world_pos(hex)
    }

    pub fn world_to_hex(&self, pos: Vec2) -> Hex {
        self.layout.world_pos_to_hex(pos)
    }
}
```

## Tile Data Model

### Terrain Types

Based on OpenCiv game mechanics:

```rust
use bevy::prelude::*;
use serde::{Deserialize, Serialize};

/// Base terrain type for a tile
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Serialize, Deserialize)]
pub enum Terrain {
    // Flat terrain
    Grassland,
    Plains,
    Desert,
    Tundra,
    Snow,

    // Elevated terrain
    GrasslandHill,
    PlainsHill,
    DesertHill,
    TundraHill,
    SnowHill,

    // Impassable
    Mountain,

    // Water
    Coast,
    Ocean,
    Lake,
}

impl Terrain {
    /// Base food yield
    pub fn base_food(&self) -> i32 {
        match self {
            Terrain::Grassland | Terrain::Lake => 2,
            Terrain::Plains | Terrain::Tundra | Terrain::Coast | Terrain::Ocean => 1,
            Terrain::GrasslandHill => 2,
            _ => 0,
        }
    }

    /// Base production yield
    pub fn base_production(&self) -> i32 {
        match self {
            Terrain::Plains => 1,
            Terrain::GrasslandHill | Terrain::PlainsHill | Terrain::DesertHill
            | Terrain::TundraHill | Terrain::SnowHill => 2,
            _ => 0,
        }
    }

    /// Base gold yield
    pub fn base_gold(&self) -> i32 {
        0 // Base terrain has no gold
    }

    /// Movement cost (high = impassable)
    pub fn movement_cost(&self) -> i32 {
        match self {
            Terrain::Mountain => 9999, // Impassable
            Terrain::Ocean | Terrain::Coast | Terrain::Lake => 9999, // Water - impassable for land units
            Terrain::GrasslandHill | Terrain::PlainsHill | Terrain::DesertHill
            | Terrain::TundraHill | Terrain::SnowHill => 2,
            _ => 1,
        }
    }

    /// Is this water terrain?
    pub fn is_water(&self) -> bool {
        matches!(self, Terrain::Coast | Terrain::Ocean | Terrain::Lake)
    }

    /// Is this elevated terrain?
    pub fn is_hill(&self) -> bool {
        matches!(self,
            Terrain::GrasslandHill | Terrain::PlainsHill | Terrain::DesertHill
            | Terrain::TundraHill | Terrain::SnowHill
        )
    }
}

/// Terrain feature that overlays base terrain
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Serialize, Deserialize)]
pub enum TileFeature {
    Forest,
    Jungle,
    Marsh,
    Floodplains,
    Oasis,
    Ice,
}

impl TileFeature {
    /// Food modifier
    pub fn food_modifier(&self) -> i32 {
        match self {
            TileFeature::Floodplains => 2,
            TileFeature::Oasis => 3,
            TileFeature::Marsh => -1,
            _ => 0,
        }
    }

    /// Production modifier
    pub fn production_modifier(&self) -> i32 {
        match self {
            TileFeature::Forest => 1,
            TileFeature::Jungle => -1,
            _ => 0,
        }
    }

    /// Movement cost modifier
    pub fn movement_modifier(&self) -> i32 {
        match self {
            TileFeature::Forest | TileFeature::Jungle | TileFeature::Marsh => 1,
            _ => 0,
        }
    }
}

/// Resource on a tile (bonus, strategic, or luxury)
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Serialize, Deserialize)]
pub enum TileResource {
    // Bonus resources
    Cattle,
    Sheep,
    Fish,
    Stone,
    Wheat,
    Bananas,
    Deer,

    // Strategic resources
    Horses,
    Iron,
    Coal,
    Oil,
    Aluminum,
    Uranium,

    // Luxury resources
    Citrus,
    Cotton,
    Copper,
    Gold,
    Crab,
    Whales,
    Turtles,
    Olives,
    Wine,
    Silk,
    Spices,
    Gems,
    Marble,
    Ivory,
}

impl TileResource {
    /// Food bonus from resource
    pub fn food_bonus(&self) -> i32 {
        match self {
            TileResource::Cattle | TileResource::Fish | TileResource::Wheat
            | TileResource::Bananas | TileResource::Deer => 1,
            TileResource::Crab | TileResource::Citrus => 1,
            _ => 0,
        }
    }

    /// Production bonus from resource
    pub fn production_bonus(&self) -> i32 {
        match self {
            TileResource::Sheep | TileResource::Stone | TileResource::Horses
            | TileResource::Iron | TileResource::Coal | TileResource::Oil
            | TileResource::Aluminum | TileResource::Uranium => 1,
            TileResource::Marble => 1,
            _ => 0,
        }
    }

    /// Gold bonus from resource
    pub fn gold_bonus(&self) -> i32 {
        match self {
            TileResource::Cotton | TileResource::Copper | TileResource::Gold
            | TileResource::Whales | TileResource::Turtles | TileResource::Wine
            | TileResource::Silk | TileResource::Spices | TileResource::Gems => 2,
            TileResource::Olives | TileResource::Ivory => 1,
            _ => 0,
        }
    }
}

/// Computed tile yields (recalculated when terrain changes)
#[derive(Component, Clone, Copy, Default, Debug)]
pub struct TileYields {
    pub food: i32,
    pub production: i32,
    pub gold: i32,
    pub science: i32,
    pub culture: i32,
    pub faith: i32,
}

impl TileYields {
    /// Calculate yields from terrain, feature, and resource
    pub fn calculate(
        terrain: Terrain,
        feature: Option<TileFeature>,
        resource: Option<TileResource>,
    ) -> Self {
        let mut yields = TileYields {
            food: terrain.base_food(),
            production: terrain.base_production(),
            gold: terrain.base_gold(),
            ..default()
        };

        if let Some(feat) = feature {
            yields.food += feat.food_modifier();
            yields.production += feat.production_modifier();
        }

        if let Some(res) = resource {
            yields.food += res.food_bonus();
            yields.production += res.production_bonus();
            yields.gold += res.gold_bonus();
        }

        yields
    }
}

/// River edges on a tile (bitmask for 6 edges)
#[derive(Component, Clone, Copy, Default, Debug)]
pub struct RiverEdges(pub u8);

impl RiverEdges {
    pub const EDGE_EAST: u8 = 1 << 0;
    pub const EDGE_NORTHEAST: u8 = 1 << 1;
    pub const EDGE_NORTHWEST: u8 = 1 << 2;
    pub const EDGE_WEST: u8 = 1 << 3;
    pub const EDGE_SOUTHWEST: u8 = 1 << 4;
    pub const EDGE_SOUTHEAST: u8 = 1 << 5;

    pub fn has_river(&self) -> bool {
        self.0 != 0
    }

    pub fn has_edge(&self, edge: u8) -> bool {
        self.0 & edge != 0
    }

    pub fn set_edge(&mut self, edge: u8) {
        self.0 |= edge;
    }
}
```

### Tile Bundle for Entity Spawning

```rust
use bevy::prelude::*;

/// Marker component for tiles
#[derive(Component, Default)]
pub struct Tile;

/// Bundle containing all tile components
#[derive(Bundle, Default)]
pub struct TileBundle {
    pub tile: Tile,
    pub position: TilePosition,
    pub terrain: Terrain,
    pub yields: TileYields,
    pub rivers: RiverEdges,
}

impl TileBundle {
    pub fn new(position: TilePosition, terrain: Terrain) -> Self {
        let yields = TileYields::calculate(terrain, None, None);
        Self {
            tile: Tile,
            position,
            terrain,
            yields,
            rivers: RiverEdges::default(),
        }
    }

    pub fn with_feature(mut self, feature: TileFeature) -> (Self, TileFeature) {
        self.yields = TileYields::calculate(self.terrain, Some(feature), None);
        (self, feature)
    }
}
```

## Procedural Generation

### Multi-Layer Terrain Generation Algorithm

```rust
use bevy::prelude::*;
use noise::{NoiseFn, Perlin, Fbm, MultiFractal, Seedable};
use rand::prelude::*;

/// Map generation configuration
#[derive(Resource, Clone)]
pub struct MapConfig {
    pub width: i32,
    pub height: i32,
    pub seed: u32,
    pub land_coverage: f64,      // 0.0 to 1.0, target land percentage
    pub mountain_threshold: f64, // Height above which = mountain
    pub hill_threshold: f64,     // Height above which = hill
    pub ocean_threshold: f64,    // Height below which = ocean
}

impl Default for MapConfig {
    fn default() -> Self {
        Self {
            width: 80,
            height: 52,
            seed: 42,
            land_coverage: 0.4,
            mountain_threshold: 0.75,
            hill_threshold: 0.55,
            ocean_threshold: 0.35,
        }
    }
}

/// Map size presets (from OpenCiv)
impl MapConfig {
    pub fn duel() -> Self {
        Self { width: 48, height: 32, ..default() }
    }

    pub fn tiny() -> Self {
        Self { width: 56, height: 36, ..default() }
    }

    pub fn small() -> Self {
        Self { width: 68, height: 44, ..default() }
    }

    pub fn standard() -> Self {
        Self { width: 80, height: 52, ..default() }
    }

    pub fn large() -> Self {
        Self { width: 104, height: 64, ..default() }
    }

    pub fn huge() -> Self {
        Self { width: 128, height: 80, ..default() }
    }
}

/// Intermediate height/temperature data for generation
pub struct GenerationData {
    pub height: Vec<Vec<f64>>,     // -1.0 to 1.0
    pub temperature: Vec<Vec<f64>>, // 0.0 to 1.0 (cold to hot)
    pub moisture: Vec<Vec<f64>>,    // 0.0 to 1.0 (dry to wet)
}

/// Procedural map generator
pub struct MapGenerator {
    config: MapConfig,
    rng: StdRng,
}

impl MapGenerator {
    pub fn new(config: MapConfig) -> Self {
        let rng = StdRng::seed_from_u64(config.seed as u64);
        Self { config, rng }
    }

    /// Generate height map using fractal Brownian motion
    fn generate_height_map(&self) -> Vec<Vec<f64>> {
        let fbm: Fbm<Perlin> = Fbm::new(self.config.seed)
            .set_octaves(6)
            .set_frequency(0.02)
            .set_lacunarity(2.0)
            .set_persistence(0.5);

        let mut height = vec![vec![0.0; self.config.height as usize]; self.config.width as usize];

        for x in 0..self.config.width {
            for y in 0..self.config.height {
                let nx = x as f64;
                let ny = y as f64;

                // Base continental noise
                let h = fbm.get([nx, ny]);

                // Edge falloff for island-like maps
                let edge_x = (x as f64 / self.config.width as f64 - 0.5).abs() * 2.0;
                let edge_y = (y as f64 / self.config.height as f64 - 0.5).abs() * 2.0;
                let edge_falloff = 1.0 - (edge_x.powi(2) + edge_y.powi(2)).sqrt().min(1.0);

                height[x as usize][y as usize] = h * edge_falloff;
            }
        }

        // Normalize to 0.0-1.0 range
        self.normalize_map(&mut height);
        height
    }

    /// Generate temperature map (latitude-based with noise)
    fn generate_temperature_map(&self) -> Vec<Vec<f64>> {
        let perlin = Perlin::new(self.config.seed.wrapping_add(1000));
        let mut temp = vec![vec![0.0; self.config.height as usize]; self.config.width as usize];

        for x in 0..self.config.width {
            for y in 0..self.config.height {
                // Base temperature from latitude (0.0 at poles, 1.0 at equator)
                let latitude = (y as f64 / self.config.height as f64 - 0.5).abs() * 2.0;
                let base_temp = 1.0 - latitude;

                // Add noise variation
                let noise = perlin.get([x as f64 * 0.05, y as f64 * 0.05]) * 0.2;

                temp[x as usize][y as usize] = (base_temp + noise).clamp(0.0, 1.0);
            }
        }

        temp
    }

    /// Generate moisture map
    fn generate_moisture_map(&self) -> Vec<Vec<f64>> {
        let fbm: Fbm<Perlin> = Fbm::new(self.config.seed.wrapping_add(2000))
            .set_octaves(4)
            .set_frequency(0.03);

        let mut moisture = vec![vec![0.0; self.config.height as usize]; self.config.width as usize];

        for x in 0..self.config.width {
            for y in 0..self.config.height {
                let m = (fbm.get([x as f64, y as f64]) + 1.0) / 2.0;
                moisture[x as usize][y as usize] = m.clamp(0.0, 1.0);
            }
        }

        moisture
    }

    /// Normalize a map to 0.0-1.0 range
    fn normalize_map(&self, map: &mut Vec<Vec<f64>>) {
        let mut min = f64::MAX;
        let mut max = f64::MIN;

        for row in map.iter() {
            for &val in row {
                min = min.min(val);
                max = max.max(val);
            }
        }

        let range = max - min;
        if range > 0.0 {
            for row in map.iter_mut() {
                for val in row.iter_mut() {
                    *val = (*val - min) / range;
                }
            }
        }
    }

    /// Determine terrain from generation data
    fn determine_terrain(&self, height: f64, temp: f64, _moisture: f64) -> Terrain {
        // Water
        if height < self.config.ocean_threshold {
            if height < self.config.ocean_threshold * 0.6 {
                return Terrain::Ocean;
            } else {
                return Terrain::Coast;
            }
        }

        // Mountains
        if height > self.config.mountain_threshold {
            return Terrain::Mountain;
        }

        // Determine base terrain by temperature
        let is_hill = height > self.config.hill_threshold;

        if temp < 0.15 {
            // Frozen
            if is_hill { Terrain::SnowHill } else { Terrain::Snow }
        } else if temp < 0.3 {
            // Cold
            if is_hill { Terrain::TundraHill } else { Terrain::Tundra }
        } else if temp > 0.8 {
            // Hot and dry
            if is_hill { Terrain::DesertHill } else { Terrain::Desert }
        } else if temp > 0.5 {
            // Warm
            if is_hill { Terrain::PlainsHill } else { Terrain::Plains }
        } else {
            // Temperate
            if is_hill { Terrain::GrasslandHill } else { Terrain::Grassland }
        }
    }

    /// Determine feature for terrain
    fn determine_feature(
        &mut self,
        terrain: Terrain,
        temp: f64,
        moisture: f64,
    ) -> Option<TileFeature> {
        // No features on water, mountains, or snow
        if terrain.is_water() || matches!(terrain, Terrain::Mountain | Terrain::Snow | Terrain::SnowHill) {
            return None;
        }

        // Forest in temperate/cold with high moisture
        if temp < 0.6 && moisture > 0.5 && self.rng.gen_bool(0.4) {
            return Some(TileFeature::Forest);
        }

        // Jungle in hot with high moisture
        if temp > 0.7 && moisture > 0.6 && self.rng.gen_bool(0.5) {
            return Some(TileFeature::Jungle);
        }

        // Marsh in flat, wet areas
        if !terrain.is_hill() && moisture > 0.7 && self.rng.gen_bool(0.2) {
            return Some(TileFeature::Marsh);
        }

        // Oasis in desert
        if matches!(terrain, Terrain::Desert) && moisture > 0.4 && self.rng.gen_bool(0.05) {
            return Some(TileFeature::Oasis);
        }

        None
    }

    /// Generate the complete map
    pub fn generate(&mut self, commands: &mut Commands) -> Vec<Entity> {
        let height = self.generate_height_map();
        let temperature = self.generate_temperature_map();
        let moisture = self.generate_moisture_map();

        let mut entities = Vec::with_capacity(
            (self.config.width * self.config.height) as usize
        );

        for q in 0..self.config.width {
            for r in 0..self.config.height {
                let x = q as usize;
                let y = r as usize;

                let terrain = self.determine_terrain(
                    height[x][y],
                    temperature[x][y],
                    moisture[x][y],
                );

                let feature = self.determine_feature(
                    terrain,
                    temperature[x][y],
                    moisture[x][y],
                );

                let position = TilePosition::new(q, r);
                let yields = TileYields::calculate(terrain, feature, None);

                let mut entity_cmd = commands.spawn(TileBundle {
                    tile: Tile,
                    position,
                    terrain,
                    yields,
                    rivers: RiverEdges::default(),
                });

                if let Some(feat) = feature {
                    entity_cmd.insert(feat);
                }

                entities.push(entity_cmd.id());
            }
        }

        entities
    }
}
```

### River Generation

```rust
impl MapGenerator {
    /// Generate rivers flowing from high elevation to water
    pub fn generate_rivers(
        &mut self,
        height_map: &Vec<Vec<f64>>,
        tiles: &mut Query<(&TilePosition, &Terrain, &mut RiverEdges)>,
    ) {
        let river_starts = self.find_river_sources(height_map);

        for start in river_starts {
            self.trace_river(start, height_map, tiles);
        }
    }

    fn find_river_sources(&mut self, height: &Vec<Vec<f64>>) -> Vec<(i32, i32)> {
        let mut sources = Vec::new();

        for x in 0..self.config.width {
            for y in 0..self.config.height {
                let h = height[x as usize][y as usize];

                // Rivers start from mountains and high hills
                if h > self.config.hill_threshold + 0.1 && self.rng.gen_bool(0.1) {
                    sources.push((x, y));
                }
            }
        }

        sources
    }

    fn trace_river(
        &self,
        start: (i32, i32),
        height: &Vec<Vec<f64>>,
        tiles: &mut Query<(&TilePosition, &Terrain, &mut RiverEdges)>,
    ) {
        let mut current = start;
        let mut visited = std::collections::HashSet::new();

        while visited.insert(current) {
            let (cx, cy) = current;
            if cx < 0 || cy < 0 || cx >= self.config.width || cy >= self.config.height {
                break;
            }

            // Find lowest neighbor
            let current_hex = TilePosition::new(cx, cy);
            let neighbors = current_hex.neighbors();

            let mut lowest: Option<(TilePosition, f64)> = None;

            for (i, neighbor) in neighbors.iter().enumerate() {
                let nx = neighbor.0.x();
                let ny = neighbor.0.y();

                if nx >= 0 && ny >= 0 && nx < self.config.width && ny < self.config.height {
                    let neighbor_height = height[nx as usize][ny as usize];

                    if lowest.is_none() || neighbor_height < lowest.unwrap().1 {
                        lowest = Some((*neighbor, neighbor_height));
                    }
                }
            }

            if let Some((next_pos, next_height)) = lowest {
                let current_height = height[cx as usize][cy as usize];

                // Only flow downhill
                if next_height < current_height {
                    // Mark river edge on current tile
                    // (Would need to determine which edge based on direction)
                    current = (next_pos.0.x(), next_pos.0.y());

                    // Check if we reached water
                    // Stop river generation
                    if next_height < self.config.ocean_threshold {
                        break;
                    }
                } else {
                    break; // Can't flow uphill
                }
            } else {
                break; // No valid neighbor
            }
        }
    }
}
```

## Map Rendering

### Using `bevy_ecs_tilemap` for Efficient Rendering

```toml
# Cargo.toml
[dependencies]
bevy = "0.12"
bevy_ecs_tilemap = "0.12"
```

```rust
use bevy::prelude::*;
use bevy_ecs_tilemap::prelude::*;

/// Tile texture indices for the sprite atlas
#[derive(Clone, Copy)]
pub struct TerrainSpriteIndex {
    pub grassland: u32,
    pub plains: u32,
    pub desert: u32,
    pub tundra: u32,
    pub snow: u32,
    pub ocean: u32,
    pub coast: u32,
    pub mountain: u32,
    pub grassland_hill: u32,
    pub plains_hill: u32,
    pub desert_hill: u32,
    pub tundra_hill: u32,
    pub snow_hill: u32,
    pub lake: u32,
}

impl Default for TerrainSpriteIndex {
    fn default() -> Self {
        Self {
            grassland: 0,
            plains: 1,
            desert: 2,
            tundra: 3,
            snow: 4,
            ocean: 5,
            coast: 6,
            mountain: 7,
            grassland_hill: 8,
            plains_hill: 9,
            desert_hill: 10,
            tundra_hill: 11,
            snow_hill: 12,
            lake: 13,
        }
    }
}

/// Resource holding tilemap configuration
#[derive(Resource)]
pub struct TilemapAssets {
    pub terrain_texture: Handle<Image>,
    pub feature_texture: Handle<Image>,
    pub sprite_indices: TerrainSpriteIndex,
}

/// Spawn the tilemap from generated tiles
pub fn spawn_tilemap(
    mut commands: Commands,
    assets: Res<TilemapAssets>,
    config: Res<MapConfig>,
    tiles: Query<(&TilePosition, &Terrain, Option<&TileFeature>)>,
) {
    let map_size = TilemapSize {
        x: config.width as u32,
        y: config.height as u32,
    };

    let tilemap_entity = commands.spawn_empty().id();
    let mut tile_storage = TileStorage::empty(map_size);

    for (position, terrain, _feature) in tiles.iter() {
        let tile_pos = TilePos {
            x: position.0.x() as u32,
            y: position.0.y() as u32,
        };

        let texture_index = terrain_to_sprite_index(*terrain, &assets.sprite_indices);

        let tile_entity = commands
            .spawn(TileBundle {
                position: tile_pos,
                tilemap_id: TilemapId(tilemap_entity),
                texture_index: TileTextureIndex(texture_index),
                ..default()
            })
            .id();

        tile_storage.set(&tile_pos, tile_entity);
    }

    let tile_size = TilemapTileSize { x: 64.0, y: 64.0 };
    let grid_size = tile_size.into();
    let map_type = TilemapType::Hexagon(HexCoordSystem::RowOdd);

    commands.entity(tilemap_entity).insert(TilemapBundle {
        grid_size,
        map_type,
        size: map_size,
        storage: tile_storage,
        texture: TilemapTexture::Single(assets.terrain_texture.clone()),
        tile_size,
        transform: Transform::from_translation(Vec3::ZERO),
        ..default()
    });
}

fn terrain_to_sprite_index(terrain: Terrain, indices: &TerrainSpriteIndex) -> u32 {
    match terrain {
        Terrain::Grassland => indices.grassland,
        Terrain::Plains => indices.plains,
        Terrain::Desert => indices.desert,
        Terrain::Tundra => indices.tundra,
        Terrain::Snow => indices.snow,
        Terrain::Ocean => indices.ocean,
        Terrain::Coast => indices.coast,
        Terrain::Mountain => indices.mountain,
        Terrain::GrasslandHill => indices.grassland_hill,
        Terrain::PlainsHill => indices.plains_hill,
        Terrain::DesertHill => indices.desert_hill,
        Terrain::TundraHill => indices.tundra_hill,
        Terrain::SnowHill => indices.snow_hill,
        Terrain::Lake => indices.lake,
    }
}
```

### Alternative: Simple Sprite-Based Rendering

For prototyping before adding `bevy_ecs_tilemap`:

```rust
use bevy::prelude::*;

/// Simple colored hex rendering for prototyping
pub fn spawn_simple_hexes(
    mut commands: Commands,
    tiles: Query<(Entity, &TilePosition, &Terrain)>,
    layout: Res<HexGridLayout>,
) {
    for (entity, pos, terrain) in tiles.iter() {
        let world_pos = layout.hex_to_world(pos.0);
        let color = terrain_to_color(*terrain);

        commands.entity(entity).insert(SpriteBundle {
            sprite: Sprite {
                color,
                custom_size: Some(Vec2::splat(32.0)),
                ..default()
            },
            transform: Transform::from_translation(world_pos.extend(0.0)),
            ..default()
        });
    }
}

fn terrain_to_color(terrain: Terrain) -> Color {
    match terrain {
        Terrain::Grassland => Color::rgb(0.2, 0.7, 0.2),
        Terrain::GrasslandHill => Color::rgb(0.15, 0.6, 0.15),
        Terrain::Plains => Color::rgb(0.8, 0.7, 0.3),
        Terrain::PlainsHill => Color::rgb(0.7, 0.6, 0.25),
        Terrain::Desert => Color::rgb(0.9, 0.85, 0.5),
        Terrain::DesertHill => Color::rgb(0.85, 0.8, 0.45),
        Terrain::Tundra => Color::rgb(0.6, 0.65, 0.55),
        Terrain::TundraHill => Color::rgb(0.55, 0.6, 0.5),
        Terrain::Snow => Color::rgb(0.95, 0.95, 0.95),
        Terrain::SnowHill => Color::rgb(0.9, 0.9, 0.9),
        Terrain::Mountain => Color::rgb(0.5, 0.45, 0.4),
        Terrain::Ocean => Color::rgb(0.1, 0.2, 0.5),
        Terrain::Coast => Color::rgb(0.2, 0.4, 0.7),
        Terrain::Lake => Color::rgb(0.3, 0.5, 0.8),
    }
}
```

## Tile Hover Information

### Raycast-Based Tile Detection

```rust
use bevy::prelude::*;
use bevy::window::PrimaryWindow;

/// Currently hovered tile
#[derive(Resource, Default)]
pub struct HoveredTile(pub Option<Entity>);

/// System to detect which tile the cursor is over
pub fn update_hovered_tile(
    mut hovered: ResMut<HoveredTile>,
    windows: Query<&Window, With<PrimaryWindow>>,
    cameras: Query<(&Camera, &GlobalTransform)>,
    layout: Res<HexGridLayout>,
    tiles: Query<(Entity, &TilePosition)>,
) {
    let Ok(window) = windows.get_single() else { return };
    let Ok((camera, camera_transform)) = cameras.get_single() else { return };

    let Some(cursor_pos) = window.cursor_position() else {
        hovered.0 = None;
        return;
    };

    // Convert screen position to world position
    let Some(world_pos) = camera.viewport_to_world_2d(camera_transform, cursor_pos) else {
        hovered.0 = None;
        return;
    };

    // Convert world position to hex coordinate
    let hex_coord = layout.world_to_hex(world_pos);

    // Find the tile entity at this hex
    hovered.0 = tiles
        .iter()
        .find(|(_, pos)| pos.0 == hex_coord)
        .map(|(entity, _)| entity);
}
```

### Tile Info Panel with `bevy_egui`

```toml
# Cargo.toml
[dependencies]
bevy_egui = "0.24"
```

```rust
use bevy::prelude::*;
use bevy_egui::{egui, EguiContexts, EguiPlugin};

/// UI state for tile hover panel
#[derive(Resource, Default)]
pub struct TileHoverUI {
    pub show_panel: bool,
}

/// System to display tile information on hover
pub fn tile_hover_ui(
    mut contexts: EguiContexts,
    hovered: Res<HoveredTile>,
    tiles: Query<(
        &TilePosition,
        &Terrain,
        &TileYields,
        Option<&TileFeature>,
        Option<&TileResource>,
        &RiverEdges,
    )>,
) {
    let Some(hovered_entity) = hovered.0 else { return };
    let Ok((pos, terrain, yields, feature, resource, rivers)) = tiles.get(hovered_entity) else {
        return;
    };

    let ctx = contexts.ctx_mut();

    egui::Window::new("Tile Info")
        .anchor(egui::Align2::LEFT_BOTTOM, [10.0, -10.0])
        .resizable(false)
        .collapsible(false)
        .show(ctx, |ui| {
            // Coordinates
            ui.label(format!("Position: ({}, {})", pos.0.x(), pos.0.y()));
            ui.separator();

            // Terrain
            ui.label(format!("Terrain: {:?}", terrain));

            // Feature
            if let Some(feat) = feature {
                ui.label(format!("Feature: {:?}", feat));
            }

            // Resource
            if let Some(res) = resource {
                ui.label(format!("Resource: {:?}", res));
            }

            // River
            if rivers.has_river() {
                ui.label("River");
            }

            ui.separator();

            // Yields
            ui.heading("Yields");
            ui.horizontal(|ui| {
                if yields.food > 0 {
                    ui.label(format!("Food: {}", yields.food));
                }
                if yields.production > 0 {
                    ui.label(format!("Prod: {}", yields.production));
                }
                if yields.gold > 0 {
                    ui.label(format!("Gold: {}", yields.gold));
                }
            });
        });
}
```

## Camera Controls

```rust
use bevy::prelude::*;
use bevy::input::mouse::{MouseMotion, MouseWheel};

/// Camera movement speed
const CAMERA_SPEED: f32 = 500.0;
const ZOOM_SPEED: f32 = 0.1;
const MIN_ZOOM: f32 = 0.5;
const MAX_ZOOM: f32 = 3.0;

/// Marker component for the main camera
#[derive(Component)]
pub struct MainCamera;

/// System to handle camera movement
pub fn camera_movement(
    time: Res<Time>,
    keyboard: Res<Input<KeyCode>>,
    mut query: Query<&mut Transform, With<MainCamera>>,
) {
    let Ok(mut transform) = query.get_single_mut() else { return };

    let mut direction = Vec3::ZERO;

    if keyboard.pressed(KeyCode::W) || keyboard.pressed(KeyCode::Up) {
        direction.y += 1.0;
    }
    if keyboard.pressed(KeyCode::S) || keyboard.pressed(KeyCode::Down) {
        direction.y -= 1.0;
    }
    if keyboard.pressed(KeyCode::A) || keyboard.pressed(KeyCode::Left) {
        direction.x -= 1.0;
    }
    if keyboard.pressed(KeyCode::D) || keyboard.pressed(KeyCode::Right) {
        direction.x += 1.0;
    }

    if direction != Vec3::ZERO {
        direction = direction.normalize();
        transform.translation += direction * CAMERA_SPEED * time.delta_seconds();
    }
}

/// System to handle camera zoom
pub fn camera_zoom(
    mut scroll_events: EventReader<MouseWheel>,
    mut query: Query<&mut OrthographicProjection, With<MainCamera>>,
) {
    let Ok(mut projection) = query.get_single_mut() else { return };

    for event in scroll_events.read() {
        projection.scale -= event.y * ZOOM_SPEED;
        projection.scale = projection.scale.clamp(MIN_ZOOM, MAX_ZOOM);
    }
}

/// Spawn the main camera
pub fn spawn_camera(mut commands: Commands) {
    commands.spawn((
        Camera2dBundle::default(),
        MainCamera,
    ));
}
```

## Project Structure

```
openciv/
  Cargo.toml
  src/
    main.rs                 # App entry point
    lib.rs                  # Library root (optional)

    # Hex grid module
    hex/
      mod.rs                # Module exports
      coord.rs              # HexCoord, TilePosition
      layout.rs             # HexGridLayout

    # Tile module
    tile/
      mod.rs                # Module exports
      terrain.rs            # Terrain enum
      feature.rs            # TileFeature enum
      resource.rs           # TileResource enum
      yields.rs             # TileYields component
      river.rs              # RiverEdges component
      bundle.rs             # TileBundle

    # Map generation module
    map/
      mod.rs                # Module exports
      config.rs             # MapConfig resource
      generator.rs          # MapGenerator
      rivers.rs             # River generation

    # Rendering module
    render/
      mod.rs                # Module exports
      tilemap.rs            # Tilemap rendering
      camera.rs             # Camera controls

    # UI module
    ui/
      mod.rs                # Module exports
      tile_info.rs          # Tile hover panel

    # Plugin definitions
    plugins/
      mod.rs
      game_plugin.rs        # Main game plugin
      map_plugin.rs         # Map generation plugin
      ui_plugin.rs          # UI plugin
```

### Cargo.toml

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

### Main Entry Point

```rust
// src/main.rs
use bevy::prelude::*;

mod hex;
mod tile;
mod map;
mod render;
mod ui;
mod plugins;

use plugins::GamePlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "OpenCiv".into(),
                resolution: (1280., 720.).into(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins(GamePlugin)
        .run();
}
```

### Game Plugin

```rust
// src/plugins/game_plugin.rs
use bevy::prelude::*;
use bevy_egui::EguiPlugin;

use crate::hex::HexGridLayout;
use crate::map::{MapConfig, MapGenerator};
use crate::render::{spawn_camera, camera_movement, camera_zoom};
use crate::ui::{tile_hover_ui, update_hovered_tile, HoveredTile};

pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app
            // Third-party plugins
            .add_plugins(EguiPlugin)

            // Resources
            .init_resource::<HexGridLayout>()
            .init_resource::<MapConfig>()
            .init_resource::<HoveredTile>()

            // Startup systems
            .add_systems(Startup, (
                spawn_camera,
                generate_map,
            ))

            // Update systems
            .add_systems(Update, (
                camera_movement,
                camera_zoom,
                update_hovered_tile,
                tile_hover_ui,
            ));
    }
}

fn generate_map(
    mut commands: Commands,
    config: Res<MapConfig>,
) {
    let mut generator = MapGenerator::new(config.clone());
    generator.generate(&mut commands);
}
```

## Recommended Crates Summary

| Crate | Version | Purpose |
|-------|---------|---------|
| `bevy` | 0.12+ | Game engine and ECS |
| `bevy_egui` | 0.24 | Immediate mode UI |
| `bevy_ecs_tilemap` | 0.12 | Efficient tilemap rendering |
| `hexx` | 0.17 | Hex grid math |
| `noise` | 0.8 | Procedural noise generation |
| `rand` | 0.8 | Random number generation |
| `serde` | 1.0 | Serialization for save/load |
| `serde_json` | 1.0 | JSON serialization |

## Alignment with Architecture Patterns

### From `2026-01-17-rust-architecture-patterns.md`

| Pattern | Implementation |
|---------|----------------|
| Small focused components | `Terrain`, `TileYields`, `TileFeature` separate |
| Single responsibility systems | `update_hovered_tile`, `tile_hover_ui` separate |
| Event-driven when needed | Can add `TileHoveredEvent` for additional handlers |
| Resources for global state | `HexGridLayout`, `MapConfig`, `HoveredTile` |
| Builder patterns | `TileBundle::new().with_feature()` |
| Clear module boundaries | `hex/`, `tile/`, `map/`, `render/`, `ui/` |

### From `2026-01-17-game-architecture-partitioning.md`

| Recommendation | Implementation |
|----------------|----------------|
| Shared hex math | `hex/` module reusable across client/server |
| Configuration-driven | `MapConfig` resource with presets |
| Type definitions | All enums implement `Serialize`/`Deserialize` |
| Clear module boundaries | Plugin-based architecture |

## Dependencies Unlocked for Phase 2+

After completing Phase 1, these systems are ready to build:

| Feature | Required from Phase 1 |
|---------|----------------------|
| Unit movement | `HexCoord::neighbors()`, `HexCoord::distance()` |
| City territory | `HexCoord::range()` |
| Pathfinding | `Terrain::movement_cost()`, hex adjacency |
| Rivers/features | `TileFeature`, `RiverEdges` components |
| Fog of war | Tile visibility can use same hover detection |
| Resource spawning | `TileResource` enum ready |
| Save/load | All components implement `Serialize` |

## Key Files Summary

| File | Purpose |
|------|---------|
| `src/main.rs` | Application entry point |
| `src/hex/coord.rs` | Hex coordinate system |
| `src/tile/terrain.rs` | Terrain types and properties |
| `src/tile/yields.rs` | Tile yield calculations |
| `src/map/generator.rs` | Procedural map generation |
| `src/render/camera.rs` | Camera movement and zoom |
| `src/ui/tile_info.rs` | Tile hover panel |
| `Cargo.toml` | Dependencies |

## Recommendations

### For Implementation

1. **Start with `hexx` crate** rather than custom hex math - battle-tested and Bevy-compatible
2. **Use placeholder colors first** before investing in sprite assets
3. **Test generation with small maps** (Duel size: 48x32) for fast iteration
4. **Implement camera controls early** - essential for map exploration
5. **Add seed display/input** so maps can be reproduced

### For AI Agent Development

1. **Keep systems under 50 lines** - easier to modify without breaking other code
2. **Use explicit types** rather than type inference where it aids clarity
3. **Document enum variants** with yield/cost values inline
4. **Prefer composition** (multiple small components) over large structs
5. **Test hex math separately** - unit tests for `HexCoord` methods

### Performance Considerations

1. **Use `bevy_ecs_tilemap`** for maps larger than 50x50 tiles
2. **Enable `dynamic_linking`** in dev mode for faster compile times
3. **Consider chunk-based generation** for huge maps (deferred loading)
4. **Cache pathfinding results** when implementing movement

## Open Questions

1. **Tileset Format**: Should hexes use pointy-top or flat-top orientation? Recommend pointy-top for consistency with OpenCiv reference.

2. **Map Wrapping**: Should the map wrap horizontally (cylindrical)? Affects hex neighbor calculations at edges.

3. **River Visualization**: Rivers exist on tile edges - how to render? Options: edge sprites, shader effects, or separate river entity layer.

4. **Yield Icons**: Display yields as icons on tiles or only on hover? Consider performance impact of per-tile UI.

5. **Generation Determinism**: Should same seed produce identical maps across versions? Important for multiplayer reproducibility.

6. **Asset Loading**: Use Bevy's built-in asset system or external loading for sprites? Built-in is simpler; external allows mod support.

7. **Map Editor**: Should Phase 1 include basic map editing for testing? Could accelerate terrain/feature tuning.
