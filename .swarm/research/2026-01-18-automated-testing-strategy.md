# Research: Automated Testing Strategy for Claude-Playable Civ Game

**Date**: 2026-01-18
**Status**: Complete

## Summary

This research establishes a comprehensive testing strategy for a Rust/Bevy Civilization-style game designed to be playable by Claude. The key insight is that making the game testable and making it AI-playable are complementary goals: both require a clear separation between game logic and presentation, a well-defined command interface, and deterministic game state. The recommended approach combines pure Rust unit tests for game mechanics, Bevy integration tests for ECS systems, headless game simulation for end-to-end testing, and a CLI/API layer that serves both automated testing and Claude interaction.

## Key Discoveries

- **Testability = AI-playability**: The same architecture that enables automated testing enables Claude to play the game
- **Bevy supports headless mode**: Running without rendering via `MinimalPlugins` allows fast integration testing
- **Command pattern is essential**: All game actions should flow through a command layer that can be invoked programmatically
- **OpenRCT2 fork provides blueprint**: JSON-RPC + CLI pattern proven for Claude game interaction
- **Deterministic simulation enables replay**: With seeded RNG, game sessions can be reproduced for debugging
- **Property-based testing suits hex math**: Use `proptest` for coordinate conversion and pathfinding validation
- **Event-driven architecture simplifies testing**: Bevy Events decouple systems, making them independently testable

## Architecture for AI-Playability

### Core Principle: Separation of Concerns

```
+------------------+     +------------------+     +------------------+
|   UI/Rendering   | <-- |   Game Logic     | <-- |  Command Layer   |
|   (optional)     |     |   (pure Rust)    |     |  (CLI/API)       |
+------------------+     +------------------+     +------------------+
        ^                        ^                        ^
        |                        |                        |
    Human Player            Tests/AI               Claude/Automation
```

The game logic must be completely independent of rendering. This allows:
1. **Headless testing**: Run full game simulations without graphics
2. **Claude interaction**: Claude sends commands, receives game state
3. **Deterministic replay**: Record and replay game sessions
4. **Fast CI/CD**: Tests run in milliseconds without GPU

### Command Layer Design (Claude Interface)

Following the OpenRCT2 fork pattern, implement a command interface:

```rust
// src/commands/mod.rs

/// All possible game commands Claude can issue
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GameCommand {
    // Unit commands
    MoveUnit { unit_id: u64, target_q: i32, target_r: i32 },
    AttackUnit { attacker_id: u64, target_id: u64 },
    FortifyUnit { unit_id: u64 },
    SkipUnit { unit_id: u64 },

    // City commands
    FoundCity { settler_id: u64 },
    SetProduction { city_id: u64, item: ProductionItem },
    SetCitizenFocus { city_id: u64, focus: CitizenFocus },
    BuyTile { city_id: u64, tile_q: i32, tile_r: i32 },

    // Research commands
    SetResearch { tech_id: String },

    // Turn commands
    EndTurn,

    // Query commands (no state change)
    GetGameState,
    GetUnitInfo { unit_id: u64 },
    GetCityInfo { city_id: u64 },
    GetTileInfo { q: i32, r: i32 },
    GetValidMoves { unit_id: u64 },
    GetAvailableActions { unit_id: u64 },
}

/// Result of executing a command
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum CommandResult {
    Success {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        data: Option<serde_json::Value>,
    },
    Error {
        code: String,
        message: String,
    },
    GameState(GameStateSnapshot),
}
```

### Game State Snapshot (Claude Receives)

