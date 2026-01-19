# Research: Game Architecture Partitioning for OpenCiv

**Date**: 2026-01-17
**Status**: Complete

## Summary

OpenCiv is a browser-based turn-based strategy game inspired by Civilization, built with TypeScript using a client-server WebSocket architecture. The codebase consists of approximately 65 TypeScript files split between a custom Canvas2D rendering client and a Node.js WebSocket server. This research explores the current architecture and recommends optimal partitioning strategies for building a similar game from scratch.

## Key Discoveries

- **Pure TypeScript Stack**: No game engine frameworks used - custom Canvas2D rendering system built from scratch
- **Client-Server Split**: Clear separation with WebSocket (ws) communication on port 2000
- **Singleton Pattern Heavy**: Game, GameMap, Server all use singleton patterns for global state access
- **Event-Driven Architecture**: Both client and server use custom event systems (NetworkEvents, ServerEvents)
- **Scene-Based State Machine**: Client uses Scene pattern; Server uses State pattern for game flow
- **Hexagonal Grid**: Map system implements hex grid with A* pathfinding duplicated on both sides
- **Monorepo Structure**: Single repository with separate package.json for client, server, and root
- **YAML Configuration**: Game data (civilizations, buildings, tiles, resources) stored in YAML config files

## Architecture Overview

### Project Structure
```
OpenCiv/
├── client/                    # Browser client (Parcel bundler)
│   ├── src/
│   │   ├── Index.ts          # Entry point
│   │   ├── Game.ts           # Main game singleton (~818 lines)
│   │   ├── Assets.ts         # Asset definitions and loading
│   │   ├── Unit.ts           # Client-side unit logic
│   │   ├── city/             # City-related components
│   │   ├── map/              # Map, Tile, River, HoveredTile
│   │   ├── network/          # WebSocket client
│   │   ├── player/           # Player abstractions
│   │   ├── scene/            # Scene system + specific scenes
│   │   ├── testing/          # E2E test framework
│   │   ├── ui/               # UI components (Button, Label, etc.)
│   │   └── util/             # Utility classes (Vector, Numbers, etc.)
│   ├── assets/               # Images, sprites, fonts
│   └── index.html
├── server/                    # Node.js server
│   ├── src/
│   │   ├── Server.ts         # WebSocket server entry
│   │   ├── Game.ts           # Server game state manager
│   │   ├── Player.ts         # Server-side player
│   │   ├── Events.ts         # Server event system
│   │   ├── city/             # Server city logic
│   │   ├── map/              # Map generation + tile logic
│   │   ├── state/            # Game states (Lobby, InGame)
│   │   └── unit/             # Server unit logic
│   └── config/               # YAML game data files
└── scripts/                   # Build/test scripts
```

### Current Module Dependencies

```
Client Side:
Game (singleton)
  └─> Scene (abstract) -> InGameScene, LobbyScene, MainMenuScene, etc.
      └─> Actor (base) -> ActorGroup -> Button, Unit, City, Tile
          └─> SceneObject (interface)
      └─> Camera
  └─> NetworkEvents (static) -> WebsocketClient
  └─> GameMap (singleton)
      └─> Tile -> Unit[], City, River

Server Side:
Server (singleton)
  └─> Game (singleton)
      └─> State (abstract) -> LobbyState, InGameState
      └─> Player[]
  └─> ServerEvents (static)
  └─> GameMap (singleton)
      └─> Tile -> Unit[], City
```

## Patterns Found

### 1. Rendering System
- **Custom Canvas2D Renderer**: No WebGL or game frameworks
- **Retained Mode Drawing**: Actors maintain state, redrawn each frame
- **Nine-Slice Scaling**: UI elements use nine-slice for resolution independence
- **Sprite Sheet System**: Single spritesheet with region-based sprite selection
- **Camera Transform**: Manual matrix transforms for zoom/pan
- **Actor Culling**: Off-screen actors culled before drawing
- **DPR Handling**: Device pixel ratio support for high-DPI displays

### 2. State Management
- **Scene Pattern (Client)**: Each screen (menu, lobby, game) is a Scene class
- **State Pattern (Server)**: LobbyState and InGameState manage server-side game phases
- **Event System**: Custom pub/sub for both network and local events
- **Global vs Local Events**: Events can be marked as "global" to persist across scene changes

