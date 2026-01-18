//! Tile features for OpenCiv tiles.
//!
//! Features are overlay elements that modify terrain yields and movement costs.
//! A tile can have at most one feature.

use bevy::prelude::*;
use serde::{Deserialize, Serialize};

use super::terrain::Terrain;

/// Feature overlay on a terrain tile.
///
/// Features modify the base terrain yields and movement costs.
/// Each feature has restrictions on which terrain types it can appear on.
///
/// # Yield Modifiers (from OpenCiv)
///
/// | Feature | Food | Production | Gold | Movement |
/// |---------|------|------------|------|----------|
/// | Forest | 0 | +1 | 0 | +1 |
/// | Jungle | 0 | -1 | 0 | +1 |
/// | Marsh | -1 | 0 | 0 | +1 |
/// | Floodplains | +2 | 0 | 0 | 0 |
/// | Oasis | +3 | 0 | +1 | 0 |
/// | Ice | 0 | 0 | 0 | 0 |
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Serialize, Deserialize)]
pub enum TileFeature {
    /// Dense woodland providing production bonus.
    /// Valid on: Grassland, Plains, Tundra (and their hills)
    Forest,

    /// Tropical jungle, difficult to traverse and work.
    /// Valid on: Grassland, Plains (warm climates)
    Jungle,

    /// Wetland with difficult terrain.
    /// Valid on: Grassland (flat only)
    Marsh,

    /// Fertile river floodplain.
    /// Valid on: Desert (flat, near river)
    Floodplains,

    /// Desert water source.
    /// Valid on: Desert (flat only)
    Oasis,

    /// Polar ice cover.
    /// Valid on: Coast, Ocean (polar regions)
    Ice,
}

impl TileFeature {
    /// Food yield modifier for this feature.
    ///
    /// - Marsh: -1 (difficult to farm)
    /// - Floodplains: +2 (very fertile)
    /// - Oasis: +3 (desert food source)
    /// - Others: 0
    #[inline]
    pub fn food_modifier(&self) -> i32 {
        match self {
            TileFeature::Marsh => -1,
            TileFeature::Floodplains => 2,
            TileFeature::Oasis => 3,
            _ => 0,
        }
    }

    /// Production yield modifier for this feature.
    ///
    /// - Forest: +1 (lumber source)
    /// - Jungle: -1 (difficult to work)
    /// - Others: 0
    #[inline]
    pub fn production_modifier(&self) -> i32 {
        match self {
            TileFeature::Forest => 1,
            TileFeature::Jungle => -1,
            _ => 0,
        }
    }

    /// Gold yield modifier for this feature.
    ///
    /// - Oasis: +1 (trade route stop)
    /// - Others: 0
    #[inline]
    pub fn gold_modifier(&self) -> i32 {
        match self {
            TileFeature::Oasis => 1,
            _ => 0,
        }
    }

    /// Additional movement cost from this feature.
    ///
    /// - Forest, Jungle, Marsh: +1 (difficult terrain)
    /// - Others: 0
    #[inline]
    pub fn movement_modifier(&self) -> i32 {
        match self {
            TileFeature::Forest | TileFeature::Jungle | TileFeature::Marsh => 1,
            _ => 0,
        }
    }

    /// Returns true if this feature can appear on the given terrain.
    ///
    /// Feature-terrain compatibility:
    /// - Forest: Grassland, Plains, Tundra (and their hills)
    /// - Jungle: Grassland, Plains (and their hills)
    /// - Marsh: Grassland (flat only)
    /// - Floodplains: Desert (flat only)
    /// - Oasis: Desert (flat only)
    /// - Ice: Coast, Ocean
    pub fn can_place_on(&self, terrain: Terrain) -> bool {
        match self {
            TileFeature::Forest => matches!(
                terrain,
                Terrain::Grassland
                    | Terrain::Plains
                    | Terrain::Tundra
                    | Terrain::GrasslandHill
                    | Terrain::PlainsHill
                    | Terrain::TundraHill
            ),
            TileFeature::Jungle => matches!(
                terrain,
                Terrain::Grassland
                    | Terrain::Plains
                    | Terrain::GrasslandHill
                    | Terrain::PlainsHill
            ),
            TileFeature::Marsh => matches!(terrain, Terrain::Grassland),
            TileFeature::Floodplains => matches!(terrain, Terrain::Desert),
            TileFeature::Oasis => matches!(terrain, Terrain::Desert),
            TileFeature::Ice => matches!(terrain, Terrain::Coast | Terrain::Ocean),
        }
    }

