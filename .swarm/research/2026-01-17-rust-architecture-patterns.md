# Research: Rust Architecture Patterns for 4X Strategy Game Development

**Date**: 2026-01-17
**Status**: Complete

## Summary

This research analyzes Rust architecture patterns suitable for developing a Civilization-style 4X strategy game, with specific focus on patterns that are AI-agent friendly. The document covers Entity Component System (ECS) patterns with Bevy, ownership-friendly architectures, game-specific patterns for turn-based games, and practical recommendations for structuring a project that AI agents can effectively work on.

## Key Discoveries

- **Bevy ECS** is the most mature and AI-friendly Rust game engine with excellent documentation
- **Generational indices** (like in `slotmap`) solve most ownership challenges in game development
- **Event-driven architecture** via Bevy Events prevents complex borrow checker conflicts
- **State machines** using Bevy States provide clean game flow management
- **Serde** is the de-facto standard for serialization, enabling robust save/load systems
- **Message passing** (channels, events) is preferred over shared mutable state
- **Component-based design** aligns well with AI code generation patterns
- **WebSocket with tokio** provides async networking for multiplayer

## Core Rust Patterns for Games

### 1. Entity Component System (ECS) - Bevy

Bevy ECS is the recommended approach for Rust game development. It naturally avoids borrow checker conflicts through its architecture.

#### Basic Bevy Structure

```rust
use bevy::prelude::*;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_state::<GameState>()
        .add_event::<TurnEvent>()
        .add_systems(Startup, setup)
        .add_systems(Update, (
            handle_input,
            process_units.run_if(in_state(GameState::InGame)),
            update_ui,
        ))
        .run();
}
```

#### Component Design Pattern

Components should be small, focused data containers:

```rust
// Good: Small, focused components
#[derive(Component)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Component)]
pub struct Movement {
    pub points: u32,
    pub max_points: u32,
}

#[derive(Component)]
pub struct Health {
    pub current: i32,
    pub max: i32,
}

#[derive(Component)]
pub struct Unit;

#[derive(Component)]
pub struct City;

#[derive(Component)]
pub struct Tile;

// Bad: Monolithic component with everything
// Avoid this pattern - harder for AI to modify
#[derive(Component)]
pub struct UnitData {
    position: (i32, i32),
    movement: u32,
    health: i32,
    attack: i32,
    defense: i32,
    // ... many more fields
}
```

#### System Design Pattern

Systems should do one thing well:

```rust
// Good: Single responsibility systems
fn movement_system(
    mut query: Query<(&mut Position, &mut Movement), With<Unit>>,
    input: Res<MovementInput>,
) {
    for (mut pos, mut movement) in query.iter_mut() {
        if movement.points > 0 {
            pos.x += input.dx;
            pos.y += input.dy;
            movement.points -= 1;
        }
    }
}

fn health_regen_system(
    mut query: Query<&mut Health>,
    turn_events: EventReader<TurnEndEvent>,
) {
    for _ in turn_events.iter() {
        for mut health in query.iter_mut() {
            health.current = (health.current + 1).min(health.max);
        }
    }
}
```

#### Query Patterns for Complex Selections

```rust
// Query with multiple filters
fn city_production_system(
    mut cities: Query<(&mut City, &Position, &Owner), With<ProductionQueue>>,
    tiles: Query<(&Tile, &Position, &Yields)>,
) {
    for (mut city, city_pos, owner) in cities.iter_mut() {
        // Process city production
    }
}

// Optional components
fn render_system(
    query: Query<(&Position, Option<&Sprite>, Option<&AnimationState>)>,
) {
    for (pos, maybe_sprite, maybe_anim) in query.iter() {
        if let Some(sprite) = maybe_sprite {
            // Render sprite
        }
    }
}
```

### 2. State Machine Patterns

#### Bevy States for Game Flow

```rust
#[derive(Debug, Clone, Copy, Default, Eq, PartialEq, Hash, States)]
pub enum GameState {
    #[default]
    MainMenu,
    Loading,
    Lobby,
    InGame,
    Paused,
}

#[derive(Debug, Clone, Copy, Default, Eq, PartialEq, Hash, SubStates)]
#[source(GameState = GameState::InGame)]
pub enum TurnPhase {
    #[default]
    PlayerTurn,
    Processing,
    AITurn,
    EndTurn,
}

// State transition system
fn check_turn_end(
    mut next_state: ResMut<NextState<TurnPhase>>,
    players: Query<&Player>,
    input: Res<Input<KeyCode>>,
) {
    if input.just_pressed(KeyCode::Space) {
        next_state.set(TurnPhase::Processing);
    }
}

// Systems that run only in specific states
app.add_systems(
    Update,
    (
        handle_player_input,
        show_unit_actions,
    ).run_if(in_state(TurnPhase::PlayerTurn))
);

app.add_systems(OnEnter(GameState::InGame), spawn_initial_units);
app.add_systems(OnExit(GameState::InGame), cleanup_game_entities);
```

#### Typestate Pattern for Compile-Time State Validation

```rust
// Typestate pattern ensures valid state transitions at compile time
pub struct Unit<S: UnitState> {
    id: UnitId,
    position: Position,
    _state: PhantomData<S>,
}

pub trait UnitState {}
pub struct Idle;
pub struct Moving;
pub struct Acting;

impl UnitState for Idle {}
impl UnitState for Moving {}
impl UnitState for Acting {}

impl Unit<Idle> {
    pub fn start_move(self, target: Position) -> Unit<Moving> {
        Unit {
            id: self.id,
            position: self.position,
            _state: PhantomData,
        }
    }

    pub fn perform_action(self, action: Action) -> Unit<Acting> {
        Unit {
            id: self.id,
            position: self.position,
            _state: PhantomData,
        }
    }
}

impl Unit<Moving> {
    pub fn complete_move(self, new_pos: Position) -> Unit<Idle> {
        Unit {
            id: self.id,
            position: new_pos,
            _state: PhantomData,
        }
    }
}
```