```rust
// src/state/snapshot.rs

/// Complete game state snapshot for Claude to analyze
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateSnapshot {
    pub turn: u32,
    pub current_player: PlayerId,
    pub phase: TurnPhase,

    // Visible map (respects fog of war)
    pub visible_tiles: Vec<TileSnapshot>,

    // Player's units and cities
    pub units: Vec<UnitSnapshot>,
    pub cities: Vec<CitySnapshot>,

    // Known enemy units/cities (in vision)
    pub enemy_units: Vec<UnitSnapshot>,
    pub enemy_cities: Vec<CitySnapshot>,

    // Resources and stats
    pub gold: i32,
    pub science: i32,
    pub culture: i32,
    pub faith: i32,

    // Research state
    pub current_research: Option<String>,
    pub research_progress: i32,
    pub available_techs: Vec<String>,

    // Turn info
    pub units_needing_orders: Vec<u64>,
    pub cities_needing_production: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitSnapshot {
    pub id: u64,
    pub unit_type: String,
    pub position: (i32, i32),  // (q, r)
    pub health: i32,
    pub max_health: i32,
    pub movement: u32,
    pub max_movement: u32,
    pub available_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TileSnapshot {
    pub q: i32,
    pub r: i32,
    pub terrain: String,
    pub feature: Option<String>,
    pub resource: Option<String>,
    pub improvement: Option<String>,
    pub yields: TileYields,
    pub owner: Option<PlayerId>,
    pub unit_ids: Vec<u64>,
}
```

## Testing Layers

### Layer 1: Pure Rust Unit Tests

Test game logic without Bevy ECS. These run fastest and catch most bugs.

```rust
// src/game/hex_math.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hex_distance() {
        let a = TilePosition::new(0, 0);
        let b = TilePosition::new(3, -1);
        assert_eq!(a.distance_to(b), 3);
    }

    #[test]
    fn test_hex_neighbors() {
        let pos = TilePosition::ORIGIN;
        let neighbors = pos.neighbors();
        assert_eq!(neighbors.len(), 6);
        for n in neighbors {
            assert_eq!(pos.distance_to(n), 1);
        }
    }

    #[test]
    fn test_hex_range() {
        let pos = TilePosition::ORIGIN;
        let range: Vec<_> = pos.range(2).collect();
        // Range 2 = 1 + 6 + 12 = 19 hexes
        assert_eq!(range.len(), 19);
    }
}

// src/game/combat.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_combat_damage_calculation() {
        let attacker = CombatStats { attack: 20, defense: 10, health: 100 };
        let defender = CombatStats { attack: 10, defense: 15, health: 100 };

        let result = calculate_combat(&attacker, &defender);

        // Verify damage is reasonable
        assert!(result.attacker_damage > 0);
        assert!(result.defender_damage > 0);
        assert!(result.attacker_damage > result.defender_damage); // Attacker advantage
    }

    #[test]
    fn test_terrain_defense_bonus() {
        let base_defense = 10;
        let hill_bonus = terrain_defense_modifier(TerrainType::Hill);
        let flat_bonus = terrain_defense_modifier(TerrainType::Grassland);

        assert!(hill_bonus > flat_bonus);
    }
}

// src/game/pathfinding.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pathfinding_basic() {
        let map = TestMap::flat(10, 10);
        let start = TilePosition::new(0, 0);
        let end = TilePosition::new(5, 0);

        let path = find_path(&map, start, end).expect("Path should exist");

        assert_eq!(path.first(), Some(&start));
        assert_eq!(path.last(), Some(&end));
        assert_eq!(path.len(), 6); // Direct path
    }

    #[test]
    fn test_pathfinding_around_obstacle() {
        let mut map = TestMap::flat(10, 10);
        map.set_terrain(TilePosition::new(2, 0), TerrainType::Mountain);

        let start = TilePosition::new(0, 0);
        let end = TilePosition::new(4, 0);

        let path = find_path(&map, start, end).expect("Path should exist");

        // Path should go around mountain
        assert!(!path.contains(&TilePosition::new(2, 0)));
        assert!(path.len() > 5); // Longer than direct
    }

    #[test]
    fn test_pathfinding_no_path() {
        let mut map = TestMap::flat(10, 10);
        // Surround target with mountains
        for neighbor in TilePosition::new(5, 5).neighbors() {
            map.set_terrain(neighbor, TerrainType::Mountain);
        }

        let start = TilePosition::new(0, 0);
        let end = TilePosition::new(5, 5);

        let path = find_path(&map, start, end);
        assert!(path.is_none());
    }
}
```

### Layer 2: Property-Based Testing

Use `proptest` for invariant testing:

```rust
// src/game/hex_math.rs
#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn hex_distance_is_symmetric(
            q1 in -100i32..100,
            r1 in -100i32..100,
            q2 in -100i32..100,
            r2 in -100i32..100,
        ) {
            let a = TilePosition::new(q1, r1);
            let b = TilePosition::new(q2, r2);
            prop_assert_eq!(a.distance_to(b), b.distance_to(a));
        }

        #[test]
        fn hex_distance_triangle_inequality(
            q1 in -50i32..50,
            r1 in -50i32..50,
            q2 in -50i32..50,
            r2 in -50i32..50,
            q3 in -50i32..50,
            r3 in -50i32..50,
        ) {
            let a = TilePosition::new(q1, r1);
            let b = TilePosition::new(q2, r2);
            let c = TilePosition::new(q3, r3);

            // Triangle inequality: d(a,c) <= d(a,b) + d(b,c)
            prop_assert!(a.distance_to(c) <= a.distance_to(b) + b.distance_to(c));
        }

        #[test]
        fn coordinate_conversion_roundtrip(
            q in -100i32..100,
            r in -100i32..100,
        ) {
            let layout = HexGridLayout::default();
            let original = TilePosition::new(q, r);
            let world = layout.tile_to_world(original);
            let back = layout.world_to_tile(world);
            prop_assert_eq!(original, back);
        }
    }
}
```

### Layer 3: Bevy Integration Tests

Test ECS systems in isolation using `MinimalPlugins`:

```rust
// tests/bevy_integration.rs
use bevy::prelude::*;
use openciv::prelude::*;

/// Helper to create test app with game systems
fn test_app() -> App {
    let mut app = App::new();
    app.add_plugins(MinimalPlugins)
       .add_plugins(GameLogicPlugin)  // Our game logic (no rendering)
       .init_resource::<TurnState>()
       .init_resource::<GameMap>()
       .add_event::<UnitMovedEvent>()
       .add_event::<TurnEndEvent>();
    app
}

#[test]
fn test_unit_movement_system() {
    let mut app = test_app();

    // Spawn a unit
    let unit_entity = app.world.spawn((
        Unit { unit_type: "Warrior".into() },
        TilePosition::new(0, 0),
        Movement { points: 2, max_points: 2 },
        Owner(PlayerId(0)),
    )).id();

    // Issue move command
    app.world.insert_resource(PendingCommand(GameCommand::MoveUnit {
        unit_id: unit_entity.index() as u64,
        target_q: 1,
        target_r: 0,
    }));

    // Run systems
    app.update();

    // Verify movement
    let pos = app.world.get::<TilePosition>(unit_entity).unwrap();
    assert_eq!(*pos, TilePosition::new(1, 0));

    let movement = app.world.get::<Movement>(unit_entity).unwrap();
    assert_eq!(movement.points, 1); // Used 1 movement
}

#[test]
fn test_turn_processing() {
    let mut app = test_app();

    // Spawn unit with 0 movement
    let unit_entity = app.world.spawn((
        Unit { unit_type: "Warrior".into() },
        TilePosition::new(0, 0),
        Movement { points: 0, max_points: 2 },
    )).id();

    // End turn
    app.world.send_event(TurnEndEvent { turn: 1 });
    app.update();

    // Verify movement restored
    let movement = app.world.get::<Movement>(unit_entity).unwrap();
    assert_eq!(movement.points, 2);
}

#[test]
fn test_city_production() {
    let mut app = test_app();

    // Spawn city with production queue
    let city_entity = app.world.spawn((
        City { name: "Rome".into() },
        TilePosition::new(0, 0),
        Production {
            current: Some(ProductionItem::Unit("Warrior".into())),
            progress: 0,
            cost: 40,
        },
        CityYields { production: 10, food: 5, gold: 3 },
    )).id();

    // Process 4 turns
    for turn in 0..4 {
        app.world.send_event(TurnEndEvent { turn });
        app.update();
    }

    // Production should be complete (4 * 10 = 40)
    let production = app.world.get::<Production>(city_entity).unwrap();
    assert!(production.current.is_none()); // Production complete

    // Unit should be spawned
    let units: Vec<_> = app.world.query::<&Unit>().iter(&app.world).collect();
    assert_eq!(units.len(), 1);
}
```

