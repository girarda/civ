# Research: OpenCiv Game Mechanics

**Date**: 2026-01-17
**Status**: Complete

## Summary
OpenCiv is a browser-based, turn-based strategy game inspired by Sid Meier's Civilization series (primarily Civ 5). The game features multiplayer support via WebSocket, hexagonal tile-based maps with procedural generation, civilizations with unique abilities, and standard 4X gameplay elements including city building, unit management, and resource gathering.

## Key Discoveries
- Client-server architecture using WebSocket for real-time multiplayer
- Hexagonal tile-based map with 6 adjacent tiles per hex
- Turn-based gameplay with configurable turn timer (default 60 seconds)
- Procedural map generation with biomes based on temperature and terrain height
- 8 playable civilizations with unique units, buildings, and abilities
- Resource system with bonus, strategic, and luxury resources
- City management with population, worked tiles, and citizen focus options
- Unit movement with pathfinding (A* algorithm) and queued movement across turns

## Architecture Overview

### Game Flow
1. **Main Menu** - Entry point with Play/Options buttons
2. **Join Game** - Server connection screen
3. **Lobby** - Player list, civilization selection, ready-up
4. **Loading** - Map generation and data transfer
5. **In-Game** - Main gameplay with turns, units, cities

### State Machine
- Server manages game state: `LobbyState` -> `InGameState`
- State changes broadcast to all connected players
- Each state handles its own network events

### Turn Structure
- Configurable turn time (default: 60 seconds)
- Turn timer counts down every second
- Players can manually request "Next Turn"
- Turn advances when: all players ready OR timer expires
- On new turn: units regain movement, queued movements execute

## Game Concepts

### Civilizations
8 defined civilizations with unique attributes:

| Civilization | Start Bias | Unique Units | Unique Buildings | Special Abilities |
|--------------|------------|--------------|------------------|-------------------|
| Rome | None | Balista, Legion | - | +25% production for buildings in capital |
| Mongolia | Plains | Keshik, Khan | - | +30% vs City-States, +1 cavalry movement |
| Mamluks | Desert | Salihi | Madrasah | Fort bonuses, free mounted units on Great Prophet |
| America | None | B17, Minuteman | - | +1 sight for land units, -50% tile purchase |
| Germany | None | Landsknecht, Panzer | Hanse | Convert barbarian camps, -25% maintenance |
| England | Shallow Ocean | Longbowman, Ship of the Line | - | +2 naval movement, +1 spy |
| Cuba | Shallow Ocean | Guerrillero | Dance Hall | +20% combat near shallow ocean |
| Canada | Tundra | Mountie, Great Voyageur | Hudson's Bay Company | No city-state wars, tundra farms |

Each civilization has:
- Unique icon and border colors (inside/outside)
- Predefined city names list (10 cities)
- Start bias for map placement

### Map System

#### Map Sizes
| Size | Dimensions |
|------|------------|
| Duel | 48x32 |
| Tiny | 56x36 |
| Small | 68x44 |
| Standard | 80x52 |
| Large | 104x64 |
| Huge | 128x80 |

#### Tile Types (Terrain)
| Terrain | Base Stats | Movement Cost |
|---------|------------|---------------|
| Grass | +2 Food | 1 |
| Plains | +1 Food, +1 Production | 1 |
| Tundra | +1 Food | 1 |
| Desert | - | 1 |
| Floodplains | +2 Food | 1 |
| Snow | - | 1 |
| Freshwater | +2 Food | N/A (water) |
| Shallow Ocean | +1 Food | N/A (water) |
| Ocean | +1 Food | N/A (water) |
| Grass Hill | +2 Production | 2 |
| Plains Hill | +2 Production | 2 |
| Desert Hill | +2 Production | 2 |
| Tundra Hill | +2 Production | 2 |
| Snow Hill | +2 Production | 2 |
| Mountain | - | Impassable (9999) |

#### Terrain Features (stackable on base terrain)
- **Forest** - Spawns on grass, plains, tundra (+movement cost)
- **Jungle** - Spawns in warm climates (+movement cost)
- **Floodplains** - Replaces desert tiles adjacent to rivers

