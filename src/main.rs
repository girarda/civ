//! OpenCiv - A Civilization-style 4X strategy game in Rust
//!
//! This is the application entry point.

use bevy::prelude::*;

mod hex;
mod map;
mod plugins;
mod render;
mod tile;

use render::RenderPlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "OpenCiv".into(),
                resolution: (1280., 720.).into(),
                ..default()
            }),
            ..default()
        }))
        .add_plugins(RenderPlugin)
        .run();
}
