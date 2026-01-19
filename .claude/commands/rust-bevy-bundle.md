Create a Bevy ECS bundle following Rust best practices.

## Context

Bevy bundles are collections of components that are commonly spawned together on an entity. In Bevy 0.12+, bundles use the `#[derive(Bundle)]` macro. Well-designed bundles group logically related components that define a complete "thing" in your game world - like a unit, building, or UI element.

## Pattern

```rust
use bevy::prelude::*;

// Standard bundle grouping related components
#[derive(Bundle)]
pub struct EntityBundle {
    pub position: Position,
    pub sprite: SpriteBundle,
    pub marker: MarkerComponent,
}

// Bundle with default implementation
#[derive(Bundle, Default)]
pub struct DefaultableBundle {
    pub transform: Transform,
    pub visibility: Visibility,
}

// Bundle with constructor
#[derive(Bundle)]
pub struct UnitBundle {
    pub unit: Unit,
    pub health: Health,
    pub position: Position,
}

impl UnitBundle {
    pub fn new(position: Position, health: i32) -> Self {
        Self {
            unit: Unit,
            health: Health { current: health, max: health },
            position,
        }
    }
}
```

### Common Derive Combinations

| Use Case | Derives |
|----------|---------|
| Basic bundle | `Bundle` |
| With defaults | `Bundle, Default` |
| Cloneable | `Bundle, Clone` |

### Nested Bundles

```rust
// Bundles can contain other bundles
#[derive(Bundle)]
pub struct PlayerBundle {
    pub unit: UnitBundle,          // Nested bundle
    pub player: Player,            // Marker
    pub input: PlayerInput,
}

// Bevy's built-in bundles can be included
#[derive(Bundle)]
pub struct GameEntityBundle {
    pub sprite: SpriteBundle,      // Bevy's sprite bundle
    pub game_data: GameData,
}
```

### Builder Pattern for Complex Bundles

```rust
#[derive(Bundle)]
pub struct UnitBundle {
    pub unit: Unit,
    pub health: Health,
    pub movement: Movement,
    pub transform: Transform,
    pub visibility: Visibility,
}

impl UnitBundle {
    pub fn builder() -> UnitBundleBuilder {
        UnitBundleBuilder::default()
    }
}

#[derive(Default)]
pub struct UnitBundleBuilder {
    health: Option<i32>,
    movement: Option<u32>,
    position: Option<Vec3>,
}

impl UnitBundleBuilder {
    pub fn health(mut self, health: i32) -> Self {
        self.health = Some(health);
        self
    }

    pub fn movement(mut self, points: u32) -> Self {
        self.movement = Some(points);
        self
    }

    pub fn position(mut self, pos: Vec3) -> Self {
        self.position = Some(pos);
        self
    }

    pub fn build(self) -> UnitBundle {
        UnitBundle {
            unit: Unit,
            health: Health {
                current: self.health.unwrap_or(100),
                max: self.health.unwrap_or(100),
            },
            movement: Movement {
                points: self.movement.unwrap_or(2),
                max_points: self.movement.unwrap_or(2),
            },
            transform: Transform::from_translation(self.position.unwrap_or_default()),
            visibility: Visibility::default(),
        }
    }
}
```

### Spawning Bundles

```rust
// Basic spawn
commands.spawn(UnitBundle::new(position, 100));

// Spawn with additional components
commands.spawn((
    UnitBundle::new(position, 100),
    Player,
    Name::new("Hero"),
));

// Spawn with builder
commands.spawn(
    UnitBundle::builder()
        .health(150)
        .movement(3)
        .position(Vec3::new(10.0, 0.0, 5.0))
        .build()
);
```

## Anti-Patterns to Avoid

### DON'T: Put all entity data in one massive bundle
```rust
// BAD: Kitchen sink bundle
#[derive(Bundle)]
pub struct UnitBundle {
    pub unit: Unit,
    pub health: Health,
    pub movement: Movement,
    pub combat: Combat,
    pub ai: AIBehavior,
    pub animation: Animation,
    pub audio: AudioSource,
    pub physics: RigidBody,
    pub inventory: Inventory,
    pub skills: Skills,
    pub buffs: Buffs,
    pub quests: QuestLog,
    // ... 20 more components
}
```

### DO: Create focused bundles that can be composed
```rust
// GOOD: Composable bundles
#[derive(Bundle)]
pub struct UnitCoreBundle {
    pub unit: Unit,
    pub health: Health,
    pub transform: Transform,
}

#[derive(Bundle)]
pub struct CombatBundle {
    pub combat: Combat,
    pub attack_timer: AttackTimer,
}

#[derive(Bundle)]
pub struct AIBundle {
    pub behavior: AIBehavior,
    pub navigation: NavAgent,
}

// Compose when spawning
commands.spawn((
    UnitCoreBundle::new(position),
    CombatBundle::default(),
    AIBundle::new(BehaviorType::Aggressive),
));
```

### DON'T: Duplicate components across bundles without clear hierarchy
```rust
// BAD: Transform duplicated in both
#[derive(Bundle)]
pub struct PlayerBundle {
    transform: Transform,
    player: Player,
}

#[derive(Bundle)]
pub struct EnemyBundle {
    transform: Transform,  // Duplicated
    enemy: Enemy,
}
```

### DO: Extract common components to a base bundle
```rust
// GOOD: Shared base bundle
#[derive(Bundle, Default)]
pub struct SpatialBundle {
    pub transform: Transform,
    pub global_transform: GlobalTransform,
    pub visibility: Visibility,
    pub inherited_visibility: InheritedVisibility,
    pub view_visibility: ViewVisibility,
}

#[derive(Bundle)]
pub struct PlayerBundle {
    pub spatial: SpatialBundle,
    pub player: Player,
}

#[derive(Bundle)]
pub struct EnemyBundle {
    pub spatial: SpatialBundle,
    pub enemy: Enemy,
}
```

