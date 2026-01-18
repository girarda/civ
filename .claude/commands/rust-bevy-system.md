Create a Bevy ECS system following Rust best practices.

## Context

Bevy systems are functions that operate on the game world. They take system parameters (Query, Res, Commands, etc.) and perform one logical operation. Well-designed systems follow single responsibility principle - each system does one thing well.

## Pattern

```rust
use bevy::prelude::*;

// Basic query system
fn system_name(query: Query<&Component>) {
    for component in &query {
        // process each entity
    }
}

// Mutable query system
fn update_system(mut query: Query<&mut Component>) {
    for mut component in &mut query {
        component.field = new_value;
    }
}

// Resource access system
fn resource_system(resource: Res<MyResource>, mut query: Query<&mut Component>) {
    for mut component in &mut query {
        component.value = resource.data;
    }
}

// Commands system (spawn/despawn)
fn spawn_system(mut commands: Commands) {
    commands.spawn(ComponentBundle { ... });
}

// Event-driven system
fn event_system(mut events: EventReader<MyEvent>, mut query: Query<&mut Component>) {
    for event in events.read() {
        if let Ok(mut component) = query.get_mut(event.entity) {
            // handle event
        }
    }
}
```

### Common System Parameter Types

| Parameter | Use Case | Mutable Version |
|-----------|----------|-----------------|
| `Query<&T>` | Read component data | `Query<&mut T>` |
| `Res<T>` | Read resource | `ResMut<T>` |
| `Commands` | Spawn/despawn entities | Always mutable |
| `EventReader<E>` | Consume events | N/A |
| `EventWriter<E>` | Send events | N/A |
| `Local<T>` | Per-system state | Always mutable |
| `Time` | Delta time, elapsed | Via `Res<Time>` |

### Query Filters

```rust
// With/Without filters
fn filtered_system(query: Query<&Component, With<Marker>>) { }
fn excluded_system(query: Query<&Component, Without<Disabled>>) { }

// Multiple filters
fn complex_filter(query: Query<&A, (With<B>, Without<C>)>) { }

// Changed detection
fn change_detection(query: Query<&Component, Changed<Component>>) { }

// Added detection
fn added_system(query: Query<Entity, Added<NewComponent>>) { }
```

### System Ordering

```rust
// Add to app with ordering
app.add_systems(Update, (
    input_system,
    movement_system.after(input_system),
    collision_system.after(movement_system),
));

// System sets for grouping
app.add_systems(Update, (
    system_a,
    system_b,
).in_set(MySystemSet));
```

## Anti-Patterns to Avoid

### DON'T: Monolithic systems doing many things
```rust
// BAD: Multiple responsibilities
fn update_unit(
    mut query: Query<(&mut Position, &mut Health, &mut Movement, &Combat)>,
    input: Res<Input>,
    time: Res<Time>,
) {
    for (mut pos, mut health, mut movement, combat) in &mut query {
        // Handle input
        // Update position
        // Process health regen
        // Calculate combat
        // ... too many things!
    }
}
```

### DO: Split into focused systems
```rust
// GOOD: Single responsibility
fn handle_movement_input(
    input: Res<ButtonInput<KeyCode>>,
    mut query: Query<&mut Velocity, With<Player>>,
) {
    for mut velocity in &mut query {
        // Only handle input -> velocity
    }
}

fn apply_movement(
    time: Res<Time>,
    mut query: Query<(&Velocity, &mut Transform)>,
) {
    for (velocity, mut transform) in &mut query {
        // Only apply velocity to position
    }
}

fn regenerate_health(
    time: Res<Time>,
    mut query: Query<&mut Health, With<HealthRegen>>,
) {
    for mut health in &mut query {
        // Only handle health regen
    }
}
```

### DON'T: Query everything when you need specific data
```rust
// BAD: Querying full entity when only one field needed
fn check_deaths(query: Query<(Entity, &Health, &Transform, &Sprite, &Name)>) {
    for (entity, health, _, _, _) in &query {
        if health.current <= 0 {
            // Only needed Entity and Health
        }
    }
}
```

### DO: Query only what you need
```rust
// GOOD: Minimal query
fn check_deaths(query: Query<(Entity, &Health)>) {
    for (entity, health) in &query {
        if health.current <= 0 {
            // Process death
        }
    }
}
```

