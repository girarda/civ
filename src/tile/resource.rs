//! Tile resources for OpenCiv tiles.
//!
//! Resources are collectible elements on tiles that provide yield bonuses.
//! Resources come in three categories: Bonus, Strategic, and Luxury.

use bevy::prelude::*;
use serde::{Deserialize, Serialize};

/// Resource category classification.
///
/// - Bonus: Common resources that improve tile yields
/// - Strategic: Resources needed for advanced units and buildings
/// - Luxury: Rare resources that provide happiness and trade value
#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug, Serialize, Deserialize)]
pub enum ResourceCategory {
    /// Common resources that boost tile yields.
    Bonus,
    /// Resources needed for military units and buildings.
    Strategic,
    /// Rare resources providing happiness and trade.
    Luxury,
}

/// Resource type on a tile.
///
/// Resources provide yield bonuses, with additional bonuses when improved.
///
/// # Yield Values (from OpenCiv tiles.yml)
///
/// | Resource | Category | Base Food | Base Prod | Base Gold | Improved Food | Improved Prod | Improved Gold |
/// |----------|----------|-----------|-----------|-----------|---------------|---------------|---------------|
/// | Cattle | Bonus | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Sheep | Bonus | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Fish | Bonus | +1 | 0 | 0 | +2 | 0 | 0 |
/// | Stone | Bonus | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Wheat | Bonus | +1 | 0 | 0 | +2 | 0 | 0 |
/// | Bananas | Bonus | +1 | 0 | 0 | +2 | 0 | 0 |
/// | Deer | Bonus | +1 | 0 | 0 | +2 | 0 | 0 |
/// | Horses | Strategic | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Iron | Strategic | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Coal | Strategic | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Oil | Strategic | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Aluminum | Strategic | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Uranium | Strategic | 0 | +1 | 0 | 0 | +2 | 0 |
/// | Citrus | Luxury | +1 | 0 | +1 | +1 | 0 | +2 |
/// | Cotton | Luxury | 0 | 0 | +2 | 0 | 0 | +3 |
/// | Copper | Luxury | 0 | 0 | +2 | 0 | +1 | +2 |
/// | Gold | Luxury | 0 | 0 | +2 | 0 | 0 | +2 |
/// | Crab | Luxury | +1 | 0 | 0 | +2 | 0 | 0 |
/// | Whales | Luxury | +1 | 0 | +1 | +2 | 0 | +1 |
/// | Turtles | Luxury | +1 | 0 | +1 | +2 | 0 | +1 |
/// | Olives | Luxury | 0 | +1 | +1 | 0 | +1 | +2 |
/// | Wine | Luxury | 0 | 0 | +2 | 0 | 0 | +3 |
/// | Silk | Luxury | 0 | 0 | +2 | 0 | 0 | +3 |
/// | Spices | Luxury | 0 | 0 | +2 | 0 | 0 | +3 |
/// | Gems | Luxury | 0 | 0 | +3 | 0 | 0 | +3 |
/// | Marble | Luxury | 0 | +1 | +1 | 0 | +2 | +1 |
/// | Ivory | Luxury | 0 | +1 | +1 | 0 | +2 | +1 |
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
    /// Returns the category of this resource.
    #[inline]
    pub fn category(&self) -> ResourceCategory {
        match self {
            // Bonus resources
            TileResource::Cattle
            | TileResource::Sheep
            | TileResource::Fish
            | TileResource::Stone
            | TileResource::Wheat
            | TileResource::Bananas
            | TileResource::Deer => ResourceCategory::Bonus,

            // Strategic resources
            TileResource::Horses
            | TileResource::Iron
            | TileResource::Coal
            | TileResource::Oil
            | TileResource::Aluminum
            | TileResource::Uranium => ResourceCategory::Strategic,

            // Luxury resources
            TileResource::Citrus
            | TileResource::Cotton
            | TileResource::Copper
            | TileResource::Gold
            | TileResource::Crab
            | TileResource::Whales
            | TileResource::Turtles
            | TileResource::Olives
            | TileResource::Wine
            | TileResource::Silk
            | TileResource::Spices
            | TileResource::Gems
            | TileResource::Marble
            | TileResource::Ivory => ResourceCategory::Luxury,
        }
    }

    /// Base food bonus from this resource (before improvement).
    #[inline]
    pub fn food_bonus(&self) -> i32 {
        match self {
            // +1 food resources
            TileResource::Fish
            | TileResource::Wheat
            | TileResource::Bananas
            | TileResource::Deer
            | TileResource::Citrus
            | TileResource::Crab
            | TileResource::Whales
            | TileResource::Turtles => 1,

            _ => 0,
        }
    }

    /// Base production bonus from this resource (before improvement).
    #[inline]
    pub fn production_bonus(&self) -> i32 {
        match self {
            // +1 production resources
            TileResource::Cattle
            | TileResource::Sheep
            | TileResource::Stone
            | TileResource::Horses
            | TileResource::Iron
            | TileResource::Coal
            | TileResource::Oil
            | TileResource::Aluminum
            | TileResource::Uranium
            | TileResource::Olives
            | TileResource::Marble
            | TileResource::Ivory => 1,

            _ => 0,
        }
    }

    /// Base gold bonus from this resource (before improvement).
    #[inline]
    pub fn gold_bonus(&self) -> i32 {
        match self {
            // +3 gold
            TileResource::Gems => 3,

            // +2 gold
            TileResource::Cotton
            | TileResource::Copper
            | TileResource::Gold
            | TileResource::Wine
            | TileResource::Silk
            | TileResource::Spices => 2,

            // +1 gold
            TileResource::Citrus
            | TileResource::Whales
            | TileResource::Turtles
            | TileResource::Olives
            | TileResource::Marble
            | TileResource::Ivory => 1,

            _ => 0,
        }
    }

    /// Improved food bonus when tile has appropriate improvement.
    #[inline]
    pub fn improved_food_bonus(&self) -> i32 {
        match self {
            // +2 improved food
            TileResource::Fish
            | TileResource::Wheat
            | TileResource::Bananas
            | TileResource::Deer
            | TileResource::Crab
            | TileResource::Whales
            | TileResource::Turtles => 2,

            // +1 improved food
            TileResource::Citrus => 1,

            _ => 0,
        }
    }

    /// Improved production bonus when tile has appropriate improvement.
    #[inline]
    pub fn improved_production_bonus(&self) -> i32 {
        match self {
            // +2 improved production
            TileResource::Cattle
            | TileResource::Sheep
            | TileResource::Stone
            | TileResource::Horses
            | TileResource::Iron
            | TileResource::Coal
            | TileResource::Oil
            | TileResource::Aluminum
            | TileResource::Uranium
            | TileResource::Marble
            | TileResource::Ivory => 2,

            // +1 improved production
            TileResource::Copper | TileResource::Olives => 1,

            _ => 0,
        }
    }

    /// Improved gold bonus when tile has appropriate improvement.
    #[inline]
    pub fn improved_gold_bonus(&self) -> i32 {
        match self {
            // +3 improved gold
            TileResource::Cotton
            | TileResource::Wine
            | TileResource::Silk
            | TileResource::Spices
            | TileResource::Gems => 3,

            // +2 improved gold
            TileResource::Citrus
            | TileResource::Copper
            | TileResource::Gold
            | TileResource::Olives => 2,

            // +1 improved gold
            TileResource::Whales | TileResource::Turtles | TileResource::Marble | TileResource::Ivory => 1,

            _ => 0,
        }
    }

    /// Returns true if this is a bonus resource.
    #[inline]
    pub fn is_bonus(&self) -> bool {
        self.category() == ResourceCategory::Bonus
    }

    /// Returns true if this is a strategic resource.
    #[inline]
    pub fn is_strategic(&self) -> bool {
        self.category() == ResourceCategory::Strategic
    }

    /// Returns true if this is a luxury resource.
    #[inline]
    pub fn is_luxury(&self) -> bool {
        self.category() == ResourceCategory::Luxury
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ Category Tests ============

    #[test]
    fn test_bonus_resources() {
        let bonus = [
            TileResource::Cattle,
            TileResource::Sheep,
            TileResource::Fish,
            TileResource::Stone,
            TileResource::Wheat,
            TileResource::Bananas,
            TileResource::Deer,
        ];

        for resource in bonus {
            assert_eq!(
                resource.category(),
                ResourceCategory::Bonus,
                "{:?} should be Bonus",
                resource
            );
            assert!(resource.is_bonus());
            assert!(!resource.is_strategic());
            assert!(!resource.is_luxury());
        }
    }

    #[test]
    fn test_strategic_resources() {
        let strategic = [
            TileResource::Horses,
            TileResource::Iron,
            TileResource::Coal,
            TileResource::Oil,
            TileResource::Aluminum,
            TileResource::Uranium,
        ];

        for resource in strategic {
            assert_eq!(
                resource.category(),
                ResourceCategory::Strategic,
                "{:?} should be Strategic",
                resource
            );
            assert!(resource.is_strategic());
            assert!(!resource.is_bonus());
            assert!(!resource.is_luxury());
        }
    }

    #[test]
    fn test_luxury_resources() {
        let luxury = [
            TileResource::Citrus,
            TileResource::Cotton,
            TileResource::Copper,
            TileResource::Gold,
            TileResource::Crab,
            TileResource::Whales,
            TileResource::Turtles,
            TileResource::Olives,
            TileResource::Wine,
            TileResource::Silk,
            TileResource::Spices,
            TileResource::Gems,
            TileResource::Marble,
            TileResource::Ivory,
        ];

        for resource in luxury {
            assert_eq!(
                resource.category(),
                ResourceCategory::Luxury,
                "{:?} should be Luxury",
                resource
            );
            assert!(resource.is_luxury());
            assert!(!resource.is_bonus());
            assert!(!resource.is_strategic());
        }
    }

    // ============ Base Yield Tests ============

    #[test]
    fn test_cattle_yields() {
        let resource = TileResource::Cattle;
        assert_eq!(resource.food_bonus(), 0);
        assert_eq!(resource.production_bonus(), 1);
        assert_eq!(resource.gold_bonus(), 0);
    }

    #[test]
    fn test_fish_yields() {
        let resource = TileResource::Fish;
        assert_eq!(resource.food_bonus(), 1);
        assert_eq!(resource.production_bonus(), 0);
        assert_eq!(resource.gold_bonus(), 0);
    }

    #[test]
    fn test_citrus_yields() {
        let resource = TileResource::Citrus;
        assert_eq!(resource.food_bonus(), 1);
        assert_eq!(resource.production_bonus(), 0);
        assert_eq!(resource.gold_bonus(), 1);
    }

    #[test]
    fn test_cotton_yields() {
        let resource = TileResource::Cotton;
        assert_eq!(resource.food_bonus(), 0);
        assert_eq!(resource.production_bonus(), 0);
        assert_eq!(resource.gold_bonus(), 2);
    }

    #[test]
    fn test_copper_yields() {
        let resource = TileResource::Copper;
        assert_eq!(resource.food_bonus(), 0);
        assert_eq!(resource.production_bonus(), 0);
        assert_eq!(resource.gold_bonus(), 2);
    }

    #[test]
    fn test_gems_yields() {
        let resource = TileResource::Gems;
        assert_eq!(resource.food_bonus(), 0);
        assert_eq!(resource.production_bonus(), 0);
        assert_eq!(resource.gold_bonus(), 3);
    }

    #[test]
    fn test_whales_yields() {
        let resource = TileResource::Whales;
        assert_eq!(resource.food_bonus(), 1);
        assert_eq!(resource.production_bonus(), 0);
        assert_eq!(resource.gold_bonus(), 1);
    }

    #[test]
    fn test_olives_yields() {
        let resource = TileResource::Olives;
        assert_eq!(resource.food_bonus(), 0);
        assert_eq!(resource.production_bonus(), 1);
        assert_eq!(resource.gold_bonus(), 1);
    }

    // ============ Improved Yield Tests ============

    #[test]
    fn test_cattle_improved_yields() {
        let resource = TileResource::Cattle;
        assert_eq!(resource.improved_food_bonus(), 0);
        assert_eq!(resource.improved_production_bonus(), 2);
        assert_eq!(resource.improved_gold_bonus(), 0);
    }

    #[test]
    fn test_fish_improved_yields() {
        let resource = TileResource::Fish;
        assert_eq!(resource.improved_food_bonus(), 2);
        assert_eq!(resource.improved_production_bonus(), 0);
        assert_eq!(resource.improved_gold_bonus(), 0);
    }

    #[test]
    fn test_citrus_improved_yields() {
        let resource = TileResource::Citrus;
        assert_eq!(resource.improved_food_bonus(), 1);
        assert_eq!(resource.improved_production_bonus(), 0);
        assert_eq!(resource.improved_gold_bonus(), 2);
    }

    #[test]
    fn test_cotton_improved_yields() {
        let resource = TileResource::Cotton;
        assert_eq!(resource.improved_food_bonus(), 0);
        assert_eq!(resource.improved_production_bonus(), 0);
        assert_eq!(resource.improved_gold_bonus(), 3);
    }

    #[test]
    fn test_copper_improved_yields() {
        let resource = TileResource::Copper;
        assert_eq!(resource.improved_food_bonus(), 0);
        assert_eq!(resource.improved_production_bonus(), 1);
        assert_eq!(resource.improved_gold_bonus(), 2);
    }

    #[test]
    fn test_gold_improved_yields() {
        let resource = TileResource::Gold;
        assert_eq!(resource.improved_food_bonus(), 0);
        assert_eq!(resource.improved_production_bonus(), 0);
        assert_eq!(resource.improved_gold_bonus(), 2);
    }

    #[test]
    fn test_crab_improved_yields() {
        let resource = TileResource::Crab;
        assert_eq!(resource.improved_food_bonus(), 2);
        assert_eq!(resource.improved_production_bonus(), 0);
        assert_eq!(resource.improved_gold_bonus(), 0);
    }

    #[test]
    fn test_marble_improved_yields() {
        let resource = TileResource::Marble;
        assert_eq!(resource.improved_food_bonus(), 0);
        assert_eq!(resource.improved_production_bonus(), 2);
        assert_eq!(resource.improved_gold_bonus(), 1);
    }

    // ============ Serde Tests ============

    #[test]
    fn test_serde_roundtrip_resources() {
        let resources = [
            TileResource::Cattle,
            TileResource::Horses,
            TileResource::Citrus,
            TileResource::Gems,
            TileResource::Uranium,
        ];

        for resource in resources {
            let json = serde_json::to_string(&resource).expect("serialization failed");
            let deserialized: TileResource =
                serde_json::from_str(&json).expect("deserialization failed");
            assert_eq!(resource, deserialized);
        }
    }

    #[test]
    fn test_serde_roundtrip_category() {
        let categories = [
            ResourceCategory::Bonus,
            ResourceCategory::Strategic,
            ResourceCategory::Luxury,
        ];

        for category in categories {
            let json = serde_json::to_string(&category).expect("serialization failed");
            let deserialized: ResourceCategory =
                serde_json::from_str(&json).expect("deserialization failed");
            assert_eq!(category, deserialized);
        }
    }
}
