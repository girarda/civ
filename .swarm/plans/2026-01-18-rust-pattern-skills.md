# Plan: Claude Code Skills for Rust Game Patterns

**Date**: 2026-01-18
**Status**: Complete

## Overview

This plan covers creating a suite of Claude Code skills for Rust game development patterns, specifically targeting Bevy ECS architecture. The skills will auto-activate when users request common game development tasks like creating components, systems, plugins, events, resources, and game states. These skills encode best practices from the game architecture research and provide consistent, production-ready code patterns.

## Research Summary

Key findings informing this plan:

**From Claude Code Skills Research (2026-01-18-claude-code-skills.md):**
- Skills use YAML frontmatter with `name`, `description`, `user-invocable` fields
- Skills are stored in `.claude/skills/<name>.md` (flat) or `.claude/skills/<name>/SKILL.md` (directory)
- The `description` field is critical for auto-activation and must include trigger keywords
- Skills should be concise, set appropriate degrees of freedom, and include error handling

**From Game Architecture Research (2026-01-17-game-architecture-partitioning.md):**
- Bevy ECS patterns: components, systems, plugins, resources, events
- Entity Component System (ECS) preferred over inheritance hierarchies
- Event-driven architecture for decoupled communication
- Plugin pattern for modular game feature organization
- State pattern for game flow management (menu, lobby, in-game)

**From Hex Grid Game Plan (2026-01-17-hex-grid-game-rust.md):**
- Bevy 0.12+ with standard plugin architecture
- Small focused components, single-responsibility systems
- Resources for global configuration and state
- Bundle pattern for entity templates

## Skills to Create

| Skill Name | Purpose | Trigger Keywords |
|------------|---------|------------------|
| `rust-bevy-component` | Create ECS components | component, struct, data, entity data |
| `rust-bevy-system` | Create ECS systems | system, behavior, update, process |
| `rust-bevy-plugin` | Create Bevy plugins | plugin, feature, module |
| `rust-bevy-event` | Create event types | event, message, signal, notify |
| `rust-bevy-resource` | Create global resources | resource, global, config, settings |
| `rust-bevy-state` | Create game states | state, screen, phase, mode |
| `rust-bevy-bundle` | Create entity bundles | bundle, spawn, template, prefab |
| `rust-bevy-query` | Write ECS queries | query, filter, access, find entities |

## Phased Implementation

### Phase 1: Core ECS Skills

**Goal**: Create the three foundational Bevy ECS skills that are used most frequently.

- [x] Create `.claude/skills/rust-bevy-component.md` - Component creation skill
- [x] Create `.claude/skills/rust-bevy-system.md` - System creation skill
- [x] Create `.claude/skills/rust-bevy-plugin.md` - Plugin creation skill
- [x] Test each skill by requesting relevant code generation
- [x] Verify auto-activation triggers correctly on natural language requests

**Success Criteria**:
- Each skill activates on at least 3 different phrasings of a request
- Generated code follows Bevy 0.12+ conventions
- Code includes appropriate derives, doc comments, and examples

### Phase 2: Communication & State Skills

**Goal**: Add skills for event-driven patterns and game state management.

- [x] Create `.claude/skills/rust-bevy-event.md` - Event type creation skill
- [x] Create `.claude/skills/rust-bevy-resource.md` - Resource creation skill
- [x] Create `.claude/skills/rust-bevy-state.md` - Game state creation skill
- [x] Test inter-skill consistency (e.g., events work with systems)
- [x] Verify generated patterns match research recommendations

**Success Criteria**:
- Event skill generates send/receive patterns
- Resource skill includes initialization patterns
- State skill generates state transitions and enter/exit systems

### Phase 3: Template & Query Skills

**Goal**: Add utility skills for entity templates and ECS queries.

- [x] Create `.claude/skills/rust-bevy-bundle.md` - Bundle creation skill
- [x] Create `.claude/skills/rust-bevy-query.md` - Query pattern skill
- [x] Test bundles work with component skill outputs
- [x] Verify query patterns cover common use cases

**Success Criteria**:
- Bundle skill generates spawn-ready entity templates
- Query skill covers With, Without, Changed, Added filters
- Integration with existing skills is seamless

### Phase 4: Testing & Refinement

**Goal**: Validate all skills work together and refine descriptions.

- [x] Test complete workflow: create plugin with components, systems, events
- [x] Adjust descriptions based on activation testing
- [x] Add clarifying examples to skills that need them
- [x] Document any discovered edge cases

