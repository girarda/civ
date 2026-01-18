//! OpenCiv library crate.
//!
//! Exports all game modules for testing and potential library usage.

pub mod hex;
pub mod plugins;
pub mod tile;

// Re-export commonly used types
pub use hex::{HexGridLayout, TilePosition};
pub use tile::{Terrain, Tile, TileBundle, TileFeature, TileResource, TileYields};
