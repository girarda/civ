//! Procedural map generator for OpenCiv.
//!
//! Uses multi-layer noise functions to generate realistic terrain maps
//! with varied biomes and features.

use bevy::prelude::*;
use noise::{Fbm, MultiFractal, NoiseFn, Perlin};
use rand::prelude::*;

use crate::hex::TilePosition;
use crate::tile::{Terrain, TileBuilder, TileFeature};

use super::config::MapConfig;

/// Procedural map generator using Fbm noise.
///
/// Creates terrain maps by combining multiple noise layers:
/// - Height map for elevation (land/water/hills/mountains)
/// - Temperature map for biome selection
/// - Moisture map for feature placement
///
/// # Example
///
/// ```rust,ignore
/// use openciv::map::{MapConfig, MapGenerator};
/// use bevy::prelude::*;
///
/// fn generate_world(mut commands: Commands) {
///     let config = MapConfig::standard().with_seed(42);
///     let mut generator = MapGenerator::new(config);
///     let entities = generator.generate(&mut commands);
/// }
/// ```
pub struct MapGenerator {
    config: MapConfig,
    rng: StdRng,
}

impl MapGenerator {
    /// Create a new map generator with the given configuration.
    ///
    /// The random number generator is seeded from the config's seed value,
    /// ensuring deterministic generation.
    pub fn new(config: MapConfig) -> Self {
        let rng = StdRng::seed_from_u64(config.seed);
        Self { config, rng }
    }

    /// Normalize a 2D map to the range [0.0, 1.0].
    ///
    /// Finds the min and max values and scales all values proportionally.
    fn normalize_map(map: &mut [Vec<f64>]) {
        let mut min_val = f64::MAX;
        let mut max_val = f64::MIN;

        // Find min and max
        for row in map.iter() {
            for &val in row.iter() {
                if val < min_val {
                    min_val = val;
                }
                if val > max_val {
                    max_val = val;
                }
            }
        }

        // Normalize to 0.0-1.0
        let range = max_val - min_val;
        if range > f64::EPSILON {
            for row in map.iter_mut() {
                for val in row.iter_mut() {
                    *val = (*val - min_val) / range;
                }
            }
        }
    }

    /// Generate the height map using Fbm noise with edge falloff.
    ///
    /// Returns a 2D vector of height values normalized to [0.0, 1.0].
    /// Edge falloff creates island-like landmasses.
    pub fn generate_height_map(&self) -> Vec<Vec<f64>> {
        let (width, height) = self.config.size.dimensions();
        let fbm: Fbm<Perlin> = Fbm::new(self.config.seed as u32)
            .set_octaves(6)
            .set_frequency(0.02)
            .set_lacunarity(2.0)
            .set_persistence(0.5);

        let mut map = vec![vec![0.0; height as usize]; width as usize];

        for x in 0..width {
            for y in 0..height {
                let nx = x as f64;
                let ny = y as f64;

                // Base noise value
                let h = fbm.get([nx, ny]);

                // Edge falloff for island-like shapes
                let edge_x = (x as f64 / width as f64 - 0.5).abs() * 2.0;
                let edge_y = (y as f64 / height as f64 - 0.5).abs() * 2.0;
                let edge_falloff = 1.0 - (edge_x.powi(2) + edge_y.powi(2)).sqrt().min(1.0);

                map[x as usize][y as usize] = h * edge_falloff;
            }
        }

        Self::normalize_map(&mut map);
        map
    }

    /// Generate the temperature map based on latitude with noise variation.
    ///
    /// Returns a 2D vector of temperature values normalized to [0.0, 1.0].
    /// Temperature is higher at the equator (y = height/2) and lower at poles.
    pub fn generate_temperature_map(&self) -> Vec<Vec<f64>> {
        let (width, height) = self.config.size.dimensions();
        let perlin = Perlin::new(self.config.seed as u32 + 1000);

        let mut map = vec![vec![0.0; height as usize]; width as usize];

        for x in 0..width {
            for y in 0..height {
                // Latitude-based temperature (1.0 at equator, 0.0 at poles)
                let latitude_factor = (y as f64 / height as f64 - 0.5).abs() * 2.0;
                let base_temp = 1.0 - latitude_factor;

                // Add noise variation (+/- 0.2)
                let noise_val = perlin.get([x as f64 * 0.05, y as f64 * 0.05]) * 0.2;

                // Combine and clamp
                let temp = (base_temp + noise_val).clamp(0.0, 1.0);
                map[x as usize][y as usize] = temp;
            }
        }

        map
    }

