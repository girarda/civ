//! Tile yield calculations for OpenCiv.
//!
//! TileYields represents the combined output of a tile including terrain,
//! features, resources, and improvements.

use bevy::prelude::*;
use serde::{Deserialize, Serialize};
use std::ops::Add;

use super::feature::TileFeature;
use super::resource::TileResource;
use super::terrain::Terrain;

/// Combined yield values for a tile.
///
/// Represents the total output from terrain, features, resources, and improvements.
/// Values are stored as i32 to support negative modifiers (e.g., Jungle -1 production).
///
/// # Yield Types
///
/// - **Food**: Population growth
/// - **Production**: Building and unit construction speed
/// - **Gold**: Treasury income
/// - **Science**: Research progress (from buildings/specialists, not terrain)
/// - **Culture**: Border expansion and policy progress
/// - **Faith**: Religious progress
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default, Serialize, Deserialize)]
pub struct TileYields {
    /// Food yield - affects city growth
    pub food: i32,
    /// Production yield - affects building/unit construction
    pub production: i32,
    /// Gold yield - affects treasury
    pub gold: i32,
    /// Science yield - affects research (typically from improvements, not terrain)
    pub science: i32,
    /// Culture yield - affects borders and policies
    pub culture: i32,
    /// Faith yield - affects religion
    pub faith: i32,
}

impl TileYields {
    /// Create a new TileYields with specified values.
    #[inline]
    pub fn new(food: i32, production: i32, gold: i32) -> Self {
        Self {
            food,
            production,
            gold,
            science: 0,
            culture: 0,
            faith: 0,
        }
    }

    /// Create a TileYields with all values set to zero.
    pub const ZERO: Self = Self {
        food: 0,
        production: 0,
        gold: 0,
        science: 0,
        culture: 0,
        faith: 0,
    };

    /// Calculate base yields from terrain, optional feature, and optional resource.
    ///
    /// This combines:
    /// - Base terrain yields
    /// - Feature modifiers (if present)
    /// - Resource bonuses (if present, unimproved)
    ///
    /// River bonuses are typically applied at the city level for workable tiles,
    /// not stored directly in TileYields.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use openciv::tile::{Terrain, TileFeature, TileYields};
    ///
    /// // Grassland with forest: 2 food + 1 production
    /// let yields = TileYields::calculate(
    ///     Terrain::Grassland,
    ///     Some(TileFeature::Forest),
    ///     None,
    ///     false,
    /// );
    /// assert_eq!(yields.food, 2);
    /// assert_eq!(yields.production, 1);
    /// ```
    pub fn calculate(
        terrain: Terrain,
        feature: Option<TileFeature>,
        resource: Option<TileResource>,
        _has_river: bool, // Reserved for future river bonus implementation
    ) -> Self {
        let mut yields = Self {
            food: terrain.base_food(),
            production: terrain.base_production(),
            gold: terrain.base_gold(),
            science: 0,
            culture: 0,
            faith: 0,
        };

        // Apply feature modifiers
        if let Some(feat) = feature {
            yields.food += feat.food_modifier();
            yields.production += feat.production_modifier();
            yields.gold += feat.gold_modifier();
        }

        // Apply resource bonuses (unimproved)
        if let Some(res) = resource {
            yields.food += res.food_bonus();
            yields.production += res.production_bonus();
            yields.gold += res.gold_bonus();
        }

        // Ensure yields don't go negative
        // (A tile can never have negative yields)
        yields.food = yields.food.max(0);
        yields.production = yields.production.max(0);
        yields.gold = yields.gold.max(0);

        yields
    }