**Success Criteria**:
- Full game feature can be scaffolded using multiple skills
- No false positive activations on unrelated requests
- All skills follow consistent formatting

## Files to Create

| File | Action | Description |
|------|--------|-------------|
| `.claude/skills/rust-bevy-component.md` | Create | Component creation with derives and docs |
| `.claude/skills/rust-bevy-system.md` | Create | System functions with parameters and ordering |
| `.claude/skills/rust-bevy-plugin.md` | Create | Plugin struct with resource/system registration |
| `.claude/skills/rust-bevy-event.md` | Create | Event types with send/receive patterns |
| `.claude/skills/rust-bevy-resource.md` | Create | Resource types with initialization |
| `.claude/skills/rust-bevy-state.md` | Create | Game states with transitions |
| `.claude/skills/rust-bevy-bundle.md` | Create | Entity bundles for spawning |
| `.claude/skills/rust-bevy-query.md` | Create | Query patterns and filters |

**Total: 8 skills to create**

## Skill Templates

### rust-bevy-component.md

```markdown
---
name: rust-bevy-component
description: Creates a new Bevy ECS component with proper derives and documentation. Use when the user asks to create, generate, or add a component, struct for ECS, entity data, or game object property.
user-invocable: true
---

# Create Bevy Component

## Purpose
Generate a well-structured Bevy ECS component following project conventions.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the component name and purpose.

## Instructions

1. Parse the component name (convert to PascalCase)
2. Determine appropriate derives:
   - Always: `Component`
   - Usually: `Debug`, `Clone`
   - If comparable: `PartialEq`, `Eq`
   - If default needed: `Default`
   - If serializable: `Serialize`, `Deserialize`, `Reflect`
3. Generate doc comments explaining purpose
4. Include field documentation
5. Add usage example in doc comment

## Output Format

```rust
use bevy::prelude::*;

/// [Component description]
///
/// # Example
/// ```
/// commands.spawn(ComponentName { field: value });
/// ```
#[derive(Component, Debug, Clone, Default)]
pub struct ComponentName {
    /// Field description
    pub field: Type,
}
```

## Common Patterns

- **Marker Component**: Empty struct with just `#[derive(Component)]`
- **Data Component**: Struct with fields for entity state
- **Tag Component**: Unit struct for filtering queries

## If unclear
- Default to `Debug, Clone, Default` derives
- Use `pub` visibility unless explicitly private
- Ask at most 1 question if component purpose is ambiguous
```

### rust-bevy-system.md

```markdown
---
name: rust-bevy-system
description: Creates a new Bevy ECS system function with proper parameters and query patterns. Use when the user asks to create, generate, or add a system, behavior, update logic, or processing function.
user-invocable: true
---

# Create Bevy System

## Purpose
Generate a well-structured Bevy ECS system following project conventions.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the system purpose.

## Instructions

1. Parse the system name (convert to snake_case)
2. Determine system parameters:
   - `Query<...>` for entity queries
   - `Res<T>` for read-only resources
   - `ResMut<T>` for mutable resources
   - `Commands` for entity spawning/despawning
   - `EventReader<T>` for reading events
   - `EventWriter<T>` for sending events
   - `Time` for delta time
3. Add ordering hints if needed (after/before other systems)
4. Generate doc comments

## Output Format

```rust
use bevy::prelude::*;

/// [System description]
///
/// Runs in [schedule] to [purpose].
pub fn system_name(
    query: Query<&Component, With<Filter>>,
    time: Res<Time>,
) {
    for component in &query {
        // System logic
    }
}
```

## Common Patterns

- **Update System**: Runs every frame in `Update`
- **Startup System**: Runs once in `Startup`
- **State System**: Runs in specific game state
- **Event Handler**: Reads events and responds

## If unclear
- Default to `Update` schedule
- Use immutable queries unless mutation needed
- Ask about dependencies if ordering matters
```

### rust-bevy-plugin.md

```markdown
---
name: rust-bevy-plugin
description: Creates a new Bevy plugin struct with resource and system registration. Use when the user asks to create, generate, or add a plugin, feature module, or game subsystem.
user-invocable: true
---

# Create Bevy Plugin

## Purpose
Generate a well-structured Bevy plugin following project conventions.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the plugin name and purpose.

## Instructions

