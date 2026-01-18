Create a Bevy plugin following Rust best practices for modular game features.

## Context

Bevy plugins organize related systems, resources, components, and events into reusable modules. In Bevy 0.12+, plugins implement the `Plugin` trait with a `build` method. Well-designed plugins encapsulate a single game feature and expose configuration through plugin structs or resources.

## Pattern

```rust
use bevy::prelude::*;

/// Plugin for [feature description]
pub struct FeaturePlugin;

impl Plugin for FeaturePlugin {
    fn build(&self, app: &mut App) {
        app
            // Register events
            .add_event::<FeatureEvent>()
            // Insert resources
            .init_resource::<FeatureSettings>()
            // Add systems organized by schedule
            .add_systems(Startup, setup_feature)
            .add_systems(Update, (
                feature_system_a,
                feature_system_b.after(feature_system_a),
            ));
    }
}
```

### Plugin with Configuration

```rust
use bevy::prelude::*;

/// Configurable plugin with builder pattern
pub struct FeaturePlugin {
    pub enabled: bool,
    pub tick_rate: f32,
}

impl Default for FeaturePlugin {
    fn default() -> Self {
        Self {
            enabled: true,
            tick_rate: 1.0,
        }
    }
}

impl Plugin for FeaturePlugin {
    fn build(&self, app: &mut App) {
        if !self.enabled {
            return;
        }

        app.insert_resource(FeatureConfig {
            tick_rate: self.tick_rate,
        });

        app.add_systems(Update, feature_tick_system);
    }
}

// Usage: app.add_plugins(FeaturePlugin { tick_rate: 0.5, ..default() });
```

### Plugin Groups

```rust
use bevy::prelude::*;

/// Group of related plugins for a game domain
pub struct GameplayPlugins;

impl PluginGroup for GameplayPlugins {
    fn build(self) -> PluginGroupBuilder {
        PluginGroupBuilder::start::<Self>()
            .add(MovementPlugin)
            .add(CombatPlugin)
            .add(ResourcePlugin)
            .add(TurnPlugin)
    }
}

// Usage: app.add_plugins(GameplayPlugins);
```

### Nested/Dependent Plugins

```rust
use bevy::prelude::*;

/// Plugin that depends on another plugin
pub struct AdvancedCombatPlugin;

impl Plugin for AdvancedCombatPlugin {
    fn build(&self, app: &mut App) {
        // Ensure dependency is added (idempotent)
        if !app.is_plugin_added::<CombatPlugin>() {
            app.add_plugins(CombatPlugin);
        }

        app.add_systems(Update, advanced_combat_system);
    }
}
```

### Plugin with States

```rust
use bevy::prelude::*;

/// Plugin that manages game states
pub struct GameStatePlugin;

impl Plugin for GameStatePlugin {
    fn build(&self, app: &mut App) {
        app
            .init_state::<GameState>()
            .add_systems(OnEnter(GameState::Playing), setup_gameplay)
            .add_systems(OnExit(GameState::Playing), cleanup_gameplay)
            .add_systems(Update, gameplay_systems.run_if(in_state(GameState::Playing)));
    }
}

#[derive(States, Default, Debug, Clone, PartialEq, Eq, Hash)]
pub enum GameState {
    #[default]
    Loading,
    MainMenu,
    Playing,
    Paused,
}
```

### Common Plugin Structure

| Component | Purpose |
|-----------|---------|
| `add_event::<T>()` | Register custom events |
| `init_resource::<T>()` | Add resource with Default |
| `insert_resource(T)` | Add resource with value |
| `add_systems(Schedule, systems)` | Add systems to a schedule |
| `register_type::<T>()` | Register for reflection/inspector |
| `add_plugins(P)` | Add nested plugins |

### Required Imports

```rust
use bevy::prelude::*;
// For PluginGroup
use bevy::app::PluginGroup;
use bevy::app::PluginGroupBuilder;
```

## Anti-Patterns to Avoid

### DON'T: Monolithic plugin with everything

```rust
// BAD: One plugin doing too many unrelated things
pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app
            .add_systems(Update, movement_system)
            .add_systems(Update, combat_system)
            .add_systems(Update, economy_system)
            .add_systems(Update, diplomacy_system)
            .add_systems(Update, ui_system)
            .add_systems(Update, audio_system)
            // ... 50 more systems
    }
}
```

### DO: Split into focused plugins

```rust
// GOOD: Each plugin handles one domain
pub struct MovementPlugin;
pub struct CombatPlugin;
pub struct EconomyPlugin;
pub struct DiplomacyPlugin;

// Group them for convenience
pub struct GameplayPlugins;

impl PluginGroup for GameplayPlugins {
    fn build(self) -> PluginGroupBuilder {
        PluginGroupBuilder::start::<Self>()
            .add(MovementPlugin)
            .add(CombatPlugin)
            .add(EconomyPlugin)
            .add(DiplomacyPlugin)
    }
}
```

### DON'T: Hard-code configuration in plugin

```rust
// BAD: No way to customize behavior
impl Plugin for CombatPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(CombatSettings {
            damage_multiplier: 1.0,  // Always 1.0
        });
    }
}
```

### DO: Accept configuration via plugin struct or resource

```rust
// GOOD: Configurable via plugin struct
pub struct CombatPlugin {
    pub damage_multiplier: f32,
}

impl Default for CombatPlugin {
    fn default() -> Self {
        Self { damage_multiplier: 1.0 }
    }
}

impl Plugin for CombatPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(CombatSettings {
            damage_multiplier: self.damage_multiplier,
        });
    }
}

// Usage: app.add_plugins(CombatPlugin { damage_multiplier: 1.5 });
```