#### Map Generation Algorithm
1. Generate landmass using random "grass circles" until target coverage reached
2. Clear isolated single ocean tiles
3. Apply height-based hills/mountains (top 5% = mountains, top 10% chance for hills)
4. Apply biomes based on Y-axis temperature gradient:
   - 0-10% / 90-100% Y: Snow
   - 10-15% / 85-90% Y: Tundra
   - Middle: Grass/Plains/Desert based on temperature
5. Generate freshwater lakes (enclosed ocean tiles)
6. Convert coastal ocean to shallow ocean
7. Spawn resources based on terrain and temperature
8. Generate rivers from hills/mountains flowing to water
9. Apply floodplains to desert tiles with rivers

### Resources

#### Bonus Resources
| Resource | Spawn Tiles | Stats |
|----------|-------------|-------|
| Cattle | Grass | +1 Production (improved: +2) |
| Sheep | Grass, Plains (inc. hills) | +1 Production (improved: +2) |
| Fish | Freshwater, Shallow Ocean | +1 Food (improved: +2) |
| Stone | Most land tiles | +1 Production (improved: +2) |

#### Strategic Resources
| Resource | Spawn Tiles | Stats |
|----------|-------------|-------|
| Horses | Grass, Plains, Tundra | +1 Production (improved: +2) |
| Iron | Most land tiles | +1 Production (improved: +2) |

#### Luxury Resources
| Resource | Spawn Tiles | Stats |
|----------|-------------|-------|
| Citrus | Jungle, Forest, Grass | +1 Food, +1 Gold |
| Cotton | Grass, Plains, Desert | +2 Gold |
| Copper | Most land tiles | +2 Gold |
| Gold | Most land tiles | +2 Gold |
| Crab | Freshwater, Shallow Ocean | +1 Food |
| Whales | Shallow Ocean | +1 Food, +1 Gold |
| Turtles | Freshwater, Shallow Ocean | +1 Food, +1 Gold |
| Olives | Grass | +1 Gold, +1 Production |

### Rivers
- Rivers exist on tile edges (6 possible sides per hex)
- Crossing a river costs 2 movement minimum
- Rivers flow from hills/mountains toward water
- Tiles adjacent to rivers become "riverine" (affects floodplains)

### Units

#### Unit Properties
- **Name** - Unit type identifier
- **Attack Type** - "melee", "ranged", or "none"
- **Default Move Distance** - Base movement points (default: 2)
- **Available Movement** - Current movement points this turn
- **Actions** - List of special actions the unit can perform

#### Known Unit Types
- Settler (can settle cities)
- Warrior (melee combat)
- Archer
- Builder
- Camel Archer
- Caravan
- Catapult
- Composite Bowman
- Crossbowman
- Horseman
- Roman Legion

#### Unit Movement
- Uses A* pathfinding algorithm
- Movement costs vary by terrain (1 for flat, 2 for hills/forest)
- Crossing rivers costs minimum 2 movement
- Mountains are impassable (cost 9999)
- Water tiles impassable for land units (cost 9999)
- Queued movement: if path exceeds current movement, remaining path saved for next turn
- Movement queue visualized with colored lines (cyan = this turn, grey = queued)

#### Unit Actions
Actions have requirements that must be met:
- **Settle City** - Requirements: `awayFromCity`, `movement`
  - Creates a city at unit's location
  - Consumes the settler unit
  - First city gets Palace building automatically

### Cities

#### City Properties
- **Name** - From civilization's city name list
- **Population** - Number of citizens (starts at 1)
- **Food Surplus** - Accumulated food for growth
- **Buildings** - List of constructed buildings
- **Territory** - Tiles owned by city (starts with center + 6 adjacent)
- **Worked Tiles** - Tiles being worked by citizens for yields

#### City Stats
| Stat | Description |
|------|-------------|
| Population | Number of citizens |
| Food | Food production (- population * 2 for consumption) |
| Production | Production per turn |
| Gold | Gold income per turn |
| Science | Science per turn |
| Culture | Culture per turn |
| Faith | Faith per turn |
| Morale | City happiness (TODO) |
| Food Surplus | Accumulated excess food |