### 3. Event-Driven Architecture

#### Bevy Events Pattern

```rust
// Define events as simple structs
#[derive(Event)]
pub struct UnitMovedEvent {
    pub unit: Entity,
    pub from: Position,
    pub to: Position,
}

#[derive(Event)]
pub struct CityFoundedEvent {
    pub city: Entity,
    pub founder: Entity,
    pub position: Position,
}

#[derive(Event)]
pub struct TurnEndEvent {
    pub turn_number: u32,
}

// Event sender system
fn handle_unit_movement(
    mut commands: Commands,
    mut move_events: EventWriter<UnitMovedEvent>,
    mut units: Query<(Entity, &mut Position, &Movement), With<Unit>>,
    input: Res<MovementInput>,
) {
    if let Some(target) = input.target {
        for (entity, mut pos, movement) in units.iter_mut() {
            let old_pos = *pos;
            pos.x = target.x;
            pos.y = target.y;

            move_events.send(UnitMovedEvent {
                unit: entity,
                from: old_pos,
                to: *pos,
            });
        }
    }
}

// Event receiver system
fn update_fog_of_war(
    mut move_events: EventReader<UnitMovedEvent>,
    mut fog: ResMut<FogOfWar>,
) {
    for event in move_events.read() {
        fog.reveal_around(event.to, 2);
    }
}

// Multiple systems can read the same event
fn play_movement_sound(
    mut move_events: EventReader<UnitMovedEvent>,
    audio: Res<Audio>,
) {
    for _event in move_events.read() {
        audio.play(MOVE_SOUND);
    }
}
```

### 4. Resource Management and Asset Loading

#### Bevy Asset System

```rust
#[derive(Resource)]
pub struct GameAssets {
    pub unit_sprites: Handle<TextureAtlas>,
    pub tile_sprites: Handle<TextureAtlas>,
    pub ui_font: Handle<Font>,
}

#[derive(Resource)]
pub struct GameConfig {
    pub map_width: u32,
    pub map_height: u32,
    pub turn_timer_seconds: u32,
}

fn load_assets(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut texture_atlases: ResMut<Assets<TextureAtlas>>,
) {
    let texture_handle = asset_server.load("sprites/units.png");
    let texture_atlas = TextureAtlas::from_grid(
        texture_handle,
        Vec2::new(64.0, 64.0),
        8,
        8,
        None,
        None,
    );
    let atlas_handle = texture_atlases.add(texture_atlas);

    commands.insert_resource(GameAssets {
        unit_sprites: atlas_handle,
        tile_sprites: Default::default(),
        ui_font: asset_server.load("fonts/main.ttf"),
    });
}

// Asset loading state management
#[derive(Resource, Default)]
pub struct AssetLoadingState {
    pub handles: Vec<HandleUntyped>,
    pub loaded: bool,
}

fn check_assets_loaded(
    asset_server: Res<AssetServer>,
    loading: Res<AssetLoadingState>,
    mut next_state: ResMut<NextState<GameState>>,
) {
    use bevy::asset::LoadState;

    let all_loaded = loading.handles.iter().all(|h| {
        matches!(
            asset_server.get_load_state(h.id()),
            Some(LoadState::Loaded)
        )
    });

    if all_loaded {
        next_state.set(GameState::MainMenu);
    }
}
```

### 5. Error Handling Patterns