### DON'T: Add systems without organizing by schedule

```rust
// BAD: Unclear when systems run, potential ordering issues
impl Plugin for FeaturePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, system_a);
        app.add_systems(Update, system_b);
        app.add_systems(Update, system_c);
        // What order do these run? Who knows!
    }
}
```

### DO: Use system sets and explicit ordering

```rust
// GOOD: Clear organization and ordering
impl Plugin for FeaturePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, (
            system_a,
            system_b.after(system_a),
            system_c.after(system_b),
        ));
    }
}

// Or with system sets for larger plugins
#[derive(SystemSet, Debug, Clone, PartialEq, Eq, Hash)]
pub enum FeatureSet {
    Input,
    Logic,
    Render,
}

impl Plugin for FeaturePlugin {
    fn build(&self, app: &mut App) {
        app.configure_sets(Update, (
            FeatureSet::Input,
            FeatureSet::Logic.after(FeatureSet::Input),
            FeatureSet::Render.after(FeatureSet::Logic),
        ));

        app.add_systems(Update, (
            handle_input.in_set(FeatureSet::Input),
            process_logic.in_set(FeatureSet::Logic),
            update_visuals.in_set(FeatureSet::Render),
        ));
    }
}
```

### DON'T: Duplicate plugin additions

```rust
// BAD: Adding same plugin twice causes panic
fn main() {
    App::new()
        .add_plugins(CombatPlugin)
        .add_plugins(CombatPlugin)  // PANIC!
        .run();
}
```

### DO: Check before adding dependent plugins

```rust
// GOOD: Guard against duplicate additions
impl Plugin for AdvancedFeaturePlugin {
    fn build(&self, app: &mut App) {
        if !app.is_plugin_added::<BaseFeaturePlugin>() {
            app.add_plugins(BaseFeaturePlugin);
        }
        // Continue with this plugin's setup
    }
}
```

## Example

Turn-based system plugin for a 4X game:

```rust
use bevy::prelude::*;

/// Plugin managing turn-based game flow
pub struct TurnPlugin {
    /// Starting player (default: 0)
    pub starting_player: usize,
    /// Enable AI for non-human players
    pub ai_enabled: bool,
}

impl Default for TurnPlugin {
    fn default() -> Self {
        Self {
            starting_player: 0,
            ai_enabled: true,
        }
    }
}

impl Plugin for TurnPlugin {
    fn build(&self, app: &mut App) {
        app
            // Events for turn flow
            .add_event::<TurnStarted>()
            .add_event::<TurnEnded>()
            .add_event::<EndTurnRequest>()
            // Turn state resource
            .insert_resource(TurnState {
                current_player: self.starting_player,
                turn_number: 1,
                phase: TurnPhase::Start,
            })
            .insert_resource(TurnConfig {
                ai_enabled: self.ai_enabled,
            })
            // Turn management systems
            .add_systems(Update, (
                handle_turn_start.run_if(in_turn_phase(TurnPhase::Start)),
                process_player_actions.run_if(in_turn_phase(TurnPhase::Action)),
                handle_end_turn_request,
                process_turn_end.run_if(in_turn_phase(TurnPhase::End)),
            ));
    }
}

// Supporting types

#[derive(Event)]
pub struct TurnStarted {
    pub player: usize,
    pub turn: u32,
}

#[derive(Event)]
pub struct TurnEnded {
    pub player: usize,
}

#[derive(Event)]
pub struct EndTurnRequest;

#[derive(Resource)]
pub struct TurnState {
    pub current_player: usize,
    pub turn_number: u32,
    pub phase: TurnPhase,
}

#[derive(Resource)]
pub struct TurnConfig {
    pub ai_enabled: bool,
}

#[derive(Default, Clone, Copy, PartialEq, Eq)]
pub enum TurnPhase {
    #[default]
    Start,
    Action,
    End,
}

fn in_turn_phase(phase: TurnPhase) -> impl Fn(Res<TurnState>) -> bool {
    move |state: Res<TurnState>| state.phase == phase
}

// Systems

fn handle_turn_start(
    mut state: ResMut<TurnState>,
    mut events: EventWriter<TurnStarted>,
) {
    events.send(TurnStarted {
        player: state.current_player,
        turn: state.turn_number,
    });
    state.phase = TurnPhase::Action;
}

fn process_player_actions(
    // Query for player input, unit commands, etc.
) {
    // Handle player actions during their turn
}

fn handle_end_turn_request(
    mut requests: EventReader<EndTurnRequest>,
    mut state: ResMut<TurnState>,
) {
    for _ in requests.read() {
        state.phase = TurnPhase::End;
    }
}

fn process_turn_end(
    mut state: ResMut<TurnState>,
    mut events: EventWriter<TurnEnded>,
    players: Query<Entity, With<Player>>,
) {
    events.send(TurnEnded {
        player: state.current_player,
    });

    // Advance to next player
    let player_count = players.iter().count();
    state.current_player = (state.current_player + 1) % player_count;

    // Increment turn number when wrapping to first player
    if state.current_player == 0 {
        state.turn_number += 1;
    }

    state.phase = TurnPhase::Start;
}

// Marker component for player entities
#[derive(Component)]
pub struct Player;
```

## Input

$ARGUMENTS

## Output

Generate the requested Bevy plugin following the patterns above.

Include:
- `pub struct PluginName;` with configuration fields if needed
- `impl Plugin for PluginName` with `build` method
- `use bevy::prelude::*;` import
- Doc comment explaining the plugin's purpose
- Events, resources, and systems the plugin adds
- System ordering with `.after()` or system sets if multiple systems
- `impl Default` if plugin has configuration fields