### Layer 4: Headless Game Simulation

Full game simulation for end-to-end testing:

```rust
// tests/simulation.rs
use openciv::simulation::*;

#[test]
fn test_full_game_loop() {
    // Create headless game with seed for determinism
    let mut sim = GameSimulation::new()
        .with_seed(12345)
        .with_map_size(MapSize::Duel)
        .with_players(2)
        .build();

    // Run 10 turns
    for _ in 0..10 {
        // Get valid commands for current player
        let state = sim.get_state();

        // AI makes decisions (or we test specific scenarios)
        for unit_id in state.units_needing_orders {
            let unit = sim.get_unit(unit_id).unwrap();
            let valid_moves = sim.get_valid_moves(unit_id);

            if !valid_moves.is_empty() {
                let target = valid_moves[0];
                sim.execute(GameCommand::MoveUnit {
                    unit_id,
                    target_q: target.0,
                    target_r: target.1,
                }).unwrap();
            }
        }

        sim.execute(GameCommand::EndTurn).unwrap();
    }

    // Verify game progressed
    assert_eq!(sim.current_turn(), 10);
}

#[test]
fn test_deterministic_replay() {
    let seed = 42;

    // Run game twice with same seed and commands
    let commands = vec![
        GameCommand::MoveUnit { unit_id: 0, target_q: 1, target_r: 0 },
        GameCommand::EndTurn,
        GameCommand::MoveUnit { unit_id: 0, target_q: 2, target_r: 0 },
        GameCommand::EndTurn,
    ];

    let state1 = run_simulation(seed, &commands);
    let state2 = run_simulation(seed, &commands);

    // States should be identical
    assert_eq!(state1, state2);
}

fn run_simulation(seed: u64, commands: &[GameCommand]) -> GameStateSnapshot {
    let mut sim = GameSimulation::new()
        .with_seed(seed)
        .build();

    for cmd in commands {
        sim.execute(cmd.clone()).unwrap();
    }

    sim.get_state()
}
```

### Layer 5: CLI Integration Tests

Test the CLI interface that Claude will use:

```rust
// tests/cli_integration.rs
use std::process::Command;

#[test]
fn test_cli_get_state() {
    let output = Command::new("cargo")
        .args(["run", "--bin", "civctl", "--", "game", "state"])
        .output()
        .expect("Failed to execute civctl");

    assert!(output.status.success());

    // Verify JSON output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let state: GameStateSnapshot = serde_json::from_str(&stdout)
        .expect("Output should be valid JSON");

    assert!(state.turn >= 0);
}

#[test]
fn test_cli_move_unit() {
    // Start a test game
    let _ = Command::new("cargo")
        .args(["run", "--bin", "civctl", "--", "game", "new", "--seed", "12345"])
        .output()
        .expect("Failed to create game");

    // Move a unit
    let output = Command::new("cargo")
        .args(["run", "--bin", "civctl", "--", "unit", "move", "0", "1", "0"])
        .output()
        .expect("Failed to move unit");

    assert!(output.status.success());
}

#[test]
fn test_cli_help() {
    let output = Command::new("cargo")
        .args(["run", "--bin", "civctl", "--", "--help"])
        .output()
        .expect("Failed to get help");

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("civctl"));
    assert!(stdout.contains("game"));
    assert!(stdout.contains("unit"));
    assert!(stdout.contains("city"));
}
```

## CLI Design for Claude (civctl)

Following OpenRCT2's `rctctl` pattern:

```
civctl <resource> <action> [args] [--flags]

Resources:
  game      - Overall game management
  map       - Map and terrain
  unit      - Unit control
  city      - City management
  tech      - Technology/research
  turn      - Turn management

Examples:
  civctl game state                     # Get full game state as JSON
  civctl game new --seed 12345          # Start new game with seed
  civctl game load savegame.json        # Load saved game

  civctl unit list                      # List all units
  civctl unit info 42                   # Get unit 42 details
  civctl unit move 42 5 -3              # Move unit 42 to hex (5, -3)
  civctl unit actions 42                # Get available actions for unit
  civctl unit attack 42 99              # Unit 42 attacks unit 99

  civctl city list                      # List all cities
  civctl city info rome                 # Get city details
  civctl city produce rome warrior      # Set production to Warrior
  civctl city focus rome production     # Set citizen focus

  civctl tech research writing          # Research Writing tech
  civctl tech available                 # List available techs

  civctl turn end                       # End current turn
  civctl turn status                    # Get turn info

Flags:
  -o, --output json|table               # Output format (default: json for Claude)
  -v, --verbose                         # Verbose output
  --help                                # Show help
```

### CLI Implementation

```rust
// src/bin/civctl.rs
use clap::{Parser, Subcommand};
use openciv::commands::*;

#[derive(Parser)]
#[command(name = "civctl")]
#[command(about = "Command-line interface for OpenCiv game")]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    #[arg(short, long, default_value = "json")]
    output: OutputFormat,
}

#[derive(Subcommand)]
enum Commands {
    /// Game management
    Game {
        #[command(subcommand)]
        action: GameAction,
    },
    /// Unit control
    Unit {
        #[command(subcommand)]
        action: UnitAction,
    },
    /// City management
    City {
        #[command(subcommand)]
        action: CityAction,
    },
    /// Research and technology
    Tech {
        #[command(subcommand)]
        action: TechAction,
    },
    /// Turn management
    Turn {
        #[command(subcommand)]
        action: TurnAction,
    },
}

#[derive(Subcommand)]
enum UnitAction {
    /// List all units
    List,
    /// Get unit information
    Info { unit_id: u64 },
    /// Move unit to position
    Move {
        unit_id: u64,
        target_q: i32,
        target_r: i32
    },
    /// Get available actions
    Actions { unit_id: u64 },
    /// Attack another unit
    Attack {
        attacker_id: u64,
        target_id: u64
    },
    /// Fortify unit
    Fortify { unit_id: u64 },
    /// Skip unit this turn
    Skip { unit_id: u64 },
}

fn main() {
    let cli = Cli::parse();

    // Connect to game server (or embedded game)
    let result = match cli.command {
        Commands::Unit { action } => handle_unit_action(action),
        Commands::City { action } => handle_city_action(action),
        Commands::Game { action } => handle_game_action(action),
        Commands::Tech { action } => handle_tech_action(action),
        Commands::Turn { action } => handle_turn_action(action),
    };

    // Output result
    match cli.output {
        OutputFormat::Json => println!("{}", serde_json::to_string_pretty(&result).unwrap()),
        OutputFormat::Table => print_table(&result),
    }
}
```

## Headless Mode Architecture

### Running Without Rendering

```rust
// src/plugins/mod.rs

/// Plugin for game logic only (no rendering)
pub struct GameLogicPlugin;

impl Plugin for GameLogicPlugin {
    fn build(&self, app: &mut App) {
        app
            // Core game systems (no rendering)
            .add_plugins(HexPlugin)
            .add_plugins(MapPlugin)
            .add_plugins(UnitPlugin)
            .add_plugins(CityPlugin)
            .add_plugins(CombatPlugin)
            .add_plugins(TurnPlugin)
            .add_plugins(CommandPlugin)

            // Events
            .add_event::<UnitMovedEvent>()
            .add_event::<CityFoundedEvent>()
            .add_event::<CombatEvent>()
            .add_event::<TurnEndEvent>()
            .add_event::<CommandEvent>();
    }
}

/// Full game plugin (with rendering)
pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app
            .add_plugins(GameLogicPlugin)
            // Add rendering
            .add_plugins(RenderPlugin)
            .add_plugins(UiPlugin)
            .add_plugins(CameraPlugin);
    }
}

// src/bin/headless.rs - For testing/AI
fn main() {
    App::new()
        .add_plugins(MinimalPlugins)
        .add_plugins(GameLogicPlugin)
        .add_plugins(CliServerPlugin)  // Accept commands via stdin/TCP
        .run();
}

// src/main.rs - For human play
fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(GamePlugin)
        .run();
}
```