#### Citizen Management
Citizens can be assigned to focus on:
- Default Focus (balanced, prioritizes food if negative)
- Food Focus
- Production Focus
- Gold Focus
- Science Focus
- Culture Focus

The game automatically assigns citizens to tiles based on focus:
- If food is negative, prioritize food tiles
- Otherwise, prioritize based on selected focus or total yield

#### City Yields
- Each worked tile contributes its yields to the city
- City center tile has minimum 2 food
- Buildings add bonuses to city stats

### Buildings

#### Known Buildings
| Building | Stats |
|----------|-------|
| Palace | +3 Science, +3 Production, +2 Gold, +2 Defense, +1 Culture |

Buildings are defined in YAML configuration and can provide various stat bonuses.

## Player Actions

### Map Navigation
| Action | Input |
|--------|-------|
| Pan Camera | Arrow Keys or Left-Click Drag |
| Zoom In/Out | Mouse Scroll Wheel |
| Skip Turn | Spacebar |
| Open Settings | ESC |

### Unit Controls
| Action | Input |
|--------|-------|
| Select Unit | Left-click on unit |
| Move Unit | Right-click destination (while unit selected) |
| Preview Path | Right-click and drag (shows path preview) |
| Cancel Selection | Click elsewhere |

### Turn Management
| Action | Method |
|--------|--------|
| End Turn Early | Click "Next Turn" button |
| Cancel Next Turn | Click "Waiting..." button to undo |

### City Interaction
| Action | Method |
|--------|--------|
| Open City View | Click on owned city name |
| Close City View | Click "Return to Map" button or ESC |
| Change Citizen Focus | Select radio button in city view |

## UI Components

### Status Bar (Top)
Displays global stats:
- Science: current research progress
- Culture: cultural growth
- Gold: treasury balance
- Faith: religious points
- Trade: trade routes (X/Y format)
- Turn Counter: "Turns: X (Ys)" showing turn number and time remaining

### Next Turn Button (Bottom Center)
- Shows "Next Turn" when available
- Changes to "Waiting..." when player has requested turn end

### Tile Information (Bottom Left)
- Shows hovered tile coordinates
- Displays terrain type(s)
- Shows "River" indicator if present
- Displays yield icons with values

### Unit Display Info (Bottom Right, when unit selected)
- Unit name
- Action buttons (e.g., Settle City)
- Movement remaining: "X/Y"

### City Display Info (when city view open)
Left panel:
- City name
- Population icon and count
- All city stats with icons

Right panel:
- Citizen Management with focus options
- Buildings list

### ESC Menu (Popup)
- Return (close menu)
- Settings
- Save Game
- Main Menu (disconnect and return)

## Network Events (Client-Server Communication)

### Lobby Events
- `connection` - New player connects
- `connectedPlayers` - Request/response for player list
- `availableCivs` - Request available civilizations
- `civInfo` - Request specific civilization details
- `selectCiv` - Player selects civilization
- `playerJoin` / `playerQuit` - Player status changes
- `setState` - Change game state (lobby -> in_game)

