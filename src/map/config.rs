//! Map configuration for procedural generation.
//!
//! Defines map sizes and generation parameters for creating varied terrain maps.

use bevy::prelude::*;
use serde::{Deserialize, Serialize};

/// Preset map sizes matching OpenCiv's standard map dimensions.
///
/// Each size provides a different gameplay experience:
/// - Smaller maps for quick games or testing
/// - Larger maps for extended gameplay with more exploration
///
/// # Dimensions
///
/// | Size | Width | Height | Total Tiles |
/// |------|-------|--------|-------------|
/// | Duel | 48 | 32 | 1,536 |
/// | Tiny | 56 | 36 | 2,016 |
/// | Small | 68 | 44 | 2,992 |
/// | Standard | 80 | 52 | 4,160 |
/// | Large | 104 | 64 | 6,656 |
/// | Huge | 128 | 80 | 10,240 |
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Default, Serialize, Deserialize)]
pub enum MapSize {
    /// 48x32 tiles (1,536 total) - Quick 1v1 games
    Duel,
    /// 56x36 tiles (2,016 total) - Small multiplayer
    Tiny,
    /// 68x44 tiles (2,992 total) - Moderate exploration
    Small,
    /// 80x52 tiles (4,160 total) - Balanced gameplay
    #[default]
    Standard,
    /// 104x64 tiles (6,656 total) - Extended games
    Large,
    /// 128x80 tiles (10,240 total) - Epic scale
    Huge,
}

impl MapSize {
    /// Returns the (width, height) dimensions for this map size.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use openciv::map::MapSize;
    ///
    /// let (width, height) = MapSize::Standard.dimensions();
    /// assert_eq!(width, 80);
    /// assert_eq!(height, 52);
    /// ```
    #[inline]
    pub fn dimensions(&self) -> (i32, i32) {
        match self {
            MapSize::Duel => (48, 32),
            MapSize::Tiny => (56, 36),
            MapSize::Small => (68, 44),
            MapSize::Standard => (80, 52),
            MapSize::Large => (104, 64),
            MapSize::Huge => (128, 80),
        }
    }

    /// Returns the total number of tiles for this map size.
    #[inline]
    pub fn total_tiles(&self) -> i32 {
        let (w, h) = self.dimensions();
        w * h
    }
}

/// Configuration resource for map generation.
///
/// Contains all parameters needed to procedurally generate a terrain map.
/// The same configuration with the same seed will always produce identical maps.
///
/// # Example
///
/// ```rust,ignore
/// use openciv::map::MapConfig;
///
/// // Create a standard map with default settings
/// let config = MapConfig::default();
///
/// // Create a small map with a specific seed
/// let config = MapConfig::small().with_seed(12345);
///
/// // Create a custom configuration
/// let config = MapConfig {
///     size: MapSize::Large,
///     seed: 42,
///     ocean_threshold: 0.40,  // More water
///     ..Default::default()
/// };
/// ```
#[derive(Resource, Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct MapConfig {
    /// Map dimensions preset
    pub size: MapSize,
    /// Random seed for deterministic generation
    pub seed: u64,
    /// Target percentage of land tiles (0.0-1.0)
    pub land_coverage: f64,
    /// Height values below this are water (0.0-1.0)
    pub ocean_threshold: f64,
    /// Height values above this are hills (0.0-1.0)
    pub hill_threshold: f64,
    /// Height values above this are mountains (0.0-1.0)
    pub mountain_threshold: f64,
}

impl Default for MapConfig {
    fn default() -> Self {
        Self {
            size: MapSize::Standard,
            seed: 42,
            land_coverage: 0.4,
            ocean_threshold: 0.35,
            hill_threshold: 0.55,
            mountain_threshold: 0.75,
        }
    }
}

impl MapConfig {
    /// Create a Duel-sized map configuration (48x32).
    pub fn duel() -> Self {
        Self {
            size: MapSize::Duel,
            ..Default::default()
        }
    }

    /// Create a Tiny-sized map configuration (56x36).
    pub fn tiny() -> Self {
        Self {
            size: MapSize::Tiny,
            ..Default::default()
        }
    }

    /// Create a Small-sized map configuration (68x44).
    pub fn small() -> Self {
        Self {
            size: MapSize::Small,
            ..Default::default()
        }
    }

    /// Create a Standard-sized map configuration (80x52).
    pub fn standard() -> Self {
        Self::default()
    }

    /// Create a Large-sized map configuration (104x64).
    pub fn large() -> Self {
        Self {
            size: MapSize::Large,
            ..Default::default()
        }
    }

    /// Create a Huge-sized map configuration (128x80).
    pub fn huge() -> Self {
        Self {
            size: MapSize::Huge,
            ..Default::default()
        }
    }

    /// Set the random seed for deterministic generation.
    ///
    /// Using the same seed with the same configuration will produce
    /// identical maps, useful for sharing maps or testing.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let config = MapConfig::small().with_seed(12345);
    /// ```
    pub fn with_seed(mut self, seed: u64) -> Self {
        self.seed = seed;
        self
    }

