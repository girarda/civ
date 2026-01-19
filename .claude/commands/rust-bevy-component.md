Create a Bevy ECS component following Rust best practices.

## Context

Bevy components are data containers attached to entities. In Bevy 0.12+, components use the `#[derive(Component)]` macro. Well-designed components follow single responsibility principle - each component holds one logical piece of data.

## Pattern

```rust
use bevy::prelude::*;

// Standard component with common derives
#[derive(Component, Default, Clone, Debug)]
pub struct ComponentName {
    pub field1: Type1,
    pub field2: Type2,
}

// Marker component (tag with no data)
#[derive(Component)]
pub struct MarkerName;

// Serializable component for save/load
#[derive(Component, Default, Clone, Debug, Serialize, Deserialize)]
pub struct SaveableComponent {
    pub data: DataType,
}
```

### Common Derive Combinations

| Use Case | Derives |
|----------|---------|
| Basic component | `Component, Default, Clone, Debug` |
| Marker/tag | `Component` |
| Saveable | `Component, Default, Clone, Debug, Serialize, Deserialize` |
| Copyable (small data) | `Component, Default, Clone, Copy, Debug` |
| With equality | `Component, Default, Clone, Debug, PartialEq, Eq` |
| Hashable | `Component, Default, Clone, Debug, PartialEq, Eq, Hash` |

### Required Imports

```rust
use bevy::prelude::*;
// For serialization (optional)
use serde::{Serialize, Deserialize};
```

## Anti-Patterns to Avoid

### DON'T: Monolithic components with many fields
```rust
// BAD: Too many responsibilities
#[derive(Component)]
pub struct UnitData {
    position_x: i32,
    position_y: i32,
    health: i32,
    max_health: i32,
    movement: u32,
    max_movement: u32,
    attack: i32,
    defense: i32,
    name: String,
    // ... many more fields
}
```

### DO: Split into focused components
```rust
// GOOD: Single responsibility
#[derive(Component, Default, Clone, Debug)]
pub struct Position { pub x: i32, pub y: i32 }

#[derive(Component, Default, Clone, Debug)]
pub struct Health { pub current: i32, pub max: i32 }

#[derive(Component, Default, Clone, Debug)]
pub struct Movement { pub points: u32, pub max_points: u32 }

#[derive(Component, Default, Clone, Debug)]
pub struct Combat { pub attack: i32, pub defense: i32 }

#[derive(Component)]
pub struct Unit;  // Marker to identify unit entities
```

### DON'T: Store Entity references that may become invalid
```rust
// BAD: Entity may be despawned
#[derive(Component)]
pub struct Target {
    entity: Entity,  // Dangerous - entity may not exist
}
```

### DO: Use Option or validate before use
```rust
// GOOD: Make invalidity explicit
#[derive(Component, Default)]
pub struct Target(pub Option<Entity>);

// Then validate in systems:
// if let Some(target) = target.0 {
//     if let Ok(data) = query.get(target) { ... }
// }
```

### DON'T: Put behavior in components
```rust
// BAD: Components should be data only
#[derive(Component)]
pub struct Player {
    health: i32,
}

impl Player {
    pub fn take_damage(&mut self, amount: i32) {
        self.health -= amount;
    }
}
```

### DO: Keep logic in systems
```rust
// GOOD: Data-only component
#[derive(Component, Default, Clone, Debug)]
pub struct Health {
    pub current: i32,
    pub max: i32,
}

// Logic lives in systems
fn damage_system(mut query: Query<&mut Health>, events: EventReader<DamageEvent>) {
    for event in events.read() {
        if let Ok(mut health) = query.get_mut(event.target) {
            health.current -= event.amount;
        }
    }
}
```

## Example

Creating components for a city in a 4X game:

```rust
use bevy::prelude::*;
use serde::{Serialize, Deserialize};

/// Marker component identifying city entities
#[derive(Component)]
pub struct City;

/// City's population count
#[derive(Component, Default, Clone, Debug, Serialize, Deserialize)]
pub struct Population {
    pub count: u32,
    pub growth_progress: f32,
}

/// City's production capacity
#[derive(Component, Default, Clone, Debug, Serialize, Deserialize)]
pub struct Production {
    pub current: Option<ProductionItem>,
    pub progress: u32,
    pub per_turn: u32,
}

/// City ownership
#[derive(Component, Clone, Debug)]
pub struct Owner(pub Entity);

/// City name for display
#[derive(Component, Clone, Debug, Serialize, Deserialize)]
pub struct CityName(pub String);

/// Grid position using axial hex coordinates
#[derive(Component, Default, Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HexPosition {
    pub q: i32,
    pub r: i32,
}
```

## Input

$ARGUMENTS

## Output

Generate the requested Bevy component(s) following the patterns above.

Include:
- `#[derive(Component)]` with appropriate additional derives
- `use bevy::prelude::*;` import
- `pub` visibility for struct and fields
- Doc comment explaining the component's purpose
- Any related marker components if applicable

If the component needs serialization, add:
- `use serde::{Serialize, Deserialize};`
- `Serialize, Deserialize` to the derive list