    /// Calculate yields with improved resources.
    ///
    /// This is the same as `calculate()` but uses the improved bonus values
    /// for resources when an appropriate improvement is present.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// use openciv::tile::{Terrain, TileResource, TileYields};
    ///
    /// // Plains with improved cattle
    /// let yields = TileYields::calculate_improved(
    ///     Terrain::Plains,
    ///     None,
    ///     Some(TileResource::Cattle),
    ///     false,
    /// );
    /// // Plains: 1F + 1P, Improved Cattle: +2P
    /// assert_eq!(yields.food, 1);
    /// assert_eq!(yields.production, 3);
    /// ```
    pub fn calculate_improved(
        terrain: Terrain,
        feature: Option<TileFeature>,
        resource: Option<TileResource>,
        _has_river: bool,
    ) -> Self {
        let mut yields = Self {
            food: terrain.base_food(),
            production: terrain.base_production(),
            gold: terrain.base_gold(),
            science: 0,
            culture: 0,
            faith: 0,
        };

        // Apply feature modifiers
        if let Some(feat) = feature {
            yields.food += feat.food_modifier();
            yields.production += feat.production_modifier();
            yields.gold += feat.gold_modifier();
        }

        // Apply improved resource bonuses
        if let Some(res) = resource {
            yields.food += res.improved_food_bonus();
            yields.production += res.improved_production_bonus();
            yields.gold += res.improved_gold_bonus();
        }

        // Ensure yields don't go negative
        yields.food = yields.food.max(0);
        yields.production = yields.production.max(0);
        yields.gold = yields.gold.max(0);

        yields
    }

    /// Returns the sum of all yield values.
    ///
    /// Useful for comparing tile quality at a glance.
    #[inline]
    pub fn total(&self) -> i32 {
        self.food + self.production + self.gold + self.science + self.culture + self.faith
    }

    /// Returns true if all yields are zero.
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.total() == 0
    }
}

impl Add for TileYields {
    type Output = Self;