### DON'T: Use get() in loops when iteration works
```rust
// BAD: Unnecessary get() calls
fn update_all(query: Query<Entity>, components: Query<&mut Component>) {
    for entity in &query {
        if let Ok(mut comp) = components.get_mut(entity) {
            // Should just iterate directly
        }
    }
}
```

### DO: Iterate directly when processing all matching entities
```rust
// GOOD: Direct iteration
fn update_all(mut query: Query<&mut Component>) {
    for mut component in &mut query {
        // Process directly
    }
}

// Use get() only for targeted access
fn targeted_update(
    events: EventReader<TargetEvent>,
    mut query: Query<&mut Component>,
) {
    for event in events.read() {
        if let Ok(mut component) = query.get_mut(event.target) {
            // Targeted access via get() is correct here
        }
    }
}
```

### DON'T: Panic on missing optional data
```rust
// BAD: May panic
fn dangerous_system(query: Query<(&Required, &Optional)>) {
    for (required, optional) in &query {
        // Entities without Optional won't be in results
        // If you expect Optional to sometimes be missing, this is wrong
    }
}
```

### DO: Use Option for truly optional components
```rust
// GOOD: Handle optional components
fn safe_system(query: Query<(&Required, Option<&MaybePresent>)>) {
    for (required, maybe) in &query {
        if let Some(present) = maybe {
            // Handle case where component exists
        }
        // Always processes entities with Required
    }
}
```

## System Signatures Reference

```rust
// Read-only observation
fn observe(query: Query<&Component>) { }

// Mutation
fn mutate(mut query: Query<&mut Component>) { }

// Multiple components
fn multi_read(query: Query<(&A, &B, &C)>) { }
fn multi_mut(mut query: Query<(&A, &mut B, &mut C)>) { }

// With commands for spawning/despawning
fn spawn(mut commands: Commands, assets: Res<AssetServer>) { }

// Events
fn send_events(mut writer: EventWriter<MyEvent>) { }
fn receive_events(mut reader: EventReader<MyEvent>) { }

// Resources with queries
fn combined(
    time: Res<Time>,
    config: Res<GameConfig>,
    mut query: Query<&mut Transform>,
) { }

// Run conditions
fn run_condition(state: Res<GameState>) -> bool {
    state.is_playing
}
```

## Example

Creating systems for a 4X game city production:

```rust
use bevy::prelude::*;

/// Adds per-turn production progress to cities
fn accumulate_production(
    mut query: Query<(&ProductionRate, &mut ProductionProgress), With<City>>,
) {
    for (rate, mut progress) in &mut query {
        progress.points += rate.per_turn;
    }
}

/// Completes production when threshold reached
fn complete_production(
    mut commands: Commands,
    mut query: Query<(Entity, &CurrentProduction, &mut ProductionProgress), With<City>>,
    costs: Res<ProductionCosts>,
) {
    for (city_entity, current, mut progress) in &mut query {
        let cost = costs.get(current.item);
        if progress.points >= cost {
            progress.points -= cost;
            commands.trigger_targets(ProductionComplete { item: current.item }, city_entity);
        }
    }
}

/// Handles production completion events
fn on_production_complete(
    trigger: Trigger<ProductionComplete>,
    mut commands: Commands,
    cities: Query<&Transform, With<City>>,
) {
    let city_entity = trigger.entity();
    if let Ok(city_transform) = cities.get(city_entity) {
        match trigger.event().item {
            ProductionItem::Unit(unit_type) => {
                commands.spawn(UnitBundle::new(unit_type, city_transform.translation));
            }
            ProductionItem::Building(building_type) => {
                commands.entity(city_entity).insert(building_type.component());
            }
        }
    }
}

/// System registration
pub fn register_production_systems(app: &mut App) {
    app.add_systems(Update, (
        accumulate_production,
        complete_production.after(accumulate_production),
    ));
    app.observe(on_production_complete);
}
```

## Input

$ARGUMENTS

## Output

Generate the requested Bevy system(s) following the patterns above.

Include:
- Correct system parameter types and mutability
- `use bevy::prelude::*;` import
- Single responsibility - one logical operation per system
- Query filters if needed (With, Without, Changed, Added)
- Doc comment explaining what the system does
- Appropriate naming (verb_noun pattern: `update_health`, `spawn_enemies`)

For system sets or ordering, also include:
- Registration code showing how to add the system(s) to the app
- Ordering constraints if systems depend on each other
