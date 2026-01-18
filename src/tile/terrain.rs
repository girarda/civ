//! Terrain types for OpenCiv tiles.
//!
//! Defines the 14 terrain variants matching OpenCiv, along with their
//! base yields and movement costs.

use bevy::prelude::*;
use serde::{Deserialize, Serialize};

/// Terrain type for a map tile.
///
/// Each terrain has base yields (food, production, gold) and movement costs.
/// Terrain types are based on OpenCiv's tiles.yml definitions.
///
/// # Yield Values (from OpenCiv)
///
/// | Terrain | Food | Production | Gold |
/// |---------|------|------------|------|
/// | Grassland | 2 | 0 | 0 |
/// | Plains | 1 | 1 | 0 |
/// | Desert | 0 | 0 | 0 |
/// | Tundra | 1 | 0 | 0 |
/// | Snow | 0 | 0 | 0 |
/// | *Hill | 0 | 2 | 0 |
/// | Mountain | 0 | 0 | 0 |
/// | Coast | 1 | 0 | 0 |
/// | Ocean | 1 | 0 | 0 |
/// | Lake | 2 | 0 | 0 |
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default, Serialize, Deserialize)]
pub enum Terrain {
    // Flat terrain
    #[default]
    Grassland,
    Plains,
    Desert,
    Tundra,
    Snow,

    // Hill variants
    GrasslandHill,
    PlainsHill,
    DesertHill,
    TundraHill,
    SnowHill,

    // Special terrain
    Mountain,

    // Water terrain
    Coast,
    Ocean,
    Lake,
}

impl Terrain {
    /// Base food yield for this terrain type.
    ///
    /// Values match OpenCiv's tiles.yml:
    /// - Grassland, Lake: 2 food
    /// - Plains, Tundra, Coast, Ocean: 1 food
    /// - All others: 0 food
    #[inline]
    pub fn base_food(&self) -> i32 {
        match self {
            Terrain::Grassland | Terrain::Lake => 2,
            Terrain::Plains | Terrain::Tundra | Terrain::Coast | Terrain::Ocean => 1,
            _ => 0,
        }
    }

    /// Base production yield for this terrain type.
    ///
    /// Values match OpenCiv's tiles.yml:
    /// - Plains: 1 production
    /// - All hills: 2 production
    /// - All others: 0 production
    #[inline]
    pub fn base_production(&self) -> i32 {
        match self {
            Terrain::Plains => 1,
            Terrain::GrasslandHill
            | Terrain::PlainsHill
            | Terrain::DesertHill
            | Terrain::TundraHill
            | Terrain::SnowHill => 2,
            _ => 0,
        }
    }

    /// Base gold yield for this terrain type.
    ///
    /// Base terrain never provides gold directly.
    /// Gold comes from features, resources, or improvements.
    #[inline]
    pub fn base_gold(&self) -> i32 {
        0
    }

    /// Movement cost to enter this terrain.
    ///
    /// Values based on OpenCiv's Tile.ts:
    /// - Flat terrain: 1
    /// - Hills: 2
    /// - Mountain: 9999 (impassable)
    /// - Water: 9999 (impassable for land units, handled separately for naval)
    #[inline]
    pub fn movement_cost(&self) -> i32 {
        match self {
            // Flat terrain costs 1 movement
            Terrain::Grassland
            | Terrain::Plains
            | Terrain::Desert
            | Terrain::Tundra
            | Terrain::Snow => 1,

            // Hills cost 2 movement
            Terrain::GrasslandHill
            | Terrain::PlainsHill
            | Terrain::DesertHill
            | Terrain::TundraHill
            | Terrain::SnowHill => 2,

            // Mountains are impassable (without special abilities)
            Terrain::Mountain => 9999,

            // Water is impassable for land units
            // Naval movement is handled separately
            Terrain::Coast | Terrain::Ocean | Terrain::Lake => 9999,
        }
    }

