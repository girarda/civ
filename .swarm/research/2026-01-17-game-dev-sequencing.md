# Research: Game Development Sequencing for OpenCiv

**Date**: 2026-01-17
**Status**: Complete

## Summary

This research analyzes the optimal sequencing strategy for developing OpenCiv, a browser-based Civilization-style 4X game. Based on existing research documents and the goal of delivering end-to-end features as fast as possible, the recommended approach is a vertical slice strategy that prioritizes playable milestones over horizontal layer completion. The sequencing emphasizes building foundational systems that unlock downstream features while maintaining tight iteration loops.

## Key Discoveries

- **Project is greenfield**: No existing source code in the repository yet - only research documents
- **Architecture decisions made**: TypeScript recommended as primary language (Rust as secondary for performance-critical paths)
- **Reference implementation exists**: OpenCiv codebase analyzed with ~68 TypeScript files across client/server
- **Core patterns identified**: Client-server WebSocket architecture, hexagonal grid, ECS-like patterns, YAML configuration
- **Major missing features in reference**: Combat, tech tree, AI opponents, victory conditions, fog of war, tile improvements

## Project End Goals (from research)

Based on the `.swarm/research/` documents, the end goals are:

1. **Browser-based multiplayer 4X game** inspired by Civilization (primarily Civ 5)
2. **WebSocket client-server architecture** with authoritative server
3. **Hexagonal tile map** with procedural generation
4. **Core 4X systems**: Cities, units, combat, technology, diplomacy
5. **8 civilizations** with unique abilities
6. **AI agent development workflow** optimized for rapid iteration

## Sequencing Strategy: Vertical Slices

### Core Principle: Playable at Every Phase

Each phase produces something playable and testable. Features are added end-to-end (UI + logic + networking) rather than building complete layers horizontally.

### Phase 0: Foundation (Week 1)
**Goal**: Skeleton that compiles and renders

| Component | Deliverable |
|-----------|-------------|
| Project setup | Vite + TypeScript, ESLint, Prettier |
| Build system | npm workspaces (shared/client/server) |
| Dev environment | Hot reload, source maps |
| Basic rendering | Canvas2D or PixiJS with camera controls |
| Placeholder assets | Colored rectangles for terrain |

**Playable milestone**: Pan/zoom over a grid of colored tiles

**Dependencies unlocked**:
- All subsequent rendering work
- Asset pipeline integration
- Input handling patterns

---

### Phase 1: Hex Grid + Map Display (Week 2)
**Goal**: Procedural map you can explore

| Component | Deliverable |
|-----------|-------------|
| Hex math library | Coordinate system, adjacency, distance |
| Tile data model | Terrain types, yields |
| Procedural generator | Landmass, biomes, height |
| Map renderer | Terrain sprites, tile yields |
| Tile hover info | Show tile details on hover |

**Playable milestone**: Generate and explore different procedural maps

**Dependencies unlocked**:
- Unit movement (needs hex adjacency)
- City territory (needs hex radius)
- Pathfinding (needs movement costs)
- Rivers and features (needs terrain data)

---

### Phase 2: Client-Server + Basic Networking (Week 3)
**Goal**: Two players see the same map

| Component | Deliverable |
|-----------|-------------|
| WebSocket server | Node.js + ws library |
| Network protocol | JSON message types |
| State synchronization | Map chunk transmission |
| Player connection | Join/disconnect handling |
| Turn timer | Basic countdown |

**Playable milestone**: Two browser windows connected, viewing same map

**Dependencies unlocked**:
- All multiplayer features
- Server-authoritative validation
- Chat and diplomacy
- Spectator mode

---

### Phase 3: Unit Spawning + Movement (Week 4)
**Goal**: Move a unit around the map

| Component | Deliverable |
|-----------|-------------|
| Unit data model | Type, position, movement points |
| Unit rendering | Sprite on tile |
| Selection system | Click to select |
| A* pathfinding | Shared between client/server |
| Movement execution | Server validates, broadcasts |
| Movement preview | Show path before committing |

**Playable milestone**: Select and move units with path preview

**Dependencies unlocked**:
- Combat (units can meet)
- Settler cities (units can act)
- Unit production (destination for units)
- Fog of war (vision from units)

---

### Phase 4: City Founding + Basic Economy (Week 5)
**Goal**: Settle a city that produces resources