    /// Returns a list of valid terrain types for this feature.
    ///
    /// Useful for map generation when deciding where to place features.
    pub fn valid_terrains(&self) -> &'static [Terrain] {
        match self {
            TileFeature::Forest => &[
                Terrain::Grassland,
                Terrain::Plains,
                Terrain::Tundra,
                Terrain::GrasslandHill,
                Terrain::PlainsHill,
                Terrain::TundraHill,
            ],
            TileFeature::Jungle => &[
                Terrain::Grassland,
                Terrain::Plains,
                Terrain::GrasslandHill,
                Terrain::PlainsHill,
            ],
            TileFeature::Marsh => &[Terrain::Grassland],
            TileFeature::Floodplains => &[Terrain::Desert],
            TileFeature::Oasis => &[Terrain::Desert],
            TileFeature::Ice => &[Terrain::Coast, Terrain::Ocean],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ Yield Modifier Tests ============

    #[test]
    fn test_forest_modifiers() {
        let feature = TileFeature::Forest;
        assert_eq!(feature.food_modifier(), 0);
        assert_eq!(feature.production_modifier(), 1);
        assert_eq!(feature.gold_modifier(), 0);
        assert_eq!(feature.movement_modifier(), 1);
    }

    #[test]
    fn test_jungle_modifiers() {
        let feature = TileFeature::Jungle;
        assert_eq!(feature.food_modifier(), 0);
        assert_eq!(feature.production_modifier(), -1);
        assert_eq!(feature.gold_modifier(), 0);
        assert_eq!(feature.movement_modifier(), 1);
    }

    #[test]
    fn test_marsh_modifiers() {
        let feature = TileFeature::Marsh;
        assert_eq!(feature.food_modifier(), -1);
        assert_eq!(feature.production_modifier(), 0);
        assert_eq!(feature.gold_modifier(), 0);
        assert_eq!(feature.movement_modifier(), 1);
    }

    #[test]
    fn test_floodplains_modifiers() {
        let feature = TileFeature::Floodplains;
        assert_eq!(feature.food_modifier(), 2);
        assert_eq!(feature.production_modifier(), 0);
        assert_eq!(feature.gold_modifier(), 0);
        assert_eq!(feature.movement_modifier(), 0);
    }

    #[test]
    fn test_oasis_modifiers() {
        let feature = TileFeature::Oasis;
        assert_eq!(feature.food_modifier(), 3);
        assert_eq!(feature.production_modifier(), 0);
        assert_eq!(feature.gold_modifier(), 1);
        assert_eq!(feature.movement_modifier(), 0);
    }

    #[test]
    fn test_ice_modifiers() {
        let feature = TileFeature::Ice;
        assert_eq!(feature.food_modifier(), 0);
        assert_eq!(feature.production_modifier(), 0);
        assert_eq!(feature.gold_modifier(), 0);
        assert_eq!(feature.movement_modifier(), 0);
    }

    // ============ Terrain Compatibility Tests ============

    #[test]
    fn test_forest_valid_terrains() {
        let feature = TileFeature::Forest;

        // Valid terrains
        assert!(feature.can_place_on(Terrain::Grassland));
        assert!(feature.can_place_on(Terrain::Plains));
        assert!(feature.can_place_on(Terrain::Tundra));
        assert!(feature.can_place_on(Terrain::GrasslandHill));
        assert!(feature.can_place_on(Terrain::PlainsHill));
        assert!(feature.can_place_on(Terrain::TundraHill));

        // Invalid terrains
        assert!(!feature.can_place_on(Terrain::Desert));
        assert!(!feature.can_place_on(Terrain::Snow));
        assert!(!feature.can_place_on(Terrain::Mountain));
        assert!(!feature.can_place_on(Terrain::Coast));
        assert!(!feature.can_place_on(Terrain::Ocean));
    }

    #[test]
    fn test_jungle_valid_terrains() {
        let feature = TileFeature::Jungle;

        // Valid terrains (warm climate only)
        assert!(feature.can_place_on(Terrain::Grassland));
        assert!(feature.can_place_on(Terrain::Plains));
        assert!(feature.can_place_on(Terrain::GrasslandHill));
        assert!(feature.can_place_on(Terrain::PlainsHill));

        // Invalid terrains (too cold or wrong type)
        assert!(!feature.can_place_on(Terrain::Tundra));
        assert!(!feature.can_place_on(Terrain::Snow));
        assert!(!feature.can_place_on(Terrain::Desert));
        assert!(!feature.can_place_on(Terrain::TundraHill));
    }

    #[test]
    fn test_marsh_valid_terrains() {
        let feature = TileFeature::Marsh;

        // Valid terrains (flat grassland only)
        assert!(feature.can_place_on(Terrain::Grassland));

        // Invalid terrains
        assert!(!feature.can_place_on(Terrain::GrasslandHill));
        assert!(!feature.can_place_on(Terrain::Plains));
        assert!(!feature.can_place_on(Terrain::Desert));
    }

    #[test]
    fn test_floodplains_valid_terrains() {
        let feature = TileFeature::Floodplains;

        // Valid terrains (flat desert only)
        assert!(feature.can_place_on(Terrain::Desert));

        // Invalid terrains
        assert!(!feature.can_place_on(Terrain::DesertHill));
        assert!(!feature.can_place_on(Terrain::Grassland));
        assert!(!feature.can_place_on(Terrain::Plains));
    }

    #[test]
    fn test_oasis_valid_terrains() {
        let feature = TileFeature::Oasis;

        // Valid terrains (flat desert only)
        assert!(feature.can_place_on(Terrain::Desert));

        // Invalid terrains
        assert!(!feature.can_place_on(Terrain::DesertHill));
        assert!(!feature.can_place_on(Terrain::Grassland));
    }

    #[test]
    fn test_ice_valid_terrains() {
        let feature = TileFeature::Ice;

        // Valid terrains (water only)
        assert!(feature.can_place_on(Terrain::Coast));
        assert!(feature.can_place_on(Terrain::Ocean));

        // Invalid terrains
        assert!(!feature.can_place_on(Terrain::Lake));
        assert!(!feature.can_place_on(Terrain::Snow));
        assert!(!feature.can_place_on(Terrain::Grassland));
    }

    #[test]
    fn test_valid_terrains_method() {
        // Verify valid_terrains() returns the same terrains as can_place_on()
        for feature in [
            TileFeature::Forest,
            TileFeature::Jungle,
            TileFeature::Marsh,
            TileFeature::Floodplains,
            TileFeature::Oasis,
            TileFeature::Ice,
        ] {
            let valid = feature.valid_terrains();
            for terrain in valid {
                assert!(
                    feature.can_place_on(*terrain),
                    "{:?} should be placeable on {:?}",
                    feature,
                    terrain
                );
            }
        }
    }

    // ============ Serde Tests ============

    #[test]
    fn test_serde_roundtrip() {
        let features = [
            TileFeature::Forest,
            TileFeature::Jungle,
            TileFeature::Marsh,
            TileFeature::Floodplains,
            TileFeature::Oasis,
            TileFeature::Ice,
        ];

        for feature in features {
            let json = serde_json::to_string(&feature).expect("serialization failed");
            let deserialized: TileFeature =
                serde_json::from_str(&json).expect("deserialization failed");
            assert_eq!(feature, deserialized);
        }
    }
}
