//! Tile bundle and marker component for OpenCiv.
//!
//! Provides the Tile marker component and TileBundle for spawning tile entities.

use bevy::prelude::*;

use crate::hex::TilePosition;

use super::feature::TileFeature;
use super::resource::TileResource;
use super::river::RiverEdges;
use super::terrain::Terrain;
use super::yields::TileYields;

/// Marker component for tile entities.
///
/// Used to identify entities that represent map tiles.
/// Query for this component to find all tile entities.
///
/// # Example
///
/// ```rust,ignore
/// fn count_tiles(tiles: Query<&Tile>) {
///     println!("Map has {} tiles", tiles.iter().count());
/// }
/// ```
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Debug, Default)]
pub struct Tile;

/// Bundle of components for spawning a tile entity.
///
/// Contains all the core components needed to represent a map tile.
/// Use the builder methods to add optional components.
///
/// # Example
///
/// ```rust,ignore
/// use openciv::tile::{TileBundle, Terrain, TileFeature};
/// use openciv::hex::TilePosition;
///
/// fn spawn_tile(mut commands: Commands) {
///     commands.spawn(
///         TileBundle::new(TilePosition::new(0, 0), Terrain::Grassland)
///             .with_feature(TileFeature::Forest)
///     );
/// }
/// ```
#[derive(Bundle, Clone, Debug)]
pub struct TileBundle {
    /// Marker component identifying this as a tile entity.
    pub tile: Tile,
    /// Hex grid position of this tile.
    pub position: TilePosition,
    /// Terrain type determining base yields and properties.
    pub terrain: Terrain,
    /// Calculated yields from terrain, feature, and resource.
    pub yields: TileYields,
    /// River edges on this tile.
    pub rivers: RiverEdges,
}

impl TileBundle {
    /// Create a new TileBundle with the given position and terrain.
    ///
    /// Yields are calculated from the terrain alone.
    /// Use builder methods to add features and resources.
    pub fn new(position: TilePosition, terrain: Terrain) -> Self {
        let yields = TileYields::calculate(terrain, None, None, false);

        Self {
            tile: Tile,
            position,
            terrain,
            yields,
            rivers: RiverEdges::NONE,
        }
    }

    /// Add a feature to this tile and recalculate yields.
    ///
    /// Note: This returns a tuple of (TileBundle, TileFeature) since
    /// TileFeature is a separate component that should be spawned alongside.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let (bundle, feature) = TileBundle::new(pos, Terrain::Grassland)
    ///     .with_feature(TileFeature::Forest);
    /// commands.spawn((bundle, feature));
    /// ```
    pub fn with_feature(mut self, feature: TileFeature) -> (Self, TileFeature) {
        // Recalculate yields with the feature
        self.yields = TileYields::calculate(self.terrain, Some(feature), None, self.rivers.has_river());
        (self, feature)
    }

    /// Add a resource to this tile and recalculate yields.
    ///
    /// Note: This returns a tuple of (TileBundle, TileResource) since
    /// TileResource is a separate component that should be spawned alongside.
    ///
    /// # Example
    ///
    /// ```rust,ignore
    /// let (bundle, resource) = TileBundle::new(pos, Terrain::Grassland)
    ///     .with_resource(TileResource::Cattle);
    /// commands.spawn((bundle, resource));
    /// ```
    pub fn with_resource(mut self, resource: TileResource) -> (Self, TileResource) {
        // Recalculate yields with the resource
        self.yields = TileYields::calculate(self.terrain, None, Some(resource), self.rivers.has_river());
        (self, resource)
    }

    /// Set the river edges for this tile.
    ///
    /// Rivers affect freshwater access and movement costs.
    pub fn with_rivers(mut self, rivers: RiverEdges) -> Self {
        self.rivers = rivers;
        // Note: We don't recalculate yields here since river bonuses
        // are typically applied at the city level, not stored in TileYields.
        self
    }
}

/// Builder for creating tile entities with full customization.
///
/// Provides a fluent API for creating tiles with all optional components.
///
/// # Example
///
/// ```rust,ignore
/// use openciv::tile::{TileBuilder, Terrain, TileFeature, TileResource, RiverEdges};
/// use openciv::hex::TilePosition;
///
/// fn spawn_rich_tile(mut commands: Commands) {
///     let components = TileBuilder::new(TilePosition::new(0, 0), Terrain::Grassland)
///         .feature(TileFeature::Forest)
///         .resource(TileResource::Deer)
///         .rivers(RiverEdges::from_edges(&[RiverEdges::EDGE_NE]))
///         .build();
///
///     commands.spawn(components);
/// }
/// ```
pub struct TileBuilder {
    position: TilePosition,
    terrain: Terrain,
    feature: Option<TileFeature>,
    resource: Option<TileResource>,
    rivers: RiverEdges,
}

impl TileBuilder {
    /// Create a new TileBuilder with the given position and terrain.
    pub fn new(position: TilePosition, terrain: Terrain) -> Self {
        Self {
            position,
            terrain,
            feature: None,
            resource: None,
            rivers: RiverEdges::NONE,
        }
    }

    /// Set the feature for this tile.
    pub fn feature(mut self, feature: TileFeature) -> Self {
        self.feature = Some(feature);
        self
    }

    /// Set the resource for this tile.
    pub fn resource(mut self, resource: TileResource) -> Self {
        self.resource = Some(resource);
        self
    }

    /// Set the river edges for this tile.
    pub fn rivers(mut self, rivers: RiverEdges) -> Self {
        self.rivers = rivers;
        self
    }

