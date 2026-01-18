//! Tile plugin for OpenCiv.
//!
//! Registers tile-related components and systems with Bevy.

use bevy::prelude::*;

use crate::tile::{RiverEdges, Terrain, Tile, TileYields};

/// Plugin for tile data model integration with Bevy.
///
/// This plugin registers tile-related component types for reflection
/// and any tile-specific systems.
///
/// # Usage
///
/// ```rust,ignore
/// use bevy::prelude::*;
/// use openciv::plugins::TilePlugin;
///
/// fn main() {
///     App::new()
///         .add_plugins(TilePlugin)
///         .run();
/// }
/// ```
pub struct TilePlugin;

impl Plugin for TilePlugin {
    fn build(&self, app: &mut App) {
        // Register component types for Bevy reflection/inspection
        // Note: We cannot use register_type! for types that derive from hexx
        // due to bevy_reflect version mismatch. Once hexx updates, we can enable:
        // app.register_type::<Tile>();
        // app.register_type::<Terrain>();
        // app.register_type::<TileYields>();
        // app.register_type::<RiverEdges>();

        // For now, we just mark the app as having the tile plugin
        // This will be expanded as we add tile-related systems
        let _ = (app, &Tile, &Terrain::default(), &TileYields::default(), &RiverEdges::default());
    }
}