    /// Returns true if this terrain is water (Coast, Ocean, or Lake).
    ///
    /// Used to determine unit movement rules and city placement.
    #[inline]
    pub fn is_water(&self) -> bool {
        matches!(self, Terrain::Coast | Terrain::Ocean | Terrain::Lake)
    }

    /// Returns true if this terrain is a hill variant.
    ///
    /// Hills provide production bonuses and defensive terrain.
    #[inline]
    pub fn is_hill(&self) -> bool {
        matches!(
            self,
            Terrain::GrasslandHill
                | Terrain::PlainsHill
                | Terrain::DesertHill
                | Terrain::TundraHill
                | Terrain::SnowHill
        )
    }

    /// Returns true if land units can traverse this terrain.
    ///
    /// Mountains and water are impassable without special abilities.
    #[inline]
    pub fn is_passable(&self) -> bool {
        !matches!(
            self,
            Terrain::Mountain | Terrain::Coast | Terrain::Ocean | Terrain::Lake
        )
    }

    /// Returns true if this is a flat (non-hill, non-mountain) land terrain.
    #[inline]
    pub fn is_flat_land(&self) -> bool {
        matches!(
            self,
            Terrain::Grassland
                | Terrain::Plains
                | Terrain::Desert
                | Terrain::Tundra
                | Terrain::Snow
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ Yield Tests ============

    #[test]
    fn test_grassland_yields() {
        let terrain = Terrain::Grassland;
        assert_eq!(terrain.base_food(), 2);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_plains_yields() {
        let terrain = Terrain::Plains;
        assert_eq!(terrain.base_food(), 1);
        assert_eq!(terrain.base_production(), 1);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_desert_yields() {
        let terrain = Terrain::Desert;
        assert_eq!(terrain.base_food(), 0);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_tundra_yields() {
        let terrain = Terrain::Tundra;
        assert_eq!(terrain.base_food(), 1);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_snow_yields() {
        let terrain = Terrain::Snow;
        assert_eq!(terrain.base_food(), 0);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_hill_yields() {
        // All hills should have 0 food, 2 production, 0 gold
        let hills = [
            Terrain::GrasslandHill,
            Terrain::PlainsHill,
            Terrain::DesertHill,
            Terrain::TundraHill,
            Terrain::SnowHill,
        ];

        for hill in hills {
            assert_eq!(hill.base_food(), 0, "{:?} should have 0 food", hill);
            assert_eq!(
                hill.base_production(),
                2,
                "{:?} should have 2 production",
                hill
            );
            assert_eq!(hill.base_gold(), 0, "{:?} should have 0 gold", hill);
        }
    }

    #[test]
    fn test_mountain_yields() {
        let terrain = Terrain::Mountain;
        assert_eq!(terrain.base_food(), 0);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_coast_yields() {
        let terrain = Terrain::Coast;
        assert_eq!(terrain.base_food(), 1);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_ocean_yields() {
        let terrain = Terrain::Ocean;
        assert_eq!(terrain.base_food(), 1);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    #[test]
    fn test_lake_yields() {
        let terrain = Terrain::Lake;
        assert_eq!(terrain.base_food(), 2);
        assert_eq!(terrain.base_production(), 0);
        assert_eq!(terrain.base_gold(), 0);
    }

    // ============ Movement Cost Tests ============

    #[test]
    fn test_flat_terrain_movement_costs() {
        let flat_terrains = [
            Terrain::Grassland,
            Terrain::Plains,
            Terrain::Desert,
            Terrain::Tundra,
            Terrain::Snow,
        ];

        for terrain in flat_terrains {
            assert_eq!(
                terrain.movement_cost(),
                1,
                "{:?} should have movement cost 1",
                terrain
            );
        }
    }

    #[test]
    fn test_hill_movement_costs() {
        let hills = [
            Terrain::GrasslandHill,
            Terrain::PlainsHill,
            Terrain::DesertHill,
            Terrain::TundraHill,
            Terrain::SnowHill,
        ];

        for hill in hills {
            assert_eq!(
                hill.movement_cost(),
                2,
                "{:?} should have movement cost 2",
                hill
            );
        }
    }

    #[test]
    fn test_impassable_movement_costs() {
        let impassable = [
            Terrain::Mountain,
            Terrain::Coast,
            Terrain::Ocean,
            Terrain::Lake,
        ];

        for terrain in impassable {
            assert_eq!(
                terrain.movement_cost(),
                9999,
                "{:?} should have movement cost 9999",
                terrain
            );
        }
    }

    // ============ Property Tests ============

    #[test]
    fn test_is_water() {
        // Water terrains
        assert!(Terrain::Coast.is_water());
        assert!(Terrain::Ocean.is_water());
        assert!(Terrain::Lake.is_water());

        // Non-water terrains
        assert!(!Terrain::Grassland.is_water());
        assert!(!Terrain::Plains.is_water());
        assert!(!Terrain::Desert.is_water());
        assert!(!Terrain::Mountain.is_water());
        assert!(!Terrain::GrasslandHill.is_water());
    }

    #[test]
    fn test_is_hill() {
        // Hill terrains
        assert!(Terrain::GrasslandHill.is_hill());
        assert!(Terrain::PlainsHill.is_hill());
        assert!(Terrain::DesertHill.is_hill());
        assert!(Terrain::TundraHill.is_hill());
        assert!(Terrain::SnowHill.is_hill());

        // Non-hill terrains
        assert!(!Terrain::Grassland.is_hill());
        assert!(!Terrain::Plains.is_hill());
        assert!(!Terrain::Mountain.is_hill());
        assert!(!Terrain::Coast.is_hill());
    }

    #[test]
    fn test_is_passable() {
        // Passable terrains
        assert!(Terrain::Grassland.is_passable());
        assert!(Terrain::Plains.is_passable());
        assert!(Terrain::Desert.is_passable());
        assert!(Terrain::Tundra.is_passable());
        assert!(Terrain::Snow.is_passable());
        assert!(Terrain::GrasslandHill.is_passable());
        assert!(Terrain::PlainsHill.is_passable());

        // Impassable terrains
        assert!(!Terrain::Mountain.is_passable());
        assert!(!Terrain::Coast.is_passable());
        assert!(!Terrain::Ocean.is_passable());
        assert!(!Terrain::Lake.is_passable());
    }

    #[test]
    fn test_is_flat_land() {
        // Flat land
        assert!(Terrain::Grassland.is_flat_land());
        assert!(Terrain::Plains.is_flat_land());
        assert!(Terrain::Desert.is_flat_land());
        assert!(Terrain::Tundra.is_flat_land());
        assert!(Terrain::Snow.is_flat_land());

        // Not flat land
        assert!(!Terrain::GrasslandHill.is_flat_land());
        assert!(!Terrain::Mountain.is_flat_land());
        assert!(!Terrain::Coast.is_flat_land());
    }

    // ============ Default Tests ============

    #[test]
    fn test_default_terrain() {
        assert_eq!(Terrain::default(), Terrain::Grassland);
    }

    // ============ Serde Tests ============

    #[test]
    fn test_serde_roundtrip() {
        let terrains = [
            Terrain::Grassland,
            Terrain::Plains,
            Terrain::Desert,
            Terrain::Tundra,
            Terrain::Snow,
            Terrain::GrasslandHill,
            Terrain::PlainsHill,
            Terrain::DesertHill,
            Terrain::TundraHill,
            Terrain::SnowHill,
            Terrain::Mountain,
            Terrain::Coast,
            Terrain::Ocean,
            Terrain::Lake,
        ];

        for terrain in terrains {
            let json = serde_json::to_string(&terrain).expect("serialization failed");
            let deserialized: Terrain =
                serde_json::from_str(&json).expect("deserialization failed");
            assert_eq!(terrain, deserialized);
        }
    }
}