1. Parse the plugin name (convert to PascalCase, add Plugin suffix)
2. Create plugin struct
3. Implement Plugin trait with build method
4. Register resources with `app.init_resource::<T>()` or `app.insert_resource(T)`
5. Add systems with `app.add_systems(Schedule, system)`
6. Register events with `app.add_event::<T>()`
7. Add states with `app.init_state::<T>()`

## Output Format

```rust
use bevy::prelude::*;

/// [Plugin description]
///
/// # Systems
/// - `system_name`: [description]
///
/// # Resources
/// - `ResourceName`: [description]
pub struct FeaturePlugin;

impl Plugin for FeaturePlugin {
    fn build(&self, app: &mut App) {
        app
            .init_resource::<FeatureConfig>()
            .add_event::<FeatureEvent>()
            .add_systems(Startup, setup_feature)
            .add_systems(Update, (
                update_feature,
                handle_feature_events,
            ));
    }
}
```

## If unclear
- Include placeholder systems and resources
- Group related systems in tuples
- Ask about dependencies on other plugins
```

### rust-bevy-event.md

```markdown
---
name: rust-bevy-event
description: Creates a new Bevy event type with send and receive patterns. Use when the user asks to create, generate, or add an event, message, signal, or notification for system communication.
user-invocable: true
---

# Create Bevy Event

## Purpose
Generate a Bevy event type with associated send/receive patterns.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the event name and what triggers it.

## Instructions

1. Parse the event name (convert to PascalCase, add Event suffix if not present)
2. Determine event data:
   - Simple: Unit struct for signals
   - Data: Struct with payload fields
   - Enum: Variants for different event types
3. Generate sender system pattern
4. Generate receiver system pattern
5. Show plugin registration

## Output Format

```rust
use bevy::prelude::*;

/// [Event description]
///
/// Sent when [trigger condition].
#[derive(Event, Debug, Clone)]
pub struct FeatureEvent {
    /// Event payload description
    pub data: Type,
}

// Sending events
fn trigger_feature(mut events: EventWriter<FeatureEvent>) {
    events.send(FeatureEvent { data: value });
}

// Receiving events
fn handle_feature(mut events: EventReader<FeatureEvent>) {
    for event in events.read() {
        // Handle event
    }
}

// Plugin registration
app.add_event::<FeatureEvent>();
```

## If unclear
- Default to struct with relevant data fields
- Include both send and receive examples
- Ask about payload structure if complex
```

### rust-bevy-resource.md

```markdown
---
name: rust-bevy-resource
description: Creates a new Bevy resource for global state or configuration. Use when the user asks to create, generate, or add a resource, global state, config, settings, or shared data.
user-invocable: true
---

# Create Bevy Resource

## Purpose
Generate a Bevy resource for global game state or configuration.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the resource name and purpose.

## Instructions

1. Parse the resource name (convert to PascalCase)
2. Determine resource type:
   - Config: Read-mostly settings
   - State: Mutable game state
   - Cache: Computed/loaded data
3. Add appropriate derives:
   - Always: `Resource`
   - Usually: `Debug`, `Clone`
   - If defaults: `Default`
   - If serializable: `Serialize`, `Deserialize`
4. Show initialization patterns

## Output Format

```rust
use bevy::prelude::*;

/// [Resource description]
///
/// # Example
/// ```
/// fn system(config: Res<FeatureConfig>) {
///     println!("{:?}", config.setting);
/// }
/// ```
#[derive(Resource, Debug, Clone, Default)]
pub struct FeatureConfig {
    /// Setting description
    pub setting: Type,
}

// Initialization options:

// Option 1: Default initialization
app.init_resource::<FeatureConfig>();

// Option 2: Custom initialization
app.insert_resource(FeatureConfig {
    setting: custom_value,
});
```

## If unclear
- Default to `Default` derive for simple init
- Use `Res<T>` for read, `ResMut<T>` for write
- Ask about initial values if non-trivial
```

### rust-bevy-state.md

```markdown
---
name: rust-bevy-state
description: Creates a new Bevy game state with transitions and state-specific systems. Use when the user asks to create, generate, or add a game state, screen, phase, mode, or flow control.
user-invocable: true
---

# Create Bevy Game State

## Purpose
Generate a Bevy game state enum with transition and state-specific system patterns.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the state name and variants.

## Instructions

1. Parse the state name (convert to PascalCase)
2. Define state variants (e.g., Menu, Playing, Paused)
3. Add required derives: `States, Debug, Clone, PartialEq, Eq, Hash, Default`
4. Generate OnEnter/OnExit systems
5. Show state transition pattern
6. Show state-conditional system registration

## Output Format

```rust
use bevy::prelude::*;

