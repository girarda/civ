//! Hex grid system plugin.
//!
//! Sets up the hex coordinate system and layout resource.

use bevy::prelude::*;

use crate::hex::HexGridLayout;

/// Plugin that initializes the hex grid system.
pub struct HexPlugin;

impl Plugin for HexPlugin {
    fn build(&self, app: &mut App) {
        // Note: TilePosition reflection registration is disabled due to hexx/bevy version mismatch.
        // Once hexx updates to a compatible bevy_reflect version, we can add:
        // .register_type::<TilePosition>()
        app.init_resource::<HexGridLayout>();
    }
}
