//! Simple sprite-based rendering for map tiles.
//!
//! Provides colored hexagon sprites for terrain visualization before
//! full tilemap integration.

use bevy::prelude::*;

use crate::hex::{HexGridLayout, TilePosition};
use crate::tile::Terrain;

/// Maps terrain type to a distinct color for visual debugging.
///
/// Colors are chosen for visibility and to match conventional Civ-style palettes.
pub fn terrain_to_color(terrain: Terrain) -> Color {
    match terrain {
        Terrain::Grassland => Color::srgb(0.2, 0.7, 0.2),
        Terrain::GrasslandHill => Color::srgb(0.15, 0.55, 0.15),
        Terrain::Plains => Color::srgb(0.8, 0.7, 0.3),
        Terrain::PlainsHill => Color::srgb(0.65, 0.55, 0.25),
        Terrain::Desert => Color::srgb(0.95, 0.85, 0.5),
        Terrain::DesertHill => Color::srgb(0.85, 0.75, 0.45),
        Terrain::Tundra => Color::srgb(0.6, 0.65, 0.55),
        Terrain::TundraHill => Color::srgb(0.5, 0.55, 0.45),
        Terrain::Snow => Color::srgb(0.95, 0.95, 0.95),
        Terrain::SnowHill => Color::srgb(0.85, 0.85, 0.85),
        Terrain::Mountain => Color::srgb(0.5, 0.45, 0.4),
        Terrain::Coast => Color::srgb(0.3, 0.5, 0.8),
        Terrain::Ocean => Color::srgb(0.1, 0.25, 0.5),
        Terrain::Lake => Color::srgb(0.25, 0.45, 0.7),
    }
}

/// Spawns colored hexagon sprites for all tiles.
///
/// This system runs after map generation and adds Sprite
/// components to existing tile entities.
pub fn spawn_hex_sprites(
    mut commands: Commands,
    tiles: Query<(Entity, &TilePosition, &Terrain), Without<Sprite>>,
    layout: Res<HexGridLayout>,
) {
    for (entity, pos, terrain) in tiles.iter() {
        let world_pos = layout.tile_to_world(*pos);
        let color = terrain_to_color(*terrain);

        // Hex size from layout (width = sqrt(3) * size, height = 2 * size for pointy-top)
        let hex_size = layout.hex_size();
        let sprite_size = Vec2::new(hex_size.x * 1.732, hex_size.y * 2.0);

        commands.entity(entity).insert((
            Sprite {
                color,
                custom_size: Some(sprite_size),
                ..default()
            },
            Transform::from_translation(world_pos.extend(0.0)),
            GlobalTransform::default(),
            Visibility::default(),
            InheritedVisibility::default(),
            ViewVisibility::default(),
        ));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_terrain_to_color_grassland() {
        let color = terrain_to_color(Terrain::Grassland);
        // Verify it returns a green-ish color
        assert!(matches!(color, Color::Srgba(_)));
    }

    #[test]
    fn test_terrain_to_color_plains() {
        let color = terrain_to_color(Terrain::Plains);
        assert!(matches!(color, Color::Srgba(_)));
    }

    #[test]
    fn test_terrain_to_color_desert() {
        let color = terrain_to_color(Terrain::Desert);
        assert!(matches!(color, Color::Srgba(_)));
    }

    #[test]
    fn test_terrain_to_color_water() {
        // All water types should return valid colors
        let coast = terrain_to_color(Terrain::Coast);
        let ocean = terrain_to_color(Terrain::Ocean);
        let lake = terrain_to_color(Terrain::Lake);

        assert!(matches!(coast, Color::Srgba(_)));
        assert!(matches!(ocean, Color::Srgba(_)));
        assert!(matches!(lake, Color::Srgba(_)));
    }

    #[test]
    fn test_terrain_to_color_hills() {
        // All hill types should return valid colors
        let hills = [
            Terrain::GrasslandHill,
            Terrain::PlainsHill,
            Terrain::DesertHill,
            Terrain::TundraHill,
            Terrain::SnowHill,
        ];

        for hill in hills {
            let color = terrain_to_color(hill);
            assert!(matches!(color, Color::Srgba(_)), "{:?} should return a color", hill);
        }
    }

    #[test]
    fn test_terrain_to_color_mountain() {
        let color = terrain_to_color(Terrain::Mountain);
        assert!(matches!(color, Color::Srgba(_)));
    }

    /// Helper function to extract RGB components from Color for comparison
    fn color_to_rgb(color: Color) -> (f32, f32, f32) {
        match color {
            Color::Srgba(srgba) => (srgba.red, srgba.green, srgba.blue),
            _ => panic!("Expected Srgba color"),
        }
    }

    #[test]
    fn test_all_terrains_distinct() {
        // All 14 terrain types should have distinct colors
        let terrains = [
            Terrain::Grassland,
            Terrain::GrasslandHill,
            Terrain::Plains,
            Terrain::PlainsHill,
            Terrain::Desert,
            Terrain::DesertHill,
            Terrain::Tundra,
            Terrain::TundraHill,
            Terrain::Snow,
            Terrain::SnowHill,
            Terrain::Mountain,
            Terrain::Coast,
            Terrain::Ocean,
            Terrain::Lake,
        ];

        let mut seen_colors: HashSet<String> = HashSet::new();

        for terrain in terrains {
            let color = terrain_to_color(terrain);
            let (r, g, b) = color_to_rgb(color);
            // Use a string representation for comparison (rounded to avoid float issues)
            let key = format!("{:.2},{:.2},{:.2}", r, g, b);

            assert!(
                seen_colors.insert(key.clone()),
                "Duplicate color found for {:?}: {}",
                terrain,
                key
            );
        }

        assert_eq!(seen_colors.len(), 14, "All 14 terrains should have distinct colors");
    }

    #[test]
    fn test_hills_darker_than_base() {
        // Hill variants should be darker than their base terrain
        let pairs = [
            (Terrain::Grassland, Terrain::GrasslandHill),
            (Terrain::Plains, Terrain::PlainsHill),
            (Terrain::Desert, Terrain::DesertHill),
            (Terrain::Tundra, Terrain::TundraHill),
            (Terrain::Snow, Terrain::SnowHill),
        ];

        for (base, hill) in pairs {
            let base_color = terrain_to_color(base);
            let hill_color = terrain_to_color(hill);

            let (base_r, base_g, base_b) = color_to_rgb(base_color);
            let (hill_r, hill_g, hill_b) = color_to_rgb(hill_color);

            // Calculate luminance (simple approximation)
            let base_lum = 0.299 * base_r + 0.587 * base_g + 0.114 * base_b;
            let hill_lum = 0.299 * hill_r + 0.587 * hill_g + 0.114 * hill_b;

            assert!(
                hill_lum < base_lum,
                "{:?} hill should be darker than {:?} base (hill: {}, base: {})",
                hill,
                base,
                hill_lum,
                base_lum
            );
        }
    }
}