    /// Combine two TileYields by adding their values.
    ///
    /// Useful for combining base yields with improvement bonuses.
    fn add(self, rhs: Self) -> Self::Output {
        Self {
            food: self.food + rhs.food,
            production: self.production + rhs.production,
            gold: self.gold + rhs.gold,
            science: self.science + rhs.science,
            culture: self.culture + rhs.culture,
            faith: self.faith + rhs.faith,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ Basic Construction Tests ============

    #[test]
    fn test_new() {
        let yields = TileYields::new(2, 1, 3);
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 1);
        assert_eq!(yields.gold, 3);
        assert_eq!(yields.science, 0);
        assert_eq!(yields.culture, 0);
        assert_eq!(yields.faith, 0);
    }

    #[test]
    fn test_default() {
        let yields = TileYields::default();
        assert_eq!(yields.food, 0);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
        assert_eq!(yields.science, 0);
        assert_eq!(yields.culture, 0);
        assert_eq!(yields.faith, 0);
    }

    #[test]
    fn test_zero_constant() {
        assert_eq!(TileYields::ZERO, TileYields::default());
    }

    // ============ Calculate Tests - Terrain Only ============

    #[test]
    fn test_calculate_grassland() {
        let yields = TileYields::calculate(Terrain::Grassland, None, None, false);
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_plains() {
        let yields = TileYields::calculate(Terrain::Plains, None, None, false);
        assert_eq!(yields.food, 1);
        assert_eq!(yields.production, 1);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_desert() {
        let yields = TileYields::calculate(Terrain::Desert, None, None, false);
        assert_eq!(yields.food, 0);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_grassland_hill() {
        let yields = TileYields::calculate(Terrain::GrasslandHill, None, None, false);
        assert_eq!(yields.food, 0);
        assert_eq!(yields.production, 2);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_coast() {
        let yields = TileYields::calculate(Terrain::Coast, None, None, false);
        assert_eq!(yields.food, 1);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    // ============ Calculate Tests - With Features ============

    #[test]
    fn test_calculate_grassland_forest() {
        let yields =
            TileYields::calculate(Terrain::Grassland, Some(TileFeature::Forest), None, false);
        // Grassland: 2F + Forest: +1P
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 1);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_grassland_jungle() {
        let yields =
            TileYields::calculate(Terrain::Grassland, Some(TileFeature::Jungle), None, false);
        // Grassland: 2F + Jungle: -1P (clamped to 0)
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_grassland_marsh() {
        let yields =
            TileYields::calculate(Terrain::Grassland, Some(TileFeature::Marsh), None, false);
        // Grassland: 2F + Marsh: -1F = 1F
        assert_eq!(yields.food, 1);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_desert_floodplains() {
        let yields = TileYields::calculate(
            Terrain::Desert,
            Some(TileFeature::Floodplains),
            None,
            false,
        );
        // Desert: 0F + Floodplains: +2F = 2F
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_desert_oasis() {
        let yields =
            TileYields::calculate(Terrain::Desert, Some(TileFeature::Oasis), None, false);
        // Desert: 0F + Oasis: +3F, +1G
        assert_eq!(yields.food, 3);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 1);
    }

    // ============ Calculate Tests - With Resources ============

    #[test]
    fn test_calculate_with_cattle() {
        let yields =
            TileYields::calculate(Terrain::Grassland, None, Some(TileResource::Cattle), false);
        // Grassland: 2F + Cattle: +1P
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 1);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_with_fish() {
        let yields = TileYields::calculate(Terrain::Coast, None, Some(TileResource::Fish), false);
        // Coast: 1F + Fish: +1F = 2F
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_with_gems() {
        let yields =
            TileYields::calculate(Terrain::GrasslandHill, None, Some(TileResource::Gems), false);
        // Grassland Hill: 2P + Gems: +3G
        assert_eq!(yields.food, 0);
        assert_eq!(yields.production, 2);
        assert_eq!(yields.gold, 3);
    }

    // ============ Calculate Tests - Combined ============

    #[test]
    fn test_calculate_combined_forest_and_deer() {
        let yields = TileYields::calculate(
            Terrain::Tundra,
            Some(TileFeature::Forest),
            Some(TileResource::Deer),
            false,
        );
        // Tundra: 1F + Forest: +1P + Deer: +1F = 2F, 1P
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 1);
        assert_eq!(yields.gold, 0);
    }

    // ============ Calculate Improved Tests ============

    #[test]
    fn test_calculate_improved_cattle() {
        let yields = TileYields::calculate_improved(
            Terrain::Grassland,
            None,
            Some(TileResource::Cattle),
            false,
        );
        // Grassland: 2F + Improved Cattle: +2P
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 2);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_improved_fish() {
        let yields =
            TileYields::calculate_improved(Terrain::Coast, None, Some(TileResource::Fish), false);
        // Coast: 1F + Improved Fish: +2F = 3F
        assert_eq!(yields.food, 3);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 0);
    }

    #[test]
    fn test_calculate_improved_cotton() {
        let yields = TileYields::calculate_improved(
            Terrain::Grassland,
            None,
            Some(TileResource::Cotton),
            false,
        );
        // Grassland: 2F + Improved Cotton: +3G
        assert_eq!(yields.food, 2);
        assert_eq!(yields.production, 0);
        assert_eq!(yields.gold, 3);
    }

    // ============ Negative Yield Clamping Tests ============

    #[test]
    fn test_jungle_clamps_production() {
        // Plains with jungle: 1F + 1P + (-1P) = 1F + 0P (clamped)
        let yields =
            TileYields::calculate(Terrain::Plains, Some(TileFeature::Jungle), None, false);
        assert_eq!(yields.food, 1);
        assert_eq!(yields.production, 0); // Clamped from 0, not negative
        assert_eq!(yields.gold, 0);
    }

    // ============ Add Trait Tests ============

    #[test]
    fn test_add_yields() {
        let a = TileYields::new(2, 1, 0);
        let b = TileYields {
            food: 0,
            production: 1,
            gold: 2,
            science: 1,
            culture: 0,
            faith: 1,
        };

        let sum = a + b;
        assert_eq!(sum.food, 2);
        assert_eq!(sum.production, 2);
        assert_eq!(sum.gold, 2);
        assert_eq!(sum.science, 1);
        assert_eq!(sum.culture, 0);
        assert_eq!(sum.faith, 1);
    }

    // ============ Total Tests ============

    #[test]
    fn test_total() {
        let yields = TileYields {
            food: 2,
            production: 1,
            gold: 3,
            science: 1,
            culture: 2,
            faith: 1,
        };
        assert_eq!(yields.total(), 10);
    }

    #[test]
    fn test_is_empty() {
        assert!(TileYields::ZERO.is_empty());
        assert!(TileYields::default().is_empty());
        assert!(!TileYields::new(1, 0, 0).is_empty());
    }

    // ============ Serde Tests ============

    #[test]
    fn test_serde_roundtrip() {
        let yields = TileYields {
            food: 2,
            production: 1,
            gold: 3,
            science: 1,
            culture: 2,
            faith: 1,
        };

        let json = serde_json::to_string(&yields).expect("serialization failed");
        let deserialized: TileYields =
            serde_json::from_str(&json).expect("deserialization failed");
        assert_eq!(yields, deserialized);
    }
}