#### Custom Error Types with thiserror

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GameError {
    #[error("Unit {0} has no movement points remaining")]
    NoMovementPoints(Entity),

    #[error("Cannot move to tile at ({x}, {y}): {reason}")]
    InvalidMove { x: i32, y: i32, reason: String },

    #[error("City cannot be founded here: {0}")]
    InvalidCityLocation(String),

    #[error("Save/load error: {0}")]
    SaveError(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
}

// Result type alias for convenience
pub type GameResult<T> = Result<T, GameError>;

// Using Result in systems (via commands)
fn try_move_unit(
    unit: Entity,
    target: Position,
    units: &Query<(&Position, &Movement), With<Unit>>,
    map: &GameMap,
) -> GameResult<()> {
    let (pos, movement) = units.get(unit)
        .map_err(|_| GameError::InvalidMove {
            x: target.x,
            y: target.y,
            reason: "Unit not found".to_string(),
        })?;

    if movement.points == 0 {
        return Err(GameError::NoMovementPoints(unit));
    }

    if !map.is_passable(target) {
        return Err(GameError::InvalidMove {
            x: target.x,
            y: target.y,
            reason: "Tile is impassable".to_string(),
        });
    }

    Ok(())
}

// Error events for UI feedback
#[derive(Event)]
pub struct GameErrorEvent {
    pub error: GameError,
}
```

#### Option Handling Patterns

```rust
// Use Option for optional game state
#[derive(Resource, Default)]
pub struct SelectedUnit(pub Option<Entity>);

#[derive(Resource, Default)]
pub struct HoveredTile(pub Option<Position>);

// Pattern: if-let for optional resources
fn handle_selection(
    selected: Res<SelectedUnit>,
    units: Query<&Unit>,
) {
    if let Some(entity) = selected.0 {
        if let Ok(unit) = units.get(entity) {
            // Process selected unit
        }
    }
}

// Pattern: Option combinators
fn get_unit_info(
    selected: Res<SelectedUnit>,
    units: Query<(&Unit, &Health, &Movement)>,
) -> Option<UnitInfo> {
    selected.0
        .and_then(|e| units.get(e).ok())
        .map(|(unit, health, movement)| UnitInfo {
            name: unit.name.clone(),
            health: health.current,
            movement: movement.points,
        })
}
```

## Ownership-Friendly Architectures

### 1. Generational Indices with slotmap

```rust
use slotmap::{SlotMap, new_key_type};

new_key_type! {
    pub struct UnitId;
    pub struct CityId;
    pub struct TileId;
}

// Using SlotMap for entity storage
pub struct GameWorld {
    units: SlotMap<UnitId, UnitData>,
    cities: SlotMap<CityId, CityData>,
    tiles: SlotMap<TileId, TileData>,
}

impl GameWorld {
    pub fn spawn_unit(&mut self, data: UnitData) -> UnitId {
        self.units.insert(data)
    }

    pub fn get_unit(&self, id: UnitId) -> Option<&UnitData> {
        self.units.get(id)
    }

    pub fn get_unit_mut(&mut self, id: UnitId) -> Option<&mut UnitData> {
        self.units.get_mut(id)
    }

    pub fn remove_unit(&mut self, id: UnitId) -> Option<UnitData> {
        self.units.remove(id)
    }
}

// Safe iteration
impl GameWorld {
    pub fn process_all_units(&mut self) {
        for (id, unit) in self.units.iter_mut() {
            unit.movement_points = unit.max_movement;
        }
    }

    // Collecting IDs for deferred removal (avoids borrow issues)
    pub fn remove_dead_units(&mut self) {
        let dead: Vec<UnitId> = self.units
            .iter()
            .filter(|(_, u)| u.health <= 0)
            .map(|(id, _)| id)
            .collect();

        for id in dead {
            self.units.remove(id);
        }
    }
}
```

### 2. Arena Allocators with typed-arena

```rust
use typed_arena::Arena;

// Arenas for game data with same lifetime
pub struct TurnArena<'a> {
    actions: Arena<Action>,
    paths: Arena<Vec<Position>>,
    _phantom: PhantomData<&'a ()>,
}

impl<'a> TurnArena<'a> {
    pub fn new() -> Self {
        Self {
            actions: Arena::new(),
            paths: Arena::new(),
            _phantom: PhantomData,
        }
    }

    pub fn alloc_action(&'a self, action: Action) -> &'a Action {
        self.actions.alloc(action)
    }

    pub fn alloc_path(&'a self, path: Vec<Position>) -> &'a [Position] {
        self.paths.alloc(path)
    }
}
```

### 3. Message Passing with Channels

```rust
use std::sync::mpsc::{channel, Sender, Receiver};

// Game action messages
pub enum GameMessage {
    MoveUnit { id: UnitId, target: Position },
    FoundCity { settler_id: UnitId },
    EndTurn,
    SaveGame { path: PathBuf },
}

// Message-based game engine
pub struct GameEngine {
    sender: Sender<GameMessage>,
    receiver: Receiver<GameMessage>,
    world: GameWorld,
}

impl GameEngine {
    pub fn new() -> Self {
        let (sender, receiver) = channel();
        Self {
            sender,
            receiver,
            world: GameWorld::new(),
        }
    }

    pub fn sender(&self) -> Sender<GameMessage> {
        self.sender.clone()
    }

    pub fn process_messages(&mut self) {
        while let Ok(msg) = self.receiver.try_recv() {
            match msg {
                GameMessage::MoveUnit { id, target } => {
                    self.world.move_unit(id, target);
                }
                GameMessage::FoundCity { settler_id } => {
                    self.world.found_city(settler_id);
                }
                GameMessage::EndTurn => {
                    self.world.end_turn();
                }
                GameMessage::SaveGame { path } => {
                    self.save_game(&path);
                }
            }
        }
    }
}
```

### 4. Interior Mutability Patterns

```rust
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::{Arc, Mutex, RwLock};

// RefCell for single-threaded interior mutability
pub struct GameCache {
    pathfinding_cache: RefCell<HashMap<(Position, Position), Vec<Position>>>,
}

impl GameCache {
    pub fn get_or_compute_path(
        &self,
        from: Position,
        to: Position,
        map: &GameMap,
    ) -> Vec<Position> {
        let key = (from, to);

        // Check cache first
        if let Some(path) = self.pathfinding_cache.borrow().get(&key) {
            return path.clone();
        }

        // Compute and cache
        let path = map.find_path(from, to);
        self.pathfinding_cache.borrow_mut().insert(key, path.clone());
        path
    }
}

// RwLock for thread-safe shared state (multiplayer)
pub struct SharedGameState {
    world: RwLock<GameWorld>,
    players: RwLock<Vec<Player>>,
}

impl SharedGameState {
    pub fn read_world<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&GameWorld) -> R,
    {
        let guard = self.world.read().unwrap();
        f(&guard)
    }

    pub fn write_world<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&mut GameWorld) -> R,
    {
        let mut guard = self.world.write().unwrap();
        f(&mut guard)
    }
}