/// [State description]
#[derive(States, Debug, Clone, PartialEq, Eq, Hash, Default)]
pub enum GameState {
    #[default]
    Menu,
    Loading,
    Playing,
    Paused,
}

// State-specific systems
fn on_enter_playing(mut commands: Commands) {
    // Setup for Playing state
}

fn on_exit_playing(mut commands: Commands) {
    // Cleanup when leaving Playing state
}

fn playing_update(/* ... */) {
    // Only runs in Playing state
}

// Plugin registration
app
    .init_state::<GameState>()
    .add_systems(OnEnter(GameState::Playing), on_enter_playing)
    .add_systems(OnExit(GameState::Playing), on_exit_playing)
    .add_systems(Update, playing_update.run_if(in_state(GameState::Playing)));

// State transitions
fn start_game(mut next_state: ResMut<NextState<GameState>>) {
    next_state.set(GameState::Playing);
}
```

## If unclear
- Include Menu, Playing, Paused as common variants
- Default first variant as initial state
- Ask about sub-states if complex flow
```

### rust-bevy-bundle.md

```markdown
---
name: rust-bevy-bundle
description: Creates a new Bevy bundle for spawning entities with multiple components. Use when the user asks to create, generate, or add a bundle, entity template, prefab, or spawn pattern.
user-invocable: true
---

# Create Bevy Bundle

## Purpose
Generate a Bevy bundle for spawning entities with predefined component sets.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the bundle name and components.

## Instructions

1. Parse the bundle name (convert to PascalCase, add Bundle suffix)
2. List components to include
3. Add `#[derive(Bundle)]`
4. Implement Default or new() constructor
5. Show spawn usage pattern

## Output Format

```rust
use bevy::prelude::*;

/// [Bundle description]
///
/// Spawns an entity with [components list].
#[derive(Bundle, Default)]
pub struct FeatureBundle {
    /// Component description
    pub component: ComponentType,
    /// Transform for positioning
    pub transform: Transform,
    /// Global transform (required with Transform)
    pub global_transform: GlobalTransform,
}

impl FeatureBundle {
    pub fn new(/* params */) -> Self {
        Self {
            component: ComponentType::default(),
            transform: Transform::default(),
            global_transform: GlobalTransform::default(),
        }
    }
}

// Spawning
fn spawn_feature(mut commands: Commands) {
    commands.spawn(FeatureBundle::new(/* params */));
}
```

## If unclear
- Include Transform if entity needs positioning
- Add marker component for query filtering
- Ask about required vs optional components
```

### rust-bevy-query.md

```markdown
---
name: rust-bevy-query
description: Creates Bevy ECS query patterns with filters and access patterns. Use when the user asks about queries, finding entities, filtering components, accessing entity data, or ECS lookups.
user-invocable: true
---

# Create Bevy Query

## Purpose
Generate Bevy ECS query patterns for accessing and filtering entities.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask what entities/components to query.

## Instructions

1. Determine query access (read/write)
2. Add filters (With, Without, Changed, Added)
3. Show iteration patterns
4. Include Optional access if needed
5. Show single entity access patterns

## Output Format

```rust
use bevy::prelude::*;

// Basic query - read components
fn read_system(query: Query<&Component>) {
    for component in &query {
        // Read-only access
    }
}

// Mutable query - write components
fn write_system(mut query: Query<&mut Component>) {
    for mut component in &mut query {
        component.field = new_value;
    }
}

// Multiple components
fn multi_system(query: Query<(&CompA, &CompB, &mut CompC)>) {
    for (a, b, mut c) in &query {
        // Access multiple components
    }
}

// With filter - entities that have a component
fn filtered_system(query: Query<&Component, With<Marker>>) {
    // Only entities with both Component and Marker
}

// Without filter - entities that lack a component
fn exclude_system(query: Query<&Component, Without<Disabled>>) {
    // Entities with Component but not Disabled
}

// Changed filter - only modified this frame
fn changed_system(query: Query<&Component, Changed<Component>>) {
    for component in &query {
        // Only runs for changed components
    }
}

// Optional access
fn optional_system(query: Query<(&Required, Option<&Optional>)>) {
    for (required, maybe_optional) in &query {
        if let Some(optional) = maybe_optional {
            // Has optional component
        }
    }
}

// Entity access
fn entity_system(query: Query<(Entity, &Component)>) {
    for (entity, component) in &query {
        // Access entity ID with component
    }
}

// Single entity (panics if not exactly one)
fn single_system(query: Query<&Player, With<LocalPlayer>>) {
    let player = query.single();
}

// Get specific entity
fn get_system(query: Query<&Component>, entity: Entity) {
    if let Ok(component) = query.get(entity) {
        // Found entity
    }
}
```