    /// Generate the moisture map using Fbm noise.
    ///
    /// Returns a 2D vector of moisture values normalized to [0.0, 1.0].
    /// Used for determining feature placement (forests, jungles, marshes).
    pub fn generate_moisture_map(&self) -> Vec<Vec<f64>> {
        let (width, height) = self.config.size.dimensions();
        let fbm: Fbm<Perlin> = Fbm::new(self.config.seed as u32 + 2000)
            .set_octaves(4)
            .set_frequency(0.03)
            .set_lacunarity(2.0)
            .set_persistence(0.5);

        let mut map = vec![vec![0.0; height as usize]; width as usize];

        for x in 0..width {
            for y in 0..height {
                let val = fbm.get([x as f64, y as f64]);
                map[x as usize][y as usize] = val;
            }
        }

        Self::normalize_map(&mut map);
        map
    }

    /// Determine the terrain type based on height and temperature values.
    ///
    /// # Logic
    ///
    /// 1. Water: height < ocean_threshold
    ///    - Deep ocean: height < ocean_threshold * 0.6
    ///    - Coast: otherwise
    /// 2. Mountain: height > mountain_threshold
    /// 3. Hills vs Flat: height > hill_threshold
    /// 4. Biome by temperature:
    ///    - < 0.15: Snow
    ///    - 0.15-0.30: Tundra
    ///    - 0.30-0.50: Grassland
    ///    - 0.50-0.80: Plains
    ///    - > 0.80: Desert
    fn determine_terrain(&self, height: f64, temp: f64, _moisture: f64) -> Terrain {
        // Water tiles
        if height < self.config.ocean_threshold {
            return if height < self.config.ocean_threshold * 0.6 {
                Terrain::Ocean
            } else {
                Terrain::Coast
            };
        }

        // Mountains
        if height > self.config.mountain_threshold {
            return Terrain::Mountain;
        }

        // Determine if hill
        let is_hill = height > self.config.hill_threshold;

        // Temperature-based biome selection
        match temp {
            t if t < 0.15 => {
                if is_hill {
                    Terrain::SnowHill
                } else {
                    Terrain::Snow
                }
            }
            t if t < 0.30 => {
                if is_hill {
                    Terrain::TundraHill
                } else {
                    Terrain::Tundra
                }
            }
            t if t < 0.50 => {
                if is_hill {
                    Terrain::GrasslandHill
                } else {
                    Terrain::Grassland
                }
            }
            t if t < 0.80 => {
                if is_hill {
                    Terrain::PlainsHill
                } else {
                    Terrain::Plains
                }
            }
            _ => {
                if is_hill {
                    Terrain::DesertHill
                } else {
                    Terrain::Desert
                }
            }
        }
    }

    /// Determine if a feature should be placed and which type.
    ///
    /// # Rules
    ///
    /// - No features on water, mountains, or snow
    /// - Forest: temp < 0.6, moisture > 0.5, 40% chance
    /// - Jungle: temp > 0.7, moisture > 0.6, 50% chance
    /// - Marsh: flat grassland, moisture > 0.7, 20% chance
    /// - Oasis: desert, moisture > 0.4, 5% chance
    fn determine_feature(
        &mut self,
        terrain: Terrain,
        temp: f64,
        moisture: f64,
    ) -> Option<TileFeature> {
        // Skip water, mountains, snow
        if terrain.is_water()
            || matches!(
                terrain,
                Terrain::Mountain | Terrain::Snow | Terrain::SnowHill
            )
        {
            return None;
        }

        // Oasis in desert (check first since it's rare)
        if matches!(terrain, Terrain::Desert) && moisture > 0.4 && self.rng.gen_bool(0.05) {
            return Some(TileFeature::Oasis);
        }

        // Marsh in wet flat areas
        if !terrain.is_hill()
            && moisture > 0.7
            && self.rng.gen_bool(0.2)
            && TileFeature::Marsh.can_place_on(terrain)
        {
            return Some(TileFeature::Marsh);
        }

        // Jungle in hot with high moisture
        if temp > 0.7
            && moisture > 0.6
            && self.rng.gen_bool(0.5)
            && TileFeature::Jungle.can_place_on(terrain)
        {
            return Some(TileFeature::Jungle);
        }

        // Forest in temperate/cold with moisture
        if temp < 0.6
            && moisture > 0.5
            && self.rng.gen_bool(0.4)
            && TileFeature::Forest.can_place_on(terrain)
        {
            return Some(TileFeature::Forest);
        }

        None
    }