### Game Events
- `requestMap` / `mapSize` / `mapChunk` - Map data transfer
- `requestTileYields` / `tileYields` - Tile stat data
- `loadedIn` - Player finished loading
- `allPlayersLoaded` - All players ready
- `zoomToLocation` - Camera command
- `moveUnit` - Unit movement request/response
- `unitAction` - Unit special action
- `removeUnit` - Unit deleted from game
- `newCity` - City founded
- `requestCityStats` / `updateCityStats` - City data
- `addBuilding` - Building constructed
- `newTurn` - Turn advanced
- `turnTimeDecrement` - Timer update
- `nextTurnRequest` - Player ready for next turn
- `messageBox` - Error/info popup

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/OpenCiv/server/src/Game.ts` | Server game manager, player/state management |
| `/Users/alex/workspace/OpenCiv/server/src/state/type/InGameState.ts` | In-game state, turn management, spawn logic |
| `/Users/alex/workspace/OpenCiv/server/src/state/type/LobbyState.ts` | Lobby state, civilization selection |
| `/Users/alex/workspace/OpenCiv/server/src/Player.ts` | Player class with cities/units |
| `/Users/alex/workspace/OpenCiv/server/src/unit/Unit.ts` | Unit logic, movement, actions |
| `/Users/alex/workspace/OpenCiv/server/src/unit/UnitActions.ts` | Unit action definitions (settle city) |
| `/Users/alex/workspace/OpenCiv/server/src/city/City.ts` | City logic, yields, buildings |
| `/Users/alex/workspace/OpenCiv/server/src/map/GameMap.ts` | Map generation, pathfinding |
| `/Users/alex/workspace/OpenCiv/server/src/map/Tile.ts` | Tile properties, river logic |
| `/Users/alex/workspace/OpenCiv/server/src/map/MapResources.ts` | Resource spawning |
| `/Users/alex/workspace/OpenCiv/server/config/civilizations.yml` | Civilization definitions |
| `/Users/alex/workspace/OpenCiv/server/config/buildings.yml` | Building definitions |
| `/Users/alex/workspace/OpenCiv/server/config/tiles.yml` | Tile yield definitions |
| `/Users/alex/workspace/OpenCiv/server/config/map_resources.yml` | Resource definitions |
| `/Users/alex/workspace/OpenCiv/client/src/Game.ts` | Client game loop, rendering |
| `/Users/alex/workspace/OpenCiv/client/src/scene/type/InGameScene.ts` | Main game UI scene |
| `/Users/alex/workspace/OpenCiv/client/src/Unit.ts` | Client-side unit rendering |
| `/Users/alex/workspace/OpenCiv/client/src/city/City.ts` | Client-side city rendering |
| `/Users/alex/workspace/OpenCiv/client/src/player/ClientPlayer.ts` | Local player controls |
| `/Users/alex/workspace/OpenCiv/client/src/map/GameMap.ts` | Client map rendering, pathfinding |
| `/Users/alex/workspace/OpenCiv/client/src/ui/StatusBar.ts` | Top status bar UI |
| `/Users/alex/workspace/OpenCiv/client/src/ui/CityDisplayInfo.ts` | City management UI |
| `/Users/alex/workspace/OpenCiv/client/src/ui/UnitDisplayInfo.ts` | Selected unit UI |

## Recommendations

### For Recreation
1. **Core Systems to Implement First**:
   - Hexagonal tile grid with adjacency calculations
   - Turn-based state machine with timer
   - Unit spawning and movement with pathfinding
   - City founding and basic yields

2. **Data-Driven Design**:
   - Use configuration files (YAML/JSON) for civilizations, units, buildings, tiles
   - Makes balancing and content addition easier

3. **Network Architecture**:
   - Consider WebSocket for real-time multiplayer
   - Event-based communication pattern works well
   - Server authoritative for game state

4. **Map Generation**:
   - Temperature gradient for biomes is effective
   - Height accumulation for hills/mountains works well
   - River generation is complex - consider simplifying

5. **UI Considerations**:
   - Status bar for global stats
   - Context-sensitive panels for units/cities
   - Tile hover information
   - Turn indicator with timer

### Missing Features (Not Yet Implemented in OpenCiv)
Based on code analysis, these Civ-like features are planned but not complete:
- Technology tree / Research
- Combat system (damage calculation)
- Great People / Great Works
- Religion system
- Trading / Diplomacy
- Victory conditions
- Barbarians / City-States
- Tile improvements (farms, mines, etc.)
- Unit upgrades / Experience
- Wonders
- Social policies / Civics
- Fog of War

## Open Questions
1. **Combat mechanics** - Attack types (melee/ranged) are defined but no combat resolution system found
2. **Victory conditions** - Not implemented; no win state logic found
3. **AI players** - No AI logic found; appears multiplayer-only currently
4. **Technology tree** - Science stat exists but no tech progression system
5. **Diplomacy** - Not implemented
6. **Tile improvements** - Worker/Builder unit exists but no improvement logic found
7. **Unit production** - Cities track production but no unit/building queue system found
8. **Population growth** - Food surplus tracked but no growth mechanics implemented
9. **Border expansion** - Territory is static after city founding
