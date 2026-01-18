//! OpenCiv library crate.
//!
//! Exports all game modules for testing and potential library usage.

pub mod hex;
pub mod map;
pub mod plugins;
pub mod render;
pub mod tile;

// Re-export commonly used types
pub use hex::{HexGridLayout, TilePosition};
pub use map::{MapConfig, MapGenerator, MapSize};
pub use render::{MainCamera, RenderPlugin};
pub use tile::{Terrain, Tile, TileBundle, TileFeature, TileResource, TileYields};
