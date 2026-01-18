//! River edge tracking for OpenCiv tiles.
//!
//! Stores which edges of a hex tile have rivers using a bitmask.

use bevy::prelude::*;
use serde::{Deserialize, Serialize};

/// Bitmask representing which edges of a hex tile have rivers.
///
/// Each hex tile has 6 edges, and a river can flow along any combination of them.
/// Rivers affect movement costs (minimum 2 to cross) and provide freshwater access.
///
/// # Edge Mapping (pointy-top hex orientation)
///
/// ```text
///       NW  /\  NE
///         /    \
///      W |      | E
///         \    /
///       SW  \/  SE
/// ```
///
/// Edge bits:
/// - Bit 0 (EDGE_E):  East
/// - Bit 1 (EDGE_NE): Northeast
/// - Bit 2 (EDGE_NW): Northwest
/// - Bit 3 (EDGE_W):  West
/// - Bit 4 (EDGE_SW): Southwest
/// - Bit 5 (EDGE_SE): Southeast
///
/// # Example
///
/// ```rust,ignore
/// use openciv::tile::RiverEdges;
///
/// let mut river = RiverEdges::NONE;
/// river.set_edge(RiverEdges::EDGE_NE);
/// river.set_edge(RiverEdges::EDGE_E);
/// assert!(river.has_river());
/// assert_eq!(river.edge_count(), 2);
/// ```
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default, Serialize, Deserialize)]
pub struct RiverEdges(pub u8);

impl RiverEdges {
    /// East edge - bit 0
    pub const EDGE_E: u8 = 1 << 0;

    /// Northeast edge - bit 1
    pub const EDGE_NE: u8 = 1 << 1;

    /// Northwest edge - bit 2
    pub const EDGE_NW: u8 = 1 << 2;

    /// West edge - bit 3
    pub const EDGE_W: u8 = 1 << 3;

    /// Southwest edge - bit 4
    pub const EDGE_SW: u8 = 1 << 4;

    /// Southeast edge - bit 5
    pub const EDGE_SE: u8 = 1 << 5;

    /// All edge constants for iteration.
    pub const ALL_EDGES: [u8; 6] = [
        Self::EDGE_E,
        Self::EDGE_NE,
        Self::EDGE_NW,
        Self::EDGE_W,
        Self::EDGE_SW,
        Self::EDGE_SE,
    ];

    /// No river edges set.
    pub const NONE: Self = Self(0);

    /// All river edges set.
    pub const ALL: Self = Self(0b0011_1111);

    /// Create a new RiverEdges with the specified bitmask.
    #[inline]
    pub fn new(edges: u8) -> Self {
        // Mask to only use the lower 6 bits
        Self(edges & 0b0011_1111)
    }

    /// Create RiverEdges from an array of edge flags.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let river = RiverEdges::from_edges(&[RiverEdges::EDGE_NE, RiverEdges::EDGE_E]);
    /// ```
    pub fn from_edges(edges: &[u8]) -> Self {
        let mut bits = 0u8;
        for &edge in edges {
            bits |= edge;
        }
        Self::new(bits)
    }

    /// Returns true if any edge has a river.
    #[inline]
    pub fn has_river(&self) -> bool {
        self.0 != 0
    }

    /// Returns true if the specified edge has a river.
    ///
    /// Use the EDGE_* constants for the edge parameter.
    #[inline]
    pub fn has_edge(&self, edge: u8) -> bool {
        self.0 & edge != 0
    }

    /// Set a river on the specified edge.
    #[inline]
    pub fn set_edge(&mut self, edge: u8) {
        self.0 |= edge & 0b0011_1111;
    }

    /// Clear a river from the specified edge.
    #[inline]
    pub fn clear_edge(&mut self, edge: u8) {
        self.0 &= !edge;
    }

    /// Toggle a river on the specified edge.
    #[inline]
    pub fn toggle_edge(&mut self, edge: u8) {
        self.0 ^= edge & 0b0011_1111;
    }

    /// Returns the number of edges that have rivers.
    #[inline]
    pub fn edge_count(&self) -> u32 {
        self.0.count_ones()
    }