    /// Generate the complete map, spawning all tile entities.
    ///
    /// Returns a vector of entity IDs for all spawned tiles.
    ///
    /// # Process
    ///
    /// 1. Generate height, temperature, and moisture maps
    /// 2. For each coordinate, determine terrain and feature
    /// 3. Calculate yields and spawn tile entity
    pub fn generate(&mut self, commands: &mut Commands) -> Vec<Entity> {
        let (width, height) = self.config.size.dimensions();
        let height_map = self.generate_height_map();
        let temperature_map = self.generate_temperature_map();
        let moisture_map = self.generate_moisture_map();

        let mut entities = Vec::with_capacity((width * height) as usize);

        for q in 0..width {
            for r in 0..height {
                let x = q as usize;
                let y = r as usize;

                let terrain = self.determine_terrain(
                    height_map[x][y],
                    temperature_map[x][y],
                    moisture_map[x][y],
                );

                let feature = self.determine_feature(terrain, temperature_map[x][y], moisture_map[x][y]);

                let position = TilePosition::new(q, r);
                let components = TileBuilder::new(position, terrain)
                    .feature_opt(feature)
                    .build();
                let entity = components.spawn(commands);
                entities.push(entity);
            }
        }

        entities
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ Constructor Tests ============

    #[test]
    fn test_generator_new() {
        let config = MapConfig::duel().with_seed(12345);
        let generator = MapGenerator::new(config.clone());

        assert_eq!(generator.config, config);
    }

    // ============ Normalization Tests ============

    #[test]
    fn test_normalize_map() {
        let mut map = vec![vec![-1.0, 0.0, 1.0], vec![0.5, -0.5, 2.0]];
        MapGenerator::normalize_map(&mut map);

        // Check all values are in [0.0, 1.0]
        for row in &map {
            for &val in row {
                assert!(val >= 0.0 && val <= 1.0, "Value {} out of range", val);
            }
        }

        // Check min is 0.0 and max is 1.0
        let min: f64 = map.iter().flat_map(|r| r.iter()).copied().fold(f64::MAX, f64::min);
        let max: f64 = map.iter().flat_map(|r| r.iter()).copied().fold(f64::MIN, f64::max);

        assert!((min - 0.0).abs() < f64::EPSILON, "Min should be 0.0");
        assert!((max - 1.0).abs() < f64::EPSILON, "Max should be 1.0");
    }

    #[test]
    fn test_normalize_map_uniform() {
        // All same values should normalize to all zeros (or any uniform value)
        let mut map = vec![vec![5.0, 5.0], vec![5.0, 5.0]];
        MapGenerator::normalize_map(&mut map);

        // When all values are the same, they stay the same (no range to normalize)
        for row in &map {
            for &val in row {
                assert!((val - 5.0).abs() < f64::EPSILON);
            }
        }
    }

    // ============ Height Map Tests ============

    #[test]
    fn test_height_map_dimensions() {
        let config = MapConfig::duel(); // 48x32
        let generator = MapGenerator::new(config);
        let height_map = generator.generate_height_map();

        assert_eq!(height_map.len(), 48);
        assert_eq!(height_map[0].len(), 32);
    }

    #[test]
    fn test_height_map_range() {
        let config = MapConfig::duel();
        let generator = MapGenerator::new(config);
        let height_map = generator.generate_height_map();

        for row in &height_map {
            for &val in row {
                assert!(
                    val >= 0.0 && val <= 1.0,
                    "Height {} out of normalized range",
                    val
                );
            }
        }
    }

    // ============ Temperature Map Tests ============

    #[test]
    fn test_temperature_map_dimensions() {
        let config = MapConfig::duel();
        let generator = MapGenerator::new(config);
        let temp_map = generator.generate_temperature_map();

        assert_eq!(temp_map.len(), 48);
        assert_eq!(temp_map[0].len(), 32);
    }

    #[test]
    fn test_temperature_gradient() {
        let config = MapConfig::duel();
        let (_, height) = config.size.dimensions();
        let generator = MapGenerator::new(config);
        let temp_map = generator.generate_temperature_map();

        // Temperature should generally be higher at equator (middle y values)
        // and lower at poles (y=0 and y=max)
        let equator = (height / 2) as usize;

        // Sample multiple x positions and check gradient trend
        let mut equator_temps = 0.0;
        let mut pole_temps = 0.0;
        let sample_count = 10;

        for x in (0..48).step_by(5) {
            equator_temps += temp_map[x][equator];
            pole_temps += temp_map[x][0] + temp_map[x][31];
        }

        let avg_equator = equator_temps / sample_count as f64;
        let avg_pole = pole_temps / (sample_count * 2) as f64;

        // Equator should be warmer than poles on average
        assert!(
            avg_equator > avg_pole,
            "Equator ({}) should be warmer than poles ({})",
            avg_equator,
            avg_pole
        );
    }

    #[test]
    fn test_temperature_range() {
        let config = MapConfig::duel();
        let generator = MapGenerator::new(config);
        let temp_map = generator.generate_temperature_map();

        for row in &temp_map {
            for &val in row {
                assert!(
                    val >= 0.0 && val <= 1.0,
                    "Temperature {} out of range",
                    val
                );
            }
        }
    }

    // ============ Moisture Map Tests ============

    #[test]
    fn test_moisture_map_dimensions() {
        let config = MapConfig::duel();
        let generator = MapGenerator::new(config);
        let moisture_map = generator.generate_moisture_map();

        assert_eq!(moisture_map.len(), 48);
        assert_eq!(moisture_map[0].len(), 32);
    }

    #[test]
    fn test_moisture_map_range() {
        let config = MapConfig::duel();
        let generator = MapGenerator::new(config);
        let moisture_map = generator.generate_moisture_map();

        for row in &moisture_map {
            for &val in row {
                assert!(
                    val >= 0.0 && val <= 1.0,
                    "Moisture {} out of normalized range",
                    val
                );
            }
        }
    }

    // ============ Terrain Determination Tests ============

    #[test]
    fn test_determine_terrain_ocean() {
        let config = MapConfig::default();
        let generator = MapGenerator::new(config);

        // Deep ocean (very low height)
        let terrain = generator.determine_terrain(0.1, 0.5, 0.5);
        assert_eq!(terrain, Terrain::Ocean);
    }

    #[test]
    fn test_determine_terrain_coast() {
        let config = MapConfig::default();
        let generator = MapGenerator::new(config);

        // Shallow water (between 0.6*threshold and threshold)
        let terrain = generator.determine_terrain(0.30, 0.5, 0.5);
        assert_eq!(terrain, Terrain::Coast);
    }

    #[test]
    fn test_determine_terrain_mountain() {
        let config = MapConfig::default();
        let generator = MapGenerator::new(config);

        // Very high elevation
        let terrain = generator.determine_terrain(0.85, 0.5, 0.5);
        assert_eq!(terrain, Terrain::Mountain);
    }

    #[test]
    fn test_determine_terrain_biomes() {
        let config = MapConfig::default();
        let generator = MapGenerator::new(config);

        // Test each biome at flat terrain height (0.4)
        let height = 0.4;

        // Snow (temp < 0.15)
        assert_eq!(generator.determine_terrain(height, 0.1, 0.5), Terrain::Snow);

        // Tundra (0.15 <= temp < 0.30)
        assert_eq!(generator.determine_terrain(height, 0.2, 0.5), Terrain::Tundra);

        // Grassland (0.30 <= temp < 0.50)
        assert_eq!(generator.determine_terrain(height, 0.4, 0.5), Terrain::Grassland);

        // Plains (0.50 <= temp < 0.80)
        assert_eq!(generator.determine_terrain(height, 0.65, 0.5), Terrain::Plains);

        // Desert (temp >= 0.80)
        assert_eq!(generator.determine_terrain(height, 0.9, 0.5), Terrain::Desert);
    }

    #[test]
    fn test_determine_terrain_hills() {
        let config = MapConfig::default();
        let generator = MapGenerator::new(config);

        // Test hills at hill height (0.6)
        let height = 0.6;

        // GrasslandHill (0.30 <= temp < 0.50)
        assert_eq!(generator.determine_terrain(height, 0.4, 0.5), Terrain::GrasslandHill);

        // PlainsHill (0.50 <= temp < 0.80)
        assert_eq!(generator.determine_terrain(height, 0.65, 0.5), Terrain::PlainsHill);
    }

    // ============ Feature Determination Tests ============

    #[test]
    fn test_determine_feature_no_water() {
        let config = MapConfig::default();
        let mut generator = MapGenerator::new(config);

        // Water tiles should never have features
        let feature = generator.determine_feature(Terrain::Ocean, 0.5, 0.9);
        assert_eq!(feature, None);

        let feature = generator.determine_feature(Terrain::Coast, 0.5, 0.9);
        assert_eq!(feature, None);
    }

    #[test]
    fn test_determine_feature_no_mountain() {
        let config = MapConfig::default();
        let mut generator = MapGenerator::new(config);

        // Mountains should never have features
        let feature = generator.determine_feature(Terrain::Mountain, 0.5, 0.9);
        assert_eq!(feature, None);
    }

    #[test]
    fn test_determine_feature_no_snow() {
        let config = MapConfig::default();
        let mut generator = MapGenerator::new(config);

        // Snow tiles should not have features
        let feature = generator.determine_feature(Terrain::Snow, 0.1, 0.9);
        assert_eq!(feature, None);

        let feature = generator.determine_feature(Terrain::SnowHill, 0.1, 0.9);
        assert_eq!(feature, None);
    }

    #[test]
    fn test_determine_feature_respects_terrain() {
        // Run many iterations to check feature placement rules
        let config = MapConfig::default().with_seed(12345);
        let mut generator = MapGenerator::new(config);

        // Test forest conditions (temp < 0.6, moisture > 0.5)
        // Should only place on valid terrains
        for _ in 0..100 {
            if let Some(feature) = generator.determine_feature(Terrain::Grassland, 0.4, 0.7) {
                assert!(
                    feature.can_place_on(Terrain::Grassland),
                    "{:?} cannot be placed on Grassland",
                    feature
                );
            }
        }
    }

    // ============ Determinism Tests ============

    #[test]
    fn test_same_seed_produces_same_height_map() {
        let config = MapConfig::duel().with_seed(12345);

        let gen1 = MapGenerator::new(config.clone());
        let gen2 = MapGenerator::new(config);

        let map1 = gen1.generate_height_map();
        let map2 = gen2.generate_height_map();

        assert_eq!(map1, map2);
    }

    #[test]
    fn test_different_seeds_produce_different_maps() {
        let gen1 = MapGenerator::new(MapConfig::duel().with_seed(12345));
        let gen2 = MapGenerator::new(MapConfig::duel().with_seed(67890));

        let map1 = gen1.generate_height_map();
        let map2 = gen2.generate_height_map();

        // Maps should be different
        let mut same = true;
        'outer: for x in 0..48 {
            for y in 0..32 {
                if (map1[x][y] - map2[x][y]).abs() > f64::EPSILON {
                    same = false;
                    break 'outer;
                }
            }
        }

        assert!(!same, "Different seeds should produce different maps");
    }
}
