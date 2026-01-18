//! OpenCiv library crate.
//!
//! Exports all game modules for testing and potential library usage.

pub mod hex;
pub mod plugins;

// Re-export commonly used types
pub use hex::{HexGridLayout, TilePosition};