### DON'T: Use bundles for optional component groups
```rust
// BAD: Bundle for optional features
#[derive(Bundle)]
pub struct OptionalEffectsBundle {
    pub glow: Option<Glow>,      // Won't compile - Option not a Component
    pub particle: ParticleEmitter,
}
```

### DO: Add optional components separately after spawn
```rust
// GOOD: Add optional components individually
let entity = commands.spawn(UnitBundle::new(position)).id();

if has_glow_effect {
    commands.entity(entity).insert(Glow::default());
}

if has_particles {
    commands.entity(entity).insert(ParticleEmitter::new());
}
```

### DON'T: Create bundles for single components
```rust
// BAD: Pointless bundle
#[derive(Bundle)]
pub struct HealthBundle {
    pub health: Health,  // Just use Health directly
}
```

### DO: Use bundles only when grouping 2+ related components
```rust
// GOOD: Meaningful grouping
#[derive(Bundle, Default)]
pub struct HealthBundle {
    pub health: Health,
    pub health_bar: HealthBar,     // UI representation
    pub damage_flash: DamageFlash, // Visual feedback
}
```

## Required Components (Bevy 0.15+)

For Bevy 0.15+, consider using required components instead of bundles for dependencies:

```rust
// Bevy 0.15+ alternative: required components
#[derive(Component)]
#[require(Transform, Visibility)]
pub struct Sprite {
    pub image: Handle<Image>,
}

// Spawning automatically includes Transform and Visibility
commands.spawn(Sprite { image });
```

Use bundles when:
- Grouping components with specific initialization values
- Creating convenience constructors with parameters
- Composing multiple bundles together

Use required components when:
- A component always needs other components to function
- You want automatic insertion of dependencies

## Example

Creating bundles for a 4X game:

```rust
use bevy::prelude::*;

/// Core spatial components shared by all game entities
#[derive(Bundle, Default, Clone)]
pub struct SpatialBundle {
    pub transform: Transform,
    pub global_transform: GlobalTransform,
    pub visibility: Visibility,
    pub inherited_visibility: InheritedVisibility,
    pub view_visibility: ViewVisibility,
}

/// Bundle for city entities
#[derive(Bundle)]
pub struct CityBundle {
    pub city: City,
    pub name: CityName,
    pub position: HexPosition,
    pub population: Population,
    pub production: Production,
    pub owner: Owner,
    pub spatial: SpatialBundle,
}

impl CityBundle {
    pub fn new(name: impl Into<String>, position: HexPosition, owner: Entity) -> Self {
        Self {
            city: City,
            name: CityName(name.into()),
            position,
            population: Population::default(),
            production: Production::default(),
            owner: Owner(owner),
            spatial: SpatialBundle::default(),
        }
    }

    pub fn with_population(mut self, count: u32) -> Self {
        self.population.count = count;
        self
    }
}

/// Bundle for unit entities
#[derive(Bundle)]
pub struct UnitBundle {
    pub unit: Unit,
    pub unit_type: UnitType,
    pub health: Health,
    pub movement: Movement,
    pub position: HexPosition,
    pub owner: Owner,
    pub spatial: SpatialBundle,
}

impl UnitBundle {
    pub fn new(unit_type: UnitType, position: HexPosition, owner: Entity) -> Self {
        let stats = unit_type.base_stats();
        Self {
            unit: Unit,
            unit_type,
            health: Health { current: stats.health, max: stats.health },
            movement: Movement { points: stats.movement, max_points: stats.movement },
            position,
            owner: Owner(owner),
            spatial: SpatialBundle::default(),
        }
    }
}

/// Bundle for tile entities
#[derive(Bundle)]
pub struct TileBundle {
    pub tile: Tile,
    pub terrain: Terrain,
    pub position: HexPosition,
    pub yields: TileYields,
    pub spatial: SpatialBundle,
}

impl TileBundle {
    pub fn new(terrain: Terrain, position: HexPosition) -> Self {
        Self {
            tile: Tile,
            terrain,
            position,
            yields: terrain.base_yields(),
            spatial: SpatialBundle::default(),
        }
    }
}

// Usage in systems
fn spawn_starting_units(
    mut commands: Commands,
    players: Query<(Entity, &StartPosition), Added<Player>>,
) {
    for (player_entity, start_pos) in &players {
        // Spawn settler
        commands.spawn(
            UnitBundle::new(UnitType::Settler, start_pos.0, player_entity)
        );

        // Spawn warrior
        commands.spawn(
            UnitBundle::new(UnitType::Warrior, start_pos.0, player_entity)
        );
    }
}

fn found_city(
    mut commands: Commands,
    mut events: EventReader<FoundCityEvent>,
    units: Query<(&HexPosition, &Owner), With<Settler>>,
) {
    for event in events.read() {
        if let Ok((position, owner)) = units.get(event.settler) {
            commands.spawn(
                CityBundle::new(event.name.clone(), *position, owner.0)
                    .with_population(1)
            );
            commands.entity(event.settler).despawn();
        }
    }
}
```

## Input

$ARGUMENTS

## Output

Generate the requested Bevy bundle(s) following the patterns above.

Include:
- `#[derive(Bundle)]` with appropriate additional derives
- `use bevy::prelude::*;` import
- `pub` visibility for struct and fields
- Doc comment explaining the bundle's purpose
- Constructor method(s) for common creation patterns
- Nested Bevy bundles (like SpatialBundle) where appropriate

If the bundle requires complex initialization, also provide:
- A builder pattern implementation
- Example usage showing how to spawn the bundle

For related bundles, show:
- How they compose together
- Common spawning patterns