    /// Build the tile bundle with calculated yields.
    ///
    /// Returns a tuple of the bundle and optional feature/resource components.
    pub fn build(self) -> TileComponents {
        let yields = TileYields::calculate(
            self.terrain,
            self.feature,
            self.resource,
            self.rivers.has_river(),
        );

        TileComponents {
            bundle: TileBundle {
                tile: Tile,
                position: self.position,
                terrain: self.terrain,
                yields,
                rivers: self.rivers,
            },
            feature: self.feature,
            resource: self.resource,
        }
    }
}

/// Components produced by TileBuilder::build().
///
/// This struct holds all the components for a tile entity,
/// including optional feature and resource.
#[derive(Clone, Debug)]
pub struct TileComponents {
    /// The core tile bundle.
    pub bundle: TileBundle,
    /// Optional feature component.
    pub feature: Option<TileFeature>,
    /// Optional resource component.
    pub resource: Option<TileResource>,
}

impl TileComponents {
    /// Spawn this tile as an entity.
    ///
    /// Returns the entity ID for the spawned tile.
    pub fn spawn(self, commands: &mut Commands) -> Entity {
        let mut entity = commands.spawn(self.bundle);

        if let Some(feature) = self.feature {
            entity.insert(feature);
        }

        if let Some(resource) = self.resource {
            entity.insert(resource);
        }

        entity.id()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ TileBundle Tests ============

    #[test]
    fn test_new_bundle() {
        let pos = TilePosition::new(3, -2);
        let bundle = TileBundle::new(pos, Terrain::Grassland);

        assert_eq!(bundle.tile, Tile);
        assert_eq!(bundle.position, pos);
        assert_eq!(bundle.terrain, Terrain::Grassland);
        assert_eq!(bundle.yields.food, 2);
        assert_eq!(bundle.yields.production, 0);
        assert_eq!(bundle.rivers, RiverEdges::NONE);
    }

    #[test]
    fn test_with_feature() {
        let pos = TilePosition::new(0, 0);
        let (bundle, feature) = TileBundle::new(pos, Terrain::Grassland)
            .with_feature(TileFeature::Forest);

        assert_eq!(bundle.terrain, Terrain::Grassland);
        assert_eq!(feature, TileFeature::Forest);
        // Grassland (2F) + Forest (+1P) = 2F, 1P
        assert_eq!(bundle.yields.food, 2);
        assert_eq!(bundle.yields.production, 1);
    }

    #[test]
    fn test_with_resource() {
        let pos = TilePosition::new(0, 0);
        let (bundle, resource) = TileBundle::new(pos, Terrain::Coast)
            .with_resource(TileResource::Fish);

        assert_eq!(bundle.terrain, Terrain::Coast);
        assert_eq!(resource, TileResource::Fish);
        // Coast (1F) + Fish (+1F) = 2F
        assert_eq!(bundle.yields.food, 2);
    }

    #[test]
    fn test_with_rivers() {
        let pos = TilePosition::new(0, 0);
        let rivers = RiverEdges::from_edges(&[RiverEdges::EDGE_NE, RiverEdges::EDGE_E]);
        let bundle = TileBundle::new(pos, Terrain::Grassland)
            .with_rivers(rivers);

        assert!(bundle.rivers.has_river());
        assert_eq!(bundle.rivers.edge_count(), 2);
    }

    // ============ TileBuilder Tests ============

    #[test]
    fn test_builder_basic() {
        let pos = TilePosition::new(1, 1);
        let components = TileBuilder::new(pos, Terrain::Plains).build();

        assert_eq!(components.bundle.position, pos);
        assert_eq!(components.bundle.terrain, Terrain::Plains);
        assert_eq!(components.feature, None);
        assert_eq!(components.resource, None);
    }

    #[test]
    fn test_builder_with_feature() {
        let pos = TilePosition::new(1, 1);
        let components = TileBuilder::new(pos, Terrain::Grassland)
            .feature(TileFeature::Jungle)
            .build();

        assert_eq!(components.feature, Some(TileFeature::Jungle));
        // Grassland (2F) + Jungle (-1P clamped to 0) = 2F, 0P
        assert_eq!(components.bundle.yields.food, 2);
        assert_eq!(components.bundle.yields.production, 0);
    }

    #[test]
    fn test_builder_with_resource() {
        let pos = TilePosition::new(1, 1);
        let components = TileBuilder::new(pos, Terrain::PlainsHill)
            .resource(TileResource::Gems)
            .build();

        assert_eq!(components.resource, Some(TileResource::Gems));
        // Plains Hill (2P) + Gems (+3G) = 0F, 2P, 3G
        assert_eq!(components.bundle.yields.food, 0);
        assert_eq!(components.bundle.yields.production, 2);
        assert_eq!(components.bundle.yields.gold, 3);
    }

    #[test]
    fn test_builder_full() {
        let pos = TilePosition::new(2, -1);
        let rivers = RiverEdges::from_edges(&[RiverEdges::EDGE_SW]);

        let components = TileBuilder::new(pos, Terrain::Tundra)
            .feature(TileFeature::Forest)
            .resource(TileResource::Deer)
            .rivers(rivers)
            .build();

        assert_eq!(components.bundle.position, pos);
        assert_eq!(components.bundle.terrain, Terrain::Tundra);
        assert_eq!(components.feature, Some(TileFeature::Forest));
        assert_eq!(components.resource, Some(TileResource::Deer));
        assert!(components.bundle.rivers.has_edge(RiverEdges::EDGE_SW));

        // Tundra (1F) + Forest (+1P) + Deer (+1F) = 2F, 1P
        assert_eq!(components.bundle.yields.food, 2);
        assert_eq!(components.bundle.yields.production, 1);
        assert_eq!(components.bundle.yields.gold, 0);
    }

    // ============ Tile Marker Tests ============

    #[test]
    fn test_tile_marker_default() {
        let tile = Tile::default();
        assert_eq!(tile, Tile);
    }
}
