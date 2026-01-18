//! Map generation module for OpenCiv.
//!
//! This module provides procedural terrain generation using multi-layer noise
//! functions. It creates varied maps with realistic terrain distributions
//! including continents, mountains, biomes, and features.
//!
//! # Overview
//!
//! Map generation uses three noise layers:
//! - **Height map**: Determines land/water, hills, and mountains
//! - **Temperature map**: Determines biome types (snow, tundra, grassland, etc.)
//! - **Moisture map**: Determines feature placement (forest, jungle, marsh)
//!
//! # Usage
//!
//! ```rust,ignore
//! use openciv::map::{MapConfig, MapGenerator};
//! use bevy::prelude::*;
//!
//! fn setup_map(mut commands: Commands) {
//!     let config = MapConfig::standard().with_seed(12345);
//!     let mut generator = MapGenerator::new(config);
//!     let entities = generator.generate(&mut commands);
//!     println!("Generated {} tiles", entities.len());
//! }
//! ```
//!
//! # Configuration
//!
//! Use [`MapConfig`] to customize map generation:
//! - Map size (Duel to Huge)
//! - Random seed for reproducible maps
//! - Terrain thresholds (ocean, hill, mountain)
//!
//! # Determinism
//!
//! Maps are fully deterministic: the same [`MapConfig`] will always produce
//! the same map, making it easy to share maps or replay games.

mod config;
mod generator;

pub use config::{MapConfig, MapSize};
pub use generator::MapGenerator;
