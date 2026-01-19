# Research: End-to-End Game Roadmap for OpenCiv

**Date**: 2026-01-18
**Status**: Complete

## Summary

This document provides a roadmap for achieving an end-to-end (E2E) playable OpenCiv game, prioritizing the critical path to a complete game loop while maximizing parallelization opportunities. Phase 1 (Hex Grid + Map) is complete. Phase 3 (Units + Movement) is in progress. The roadmap identifies 6 parallel work streams that can be developed independently, with a target of achieving minimal E2E gameplay in approximately 4 implementation phases.

## Current State Assessment

### Phase 1: Complete (100%)
The foundation layer is fully implemented:

| Component | Status | Key Files |
|-----------|--------|-----------|
| Hex coordinate system | Done | `/Users/alex/workspace/civ/src/hex/TilePosition.ts` |
| Hex-to-world conversions | Done | `/Users/alex/workspace/civ/src/hex/HexGridLayout.ts` |
| 14 terrain types with yields | Done | `/Users/alex/workspace/civ/src/tile/Terrain.ts` |
| 6 tile features | Done | `/Users/alex/workspace/civ/src/tile/TileFeature.ts` |
| 26 resources with placement rules | Done | `/Users/alex/workspace/civ/src/tile/TileResource.ts` |
| Yield calculation | Done | `/Users/alex/workspace/civ/src/tile/TileYields.ts` |
| Procedural map generation | Done | `/Users/alex/workspace/civ/src/map/MapGenerator.ts` |
| Camera controls (pan/zoom) | Done | `/Users/alex/workspace/civ/src/render/CameraController.ts` |
| Tile rendering with colors | Done | `/Users/alex/workspace/civ/src/render/TileRenderer.ts` |
| Hover detection + highlight | Done | `/Users/alex/workspace/civ/src/ui/HoverSystem.ts`, `TileHighlight.ts` |
| Tile info panel | Done | `/Users/alex/workspace/civ/src/ui/TileInfoPanel.ts` |
| Map regeneration (R key) | Done | `/Users/alex/workspace/civ/src/ui/MapControls.ts` |
| bitECS components defined | Done | `/Users/alex/workspace/civ/src/ecs/world.ts` |

### Phase 2: Networking (Not Started)
The original sequencing plan calls for client-server architecture, but for a minimal E2E game, this can be deferred. Single-player with local state is sufficient for the first complete game loop.

### Phase 3: Units + Movement (In Progress)
Current status unknown. This is the next critical step after Phase 1.

## Critical Path to E2E Game

The minimal playable game requires these core loops:

```
START -> Explore Map -> Found City -> Produce Units -> Combat -> Victory
            ^                |            |              |
            |                v            v              v
            +--- Unit Movement <-- New Units <-- Enemy Destroyed
```

### Minimum Viable Game (MVG) Requirements

1. **Unit System**: Spawn, select, move units on the map
2. **City Founding**: Settler unit creates a city
3. **Production Queue**: City produces new units over turns
4. **Turn System**: End turn, advance game state
5. **Combat**: Units attack and destroy each other
6. **Win Condition**: Destroy all enemy units/cities OR survive X turns

### Critical Path Phases

```
Phase 1 (DONE)          Phase 3 (IN PROGRESS)     Phase 4                Phase 5
+-----------------+     +-------------------+     +----------------+     +---------------+
| Hex Grid + Map  | --> | Units + Movement  | --> | Cities + Turns | --> | Combat + Win  |
| - Terrain       |     | - Unit data model |     | - Settler      |     | - Attack      |
| - Features      |     | - Unit rendering  |     | - City found   |     | - Damage calc |
| - Resources     |     | - Selection       |     | - Territory    |     | - Unit death  |
| - Camera        |     | - A* pathfinding  |     | - Production   |     | - Victory     |
| - Hover/UI      |     | - Movement exec   |     | - Turn flow    |     | - Game over   |
+-----------------+     +-------------------+     +----------------+     +---------------+
      |                        |                        |                      |
      v                        v                        v                      v
   ~1 week                  ~1 week                  ~2 weeks              ~1 week
```

**Total critical path: ~5 weeks to MVG**

## Parallel Work Streams

These work streams can be developed independently with minimal coordination:

### Stream A: Unit System (Critical Path)
**Dependencies**: Phase 1 (Hex Grid)
**Unlocks**: Cities, Combat, AI

```
A1. Unit Data Model
    - Unit types enum (Settler, Warrior, etc.)
    - Unit stats (movement, attack, health)
    - Unit position tracking

A2. Unit Rendering
    - Sprite/graphic for unit on tile
    - Unit selection visual
    - Movement range overlay

A3. Unit Selection System
    - Click to select unit
    - Show selected unit info
    - Deselect on click elsewhere

A4. Pathfinding (A*)
    - Movement cost from terrain
    - Path calculation
    - Path visualization

A5. Movement Execution
    - Move unit along path
    - Consume movement points
    - Handle multi-turn movement
```

