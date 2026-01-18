//! TilePosition wrapper around hexx::Hex for Bevy ECS compatibility.

use bevy::prelude::*;
use hexx::Hex;
use std::fmt;
use std::ops::{Add, Deref, Sub};

/// Wrapper around hexx::Hex for use as a Bevy Component.
///
/// Provides ergonomic access to hex coordinates while maintaining
/// ECS compatibility. Use Deref to access underlying Hex methods.
///
/// # Example
/// ```rust,ignore
/// let pos = TilePosition::new(3, -2);
/// let neighbors = pos.neighbors(); // Get all 6 neighbors
/// let distance = pos.distance_to(other);
/// ```
// Note: We cannot derive Reflect here because hexx::Hex uses a different version of bevy_reflect
// than the main bevy crate. Reflection support can be added once hexx updates its bevy dependency.
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
pub struct TilePosition(pub Hex);

impl TilePosition {
    /// Origin position at (0, 0).
    pub const ORIGIN: Self = Self(Hex::ZERO);

    /// Create a new TilePosition from axial coordinates.
    #[inline]
    pub fn new(q: i32, r: i32) -> Self {
        Self(Hex::new(q, r))
    }

    /// Create a TilePosition from a hexx::Hex.
    #[inline]
    pub fn from_hex(hex: Hex) -> Self {
        Self(hex)
    }

    /// Get all 6 neighboring tile positions.
    #[inline]
    pub fn neighbors(&self) -> [TilePosition; 6] {
        self.0.all_neighbors().map(TilePosition)
    }

    /// Get all tiles within the given radius (inclusive).
    ///
    /// Returns an iterator over all tiles from the center out to the specified radius.
    /// - Radius 0 returns just the center tile (1 tile)
    /// - Radius 1 returns center + 6 neighbors (7 tiles)
    /// - Radius 2 returns 19 tiles, etc.
    #[inline]
    pub fn range(&self, radius: u32) -> impl Iterator<Item = TilePosition> {
        self.0.range(radius).map(TilePosition)
    }

    /// Get all tiles at exactly the given radius from this tile.
    ///
    /// Returns an iterator over tiles forming a ring at the specified distance.
    /// - Radius 0 returns just the center tile (1 tile)
    /// - Radius 1 returns 6 tiles
    /// - Radius n returns 6*n tiles (for n > 0)
    #[inline]
    pub fn ring(&self, radius: u32) -> impl Iterator<Item = TilePosition> {
        self.0.ring(radius).map(TilePosition)
    }

    /// Calculate the distance to another tile position.
    #[inline]
    pub fn distance_to(&self, other: TilePosition) -> u32 {
        self.0.unsigned_distance_to(other.0)
    }

    /// Get an iterator of tiles forming a line to another tile.
    #[inline]
    pub fn line_to(&self, other: TilePosition) -> impl Iterator<Item = TilePosition> {
        self.0.line_to(other.0).map(TilePosition)
    }
}

impl Deref for TilePosition {
    type Target = Hex;

    #[inline]
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<Hex> for TilePosition {
    #[inline]
    fn from(hex: Hex) -> Self {
        Self(hex)
    }
}

impl From<(i32, i32)> for TilePosition {
    #[inline]
    fn from((q, r): (i32, i32)) -> Self {
        Self::new(q, r)
    }
}

impl Add for TilePosition {
    type Output = Self;

    #[inline]
    fn add(self, rhs: Self) -> Self::Output {
        Self(self.0 + rhs.0)
    }
}

impl Sub for TilePosition {
    type Output = Self;

    #[inline]
    fn sub(self, rhs: Self) -> Self::Output {
        Self(self.0 - rhs.0)
    }
}

impl fmt::Display for TilePosition {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "TilePosition({}, {})", self.0.x, self.0.y)
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
    fn test_neighbors_count() {
        let pos = TilePosition::ORIGIN;
        let neighbors = pos.neighbors();
        assert_eq!(neighbors.len(), 6);
    }

    #[test]
    fn test_neighbors_distance() {
        let pos = TilePosition::ORIGIN;
        for neighbor in pos.neighbors() {
            assert_eq!(pos.distance_to(neighbor), 1);
        }
    }

    #[test]
    fn test_distance_straight_line() {
        let a = TilePosition::new(0, 0);
        let b = TilePosition::new(3, 0);
        assert_eq!(a.distance_to(b), 3);
    }

    #[test]
    fn test_distance_diagonal() {
        let a = TilePosition::new(0, 0);
        let b = TilePosition::new(2, -2);
        assert_eq!(a.distance_to(b), 2);
    }

    #[test]
    fn test_range_count() {
        let pos = TilePosition::ORIGIN;
        // Range 0 = 1 hex (center only)
        assert_eq!(pos.range(0).count(), 1);
        // Range 1 = 1 + 6 = 7 hexes
        assert_eq!(pos.range(1).count(), 7);
        // Range 2 = 1 + 6 + 12 = 19 hexes
        assert_eq!(pos.range(2).count(), 19);
    }

    #[test]
    fn test_ring_count() {
        let pos = TilePosition::ORIGIN;
        // Ring 0 = 1 hex (center only)
        assert_eq!(pos.ring(0).count(), 1);
        // Ring 1 = 6 hexes
        assert_eq!(pos.ring(1).count(), 6);
        // Ring 2 = 12 hexes
        assert_eq!(pos.ring(2).count(), 12);
        // Ring n = 6*n hexes (for n > 0)
        assert_eq!(pos.ring(5).count(), 30);
    }

    #[test]
    fn test_deref_access() {
        let pos = TilePosition::new(1, 2);
        // Can access Hex fields via Deref
        assert_eq!(pos.x, 1);
        assert_eq!(pos.y, 2);
    }

    #[test]
    fn test_from_tuple() {
        let pos: TilePosition = (3, -1).into();
        assert_eq!(pos.0.x, 3);
        assert_eq!(pos.0.y, -1);
    }

    #[test]
    fn test_addition() {
        let a = TilePosition::new(1, 2);
        let b = TilePosition::new(3, -1);
        let sum = a + b;
        assert_eq!(sum.0.x, 4);
        assert_eq!(sum.0.y, 1);
    }

    #[test]
    fn test_subtraction() {
        let a = TilePosition::new(5, 3);
        let b = TilePosition::new(2, 1);
        let diff = a - b;
        assert_eq!(diff.0.x, 3);
        assert_eq!(diff.0.y, 2);
    }
}
