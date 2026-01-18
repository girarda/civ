//! HexGridLayout resource for coordinate conversions.

use super::coord::TilePosition;
use bevy::prelude::*;
use hexx::{Hex, HexLayout, HexOrientation};

// Type alias for hexx's Vec2 to distinguish from bevy's Vec2
type HexxVec2 = hexx::Vec2;

/// Helper to convert hexx Vec2 to bevy Vec2
#[inline]
fn to_bevy_vec2(v: HexxVec2) -> Vec2 {
    Vec2::new(v.x, v.y)
}

/// Helper to convert bevy Vec2 to hexx Vec2
#[inline]
fn to_hexx_vec2(v: Vec2) -> HexxVec2 {
    HexxVec2::new(v.x, v.y)
}

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
    /// Creates a default layout with 32-pixel pointy-top hexes centered at origin.
    fn default() -> Self {
        Self {
            layout: HexLayout {
                hex_size: HexxVec2::splat(32.0),
                orientation: HexOrientation::Pointy,
                origin: HexxVec2::ZERO,
                invert_x: false,
                invert_y: false,
            },
        }
    }
}

impl HexGridLayout {
    /// Create a new layout with the specified hex size (pointy-top at origin).
    pub fn new(hex_size: f32) -> Self {
        Self {
            layout: HexLayout {
                hex_size: HexxVec2::splat(hex_size),
                orientation: HexOrientation::Pointy,
                origin: HexxVec2::ZERO,
                invert_x: false,
                invert_y: false,
            },
        }
    }

    /// Create a new layout with custom size and origin.
    pub fn with_origin(hex_size: f32, origin: Vec2) -> Self {
        Self {
            layout: HexLayout {
                hex_size: HexxVec2::splat(hex_size),
                orientation: HexOrientation::Pointy,
                origin: to_hexx_vec2(origin),
                invert_x: false,
                invert_y: false,
            },
        }
    }

    /// Convert a hex coordinate to world position.
    #[inline]
    pub fn hex_to_world(&self, hex: Hex) -> Vec2 {
        to_bevy_vec2(self.layout.hex_to_world_pos(hex))
    }

    /// Convert a tile position to world position.
    #[inline]
    pub fn tile_to_world(&self, tile: TilePosition) -> Vec2 {
        to_bevy_vec2(self.layout.hex_to_world_pos(tile.0))
    }

    /// Convert a world position to the nearest hex coordinate.
    #[inline]
    pub fn world_to_hex(&self, world: Vec2) -> Hex {
        self.layout.world_pos_to_hex(to_hexx_vec2(world))
    }

    /// Convert a world position to the nearest tile position.
    #[inline]
    pub fn world_to_tile(&self, world: Vec2) -> TilePosition {
        TilePosition(self.layout.world_pos_to_hex(to_hexx_vec2(world)))
    }

    /// Get the 6 corner positions of a hex in world coordinates.
    #[inline]
    pub fn hex_corners(&self, hex: Hex) -> [Vec2; 6] {
        let corners = self.layout.hex_corners(hex);
        [
            to_bevy_vec2(corners[0]),
            to_bevy_vec2(corners[1]),
            to_bevy_vec2(corners[2]),
            to_bevy_vec2(corners[3]),
            to_bevy_vec2(corners[4]),
            to_bevy_vec2(corners[5]),
        ]
    }

    /// Get the 6 edge midpoints of a hex in world coordinates.
    ///
    /// Useful for positioning rivers, roads, or other edge features.
    #[inline]
    pub fn hex_edge_midpoints(&self, hex: Hex) -> [Vec2; 6] {
        let corners = self.layout.hex_corners(hex);
        [
            to_bevy_vec2((corners[0] + corners[1]) / 2.0),
            to_bevy_vec2((corners[1] + corners[2]) / 2.0),
            to_bevy_vec2((corners[2] + corners[3]) / 2.0),
            to_bevy_vec2((corners[3] + corners[4]) / 2.0),
            to_bevy_vec2((corners[4] + corners[5]) / 2.0),
            to_bevy_vec2((corners[5] + corners[0]) / 2.0),
        ]
    }

    /// Get the current hex size.
    #[inline]
    pub fn hex_size(&self) -> Vec2 {
        to_bevy_vec2(self.layout.hex_size)
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
    fn test_origin_at_zero() {
        let layout = HexGridLayout::default();
        let origin_hex = Hex::ZERO;
        let world_pos = layout.hex_to_world(origin_hex);
        assert_relative_eq!(world_pos.x, 0.0, epsilon = 0.001);
        assert_relative_eq!(world_pos.y, 0.0, epsilon = 0.001);
    }

    #[test]
    fn test_roundtrip_conversion() {
        let layout = HexGridLayout::default();
        let test_hexes = [
            Hex::new(0, 0),
            Hex::new(1, 0),
            Hex::new(0, 1),
            Hex::new(-1, 1),
            Hex::new(5, -3),
            Hex::new(-10, 7),
        ];

        for original in test_hexes {
            let world = layout.hex_to_world(original);
            let back = layout.world_to_hex(world);
            assert_eq!(original, back, "Roundtrip failed for {:?}", original);
        }
    }

    #[test]
    fn test_tile_position_conversion() {
        let layout = HexGridLayout::default();
        let tile = TilePosition::new(3, -2);
        let world = layout.tile_to_world(tile);
        let back = layout.world_to_tile(world);
        assert_eq!(tile, back);
    }

    #[test]
    fn test_world_to_hex_rounding() {
        let layout = HexGridLayout::default();
        let hex = Hex::new(2, 1);
        let center = layout.hex_to_world(hex);

        // Small offsets should still resolve to same hex
        let small_offsets = [
            Vec2::new(1.0, 0.0),
            Vec2::new(0.0, 1.0),
            Vec2::new(-1.0, 0.0),
            Vec2::new(0.0, -1.0),
            Vec2::new(2.0, 2.0),
        ];

        for offset in small_offsets {
            let nearby = center + offset;
            let resolved = layout.world_to_hex(nearby);
            assert_eq!(hex, resolved, "Rounding failed for offset {:?}", offset);
        }
    }

    #[test]
    fn test_hex_corners_count() {
        let layout = HexGridLayout::default();
        let corners = layout.hex_corners(Hex::ZERO);
        assert_eq!(corners.len(), 6);
    }

    #[test]
    fn test_custom_hex_size() {
        let layout = HexGridLayout::new(64.0);
        assert_eq!(layout.hex_size(), Vec2::splat(64.0));
    }
}