### Stream B: City System (Depends on A1 Settler)
**Dependencies**: Unit System (Settler)
**Unlocks**: Production, Victory conditions

```
B1. City Data Model
    - City position, owner
    - Population, buildings
    - Worked tiles, territory

B2. City Founding
    - Settler "Settle" action
    - Consume settler, create city
    - Initialize territory (center + neighbors)

B3. City Rendering
    - City marker on tile
    - Territory borders
    - City name label

B4. City Panel UI
    - Show city stats
    - Display worked tiles
    - Production queue interface
```

### Stream C: Turn System (Parallel to A/B)
**Dependencies**: None (can use placeholder units/cities)
**Unlocks**: Production, Combat resolution, AI turns

```
C1. Turn State Manager
    - Current turn number
    - Turn phase (start, action, end)
    - "End Turn" button

C2. Turn Processing
    - Reset unit movement points
    - Process production
    - Update city growth

C3. Turn Timer (Optional)
    - Countdown display
    - Auto-advance on timeout
```

### Stream D: Combat System (Depends on A1-A2)
**Dependencies**: Unit data model, Unit rendering
**Unlocks**: Victory conditions, AI combat

```
D1. Combat Stats
    - Attack/defense values
    - Health/damage
    - Combat modifiers (terrain, promotions)

D2. Combat Calculation
    - Damage formula
    - Attacker/defender damage
    - Death check

D3. Combat Execution
    - Attack command
    - Apply damage
    - Remove dead units

D4. Combat Preview
    - Show expected outcome before attack
    - Display attacker/defender health bars
```

### Stream E: Production System (Depends on B1)
**Dependencies**: City data model
**Unlocks**: Unit spawning, Buildings, Tech tree

```
E1. Production Queue
    - Queue data structure
    - Add/remove items
    - Current production progress

E2. Unit Production
    - Unit costs (production points)
    - Complete unit -> spawn adjacent to city

E3. Building Production (Later)
    - Building costs
    - Building effects on city
```

### Stream F: AI Opponents (Depends on A, B, D)
**Dependencies**: Units, Cities, Combat
**Unlocks**: Single-player gameplay

```
F1. AI Decision Framework
    - Decision tree or behavior tree
    - State evaluation

F2. Exploration AI
    - Move scouts to unexplored tiles

F3. City Placement AI
    - Evaluate settlement locations

F4. Combat AI
    - Target selection
    - Attack/defend decisions
```

## Parallelization Matrix

| Stream | Can Start | Blocks | Parallel With |
|--------|-----------|--------|---------------|
| A: Units | Now | B, D, F | C, (early E) |
| B: Cities | After A1 | E, (some F) | C, D |
| C: Turns | Now | - | A, B, D, E |
| D: Combat | After A1-A2 | F | B, C, E |
| E: Production | After B1 | F | A, C, D |
| F: AI | After A,B,D | - | E (late) |

### Recommended Team Allocation (3 developers/agents)

**Week 1-2:**
- Dev 1: Stream A (Units) - Critical Path
- Dev 2: Stream C (Turns) - Foundation
- Dev 3: Stream A support + Testing infrastructure

**Week 3:**
- Dev 1: Stream B (Cities) - Now unblocked
- Dev 2: Stream D (Combat) - Now unblocked
- Dev 3: Stream E (Production) - Starts mid-week

**Week 4:**
- Dev 1: Stream B completion + E integration
- Dev 2: Stream D completion + Victory conditions
- Dev 3: Stream F (AI) - Basic exploration

**Week 5:**
- All: Integration, bug fixes, polish
- Achieve MVG milestone

## Feature Priority Tiers

### Tier 1: Essential for E2E (Must Have)
1. Unit spawning and rendering
2. Unit selection and movement
3. City founding from Settler
4. Basic production (spawn units)
5. Turn advancement
6. Unit combat (melee at minimum)
7. Win condition (eliminate enemies OR survive N turns)

### Tier 2: Important for Playability (Should Have)
1. Ranged combat
2. Movement preview/path display
3. Combat preview
4. City territory display
5. Multiple unit types (Warrior, Archer)
6. Basic AI (move toward enemy)

### Tier 3: Polish (Nice to Have)
1. Fog of war
2. Technology tree
3. Building production
4. Multiple AI difficulty
5. Save/load game
6. Sound effects

### Tier 4: Extended Features (Future)
1. Multiplayer/Networking
2. Diplomacy
3. Religion
4. Great People
5. Civilizations with unique abilities
6. Tile improvements

## Detailed Implementation Recommendations

### Stream A: Unit System

**A1. Unit Data Model** (`src/unit/Unit.ts`)
```typescript
interface Unit {
  id: number;
  type: UnitType;
  position: TilePosition;
  owner: PlayerId;
  movementPoints: number;
  maxMovement: number;
  health: number;
  maxHealth: number;
}

enum UnitType {
  Settler = 'Settler',
  Warrior = 'Warrior',
  Archer = 'Archer',
}
```

**A4. Pathfinding** (`src/pathfinding/AStar.ts`)
- Use terrain movement costs from `TERRAIN_DATA`
- Return path as `TilePosition[]`
- Cache paths for performance