## Testing Configuration

### Cargo.toml Test Setup

```toml
[package]
name = "openciv"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "openciv"
path = "src/main.rs"

[[bin]]
name = "civctl"
path = "src/bin/civctl.rs"

[[bin]]
name = "headless"
path = "src/bin/headless.rs"

[dependencies]
bevy = { version = "0.15", default-features = false, features = ["bevy_core_pipeline"] }
hexx = { version = "0.18", features = ["bevy_reflect"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
clap = { version = "4.0", features = ["derive"] }
thiserror = "1.0"
rand = { version = "0.8", features = ["small_rng"] }

[dev-dependencies]
proptest = "1.0"
approx = "0.5"

[features]
default = ["rendering"]
rendering = ["bevy/default"]
headless = []

[[test]]
name = "unit_tests"
path = "tests/unit_tests.rs"

[[test]]
name = "integration"
path = "tests/integration.rs"

[[test]]
name = "cli"
path = "tests/cli_integration.rs"
```

### CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy

      - name: Cache
        uses: Swatinem/rust-cache@v2

      - name: Check
        run: cargo check --all-targets

      - name: Clippy
        run: cargo clippy -- -D warnings

      - name: Unit Tests
        run: cargo test --lib

      - name: Integration Tests (Headless)
        run: cargo test --test integration --features headless

      - name: CLI Tests
        run: cargo test --test cli

  simulation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable

      - name: Run Simulation Tests
        run: |
          cargo build --release --bin headless --features headless
          cargo test --test simulation --release