## Common Filter Combinations

| Pattern | Use Case |
|---------|----------|
| `With<T>` | Has component T |
| `Without<T>` | Lacks component T |
| `Changed<T>` | T modified this frame |
| `Added<T>` | T added this frame |
| `Or<(With<A>, With<B>)>` | Has A or B |

## If unclear
- Default to immutable queries
- Add Entity to tuple if spawning/despawning needed
- Ask about filter requirements
```

## Success Criteria

### Functional Requirements
- [x] All 8 skills create syntactically correct Rust code
- [x] Generated code follows Bevy 0.12+ conventions
- [x] Each skill auto-activates on natural language requests
- [x] Skills include proper derives, doc comments, and examples
- [x] Generated patterns match game architecture research recommendations

### Usability Requirements
- [x] Skills activate on at least 3 different phrasings per skill
- [x] No false positive activations on unrelated requests
- [x] Clear instructions for ambiguous inputs
- [x] Consistent formatting across all skills

### Code Quality Requirements
- [x] All generated code compiles without warnings
- [x] Doc comments follow Rust conventions
- [x] Examples are copy-paste ready
- [x] Patterns cover common use cases

## Dependencies & Integration

### Depends On
- Research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-18-claude-code-skills.md`
- Research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-game-architecture-partitioning.md`
- Reference: `/Users/alex/gt/civ/crew/alex/.claude/skills/create-skill.md`
- Reference: `/Users/alex/gt/civ/crew/alex/.swarm/plans/2026-01-17-hex-grid-game-rust.md`

### Consumed By
- Hex grid game implementation (Phase 1+)
- Future Rust/Bevy game projects
- Team members learning Bevy patterns

### Integration Points
- Claude Code skill auto-activation system
- Project-specific `.claude/skills/` directory
- Bevy 0.12+ ECS architecture

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bevy API changes in future versions | Medium | Medium | Version-lock examples to 0.12; add note about checking current docs |
| Skills conflict with each other | Low | Low | Use distinct trigger keywords; test activation boundaries |
| Generated code too generic | Medium | Medium | Include concrete examples; add "common patterns" section |
| Description too broad - false activations | Medium | Medium | Use specific trigger keywords; iterate based on testing |
| Missing important patterns | Low | Medium | Start with core patterns; add more skills as needed |

## Implementation Notes

### Skill Naming Convention
All skills use `rust-bevy-*` prefix for:
- Clear grouping in skill picker
- Consistent namespace
- Easy discovery

### Description Strategy
Each description includes:
1. Primary action verb (creates, generates)
2. What it creates (component, system, etc.)
3. Trigger keywords users naturally say
4. Secondary phrasings

### Output Consistency
All skills follow the same output structure:
1. Import statement (`use bevy::prelude::*;`)
2. Doc comment with example
3. Derives
4. Type definition
5. Implementation (if needed)
6. Usage example

### Testing Approach
For each skill, test with:
1. Direct request: "Create a health component"
2. Indirect request: "I need to track entity health"
3. Context request: "Add a component for player position"

## Estimated Effort

| Phase | Estimated Time | Complexity |
|-------|----------------|------------|
| Phase 1: Core ECS Skills | 1-2 hours | Low |
| Phase 2: Communication & State | 1-2 hours | Low |
| Phase 3: Template & Query | 1 hour | Low |
| Phase 4: Testing & Refinement | 1 hour | Low |
| **Total** | **4-6 hours** | |

## Related Documents

- Research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-18-claude-code-skills.md`
- Research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-game-architecture-partitioning.md`
- Plan: `/Users/alex/gt/civ/crew/alex/.swarm/plans/2026-01-17-hex-grid-game-rust.md`
- Reference Skill: `/Users/alex/gt/civ/crew/alex/.claude/skills/create-skill.md`