### 3. Game Entity Architecture
- **ActorGroup Composition**: Complex entities (Unit, City, Button) extend ActorGroup
- **Tile-Based Entity Placement**: Units and cities reference their containing Tile
- **Dual Entity Classes**: Client and server have separate Unit/City/Tile classes
- **JSON Serialization**: Entities serialize to JSON for network transmission

### 4. Networking
- **WebSocket Protocol**: Raw JSON messages over WebSocket
- **Event-Based Messaging**: `{event: "eventName", ...data}` format
- **Authoritative Server**: Server validates moves, clients display results
- **Turn-Based Synchronization**: Server manages turn timer and progression

### 5. Map System
- **Hexagonal Grid**: Odd-row offset coordinate system
- **Procedural Generation**: Server generates terrain, biomes, rivers, resources
- **Chunk-Based Transmission**: Map sent in 4x4 tile chunks
- **A* Pathfinding**: Implemented on both client and server (duplicated)
- **Tile Layers**: Base terrain + overlays (forest, jungle, resources, city)

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/OpenCiv/client/src/Game.ts` | Main client singleton - canvas setup, game loop, input handling, rendering |
| `/Users/alex/workspace/OpenCiv/client/src/scene/Scene.ts` | Abstract base class for all game screens |
| `/Users/alex/workspace/OpenCiv/client/src/scene/Actor.ts` | Base drawable entity with input/event handling |
| `/Users/alex/workspace/OpenCiv/client/src/scene/type/InGameScene.ts` | Main gameplay scene with map, units, UI |
| `/Users/alex/workspace/OpenCiv/client/src/map/GameMap.ts` | Client-side map management and pathfinding |
| `/Users/alex/workspace/OpenCiv/client/src/map/Tile.ts` | Client tile with sprite generation and adjacency |
| `/Users/alex/workspace/OpenCiv/client/src/network/Client.ts` | WebSocket client and NetworkEvents system |
| `/Users/alex/workspace/OpenCiv/client/src/player/ClientPlayer.ts` | Local player input handling (selection, movement) |
| `/Users/alex/workspace/OpenCiv/server/src/Server.ts` | WebSocket server entry point |
| `/Users/alex/workspace/OpenCiv/server/src/Game.ts` | Server game state manager |
| `/Users/alex/workspace/OpenCiv/server/src/map/GameMap.ts` | Server-side procedural map generation (~1100 lines) |
| `/Users/alex/workspace/OpenCiv/server/src/state/type/InGameState.ts` | Server in-game state management |
| `/Users/alex/workspace/OpenCiv/server/src/unit/Unit.ts` | Server-side unit logic and movement |
| `/Users/alex/workspace/OpenCiv/server/config/civilizations.yml` | Civilization definitions |

## Technology Stack Analysis

### Current Stack
| Layer | Technology | Notes |
|-------|------------|-------|
| Client Bundler | Parcel 2.15 | Zero-config bundler |
| Client Language | TypeScript ES2022 | Modern JS features |
| Rendering | Canvas 2D API | Custom implementation |
| Server Runtime | Node.js + ts-node-dev | Hot reloading |
| Networking | ws (WebSocket) | Native WebSocket server |
| Data Format | JSON + YAML | Config in YAML, messages in JSON |
| Testing | Jest (server) + Custom E2E | Scenario-based client tests |
| Documentation | TypeDoc | API documentation generation |
| Containerization | Docker Compose | Multi-service deployment |

### Dependencies
- **Client**: Parcel, ts-priority-queue
- **Server**: ws, node-schedule, random, yaml, ts-node-dev
- **Shared**: None (code duplication between client/server)

## Recommendations for Optimal Partitioning

### 1. Core Engine Layer
Separate low-level systems that rarely change:
```
engine/
├── rendering/
│   ├── Canvas2DRenderer.ts    # Or WebGL renderer
│   ├── Camera.ts
│   ├── SpriteSheet.ts
│   └── NineSlice.ts
├── input/
│   ├── InputManager.ts
│   ├── KeyboardHandler.ts
│   └── MouseHandler.ts
├── math/
│   ├── Vector2.ts
│   ├── HexMath.ts
│   └── Pathfinding.ts
└── ecs/
    ├── Entity.ts
    ├── Component.ts
    └── System.ts
