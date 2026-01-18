//! Camera systems for OpenCiv.
//!
//! Provides camera spawning, panning, and zoom controls.

use bevy::input::mouse::MouseWheel;
use bevy::prelude::*;

use crate::hex::{HexGridLayout, TilePosition};
use crate::map::MapConfig;

/// Camera movement speed in pixels per second.
pub const CAMERA_SPEED: f32 = 500.0;

/// Zoom sensitivity per scroll event.
pub const ZOOM_SPEED: f32 = 0.1;

/// Minimum zoom level (zoomed in).
pub const MIN_ZOOM: f32 = 0.5;

/// Maximum zoom level (zoomed out).
pub const MAX_ZOOM: f32 = 3.0;

/// Marker component for the main game camera.
///
/// Used to identify the camera for movement and zoom systems.
#[derive(Component)]
pub struct MainCamera;

/// Spawns the main 2D camera for the game.
pub fn spawn_camera(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        OrthographicProjection {
            scale: 1.0,
            ..default()
        },
        MainCamera,
    ));
}

/// Handles camera panning with WASD and arrow keys.
pub fn camera_movement(
    time: Res<Time>,
    keyboard: Res<ButtonInput<KeyCode>>,
    mut query: Query<&mut Transform, With<MainCamera>>,
) {
    let Ok(mut transform) = query.get_single_mut() else {
        return;
    };

    let mut direction = Vec3::ZERO;

    if keyboard.pressed(KeyCode::KeyW) || keyboard.pressed(KeyCode::ArrowUp) {
        direction.y += 1.0;
    }
    if keyboard.pressed(KeyCode::KeyS) || keyboard.pressed(KeyCode::ArrowDown) {
        direction.y -= 1.0;
    }
    if keyboard.pressed(KeyCode::KeyA) || keyboard.pressed(KeyCode::ArrowLeft) {
        direction.x -= 1.0;
    }
    if keyboard.pressed(KeyCode::KeyD) || keyboard.pressed(KeyCode::ArrowRight) {
        direction.x += 1.0;
    }

    if direction != Vec3::ZERO {
        direction = direction.normalize();
        transform.translation += direction * CAMERA_SPEED * time.delta_seconds();
    }
}

/// Handles camera zoom with mouse scroll.
pub fn camera_zoom(
    mut scroll_events: EventReader<MouseWheel>,
    mut query: Query<&mut OrthographicProjection, With<MainCamera>>,
) {
    let Ok(mut projection) = query.get_single_mut() else {
        return;
    };

    for event in scroll_events.read() {
        projection.scale -= event.y * ZOOM_SPEED;
        projection.scale = projection.scale.clamp(MIN_ZOOM, MAX_ZOOM);
    }
}

/// Centers the camera on the map after generation.
pub fn center_camera_on_map(
    config: Res<MapConfig>,
    layout: Res<HexGridLayout>,
    mut camera_query: Query<&mut Transform, With<MainCamera>>,
) {
    let Ok(mut transform) = camera_query.get_single_mut() else {
        return;
    };

    let (width, height) = config.size.dimensions();
    let center_hex = TilePosition::new(width / 2, height / 2);
    let center_world = layout.tile_to_world(center_hex);

    transform.translation = center_world.extend(0.0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_camera_constants_valid() {
        assert!(CAMERA_SPEED > 0.0, "Camera speed must be positive");
        assert!(ZOOM_SPEED > 0.0, "Zoom speed must be positive");
        assert!(MIN_ZOOM > 0.0, "Min zoom must be positive");
        assert!(MAX_ZOOM > MIN_ZOOM, "Max zoom must be greater than min zoom");
    }
}