### Stream B: City System

**B2. City Founding**
- Check Settler is on valid terrain (not water, not mountain)
- Consume Settler, create City at position
- Territory = position.range(1) filtered by valid tiles

### Stream C: Turn System

**C1. Turn State** (`src/game/TurnManager.ts`)
```typescript
interface GameState {
  turn: number;
  phase: 'playing' | 'processing' | 'gameover';
  players: Player[];
  currentPlayer: PlayerId;
}
```

### Stream D: Combat

**D2. Combat Calculation** (Simplified Civ-style)
```typescript
function calculateDamage(attacker: Unit, defender: Unit): { attackerDamage: number, defenderDamage: number } {
  const attackerStrength = getUnitStrength(attacker);
  const defenderStrength = getUnitStrength(defender);
  const ratio = attackerStrength / defenderStrength;

  // Simplified: defender takes more damage if ratio > 1
  const baseDamage = 30;
  const defenderDamage = Math.round(baseDamage * ratio);
  const attackerDamage = Math.round(baseDamage / ratio * 0.5); // Attacker takes less

  return { attackerDamage, defenderDamage };
}
```

## Integration Points

### Critical Integration Dependencies

1. **Units -> Map**: Units need tile passability from Terrain
2. **Cities -> Map**: Cities need tile yields, territory from TilePosition
3. **Combat -> Units**: Combat needs unit stats and positions
4. **Production -> Cities**: Production needs city state and unit factory
5. **Turns -> All**: Turn manager updates all systems

### Integration Testing Priorities

1. Unit movement respects terrain (water impassable)
2. Settler creates city correctly
3. City produces unit that spawns on map
4. Combat resolves and removes dead units
5. Turn advances all game state correctly

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Pathfinding too slow | Medium | High | Limit search radius, cache paths |
| Combat feels unfun | Medium | Medium | Simple formula first, iterate |
| AI too predictable | High | Medium | Add randomness, defer complexity |
| Integration bugs | High | High | Strong type safety, integration tests |
| Scope creep | High | High | Strict tier 1 focus until MVG |

## Success Criteria for MVG

The Minimum Viable Game is achieved when:

1. [ ] Player can spawn a Settler at game start
2. [ ] Player can move units with click-to-select and click-to-move
3. [ ] Settler can found a city
4. [ ] City can produce a Warrior unit
5. [ ] Player can end turn and see production progress
6. [ ] Player can attack enemy unit with Warrior
7. [ ] Units die when health reaches 0
8. [ ] Game ends with victory/defeat message

## Key Files to Create

| Path | Purpose | Stream |
|------|---------|--------|
| `src/unit/Unit.ts` | Unit data model and factory | A |
| `src/unit/UnitType.ts` | Unit type enum and stats | A |
| `src/unit/UnitRenderer.ts` | Unit visual rendering | A |
| `src/unit/UnitSelection.ts` | Selection state and UI | A |
| `src/pathfinding/AStar.ts` | A* pathfinding algorithm | A |
| `src/pathfinding/MovementCost.ts` | Terrain movement costs | A |
| `src/city/City.ts` | City data model | B |
| `src/city/CityRenderer.ts` | City visual rendering | B |
| `src/city/Territory.ts` | Territory calculation | B |
| `src/game/TurnManager.ts` | Turn state and transitions | C |
| `src/game/GameState.ts` | Overall game state | C |
| `src/combat/Combat.ts` | Combat resolution | D |
| `src/combat/CombatPreview.ts` | Combat outcome preview | D |
| `src/production/ProductionQueue.ts` | City production queue | E |
| `src/ai/AIController.ts` | AI decision making | F |

## Open Questions

1. **Single-player first or multiplayer?** Recommend single-player with local AI to reach MVG faster. Networking adds significant complexity.

2. **How many unit types for MVG?** Recommend 3: Settler, Warrior, Archer. Enough for variety, minimal complexity.

3. **Victory condition for MVG?** Recommend "Domination" (destroy all enemy units/cities) as simplest to implement.

4. **AI complexity for MVG?** Recommend basic: move toward player, attack if adjacent. Expand after MVG.

5. **Turn timer needed?** Recommend skip for single-player MVG. Add for multiplayer later.

6. **ECS integration depth?** Current code has bitECS defined but not used. Recommend continue with simpler Map-based storage for MVG, refactor to ECS if performance needed.

## Conclusion

With Phase 1 complete and Phase 3 in progress, the critical path to an E2E game is approximately 5 weeks with focused development. The key to success is:

1. **Stay on critical path**: Units -> Cities -> Turns -> Combat -> Victory
2. **Parallelize aggressively**: 3 streams can run simultaneously most of the time
3. **Defer networking**: Single-player MVG first, then add multiplayer
4. **Strict tier 1 focus**: Resist feature creep until MVG is achieved

The parallelization strategy enables up to 3x speedup with proper coordination, potentially reducing the timeline to 2-3 weeks with multiple developers/agents working in parallel.
