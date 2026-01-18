//! Prototype rendering module for OpenCiv.
//!
//! Provides simple colored-hex visualization before full tilemap integration.
//! This is a temporary solution enabling visual verification of the map generator.

mod camera;
mod simple_render;

pub use camera::{camera_movement, camera_zoom, spawn_camera, MainCamera};
pub use simple_render::{spawn_hex_sprites, terrain_to_color};

use bevy::prelude::*;

use crate::hex::HexGridLayout;
use crate::map::{MapConfig, MapGenerator};

use camera::center_camera_on_map;

/// Plugin for prototype map rendering.
///
/// Provides simple colored-hex visualization and camera controls.
/// This is a temporary solution before full tilemap integration.
pub struct RenderPlugin;

impl Plugin for RenderPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<HexGridLayout>()
            .insert_resource(MapConfig::duel())
            .add_systems(Startup, (spawn_camera, generate_map))
            .add_systems(
                Startup,
                (spawn_hex_sprites, center_camera_on_map).after(generate_map),
            )
            .add_systems(Update, (camera_movement, camera_zoom));
    }
}

/// Generates the map using the MapGenerator.
fn generate_map(mut commands: Commands, config: Res<MapConfig>) {
    let mut generator = MapGenerator::new(config.clone());
    generator.generate(&mut commands);
}
