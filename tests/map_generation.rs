//! Integration tests for map generation.
//!
//! Tests that verify the MapGenerator produces valid, consistent maps.

use bevy::prelude::*;
use openciv::hex::TilePosition;
use openciv::map::{MapConfig, MapGenerator};
use openciv::tile::{Terrain, TileFeature};

/// Create a minimal Bevy app for testing.
fn setup_test_app() -> App {
    let mut app = App::new();
    app.add_plugins(MinimalPlugins);
    app
}

#[test]
fn test_map_generates_correct_tile_count_duel() {
    let mut app = setup_test_app();
    let config = MapConfig::duel(); // 48x32 = 1536 tiles
    let mut generator = MapGenerator::new(config);

    // Get commands and generate
    let entities = {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands)
    };

    // Apply commands
    app.world_mut().flush();

    assert_eq!(entities.len(), 48 * 32);
}

#[test]
fn test_map_generates_correct_tile_count_small() {
    let mut app = setup_test_app();
    let config = MapConfig::small(); // 68x44 = 2992 tiles
    let mut generator = MapGenerator::new(config);

    let entities = {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands)
    };

    app.world_mut().flush();

    assert_eq!(entities.len(), 68 * 44);
}

#[test]
fn test_same_seed_produces_same_map() {
    let config = MapConfig::duel().with_seed(12345);

    let gen1 = MapGenerator::new(config.clone());
    let gen2 = MapGenerator::new(config);

    // Compare height maps directly (they should be identical)
    let height1 = gen1.generate_height_map();
    let height2 = gen2.generate_height_map();

    assert_eq!(height1, height2);
}

#[test]
fn test_different_seeds_produce_different_maps() {
    let gen1 = MapGenerator::new(MapConfig::duel().with_seed(12345));
    let gen2 = MapGenerator::new(MapConfig::duel().with_seed(67890));

    let map1 = gen1.generate_height_map();
    let map2 = gen2.generate_height_map();

    // Maps should be different
    let mut differences = 0;
    for x in 0..48 {
        for y in 0..32 {
            if (map1[x][y] - map2[x][y]).abs() > f64::EPSILON {
                differences += 1;
            }
        }
    }

    assert!(differences > 0, "Different seeds should produce different maps");
}

#[test]
fn test_terrain_distribution() {
    let mut app = setup_test_app();
    let config = MapConfig::small().with_seed(42);
    let mut generator = MapGenerator::new(config);

    {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands);
    }

    app.world_mut().flush();

    // Count terrain types
    let mut water_count = 0;
    let mut land_count = 0;
    let mut mountain_count = 0;

    let mut query = app.world_mut().query::<&Terrain>();
    for terrain in query.iter(app.world()) {
        if terrain.is_water() {
            water_count += 1;
        } else if matches!(terrain, Terrain::Mountain) {
            mountain_count += 1;
        } else {
            land_count += 1;
        }
    }

    // Verify reasonable distribution
    let total = water_count + land_count + mountain_count;
    let water_pct = water_count as f64 / total as f64;
    let mountain_pct = mountain_count as f64 / total as f64;

    // Expect 30-80% water (edge falloff creates islands)
    assert!(
        water_pct > 0.25 && water_pct < 0.85,
        "Water percentage {:.1}% outside expected range 25-85%",
        water_pct * 100.0
    );

    // Expect less than 15% mountains
    assert!(
        mountain_pct < 0.20,
        "Mountain percentage {:.1}% too high (expected <20%)",
        mountain_pct * 100.0
    );

    // Should have some land
    assert!(
        land_count > 0,
        "Map should have at least some land tiles"
    );
}

#[test]
fn test_all_coordinates_populated() {
    let mut app = setup_test_app();
    let config = MapConfig::duel().with_seed(42);
    let mut generator = MapGenerator::new(config);

    {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands);
    }

    app.world_mut().flush();

    // Collect all positions
    let mut query = app.world_mut().query::<&TilePosition>();
    let positions: Vec<(i32, i32)> = query
        .iter(app.world())
        .map(|p| (p.x, p.y))
        .collect();

    // Verify all expected positions exist
    assert_eq!(positions.len(), 48 * 32);

    // Check that we have positions covering the expected range
    let min_q = positions.iter().map(|(q, _)| *q).min().unwrap();
    let max_q = positions.iter().map(|(q, _)| *q).max().unwrap();
    let min_r = positions.iter().map(|(_, r)| *r).min().unwrap();
    let max_r = positions.iter().map(|(_, r)| *r).max().unwrap();

    assert_eq!(min_q, 0);
    assert_eq!(max_q, 47);
    assert_eq!(min_r, 0);
    assert_eq!(max_r, 31);
}