| Component | Deliverable |
|-----------|-------------|
| Settler unit | Special unit type |
| City founding | Consume settler, create city |
| Territory | Hexes belong to city |
| Tile yields | Food, production, gold |
| City panel | View city stats |
| Population | Growth from food surplus |

**Playable milestone**: Found cities, watch them grow

**Dependencies unlocked**:
- Production queue
- Buildings
- Border expansion
- Trade routes
- Victory conditions (territory)

---

### Phase 5: Production Queue + Turns (Week 6)
**Goal**: Cities build units over multiple turns

| Component | Deliverable |
|-----------|-------------|
| Production queue | Select what to build |
| Turn processing | Advance production on turn end |
| Unit spawning | Complete unit appears adjacent to city |
| Building construction | Buildings modify city stats |
| Turn flow | All players ready -> new turn |

**Playable milestone**: Queue production, end turns, receive built units

**Dependencies unlocked**:
- Technology (unlocks production options)
- Victory conditions (production)
- AI (needs production decisions)
- Economy balance (production costs)

---

### Phase 6: Combat System (Week 7)
**Goal**: Units fight and destroy each other

| Component | Deliverable |
|-----------|-------------|
| Combat stats | Attack, defense, health |
| Damage calculation | Simplified Civ-style formula |
| Melee combat | Attack adjacent unit |
| Ranged combat | Attack at distance |
| Unit death | Remove from game |
| Combat preview | Show expected outcome |

**Playable milestone**: Two players can wage war

**Dependencies unlocked**:
- Unit promotions
- City sieges
- Victory conditions (domination)
- AI combat decisions
- Great generals

---

### Phase 7: Technology Tree (Week 8)
**Goal**: Research unlocks new options

| Component | Deliverable |
|-----------|-------------|
| Tech tree data | YAML/JSON configuration |
| Research queue | Select current research |
| Science accumulation | Per-turn science from cities |
| Tech completion | Unlock units/buildings |
| Tech tree UI | Visual tree with dependencies |

**Playable milestone**: Research technologies, unlock new units

**Dependencies unlocked**:
- Advanced units
- Victory conditions (science)
- Era progression
- AI research decisions

---

### Phase 8: Fog of War + Vision (Week 9)
**Goal**: Unknown map that reveals through exploration

| Component | Deliverable |
|-----------|-------------|
| Vision system | Units reveal tiles in radius |
| Fog states | Unexplored, revealed, visible |
| Fog rendering | Darken/hide unknown tiles |
| Memory | Remember last-seen state |
| Enemy visibility | Only see visible enemy units |

**Playable milestone**: Explore the map, discover opponents

**Dependencies unlocked**:
- Strategic gameplay
- Surprise attacks
- Scouting value
- Hidden information

---

### Phase 9: AI Opponents (Week 10)
**Goal**: Play against computer

| Component | Deliverable |
|-----------|-------------|
| AI framework | Decision-making loop |
| Exploration AI | Move units to explore |
| City placement | Choose where to settle |
| Production AI | Decide what to build |
| Combat AI | Attack/defend decisions |

**Playable milestone**: Singleplayer game against AI

**Dependencies unlocked**:
- Difficulty levels
- AI diplomacy
- Scenario design
- Balance testing

---

### Phase 10: Victory Conditions (Week 11)
**Goal**: Games have a winner

| Component | Deliverable |
|-----------|-------------|
| Domination victory | Capture all capitals |
| Science victory | Complete tech tree |
| Score victory | Turn limit reached |
| Victory UI | Display progress toward victories |
| Game end | Winner announcement |

**Playable milestone**: Complete games with winners

---

### Phase 11: Civilization Differentiation (Week 12)
**Goal**: Civilizations play differently

| Component | Deliverable |
|-----------|-------------|
| Unique abilities | Per-civ bonuses |
| Unique units | Replacement units |
| Unique buildings | Replacement buildings |
| Start biases | Preferred terrain |
| Leader personas | AI personality |

**Playable milestone**: Choose civilization, experience unique gameplay

---

## Feature Dependency Graph

```
Foundation
    |
    v
Hex Grid + Map ----+
    |              |
    v              |
Networking <-------+
    |
    +-------+-------+
    |       |       |
    v       v       v
  Units   Cities  Turns
    |       |       |
    +---+---+---+---+
        |       |
        v       v
     Combat  Production
        |       |
        +---+---+
            |
            v
         Tech Tree
            |
    +-------+-------+
    |       |       |
    v       v       v
  Fog of  AI     Victory
  War   Opponents Conditions
            |
            v
      Civilization
      Differentiation
```

