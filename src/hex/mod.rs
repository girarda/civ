//! Hex coordinate system module.
//!
//! Provides hex grid coordinate types and layout utilities built on the `hexx` crate.
//!
//! # Types
//!
//! - [`TilePosition`] - Component wrapper for hex coordinates
//! - [`HexGridLayout`] - Resource for coordinate conversions
//!
//! # Example
//!
//! ```rust,ignore
//! use openciv::hex::{TilePosition, HexGridLayout};
//!
//! let tile = TilePosition::new(3, -2);
//! let layout = HexGridLayout::default();
//! let world_pos = layout.tile_to_world(tile);
//! ```

mod coord;
mod layout;

pub use coord::TilePosition;
pub use layout::HexGridLayout;

// Re-export hexx types that users might need
pub use hexx::{EdgeDirection, Hex, HexOrientation, VertexDirection};
