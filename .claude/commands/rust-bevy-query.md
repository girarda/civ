Create Bevy ECS queries following Rust best practices.

## Context

Bevy queries access entity data in systems. In Bevy 0.12+, `Query<T>` fetches components matching type parameters. Filters narrow results without fetching data. Optional components handle entities that may or may not have certain components.

## Pattern

```rust
use bevy::prelude::*;

// Basic read-only query
fn read_system(query: Query<&Position>) {
    for position in &query {
        // position is &Position
    }
}

// Mutable query
fn write_system(mut query: Query<&mut Health>) {
    for mut health in &mut query {
        health.current += 1;
    }
}

// Multiple components
fn multi_system(query: Query<(&Position, &Health, &mut Movement)>) {
    for (pos, health, mut movement) in &query {
        // Access multiple components together
    }
}

// Entity access
fn entity_system(query: Query<(Entity, &Position)>) {
    for (entity, pos) in &query {
        // entity: Entity, pos: &Position
    }
}
```

### Query Filters

Filters narrow which entities match without fetching component data:

```rust
// With filter - entity must have component
fn with_filter(query: Query<&Position, With<Player>>) {
    // Only entities with both Position AND Player component
    // Player data is not accessible, just used for filtering
}

// Without filter - entity must NOT have component
fn without_filter(query: Query<&Position, Without<Enemy>>) {
    // Entities with Position but NOT Enemy
}

// Multiple filters (AND logic)
fn multi_filter(query: Query<&Position, (With<Unit>, Without<Sleeping>)>) {
    // Entities with Position AND Unit, but NOT Sleeping
}

// Added filter - component added this frame
fn added_filter(query: Query<&Position, Added<Position>>) {
    // Only entities where Position was just added
}

// Changed filter - component modified this frame
fn changed_filter(query: Query<&Position, Changed<Position>>) {
    // Only entities where Position changed (includes Added)
}
```

| Filter | Description |
|--------|-------------|
| `With<T>` | Entity has component T (data not fetched) |
| `Without<T>` | Entity does NOT have component T |
| `Added<T>` | Component T was added this frame |
| `Changed<T>` | Component T was modified this frame |
| `Or<(F1, F2)>` | Either filter F1 OR F2 matches |

### Optional Components

Use `Option<&T>` for components that may not exist:

```rust
// Optional component - Some if present, None if absent
fn optional_system(query: Query<(&Position, Option<&Velocity>)>) {
    for (pos, maybe_velocity) in &query {
        if let Some(vel) = maybe_velocity {
            // Entity has velocity
        } else {
            // Entity has no velocity component
        }
    }
}

// Mix required, optional, and filters
fn mixed_system(
    query: Query<
        (&Position, &mut Health, Option<&Shield>),
        (With<Unit>, Without<Dead>)
    >
) {
    for (pos, mut health, maybe_shield) in &query {
        let defense = maybe_shield.map(|s| s.value).unwrap_or(0);
        // ...
    }
}
```

### Query Methods

```rust
fn query_methods(
    query: Query<(&Position, &Health)>,
    target: Entity,
) {
    // Iterate all matching entities
    for (pos, health) in &query {
        // ...
    }

    // Get specific entity (returns Result)
    if let Ok((pos, health)) = query.get(target) {
        // Found the entity
    }

    // Get specific entity (panics if not found)
    let (pos, health) = query.get(target).unwrap();

    // Check if entity matches query
    let matches = query.contains(target);

    // Get single entity (panics if 0 or 2+ matches)
    let (pos, health) = query.single();

    // Get single entity (returns Result)
    if let Ok((pos, health)) = query.get_single() {
        // Exactly one matching entity
    }

    // Check if query is empty
    if query.is_empty() {
        // No matching entities
    }
}
```

### Multiple Queries in One System

```rust
// Disjoint queries - different component sets
fn disjoint_queries(
    players: Query<&Position, With<Player>>,
    enemies: Query<&Position, With<Enemy>>,
) {
    // OK: Player and Enemy are mutually exclusive markers
}

// ParamSet for overlapping mutable access
fn overlapping_queries(
    mut set: ParamSet<(
        Query<&mut Position, With<Player>>,
        Query<&mut Position, With<Enemy>>,
    )>
) {
    // Access one at a time
    for mut pos in &mut set.p0() {
        pos.x += 1;
    }
    // Then the other
    for mut pos in &mut set.p1() {
        pos.x -= 1;
    }
}
```

### Required Imports

