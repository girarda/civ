//! Tile data model for OpenCiv.
//!
//! This module provides the core tile representation including terrain types,
//! features, resources, yields, and river edges. These types form the foundation
//! for map representation, procedural generation, and gameplay mechanics.
//!
//! # Overview
//!
//! A map tile in OpenCiv consists of:
//!
//! - [`Terrain`]: The base terrain type (Grassland, Plains, Desert, etc.)
//! - [`TileFeature`]: Optional overlay (Forest, Jungle, Marsh, etc.)
//! - [`TileResource`]: Optional resource (Cattle, Iron, Gems, etc.)
//! - [`TileYields`]: Calculated yields (food, production, gold, etc.)
//! - [`RiverEdges`]: Bitmask of which edges have rivers
//!
//! # Usage
//!
//! ## Creating a Simple Tile
//!
//! ```rust,ignore
//! use openciv::tile::{TileBundle, Terrain};
//! use openciv::hex::TilePosition;
//!
//! fn spawn_tile(mut commands: Commands) {
//!     commands.spawn(TileBundle::new(
//!         TilePosition::new(0, 0),
//!         Terrain::Grassland,
//!     ));
//! }
//! ```
//!
//! ## Creating a Tile with Feature and Resource
//!
//! ```rust,ignore
//! use openciv::tile::{TileBuilder, Terrain, TileFeature, TileResource};
//! use openciv::hex::TilePosition;
//!
//! fn spawn_rich_tile(mut commands: Commands) {
//!     let components = TileBuilder::new(TilePosition::new(1, 1), Terrain::Grassland)
//!         .feature(TileFeature::Forest)
//!         .resource(TileResource::Deer)
//!         .build();
//!
//!     components.spawn(&mut commands);
//! }
//! ```
//!
//! ## Calculating Yields
//!
//! ```rust,ignore
//! use openciv::tile::{Terrain, TileFeature, TileResource, TileYields};
//!
//! // Calculate yields for a grassland tile with forest and deer
//! let yields = TileYields::calculate(
//!     Terrain::Grassland,
//!     Some(TileFeature::Forest),
//!     Some(TileResource::Deer),
//!     false, // no river
//! );
//!
//! // Grassland: 2F, Forest: +1P, Deer: +1F
//! assert_eq!(yields.food, 3);
//! assert_eq!(yields.production, 1);
//! ```
//!
//! # OpenCiv Compatibility
//!
//! The yield values in this module are based on OpenCiv's tiles.yml and follow
//! these key values:
//!
//! | Terrain | Food | Production | Notes |
//! |---------|------|------------|-------|
//! | Grassland | 2 | 0 | High food |
//! | Plains | 1 | 1 | Balanced |
//! | Hills | 0 | 2 | Production focus |
//!
//! | Feature | Food | Production | Gold |
//! |---------|------|------------|------|
//! | Forest | 0 | +1 | 0 |
//! | Jungle | 0 | -1 | 0 |
//! | Floodplains | +2 | 0 | 0 |
//! | Oasis | +3 | 0 | +1 |

mod bundle;
mod feature;
mod resource;
mod river;
mod terrain;
mod yields;

// Re-export all public types
pub use bundle::{Tile, TileBuilder, TileBundle, TileComponents};
pub use feature::TileFeature;
pub use resource::{ResourceCategory, TileResource};
pub use river::RiverEdges;
pub use terrain::Terrain;
pub use yields::TileYields;