    /// Returns an iterator over the edge constants that are set.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let river = RiverEdges::from_edges(&[RiverEdges::EDGE_NE, RiverEdges::EDGE_E]);
    /// for edge in river.iter_edges() {
    ///     println!("River on edge {:b}", edge);
    /// }
    /// ```
    pub fn iter_edges(&self) -> impl Iterator<Item = u8> + '_ {
        Self::ALL_EDGES.iter().copied().filter(|&edge| self.has_edge(edge))
    }

    /// Returns the raw bitmask value.
    #[inline]
    pub fn bits(&self) -> u8 {
        self.0
    }

    /// Returns the opposite edge for a given edge.
    ///
    /// Useful for ensuring river continuity between adjacent tiles.
    /// When tile A has a river on edge E, tile B (neighbor to the east)
    /// should have a river on edge W.
    #[inline]
    pub fn opposite_edge(edge: u8) -> u8 {
        match edge {
            Self::EDGE_E => Self::EDGE_W,
            Self::EDGE_NE => Self::EDGE_SW,
            Self::EDGE_NW => Self::EDGE_SE,
            Self::EDGE_W => Self::EDGE_E,
            Self::EDGE_SW => Self::EDGE_NE,
            Self::EDGE_SE => Self::EDGE_NW,
            _ => 0,
        }
    }

    /// Get the edge index (0-5) from an edge constant.
    ///
    /// Returns None if the edge is invalid.
    pub fn edge_to_index(edge: u8) -> Option<usize> {
        match edge {
            Self::EDGE_E => Some(0),
            Self::EDGE_NE => Some(1),
            Self::EDGE_NW => Some(2),
            Self::EDGE_W => Some(3),
            Self::EDGE_SW => Some(4),
            Self::EDGE_SE => Some(5),
            _ => None,
        }
    }

    /// Get the edge constant from an index (0-5).
    ///
    /// Returns None if the index is out of range.
    pub fn index_to_edge(index: usize) -> Option<u8> {
        Self::ALL_EDGES.get(index).copied()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ Construction Tests ============

    #[test]
    fn test_none() {
        let river = RiverEdges::NONE;
        assert_eq!(river.0, 0);
        assert!(!river.has_river());
    }

    #[test]
    fn test_all() {
        let river = RiverEdges::ALL;
        assert_eq!(river.0, 0b0011_1111);
        assert!(river.has_river());
        assert_eq!(river.edge_count(), 6);
    }

    #[test]
    fn test_new() {
        let river = RiverEdges::new(RiverEdges::EDGE_E | RiverEdges::EDGE_W);
        assert!(river.has_edge(RiverEdges::EDGE_E));
        assert!(river.has_edge(RiverEdges::EDGE_W));
        assert!(!river.has_edge(RiverEdges::EDGE_NE));
    }

    #[test]
    fn test_new_masks_high_bits() {
        // High bits should be masked off
        let river = RiverEdges::new(0xFF);
        assert_eq!(river.0, 0b0011_1111);
    }

    #[test]
    fn test_from_edges() {
        let river =
            RiverEdges::from_edges(&[RiverEdges::EDGE_NE, RiverEdges::EDGE_E, RiverEdges::EDGE_SE]);
        assert!(river.has_edge(RiverEdges::EDGE_NE));
        assert!(river.has_edge(RiverEdges::EDGE_E));
        assert!(river.has_edge(RiverEdges::EDGE_SE));
        assert!(!river.has_edge(RiverEdges::EDGE_W));
        assert_eq!(river.edge_count(), 3);
    }

    #[test]
    fn test_default() {
        let river = RiverEdges::default();
        assert_eq!(river, RiverEdges::NONE);
    }

    // ============ Edge Manipulation Tests ============

    #[test]
    fn test_set_edge() {
        let mut river = RiverEdges::NONE;
        river.set_edge(RiverEdges::EDGE_NE);
        assert!(river.has_edge(RiverEdges::EDGE_NE));
        assert!(!river.has_edge(RiverEdges::EDGE_E));
    }

    #[test]
    fn test_clear_edge() {
        let mut river = RiverEdges::ALL;
        river.clear_edge(RiverEdges::EDGE_NE);
        assert!(!river.has_edge(RiverEdges::EDGE_NE));
        assert!(river.has_edge(RiverEdges::EDGE_E));
        assert_eq!(river.edge_count(), 5);
    }

    #[test]
    fn test_toggle_edge() {
        let mut river = RiverEdges::NONE;

        // Toggle on
        river.toggle_edge(RiverEdges::EDGE_NE);
        assert!(river.has_edge(RiverEdges::EDGE_NE));

        // Toggle off
        river.toggle_edge(RiverEdges::EDGE_NE);
        assert!(!river.has_edge(RiverEdges::EDGE_NE));
    }

    // ============ Query Tests ============

    #[test]
    fn test_has_river() {
        assert!(!RiverEdges::NONE.has_river());
        assert!(RiverEdges::new(RiverEdges::EDGE_E).has_river());
        assert!(RiverEdges::ALL.has_river());
    }

    #[test]
    fn test_has_edge() {
        let river = RiverEdges::new(RiverEdges::EDGE_NE | RiverEdges::EDGE_SW);
        assert!(river.has_edge(RiverEdges::EDGE_NE));
        assert!(river.has_edge(RiverEdges::EDGE_SW));
        assert!(!river.has_edge(RiverEdges::EDGE_E));
        assert!(!river.has_edge(RiverEdges::EDGE_W));
        assert!(!river.has_edge(RiverEdges::EDGE_NW));
        assert!(!river.has_edge(RiverEdges::EDGE_SE));
    }

    #[test]
    fn test_edge_count() {
        assert_eq!(RiverEdges::NONE.edge_count(), 0);
        assert_eq!(RiverEdges::new(RiverEdges::EDGE_E).edge_count(), 1);
        assert_eq!(
            RiverEdges::new(RiverEdges::EDGE_E | RiverEdges::EDGE_W).edge_count(),
            2
        );
        assert_eq!(RiverEdges::ALL.edge_count(), 6);
    }

    // ============ Iterator Tests ============

    #[test]
    fn test_iter_edges_empty() {
        let river = RiverEdges::NONE;
        let edges: Vec<u8> = river.iter_edges().collect();
        assert!(edges.is_empty());
    }

    #[test]
    fn test_iter_edges_single() {
        let river = RiverEdges::new(RiverEdges::EDGE_NE);
        let edges: Vec<u8> = river.iter_edges().collect();
        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0], RiverEdges::EDGE_NE);
    }

    #[test]
    fn test_iter_edges_multiple() {
        let river = RiverEdges::from_edges(&[RiverEdges::EDGE_E, RiverEdges::EDGE_NW, RiverEdges::EDGE_SW]);
        let edges: Vec<u8> = river.iter_edges().collect();
        assert_eq!(edges.len(), 3);
        assert!(edges.contains(&RiverEdges::EDGE_E));
        assert!(edges.contains(&RiverEdges::EDGE_NW));
        assert!(edges.contains(&RiverEdges::EDGE_SW));
    }

    #[test]
    fn test_iter_edges_all() {
        let river = RiverEdges::ALL;
        let edges: Vec<u8> = river.iter_edges().collect();
        assert_eq!(edges.len(), 6);
    }

    // ============ Opposite Edge Tests ============

    #[test]
    fn test_opposite_edge() {
        assert_eq!(RiverEdges::opposite_edge(RiverEdges::EDGE_E), RiverEdges::EDGE_W);
        assert_eq!(RiverEdges::opposite_edge(RiverEdges::EDGE_W), RiverEdges::EDGE_E);
        assert_eq!(RiverEdges::opposite_edge(RiverEdges::EDGE_NE), RiverEdges::EDGE_SW);
        assert_eq!(RiverEdges::opposite_edge(RiverEdges::EDGE_SW), RiverEdges::EDGE_NE);
        assert_eq!(RiverEdges::opposite_edge(RiverEdges::EDGE_NW), RiverEdges::EDGE_SE);
        assert_eq!(RiverEdges::opposite_edge(RiverEdges::EDGE_SE), RiverEdges::EDGE_NW);
    }

    #[test]
    fn test_opposite_edge_invalid() {
        assert_eq!(RiverEdges::opposite_edge(0), 0);
        assert_eq!(RiverEdges::opposite_edge(0xFF), 0);
    }

    // ============ Index Conversion Tests ============

    #[test]
    fn test_edge_to_index() {
        assert_eq!(RiverEdges::edge_to_index(RiverEdges::EDGE_E), Some(0));
        assert_eq!(RiverEdges::edge_to_index(RiverEdges::EDGE_NE), Some(1));
        assert_eq!(RiverEdges::edge_to_index(RiverEdges::EDGE_NW), Some(2));
        assert_eq!(RiverEdges::edge_to_index(RiverEdges::EDGE_W), Some(3));
        assert_eq!(RiverEdges::edge_to_index(RiverEdges::EDGE_SW), Some(4));
        assert_eq!(RiverEdges::edge_to_index(RiverEdges::EDGE_SE), Some(5));
        assert_eq!(RiverEdges::edge_to_index(0), None);
        assert_eq!(RiverEdges::edge_to_index(0xFF), None);
    }

    #[test]
    fn test_index_to_edge() {
        assert_eq!(RiverEdges::index_to_edge(0), Some(RiverEdges::EDGE_E));
        assert_eq!(RiverEdges::index_to_edge(1), Some(RiverEdges::EDGE_NE));
        assert_eq!(RiverEdges::index_to_edge(2), Some(RiverEdges::EDGE_NW));
        assert_eq!(RiverEdges::index_to_edge(3), Some(RiverEdges::EDGE_W));
        assert_eq!(RiverEdges::index_to_edge(4), Some(RiverEdges::EDGE_SW));
        assert_eq!(RiverEdges::index_to_edge(5), Some(RiverEdges::EDGE_SE));
        assert_eq!(RiverEdges::index_to_edge(6), None);
    }

    // ============ Bits Tests ============

    #[test]
    fn test_bits() {
        let river = RiverEdges::new(RiverEdges::EDGE_E | RiverEdges::EDGE_NE);
        assert_eq!(river.bits(), 0b00000011);
    }

    // ============ Serde Tests ============

    #[test]
    fn test_serde_roundtrip() {
        let rivers = [
            RiverEdges::NONE,
            RiverEdges::new(RiverEdges::EDGE_E),
            RiverEdges::from_edges(&[RiverEdges::EDGE_NE, RiverEdges::EDGE_SW]),
            RiverEdges::ALL,
        ];

        for river in rivers {
            let json = serde_json::to_string(&river).expect("serialization failed");
            let deserialized: RiverEdges =
                serde_json::from_str(&json).expect("deserialization failed");
            assert_eq!(river, deserialized);
        }
    }
}