```rust
use bevy::prelude::*;
// For ParamSet with overlapping queries
use bevy::ecs::system::ParamSet;
```

## Anti-Patterns to Avoid

### DON'T: Query for components you don't need
```rust
// BAD: Fetches Health but never uses it
fn wasteful(query: Query<(&Position, &Health, &Movement)>) {
    for (pos, _health, movement) in &query {
        // Only uses pos and movement
    }
}
```

### DO: Use filters for existence checks
```rust
// GOOD: With filter for existence, only fetch what you use
fn efficient(query: Query<(&Position, &Movement), With<Health>>) {
    for (pos, movement) in &query {
        // Entity has Health, but we don't need to read it
    }
}
```

### DON'T: Nested iteration with same query
```rust
// BAD: Borrow checker issues, O(n²) performance
fn nested_bad(query: Query<(Entity, &Position)>) {
    for (entity_a, pos_a) in &query {
        for (entity_b, pos_b) in &query {  // ERROR: already borrowed
            // ...
        }
    }
}
```

### DO: Use iter_combinations or separate queries
```rust
// GOOD: Built-in combination iterator
fn combinations(query: Query<(Entity, &Position)>) {
    for [(entity_a, pos_a), (entity_b, pos_b)] in query.iter_combinations() {
        // Unique pairs, no self-comparison
    }
}

// GOOD: Two separate queries with disjoint filters
fn separate_queries(
    units: Query<(Entity, &Position), With<Unit>>,
    targets: Query<(Entity, &Position), With<Target>>,
) {
    for (unit_entity, unit_pos) in &units {
        for (target_entity, target_pos) in &targets {
            // Compare units to targets
        }
    }
}
```

### DON'T: Forget Changed includes Added
```rust
// BAD: Redundant - Changed already includes newly Added
fn redundant(query: Query<&Position, Or<(Added<Position>, Changed<Position>)>>) {
    // Added is subset of Changed
}
```

### DO: Use just Changed
```rust
// GOOD: Changed covers both modifications and additions
fn correct(query: Query<&Position, Changed<Position>>) {
    // Triggers for new AND modified Position
}
```

## Example

Damage system with shields and armor for a 4X game:

```rust
use bevy::prelude::*;

/// Apply damage considering optional shields and armor
fn apply_damage_system(
    mut query: Query<
        (Entity, &mut Health, Option<&Shield>, Option<&Armor>),
        (With<Unit>, Without<Invulnerable>)
    >,
    mut damage_events: EventReader<DamageEvent>,
) {
    for event in damage_events.read() {
        if let Ok((entity, mut health, shield, armor)) = query.get_mut(event.target) {
            let mut damage = event.amount;

            // Shield absorbs damage first
            if let Some(shield) = shield {
                damage = damage.saturating_sub(shield.absorption);
            }

            // Armor reduces remaining damage
            if let Some(armor) = armor {
                damage = (damage as f32 * (1.0 - armor.reduction)).round() as i32;
            }

            health.current = health.current.saturating_sub(damage);
        }
    }
}

/// Highlight changed positions for UI update
fn position_changed_system(
    query: Query<(Entity, &Position), Changed<Position>>,
    mut highlight_events: EventWriter<HighlightEvent>,
) {
    for (entity, pos) in &query {
        highlight_events.send(HighlightEvent { entity, position: *pos });
    }
}

/// Find nearest enemy for auto-targeting
fn find_target_system(
    units: Query<(Entity, &Position, &mut Target), (With<Unit>, With<AutoTarget>)>,
    enemies: Query<(Entity, &Position), (With<Enemy>, Without<Dead>)>,
) {
    for (unit_entity, unit_pos, mut target) in &units {
        let mut closest: Option<(Entity, i32)> = None;

        for (enemy_entity, enemy_pos) in &enemies {
            let distance = (unit_pos.x - enemy_pos.x).abs()
                         + (unit_pos.y - enemy_pos.y).abs();

            if closest.map(|(_, d)| distance < d).unwrap_or(true) {
                closest = Some((enemy_entity, distance));
            }
        }

        target.0 = closest.map(|(e, _)| e);
    }
}
```

## Input

$ARGUMENTS

## Output

Generate the requested Bevy query/system following the patterns above.

Include:
- Appropriate query parameter with `&` or `&mut` access
- Filters using `With<T>`, `Without<T>` where applicable
- `Option<&T>` for optional components
- `use bevy::prelude::*;` import
- Doc comment explaining what the query/system does
- Error handling with `if let Ok(...)` for entity lookups