```

## Test Categories and Coverage Goals

| Category | Coverage Goal | Test Type |
|----------|---------------|-----------|
| Hex math | 100% | Unit tests, property tests |
| Pathfinding | 100% | Unit tests, property tests |
| Combat calculation | 100% | Unit tests |
| Turn processing | 100% | Integration tests |
| City production | 100% | Integration tests |
| Command execution | 100% | Integration tests |
| CLI interface | 90% | CLI integration tests |
| Full game loop | 80% | Simulation tests |
| Map generation | 80% | Property tests |
| AI playability | E2E | Simulation with random commands |

## Patterns for Testable Game Mechanics

### 1. Pure Function Pattern

```rust
// Good: Pure function, easy to test
pub fn calculate_damage(
    attacker: &CombatStats,
    defender: &CombatStats,
    terrain: TerrainType,
) -> DamageResult {
    let terrain_modifier = terrain.defense_modifier();
    let effective_defense = defender.defense as f32 * terrain_modifier;

    let damage = (attacker.attack as f32 * 30.0 / effective_defense).round() as i32;

    DamageResult {
        damage_to_defender: damage,
        damage_to_attacker: (defender.attack as f32 * 30.0 / attacker.defense as f32).round() as i32,
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_calculate_damage() {
        let result = calculate_damage(
            &CombatStats { attack: 20, defense: 10 },
            &CombatStats { attack: 10, defense: 15 },
            TerrainType::Grassland,
        );
        assert_eq!(result.damage_to_defender, 40);
    }
}
```

### 2. Seeded RNG Pattern

```rust
// Game simulation with deterministic RNG
pub struct GameSimulation {
    world: World,
    rng: SmallRng,
    seed: u64,
}

impl GameSimulation {
    pub fn new(seed: u64) -> Self {
        Self {
            world: World::new(),
            rng: SmallRng::seed_from_u64(seed),
            seed,
        }
    }

    pub fn generate_map(&mut self, config: &MapConfig) -> Map {
        // All randomness uses self.rng, making it deterministic
        MapGenerator::new(&mut self.rng).generate(config)
    }
}

#[test]
fn test_deterministic_map() {
    let map1 = GameSimulation::new(12345).generate_map(&config);
    let map2 = GameSimulation::new(12345).generate_map(&config);
    assert_eq!(map1, map2);
}
```

### 3. Command Validation Pattern

```rust
pub fn validate_command(
    cmd: &GameCommand,
    state: &GameState,
    player: PlayerId,
) -> Result<(), CommandError> {
    match cmd {
        GameCommand::MoveUnit { unit_id, target_q, target_r } => {
            let unit = state.get_unit(*unit_id)
                .ok_or(CommandError::UnitNotFound(*unit_id))?;

            if unit.owner != player {
                return Err(CommandError::NotOwner);
            }

            if unit.movement_points == 0 {
                return Err(CommandError::NoMovement);
            }

            let target = TilePosition::new(*target_q, *target_r);
            if !state.is_valid_move(*unit_id, target) {
                return Err(CommandError::InvalidMove);
            }

            Ok(())
        }
        // ... other commands
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_move_validation_no_movement() {
        let state = test_state_with_exhausted_unit();
        let cmd = GameCommand::MoveUnit { unit_id: 0, target_q: 1, target_r: 0 };

        let result = validate_command(&cmd, &state, PlayerId(0));
        assert!(matches!(result, Err(CommandError::NoMovement)));
    }
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/commands/mod.rs` | Command definitions (Claude's API) |
| `src/state/snapshot.rs` | Game state serialization |
| `src/bin/civctl.rs` | CLI tool entry point |
| `src/bin/headless.rs` | Headless game server |
| `src/plugins/game_logic.rs` | Logic-only plugin (no rendering) |
| `tests/unit_tests.rs` | Pure Rust unit tests |
| `tests/integration.rs` | Bevy integration tests |
| `tests/cli_integration.rs` | CLI interface tests |
| `tests/simulation.rs` | Full game simulation tests |
| `.github/workflows/test.yml` | CI/CD configuration |

## Recommendations

### For Project Setup

1. **Start with testable core**: Implement hex math, combat calculation, and pathfinding with full test coverage before adding Bevy ECS
2. **Design commands first**: Define the `GameCommand` enum early - this is Claude's API and shapes the architecture
3. **Use feature flags**: Separate rendering from logic via Cargo features for fast headless testing
4. **Seed all randomness**: Use `SmallRng` with explicit seeds everywhere for deterministic replay

### For Claude Interaction

1. **JSON-first output**: Default CLI output to JSON for machine parsing
2. **Exhaustive state snapshots**: Include all information Claude needs to make decisions
3. **Clear error messages**: Return structured errors with action suggestions
4. **Available actions API**: Always provide `get_valid_moves` and `get_available_actions` commands

### For Testing Strategy

1. **Test pyramid**: Many unit tests, fewer integration tests, few E2E tests
2. **Property tests for math**: Hex coordinate invariants, pathfinding properties
3. **Snapshot testing**: Compare game states for regression testing
4. **Mutation testing**: Consider `cargo-mutants` to verify test quality

### For CI/CD

1. **Fast feedback**: Unit tests run in < 30 seconds
2. **Parallel tests**: Use `cargo test -- --test-threads=N`
3. **Headless CI**: No GPU required for integration tests
4. **Nightly simulations**: Run longer E2E tests overnight

## Open Questions

1. **TCP vs stdin for CLI**: Should `civctl` communicate via TCP socket (like OpenRCT2) or stdio? TCP enables persistent game state.

2. **Save format**: Should save files be human-readable JSON or binary for performance? Consider both with format flag.

3. **Replay system**: Should we record all commands for replay/debugging? Could enable "watch Claude play" feature.

4. **Partial observability**: How much should fog of war affect the state snapshot? Full information for testing, partial for fair play?

5. **Turn timeout**: Should headless mode support turn timeouts for AI testing, or run as fast as possible?

6. **Multi-agent testing**: How to test scenarios with multiple AI players? Seed-based coordination?

## Related Documents

- Previous research: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-openciv-game-mechanics.md`
- OpenRCT2 patterns: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-openrct2-fork-features.md`
- Development sequencing: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-game-dev-sequencing.md`
- Rust architecture: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-17-rust-architecture-patterns.md`
- Hex project setup: `/Users/alex/gt/civ/crew/alex/.swarm/research/2026-01-18-rust-hex-project-setup.md`