## Key Files (Anticipated Structure)

| Path | Purpose |
|------|---------|
| `packages/shared/src/hex/` | Hex math, coordinates, pathfinding |
| `packages/shared/src/types/` | Shared type definitions |
| `packages/shared/src/config/` | YAML config loaders |
| `packages/client/src/Game.ts` | Main game loop |
| `packages/client/src/scenes/` | Scene management |
| `packages/client/src/rendering/` | Map, unit, city renderers |
| `packages/client/src/ui/` | UI components |
| `packages/client/src/network/` | WebSocket client |
| `packages/server/src/Server.ts` | WebSocket server |
| `packages/server/src/Game.ts` | Server game state |
| `packages/server/src/map/` | Map generation |
| `packages/server/src/state/` | Lobby, InGame states |
| `config/civilizations.yml` | Civilization definitions |
| `config/units.yml` | Unit definitions |
| `config/buildings.yml` | Building definitions |
| `config/technologies.yml` | Tech tree |

## Recommendations

### 1. Vertical Slice Per Sprint
Each week delivers something playable. Never spend a week on "infrastructure only" - always include visible progress.

### 2. Shared Package First
Create `packages/shared/` with hex math, types, and config loading before splitting client/server. This prevents drift and duplication.

### 3. Configuration-Driven Design
Use YAML/JSON for all game data (units, buildings, techs, civs) from day one. This enables:
- Balance iteration without code changes
- AI agent understanding of game rules
- Modding support later

### 4. Network Protocol Types
Define TypeScript interfaces for all network messages in `shared/`. This catches serialization errors at compile time.

### 5. Test at Integration Points
Focus testing on:
- Hex math (unit tested)
- Network message parsing (integration tested)
- Turn state transitions (integration tested)
- Pathfinding (unit tested)

### 6. Placeholder Art Strategy
Use colored shapes initially:
- Terrain: Colored hexagons
- Units: Colored circles with letter
- Cities: Colored squares
- UI: Simple rectangles

Replace with real art after gameplay is solid.

### 7. Defer Complex Features
Save these for after core loop is fun:
- Rivers and river crossing
- Resources (strategic, luxury)
- Tile improvements
- Religion
- Great people
- Espionage
- Trade routes
- City-states

### 8. AI Agent Workflow
Enable AI agents to develop features by:
- Clear module boundaries
- Comprehensive type definitions
- Minimal cross-module dependencies
- Self-documenting configuration files

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Pathfinding performance | Implement caching, limit search radius |
| Network sync issues | Use server-authoritative model from start |
| Map generation slow | Generate chunks lazily, cache tiles |
| Turn order bugs | Explicit state machine with clear transitions |
| AI too weak/strong | Start simple, add difficulty levels later |

## Open Questions

1. **Canvas2D vs WebGL**: Should we start with PixiJS (WebGL) for performance headroom, or Canvas2D for simplicity? Recommend PixiJS given expected tile counts.

2. **State Management**: Use Redux-style state on client, or simpler component state? Recommend simpler approach initially, refactor if needed.

3. **Asset Pipeline**: When to invest in proper sprite sheet tooling? Recommend after Phase 6 when art requirements are clearer.

4. **Multiplayer Testing**: How to automate multiplayer testing? Recommend headless client mode with scripted actions.

5. **Persistence**: When to add save/load? Recommend after Phase 5 when turn structure is stable.

6. **Mod Support**: Design for modding from start, or add later? Recommend configuration-driven design now, formal mod API later.

## Summary: Critical Path

The fastest path to a fun, playable game:

1. **Weeks 1-4**: Map + Networking + Units (minimum viable game)
2. **Weeks 5-6**: Cities + Production (game loop complete)
3. **Weeks 7-8**: Combat + Tech (strategic depth)
4. **Weeks 9-11**: Fog + AI + Victory (singleplayer possible)
5. **Week 12**: Civilization variety (replayability)

At Week 6, you have a multiplayer turn-based strategy game.
At Week 9, you have a singleplayer experience.
At Week 12, you have distinct civilization gameplay.

Each week builds on the last. No week is wasted on invisible infrastructure.