    /// Set the ocean threshold.
    ///
    /// Height values below this threshold become water tiles.
    /// Higher values create more water.
    pub fn with_ocean_threshold(mut self, threshold: f64) -> Self {
        self.ocean_threshold = threshold;
        self
    }

    /// Set the hill threshold.
    ///
    /// Height values above this threshold (but below mountain threshold)
    /// become hill tiles. Lower values create more hills.
    pub fn with_hill_threshold(mut self, threshold: f64) -> Self {
        self.hill_threshold = threshold;
        self
    }

    /// Set the mountain threshold.
    ///
    /// Height values above this threshold become mountain tiles.
    /// Lower values create more mountains.
    pub fn with_mountain_threshold(mut self, threshold: f64) -> Self {
        self.mountain_threshold = threshold;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ MapSize Tests ============

    #[test]
    fn test_map_size_dimensions() {
        assert_eq!(MapSize::Duel.dimensions(), (48, 32));
        assert_eq!(MapSize::Tiny.dimensions(), (56, 36));
        assert_eq!(MapSize::Small.dimensions(), (68, 44));
        assert_eq!(MapSize::Standard.dimensions(), (80, 52));
        assert_eq!(MapSize::Large.dimensions(), (104, 64));
        assert_eq!(MapSize::Huge.dimensions(), (128, 80));
    }

    #[test]
    fn test_map_size_total_tiles() {
        assert_eq!(MapSize::Duel.total_tiles(), 48 * 32);
        assert_eq!(MapSize::Tiny.total_tiles(), 56 * 36);
        assert_eq!(MapSize::Small.total_tiles(), 68 * 44);
        assert_eq!(MapSize::Standard.total_tiles(), 80 * 52);
        assert_eq!(MapSize::Large.total_tiles(), 104 * 64);
        assert_eq!(MapSize::Huge.total_tiles(), 128 * 80);
    }

    #[test]
    fn test_map_size_default() {
        assert_eq!(MapSize::default(), MapSize::Standard);
    }

    // ============ MapConfig Tests ============

    #[test]
    fn test_default_config() {
        let config = MapConfig::default();

        assert_eq!(config.size, MapSize::Standard);
        assert_eq!(config.seed, 42);
        assert!((config.land_coverage - 0.4).abs() < f64::EPSILON);
        assert!((config.ocean_threshold - 0.35).abs() < f64::EPSILON);
        assert!((config.hill_threshold - 0.55).abs() < f64::EPSILON);
        assert!((config.mountain_threshold - 0.75).abs() < f64::EPSILON);
    }

    #[test]
    fn test_preset_configs() {
        assert_eq!(MapConfig::duel().size, MapSize::Duel);
        assert_eq!(MapConfig::tiny().size, MapSize::Tiny);
        assert_eq!(MapConfig::small().size, MapSize::Small);
        assert_eq!(MapConfig::standard().size, MapSize::Standard);
        assert_eq!(MapConfig::large().size, MapSize::Large);
        assert_eq!(MapConfig::huge().size, MapSize::Huge);

        // All presets should have same default thresholds
        for config in [
            MapConfig::duel(),
            MapConfig::tiny(),
            MapConfig::small(),
            MapConfig::standard(),
            MapConfig::large(),
            MapConfig::huge(),
        ] {
            assert_eq!(config.seed, 42);
            assert!((config.ocean_threshold - 0.35).abs() < f64::EPSILON);
        }
    }

    #[test]
    fn test_with_seed() {
        let config = MapConfig::small().with_seed(12345);

        assert_eq!(config.size, MapSize::Small);
        assert_eq!(config.seed, 12345);
    }

    #[test]
    fn test_builder_methods() {
        let config = MapConfig::default()
            .with_seed(999)
            .with_ocean_threshold(0.40)
            .with_hill_threshold(0.50)
            .with_mountain_threshold(0.80);

        assert_eq!(config.seed, 999);
        assert!((config.ocean_threshold - 0.40).abs() < f64::EPSILON);
        assert!((config.hill_threshold - 0.50).abs() < f64::EPSILON);
        assert!((config.mountain_threshold - 0.80).abs() < f64::EPSILON);
    }

    // ============ Serde Tests ============

    #[test]
    fn test_map_size_serde_roundtrip() {
        let sizes = [
            MapSize::Duel,
            MapSize::Tiny,
            MapSize::Small,
            MapSize::Standard,
            MapSize::Large,
            MapSize::Huge,
        ];

        for size in sizes {
            let json = serde_json::to_string(&size).expect("serialization failed");
            let deserialized: MapSize = serde_json::from_str(&json).expect("deserialization failed");
            assert_eq!(size, deserialized);
        }
    }

    #[test]
    fn test_map_config_serde_roundtrip() {
        let config = MapConfig::small().with_seed(12345);
        let json = serde_json::to_string(&config).expect("serialization failed");
        let deserialized: MapConfig = serde_json::from_str(&json).expect("deserialization failed");

        assert_eq!(config, deserialized);
    }
}