```

### 2. Shared Game Logic (New Package)
Extract code that must stay synchronized between client and server:
```
shared/
├── types/
│   ├── TileTypes.ts
│   ├── UnitTypes.ts
│   └── CivilizationTypes.ts
├── config/
│   ├── GameConfig.ts          # Loaded from YAML
│   └── BalanceConfig.ts
├── rules/
│   ├── MovementRules.ts
│   ├── CombatRules.ts
│   └── CityRules.ts
├── pathfinding/
│   └── AStarHex.ts            # Single source of truth
└── protocol/
    ├── MessageTypes.ts
    └── NetworkProtocol.ts
```

### 3. Client-Specific Modules
Presentation layer only:
```
client/
├── scenes/
│   ├── MainMenuScene.ts
│   ├── LobbyScene.ts
│   └── GameScene.ts
├── ui/
│   ├── components/            # Pure UI widgets
│   └── hud/                   # Game-specific HUD
├── game/
│   ├── MapRenderer.ts
│   ├── UnitRenderer.ts
│   ├── CityRenderer.ts
│   └── AnimationManager.ts
├── network/
│   └── NetworkClient.ts
└── assets/
    └── AssetLoader.ts
```

### 4. Server-Specific Modules
Game logic and authority:
```
server/
├── game/
│   ├── GameSession.ts
│   ├── TurnManager.ts
│   └── PlayerManager.ts
├── world/
│   ├── MapGenerator.ts
│   ├── TileManager.ts
│   └── FogOfWar.ts
├── entities/
│   ├── ServerUnit.ts
│   └── ServerCity.ts
├── network/
│   └── NetworkServer.ts
└── persistence/
    └── SaveLoadManager.ts
```

### 5. Recommended Module Boundaries

| Module | Responsibility | Dependencies |
|--------|---------------|--------------|
| `@openciv/engine` | Low-level rendering, input, math | None |
| `@openciv/shared` | Game rules, types, pathfinding | None |
| `@openciv/client` | UI, rendering, client networking | engine, shared |
| `@openciv/server` | Game logic, world gen, authority | shared |

### 6. Key Architectural Changes

1. **Entity Component System (ECS)**: Replace inheritance-heavy Actor hierarchy with composition
2. **Message Protocol**: Define typed message schemas instead of ad-hoc JSON
3. **Dependency Injection**: Replace singletons with DI for testability
4. **State Synchronization**: Consider using a deterministic lockstep or snapshot interpolation
5. **Asset Pipeline**: Implement proper asset bundling and caching
6. **Configuration Validation**: Schema validation for YAML config files

### 7. Build System Recommendations

```json
{
  "workspaces": [
    "packages/engine",
    "packages/shared",
    "packages/client",
    "packages/server"
  ]
}
```

Use npm/yarn workspaces or Turborepo for:
- Shared TypeScript configuration
- Coordinated builds
- Dependency hoisting
- Incremental builds

## Open Questions

1. **WebGL vs Canvas2D**: Should a rebuild use WebGL for better performance? Current Canvas2D limits sprite count and effects.

2. **Game Engine Framework**: Would adopting Phaser, PixiJS, or Babylon.js reduce development time vs. custom engine?

3. **State Synchronization**: Current model sends full state updates. Would delta compression or snapshot interpolation scale better for larger maps/more players?

4. **Shared Code Package**: How to handle TypeScript compilation for browser (ESM) vs. Node.js (CJS) in a shared package?

5. **Testing Strategy**: Current E2E tests require running server. Should unit tests cover more game logic in isolation?

6. **Persistence Layer**: No save/load implemented. What format (JSON, SQLite, binary) for game saves?

7. **Modding Support**: Should architecture support loading custom civilizations, units, or game rules?

## Appendix: File Counts by Category

| Category | Client Files | Server Files |
|----------|-------------|--------------|
| Core/Entry | 3 | 3 |
| Scene/State | 7 | 3 |
| Map/Tile | 5 | 4 |
| Entity (Unit/City) | 3 | 4 |
| Player | 3 | 1 |
| UI | 10 | 0 |
| Network | 1 | 1 |
| Utility | 5 | 1 |
| Testing | 4 | 2 |
| **Total** | **41** | **19** |