// Arc for shared ownership across threads
pub type SharedState = Arc<SharedGameState>;
```

## Game-Specific Patterns

### 1. Turn-Based Game Loop Architecture

```rust
// Turn structure
#[derive(Resource)]
pub struct TurnState {
    pub current_turn: u32,
    pub current_player: PlayerId,
    pub phase: TurnPhase,
    pub timer: Option<Timer>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum TurnPhase {
    Movement,
    Action,
    Production,
    EndTurn,
}

// Turn-based systems
fn turn_timer_system(
    time: Res<Time>,
    mut turn_state: ResMut<TurnState>,
    mut turn_events: EventWriter<TurnEndEvent>,
) {
    if let Some(ref mut timer) = turn_state.timer {
        timer.tick(time.delta());
        if timer.just_finished() {
            turn_events.send(TurnEndEvent {
                turn_number: turn_state.current_turn,
            });
        }
    }
}

fn process_turn_end(
    mut turn_events: EventReader<TurnEndEvent>,
    mut turn_state: ResMut<TurnState>,
    mut units: Query<&mut Movement, With<Unit>>,
    mut cities: Query<&mut City>,
) {
    for event in turn_events.read() {
        // Reset unit movement
        for mut movement in units.iter_mut() {
            movement.points = movement.max_points;
        }

        // Process city production
        for mut city in cities.iter_mut() {
            city.process_production();
        }

        // Advance turn
        turn_state.current_turn += 1;
        turn_state.phase = TurnPhase::Movement;
    }
}

// System ordering for turn phases
app.add_systems(
    Update,
    (
        turn_timer_system,
        process_turn_end,
    ).chain().run_if(in_state(GameState::InGame))
);
```

### 2. Networking Patterns for Multiplayer

#### WebSocket with tokio

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, WebSocketStream};
use futures_util::{SinkExt, StreamExt};

// Network message types
#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum NetworkMessage {
    Connect { player_name: String },
    Disconnect { player_id: PlayerId },
    GameAction { action: GameAction },
    StateSync { state: GameStateSnapshot },
    TurnEnd { turn: u32 },
    Chat { player_id: PlayerId, message: String },
}

#[derive(Serialize, Deserialize, Clone)]
pub enum GameAction {
    MoveUnit { unit_id: u64, target: Position },
    FoundCity { unit_id: u64 },
    EndTurn,
}

// Server implementation
pub struct GameServer {
    clients: HashMap<PlayerId, WebSocketStream<TcpStream>>,
    game_state: GameWorld,
}

impl GameServer {
    pub async fn run(addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;

        while let Ok((stream, _)) = listener.accept().await {
            let ws_stream = accept_async(stream).await?;
            tokio::spawn(Self::handle_connection(ws_stream));
        }

        Ok(())
    }

    async fn handle_connection(mut ws: WebSocketStream<TcpStream>) {
        while let Some(msg) = ws.next().await {
            if let Ok(msg) = msg {
                if let Ok(text) = msg.to_text() {
                    if let Ok(network_msg) = serde_json::from_str::<NetworkMessage>(text) {
                        // Process message
                    }
                }
            }
        }
    }
}

// Bevy integration with async runtime
#[derive(Resource)]
pub struct NetworkChannel {
    pub sender: tokio::sync::mpsc::Sender<NetworkMessage>,
    pub receiver: tokio::sync::mpsc::Receiver<NetworkMessage>,
}

fn network_receive_system(
    mut channel: ResMut<NetworkChannel>,
    mut game_events: EventWriter<GameActionEvent>,
) {
    while let Ok(msg) = channel.receiver.try_recv() {
        match msg {
            NetworkMessage::GameAction { action } => {
                game_events.send(GameActionEvent(action));
            }
            _ => {}
        }
    }
}
```

### 3. Map/Tile System Architecture

```rust
// Hexagonal coordinate system
#[derive(Component, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HexCoord {
    pub q: i32,  // Column
    pub r: i32,  // Row
}

impl HexCoord {
    pub const DIRECTIONS: [HexCoord; 6] = [
        HexCoord { q: 1, r: 0 },
        HexCoord { q: 1, r: -1 },
        HexCoord { q: 0, r: -1 },
        HexCoord { q: -1, r: 0 },
        HexCoord { q: -1, r: 1 },
        HexCoord { q: 0, r: 1 },
    ];

    pub fn neighbors(&self) -> impl Iterator<Item = HexCoord> + '_ {
        Self::DIRECTIONS.iter().map(|d| HexCoord {
            q: self.q + d.q,
            r: self.r + d.r,
        })
    }

    pub fn distance(&self, other: &HexCoord) -> i32 {
        ((self.q - other.q).abs()
            + (self.q + self.r - other.q - other.r).abs()
            + (self.r - other.r).abs()) / 2
    }

    pub fn to_pixel(&self, size: f32) -> Vec2 {
        let x = size * (3.0_f32.sqrt() * self.q as f32
            + 3.0_f32.sqrt() / 2.0 * self.r as f32);
        let y = size * (3.0 / 2.0 * self.r as f32);
        Vec2::new(x, y)
    }
}

// Tile data structure
#[derive(Component, Clone, Serialize, Deserialize)]
pub struct TileData {
    pub terrain: TerrainType,
    pub feature: Option<TileFeature>,
    pub resource: Option<Resource>,
    pub river_edges: RiverEdges,
    pub improvement: Option<Improvement>,
}

#[derive(Clone, Copy, Serialize, Deserialize)]
pub enum TerrainType {
    Grassland,
    Plains,
    Desert,
    Tundra,
    Snow,
    Ocean,
    Coast,
    Mountain,
}

// Map storage with efficient lookup
#[derive(Resource)]
pub struct GameMap {
    tiles: HashMap<HexCoord, Entity>,
    width: i32,
    height: i32,
}

impl GameMap {
    pub fn get_tile(&self, coord: HexCoord) -> Option<Entity> {
        self.tiles.get(&coord).copied()
    }

    pub fn get_neighbors(&self, coord: HexCoord) -> Vec<Entity> {
        coord.neighbors()
            .filter_map(|c| self.tiles.get(&c).copied())
            .collect()
    }

    // A* pathfinding
    pub fn find_path(
        &self,
        from: HexCoord,
        to: HexCoord,
        tiles: &Query<&TileData>,
    ) -> Option<Vec<HexCoord>> {
        use std::collections::BinaryHeap;
        use std::cmp::Reverse;

        let mut open_set = BinaryHeap::new();
        let mut came_from = HashMap::new();
        let mut g_score = HashMap::new();

        g_score.insert(from, 0);
        open_set.push(Reverse((from.distance(&to), from)));

        while let Some(Reverse((_, current))) = open_set.pop() {
            if current == to {
                return Some(self.reconstruct_path(&came_from, current));
            }

            for neighbor in current.neighbors() {
                if let Some(entity) = self.get_tile(neighbor) {
                    if let Ok(tile) = tiles.get(entity) {
                        let move_cost = tile.movement_cost();
                        if move_cost < 999 {
                            let tentative_g = g_score[&current] + move_cost;

                            if tentative_g < *g_score.get(&neighbor).unwrap_or(&i32::MAX) {
                                came_from.insert(neighbor, current);
                                g_score.insert(neighbor, tentative_g);
                                let f_score = tentative_g + neighbor.distance(&to);
                                open_set.push(Reverse((f_score, neighbor)));
                            }
                        }
                    }
                }
            }
        }

        None
    }

    fn reconstruct_path(
        &self,
        came_from: &HashMap<HexCoord, HexCoord>,
        mut current: HexCoord,
    ) -> Vec<HexCoord> {
        let mut path = vec![current];
        while let Some(&prev) = came_from.get(&current) {
            path.push(prev);
            current = prev;
        }
        path.reverse();
        path
    }
}
```

### 4. UI Patterns

#### Immediate Mode UI with egui

```rust
use bevy_egui::{egui, EguiContexts, EguiPlugin};

fn ui_system(
    mut contexts: EguiContexts,
    game_state: Res<TurnState>,
    selected: Res<SelectedUnit>,
    units: Query<(&Unit, &Health, &Movement)>,
) {
    let ctx = contexts.ctx_mut();

    // Top bar
    egui::TopBottomPanel::top("top_panel").show(ctx, |ui| {
        ui.horizontal(|ui| {
            ui.label(format!("Turn: {}", game_state.current_turn));
            ui.separator();
            ui.label(format!("Gold: 100"));
            ui.label(format!("Science: 50"));
        });
    });

    // Selected unit panel
    if let Some(entity) = selected.0 {
        if let Ok((unit, health, movement)) = units.get(entity) {
            egui::Window::new("Unit Info")
                .anchor(egui::Align2::RIGHT_BOTTOM, [-10.0, -10.0])
                .show(ctx, |ui| {
                    ui.heading(&unit.name);
                    ui.label(format!("Health: {}/{}", health.current, health.max));
                    ui.label(format!("Movement: {}/{}", movement.points, movement.max_points));

                    if ui.button("Fortify").clicked() {
                        // Handle fortify action
                    }
                });
        }
    }
}
```

#### Retained Mode UI with Bevy UI

```rust
// UI components
#[derive(Component)]
pub struct UnitInfoPanel;

#[derive(Component)]
pub struct HealthBar;

#[derive(Component)]
pub struct TurnCounter;

// Spawn UI
fn spawn_ui(mut commands: Commands, assets: Res<GameAssets>) {
    commands
        .spawn(NodeBundle {
            style: Style {
                width: Val::Percent(100.0),
                height: Val::Px(50.0),
                justify_content: JustifyContent::SpaceBetween,
                ..default()
            },
            background_color: Color::rgba(0.1, 0.1, 0.1, 0.8).into(),
            ..default()
        })
        .with_children(|parent| {
            parent.spawn((
                TextBundle::from_section(
                    "Turn: 1",
                    TextStyle {
                        font: assets.ui_font.clone(),
                        font_size: 24.0,
                        color: Color::WHITE,
                    },
                ),
                TurnCounter,
            ));
        });
}

// Update UI
fn update_turn_counter(
    turn_state: Res<TurnState>,
    mut query: Query<&mut Text, With<TurnCounter>>,
) {
    if turn_state.is_changed() {
        for mut text in query.iter_mut() {
            text.sections[0].value = format!("Turn: {}", turn_state.current_turn);
        }
    }
}
```

### 5. Save/Load Serialization Patterns

```rust
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufReader, BufWriter};

// Saveable game state
#[derive(Serialize, Deserialize)]
pub struct SaveData {
    pub version: u32,
    pub turn: u32,
    pub map: MapSaveData,
    pub players: Vec<PlayerSaveData>,
    pub units: Vec<UnitSaveData>,
    pub cities: Vec<CitySaveData>,
}

#[derive(Serialize, Deserialize)]
pub struct UnitSaveData {
    pub id: u64,
    pub unit_type: String,
    pub position: (i32, i32),
    pub owner: u64,
    pub health: i32,
    pub movement: u32,
}

// Save system
fn save_game_system(
    keyboard: Res<Input<KeyCode>>,
    turn_state: Res<TurnState>,
    units: Query<(Entity, &Unit, &Position, &Owner, &Health, &Movement)>,
    cities: Query<(&City, &Position, &Owner)>,
    map: Res<GameMap>,
) {
    if keyboard.just_pressed(KeyCode::F5) {
        let save_data = SaveData {
            version: 1,
            turn: turn_state.current_turn,
            map: map.to_save_data(),
            players: vec![], // Collect player data
            units: units.iter().map(|(e, u, p, o, h, m)| {
                UnitSaveData {
                    id: e.index() as u64,
                    unit_type: u.unit_type.clone(),
                    position: (p.x, p.y),
                    owner: o.0.index() as u64,
                    health: h.current,
                    movement: m.points,
                }
            }).collect(),
            cities: vec![], // Collect city data
        };

        let file = File::create("savegame.json").expect("Failed to create save file");
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, &save_data)
            .expect("Failed to write save data");
    }
}

// Load system
fn load_game_system(
    mut commands: Commands,
    keyboard: Res<Input<KeyCode>>,
    mut next_state: ResMut<NextState<GameState>>,
) {
    if keyboard.just_pressed(KeyCode::F9) {
        let file = File::open("savegame.json").expect("Failed to open save file");
        let reader = BufReader::new(file);
        let save_data: SaveData = serde_json::from_reader(reader)
            .expect("Failed to read save data");

        // Spawn entities from save data
        for unit in save_data.units {
            commands.spawn((
                Unit { unit_type: unit.unit_type },
                Position { x: unit.position.0, y: unit.position.1 },
                Health { current: unit.health, max: 100 },
                Movement { points: unit.movement, max_points: 2 },
            ));
        }

        next_state.set(GameState::InGame);
    }
}
```

## Agent-Friendly Considerations

### 1. Patterns Easiest for AI to Generate Correctly

#### Simple, Predictable Component Definitions

```rust
// GOOD: Clear, predictable pattern
#[derive(Component, Default, Clone, Debug)]
pub struct Health {
    pub current: i32,
    pub max: i32,
}

#[derive(Component, Default, Clone, Debug)]
pub struct Movement {
    pub points: u32,
    pub max_points: u32,
}

// Template that AI can follow
#[derive(Component, Default, Clone, Debug)]
pub struct [ComponentName] {
    pub field1: Type1,
    pub field2: Type2,
}
```

#### Consistent System Signatures

```rust
// GOOD: Consistent system pattern
fn system_name(
    // Queries first
    mut query: Query<(&Component1, &mut Component2), With<Marker>>,
    // Then resources
    resource: Res<ResourceType>,
    mut mut_resource: ResMut<MutableResource>,
    // Then events
    mut events: EventWriter<EventType>,
    // Then time/input last
    time: Res<Time>,
) {
    for (comp1, mut comp2) in query.iter_mut() {
        // Logic here
    }
}
```

#### Builder Pattern for Complex Initialization

```rust
// GOOD: Builder pattern is predictable for AI
pub struct UnitBuilder {
    unit_type: String,
    position: Option<Position>,
    health: Option<i32>,
    movement: Option<u32>,
}

impl UnitBuilder {
    pub fn new(unit_type: impl Into<String>) -> Self {
        Self {
            unit_type: unit_type.into(),
            position: None,
            health: None,
            movement: None,
        }
    }

    pub fn position(mut self, pos: Position) -> Self {
        self.position = Some(pos);
        self
    }

    pub fn health(mut self, health: i32) -> Self {
        self.health = Some(health);
        self
    }

    pub fn build(self, commands: &mut Commands) -> Entity {
        commands.spawn((
            Unit { unit_type: self.unit_type },
            self.position.unwrap_or_default(),
            Health {
                current: self.health.unwrap_or(100),
                max: self.health.unwrap_or(100),
            },
            Movement {
                points: self.movement.unwrap_or(2),
                max_points: self.movement.unwrap_or(2),
            },
        )).id()
    }
}
```

### 2. Common Pitfalls AI Agents Encounter with Rust

#### Pitfall 1: Borrow Checker Conflicts in Queries

```rust
// BAD: Multiple mutable borrows
fn problematic_system(
    mut units: Query<&mut Position, With<Unit>>,
    mut tiles: Query<&mut TileData>,
) {
    for mut unit_pos in units.iter_mut() {
        // Cannot iterate tiles mutably while holding unit reference
        for mut tile in tiles.iter_mut() {
            // Compiler error!
        }
    }
}

// GOOD: Collect data first, then mutate
fn fixed_system(
    units: Query<(Entity, &Position), With<Unit>>,
    mut tiles: Query<&mut TileData>,
) {
    // Collect immutable data first
    let unit_positions: Vec<(Entity, Position)> = units
        .iter()
        .map(|(e, p)| (e, *p))
        .collect();

    // Then mutate tiles
    for (entity, pos) in unit_positions {
        if let Ok(mut tile) = tiles.get_mut(/* tile entity */) {
            // Mutate tile
        }
    }
}
```

#### Pitfall 2: Lifetime Issues with References

```rust
// BAD: Returning reference to local
fn get_unit_name<'a>(units: &Query<&Unit>) -> &'a str {
    let unit = units.iter().next().unwrap();
    &unit.name  // Error: reference to value owned by query
}

// GOOD: Return owned data
fn get_unit_name(units: &Query<&Unit>) -> Option<String> {
    units.iter().next().map(|u| u.name.clone())
}

// GOOD: Or use callback pattern
fn with_unit_name<F, R>(units: &Query<&Unit>, f: F) -> Option<R>
where
    F: FnOnce(&str) -> R,
{
    units.iter().next().map(|u| f(&u.name))
}
```

#### Pitfall 3: Move Errors with Closures

```rust
// BAD: Value moved into closure
fn problematic(value: String) {
    let closure1 = || println!("{}", value);  // value moved here
    let closure2 = || println!("{}", value);  // Error: value already moved

    closure1();
    closure2();
}

// GOOD: Clone or use references
fn fixed(value: String) {
    let value_clone = value.clone();
    let closure1 = move || println!("{}", value);
    let closure2 = move || println!("{}", value_clone);

    closure1();
    closure2();
}
```

### 3. Patterns That Minimize Borrow Checker Conflicts

#### Pattern: Command Pattern for Deferred Mutation

```rust
// Using Bevy Commands for deferred entity manipulation
fn spawn_system(
    mut commands: Commands,
    // No direct entity mutation - commands are deferred
) {
    commands.spawn((
        Unit::default(),
        Position::default(),
    ));

    // Commands execute after system completes
}

// Custom command for complex operations
pub struct SpawnCityCommand {
    position: Position,
    owner: Entity,
}

impl Command for SpawnCityCommand {
    fn apply(self, world: &mut World) {
        world.spawn((
            City::default(),
            self.position,
            Owner(self.owner),
        ));
    }
}
```

#### Pattern: Event-Based Decoupling

```rust
// Events allow systems to communicate without shared mutable state
#[derive(Event)]
pub struct DamageEvent {
    pub target: Entity,
    pub amount: i32,
    pub source: Entity,
}

// System 1: Sends damage events
fn combat_system(
    attackers: Query<(Entity, &Attack, &Target)>,
    mut damage_events: EventWriter<DamageEvent>,
) {
    for (entity, attack, target) in attackers.iter() {
        damage_events.send(DamageEvent {
            target: target.0,
            amount: attack.damage,
            source: entity,
        });
    }
}

// System 2: Processes damage (no borrow conflict)
fn damage_system(
    mut damage_events: EventReader<DamageEvent>,
    mut health_query: Query<&mut Health>,
) {
    for event in damage_events.read() {
        if let Ok(mut health) = health_query.get_mut(event.target) {
            health.current -= event.amount;
        }
    }
}
```

#### Pattern: Index-Based Access

```rust
// Using indices instead of references
#[derive(Resource)]
pub struct UnitRegistry {
    units: Vec<UnitData>,
    free_indices: Vec<usize>,
}

impl UnitRegistry {
    pub fn add(&mut self, unit: UnitData) -> usize {
        if let Some(index) = self.free_indices.pop() {
            self.units[index] = unit;
            index
        } else {
            self.units.push(unit);
            self.units.len() - 1
        }
    }

    pub fn get(&self, index: usize) -> Option<&UnitData> {
        self.units.get(index)
    }

    pub fn get_mut(&mut self, index: usize) -> Option<&mut UnitData> {
        self.units.get_mut(index)
    }
}

// Usage: No complex lifetimes
fn process_units(mut registry: ResMut<UnitRegistry>) {
    let count = registry.units.len();
    for i in 0..count {
        if let Some(unit) = registry.get_mut(i) {
            unit.movement = unit.max_movement;
        }
    }
}
```

### 4. Clear, Predictable Code Structures

#### Project Structure

```
src/
  main.rs              # App entry point
  lib.rs               # Library root (optional)

  # Feature modules
  components/
    mod.rs             # Component re-exports
    unit.rs            # Unit-related components
    city.rs            # City-related components
    map.rs             # Map-related components

  systems/
    mod.rs             # System re-exports
    movement.rs        # Movement systems
    combat.rs          # Combat systems
    production.rs      # Production systems
    turn.rs            # Turn management systems

  resources/
    mod.rs             # Resource re-exports
    game_state.rs      # Game state resources
    config.rs          # Configuration resources

  events/
    mod.rs             # Event re-exports
    game_events.rs     # All game events

  plugins/
    mod.rs             # Plugin re-exports
    game_plugin.rs     # Main game plugin
    ui_plugin.rs       # UI plugin
    network_plugin.rs  # Networking plugin

  utils/
    mod.rs
    hex.rs             # Hex coordinate utilities
    pathfinding.rs     # Pathfinding algorithms
```

#### Module Pattern

```rust
// components/mod.rs
mod unit;
mod city;
mod map;

pub use unit::*;
pub use city::*;
pub use map::*;

// components/unit.rs
use bevy::prelude::*;

#[derive(Component, Default, Clone, Debug)]
pub struct Unit {
    pub unit_type: String,
}

#[derive(Component, Default, Clone, Debug)]
pub struct Health {
    pub current: i32,
    pub max: i32,
}

#[derive(Component, Default, Clone, Debug)]
pub struct Movement {
    pub points: u32,
    pub max_points: u32,
}

// All components in a bundle for easy spawning
#[derive(Bundle, Default)]
pub struct UnitBundle {
    pub unit: Unit,
    pub health: Health,
    pub movement: Movement,
    pub position: Position,
}
```

## Recommended Libraries/Frameworks

### Game Engines

| Engine | Pros | Cons | AI-Friendliness |
|--------|------|------|-----------------|
| **Bevy** | Modern ECS, active community, excellent docs | Compile times, still maturing | Excellent |
| macroquad | Simple, fast compile, immediate mode | Less structured, fewer features | Good |
| ggez | Simple 2D, good for prototypes | Smaller community, basic features | Good |
| piston | Modular, veteran project | Complex setup, less active | Fair |

**Recommendation**: Bevy for production, macroquad for rapid prototyping

### Networking

| Library | Use Case | Notes |
|---------|----------|-------|
| **tokio** | Async runtime | Industry standard |
| **tokio-tungstenite** | WebSocket | Works well with tokio |
| **async-std** | Alternative async runtime | Simpler API |
| **quinn** | QUIC protocol | Good for real-time |
| bevy_replicon | Bevy replication | Native Bevy integration |

### Serialization

| Library | Use Case | Notes |
|---------|----------|-------|
| **serde** | Universal serialization | Required |
| serde_json | JSON format | Human readable saves |
| bincode | Binary format | Fast, compact saves |
| ron | Rust Object Notation | Config files |
| toml | Config files | Cargo.toml format |

### UI

| Library | Type | Notes |
|---------|------|-------|
| **bevy_egui** | Immediate mode | Best for debug UI, good for game UI |
| bevy_ui | Retained mode | Native Bevy, more control |
| kayak_ui | Retained mode | React-like |

### Utilities

| Library | Purpose |
|---------|---------|
| **slotmap** | Generational indices |
| **thiserror** | Error type derivation |
| **anyhow** | Error handling |
| **tracing** | Logging/diagnostics |
| **rand** | Random number generation |
| **noise** | Procedural generation |
| **pathfinding** | A*, Dijkstra algorithms |

## Key Files (for Reference Implementation)

| File | Purpose |
|------|---------|
| `src/main.rs` | Application entry point, plugin registration |
| `src/components/unit.rs` | Unit-related components |
| `src/components/map.rs` | Tile and map components |
| `src/systems/movement.rs` | Unit movement logic |
| `src/systems/turn.rs` | Turn management |
| `src/events/game_events.rs` | All game events |
| `src/resources/game_state.rs` | Global game state |
| `src/plugins/game_plugin.rs` | Core game plugin |
| `Cargo.toml` | Dependencies |

## Recommendations

### For AI Agent Development

1. **Use Bevy ECS**: Its structured approach with Components, Systems, and Resources maps well to how AI generates code. Each piece is self-contained and has clear interfaces.

2. **Favor Events Over Shared State**: Events are safer for AI to generate because they avoid complex borrow scenarios.

3. **Use Builder Patterns**: Builders provide clear, chainable APIs that AI can pattern match effectively.

4. **Keep Systems Small**: Single-responsibility systems (< 50 lines) are easier for AI to understand and modify without breaking other functionality.

5. **Define Clear Interfaces**: Use traits and type aliases to establish patterns AI can follow:
   ```rust
   pub type Position = HexCoord;
   pub type GameResult<T> = Result<T, GameError>;
   ```

6. **Document with Examples**: Inline examples in doc comments help AI understand intended usage.

7. **Consistent Error Handling**: Always use `Result` or `Option` rather than panicking. AI can learn the pattern and apply it consistently.

8. **Prefer Clone over Complex Lifetimes**: For game data, cloning is often simpler than managing lifetimes and prevents borrow checker issues.

### Project Setup for AI Development

```toml
# Cargo.toml
[package]
name = "openciv"
version = "0.1.0"
edition = "2021"

[dependencies]
bevy = { version = "0.12", features = ["dynamic_linking"] }
bevy_egui = "0.24"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
rand = "0.8"
noise = "0.8"
slotmap = { version = "1.0", features = ["serde"] }
tokio = { version = "1.0", features = ["full"] }
tokio-tungstenite = "0.21"

[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3
```

### Starter Template

```rust
// main.rs
use bevy::prelude::*;

mod components;
mod events;
mod resources;
mod systems;
mod plugins;

use plugins::GamePlugin;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins)
        .add_plugins(GamePlugin)
        .run();
}

// plugins/game_plugin.rs
use bevy::prelude::*;
use crate::components::*;
use crate::events::*;
use crate::resources::*;
use crate::systems::*;

pub struct GamePlugin;

impl Plugin for GamePlugin {
    fn build(&self, app: &mut App) {
        app
            // States
            .add_state::<GameState>()

            // Events
            .add_event::<UnitMovedEvent>()
            .add_event::<TurnEndEvent>()
            .add_event::<CityFoundedEvent>()

            // Resources
            .init_resource::<TurnState>()
            .init_resource::<SelectedUnit>()

            // Systems
            .add_systems(Startup, setup)
            .add_systems(Update, (
                handle_input,
                movement_system,
                turn_system,
            ).run_if(in_state(GameState::InGame)));
    }
}
```

## Open Questions

1. **WASM Performance**: How well does Bevy perform when compiled to WebAssembly for browser deployment? Need benchmarking with large maps.

2. **Hot Reloading**: Bevy supports hot reloading of assets but not code. How does this affect AI development iteration speed?

3. **Multiplayer Architecture**: Should we use authoritative server (more secure) or client-authoritative (simpler) for AI-generated networking code?

4. **AI Testing**: How to set up automated testing for AI-generated Rust code? Consider integration tests with Bevy's testing utilities.

5. **Migration Path**: If starting with TypeScript (current OpenCiv), what's the path to progressively adopt Rust components (e.g., WASM modules for pathfinding)?

6. **Asset Pipeline**: How should assets be handled - Bevy's built-in asset system or external tooling?

7. **Save Compatibility**: How to handle save file versioning as game evolves through AI iterations?