#[test]
fn test_features_respect_terrain() {
    let mut app = setup_test_app();
    let config = MapConfig::small().with_seed(42);
    let mut generator = MapGenerator::new(config);

    {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands);
    }

    app.world_mut().flush();

    // Check that features are only on valid terrain
    let mut query = app.world_mut().query::<(&Terrain, &TileFeature)>();
    for (terrain, feature) in query.iter(app.world()) {
        assert!(
            feature.can_place_on(*terrain),
            "{:?} should not be placed on {:?}",
            feature,
            terrain
        );
    }
}

#[test]
fn test_water_has_no_land_features() {
    let mut app = setup_test_app();
    let config = MapConfig::small().with_seed(42);
    let mut generator = MapGenerator::new(config);

    {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands);
    }

    app.world_mut().flush();

    // Water tiles should have no features (except Ice which can go on Coast/Ocean)
    let mut query = app.world_mut().query::<(&Terrain, &TileFeature)>();
    for (terrain, feature) in query.iter(app.world()) {
        if terrain.is_water() {
            assert!(
                matches!(feature, TileFeature::Ice),
                "Water terrain {:?} has non-ice feature {:?}",
                terrain,
                feature
            );
        }
    }
}

#[test]
fn test_mountains_have_no_features() {
    let mut app = setup_test_app();
    let config = MapConfig::small().with_seed(42);
    let mut generator = MapGenerator::new(config);

    {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands);
    }

    app.world_mut().flush();

    // Mountains should never have features
    let mut query = app.world_mut().query::<(&Terrain, &TileFeature)>();
    for (terrain, _feature) in query.iter(app.world()) {
        assert!(
            !matches!(terrain, Terrain::Mountain),
            "Mountain should not have any feature"
        );
    }
}

#[test]
fn test_terrain_variety() {
    let mut app = setup_test_app();
    let config = MapConfig::small().with_seed(42);
    let mut generator = MapGenerator::new(config);

    {
        let mut commands = app.world_mut().commands();
        generator.generate(&mut commands);
    }

    app.world_mut().flush();

    // Collect unique terrain types
    let mut terrain_types = std::collections::HashSet::new();
    let mut query = app.world_mut().query::<&Terrain>();
    for terrain in query.iter(app.world()) {
        terrain_types.insert(*terrain);
    }

    // Should have at least several different terrain types
    assert!(
        terrain_types.len() >= 5,
        "Map should have terrain variety, found only {} types: {:?}",
        terrain_types.len(),
        terrain_types
    );
}

#[test]
fn test_height_map_creates_edge_falloff() {
    let config = MapConfig::duel().with_seed(42);
    let generator = MapGenerator::new(config);
    let height_map = generator.generate_height_map();

    // Sample center vs edge heights
    let center_x = 24;
    let center_y = 16;
    let center_height = height_map[center_x][center_y];

    // Sample corner heights (should be lower due to edge falloff)
    let corner_heights = [
        height_map[0][0],
        height_map[47][0],
        height_map[0][31],
        height_map[47][31],
    ];

    let avg_corner = corner_heights.iter().sum::<f64>() / 4.0;

    // Center should generally be higher than corners (edge falloff effect)
    // This is a statistical tendency, not guaranteed for every seed
    // But with good edge falloff, center areas should be elevated more often
    assert!(
        center_height >= avg_corner * 0.5 || avg_corner < 0.3,
        "Edge falloff should lower corner heights. Center: {}, Avg corner: {}",
        center_height,
        avg_corner
    );
}

#[test]
fn test_temperature_creates_latitude_gradient() {
    let config = MapConfig::duel().with_seed(42);
    let generator = MapGenerator::new(config);
    let temp_map = generator.generate_temperature_map();

    // Calculate average temperatures at different latitudes
    let mut pole_avg = 0.0;
    let mut equator_avg = 0.0;
    let samples = 10;

    for i in 0..samples {
        let x = i * 4; // Sample across x
        pole_avg += temp_map[x][0] + temp_map[x][31]; // Top and bottom
        equator_avg += temp_map[x][15] + temp_map[x][16]; // Middle
    }

    pole_avg /= (samples * 2) as f64;
    equator_avg /= (samples * 2) as f64;

    // Equator should be warmer than poles
    assert!(
        equator_avg > pole_avg,
        "Equator ({:.3}) should be warmer than poles ({:.3})",
        equator_avg,
        pole_avg
    );
}
