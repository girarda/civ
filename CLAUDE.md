# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

OpenCiv is a Civilization-style 4X strategy game built with TypeScript, PixiJS, and bitECS. The project implements foundational hex grid and terrain systems.

## Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Start development server (Vite)
npm run build            # Build for production
npm run build:cli        # Build CLI (civctl)
npm run preview          # Preview production build
npm run test             # Run unit tests (Vitest)
npm run test:e2e         # Run Playwright e2e tests
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

## Architecture

### Tech Stack

- **PixiJS 8.x** - WebGL 2D rendering
- **bitECS** - Entity Component System
- **honeycomb-grid** - Hex grid mathematics
- **simplex-noise** - Procedural noise generation
- **Vite** - Build tooling
- **Vitest** - Unit testing
- **Playwright** - E2E testing

### Module Structure

- `src/main.ts` - Application entry point, initializes PixiJS, game loop, and map generation/regeneration
- `src/hex/` - Hex coordinate system
  - `TilePosition.ts` - Hex coordinate wrapper with neighbor/range operations
  - `HexGridLayout.ts` - Hex-to-world coordinate conversions
- `src/tile/` - Tile data models
  - `Terrain.ts` - 14 terrain types with yields and movement costs
  - `TileFeature.ts` - 6 feature types with modifiers
  - `TileResource.ts` - 26 resources with bonuses and placement rules
  - `TileYields.ts` - Yield calculation system
  - `RiverEdges.ts` - River edge bitmask
- `src/map/` - Map generation
  - `MapConfig.ts` - Map sizes and generation parameters
  - `MapGenerator.ts` - Procedural terrain, feature, and resource generation
- `src/render/` - Rendering systems
  - `TileRenderer.ts` - Terrain color mapping, sprite creation, and clear/regenerate
  - `TileHighlight.ts` - Hover highlight visual feedback
  - `CameraController.ts` - Pan and zoom controls
- `src/ui/` - User interface components
  - `HoverState.ts` - Reactive state for currently hovered tile
  - `HoverSystem.ts` - Mouse event handling and screen-to-hex conversion
  - `TileInfoPanel.ts` - HTML/CSS panel displaying tile information
  - `MapControls.ts` - Seed display and map regeneration controls (R key)

### Coordinate System

Uses axial hex coordinates via honeycomb-grid. TilePosition provides:
- Neighbor queries, range/ring iterators, distance calculations
- Conversion between hex and world coordinates

HexGridLayout handles hex-to-world-position conversions. Default: 32-pixel pointy-top hexes.

### Terrain System

14 terrain types with yields based on Civilization data:
- Base terrains: Grassland, Plains, Desert, Tundra, Snow
- Hill variants: GrasslandHill, PlainsHill, DesertHill, TundraHill, SnowHill
- Special: Mountain (impassable), Coast, Ocean, Lake

## CLI (civctl)

The `civctl` command-line interface enables programmatic game control through the GameEngine API. Build with `npm run build:cli`, then run with `node dist/civctl.cjs`.

### Global Options

```
civctl [command] [options]

Options:
  -o, --output <format>  Output format: text (default), json
  -s, --state <file>     State file for persistence (default: .civctl-state.json)
  -h, --help             Show help
  -V, --version          Show version
```

### Game Commands

```bash
civctl game status              # Show current game state
civctl game end-turn            # End current player's turn
civctl game new [--seed N]      # Start new game with optional seed
civctl game new --size tiny     # Create game with specific map size
```

### Unit Commands

```bash
civctl unit list [-p <player>]         # List units (optionally filter by player)
civctl unit show <eid>                  # Show unit details
civctl unit move <eid> --to <q,r>       # Move unit to coordinates
civctl unit attack <eid> --target <id>  # Attack enemy unit
civctl unit found-city <eid>            # Found city with settler
```

### City Commands

```bash
civctl city list [-p <player>]           # List cities
civctl city show <eid>                   # Show city details
civctl city production <eid> <type>      # Set production (warrior/scout/settler/none)
```

### Map Commands

```bash
civctl map tile <q,r>   # Get tile at coordinates (e.g., "0,5")
civctl map info         # Get map dimensions and seed
```

### Player Commands

```bash
civctl player list      # List all players with unit/city counts
```

### JSON Output

Use `-o json` for machine-readable output:

```bash
civctl game status -o json
# Returns: { "success": true, "data": { "turnNumber": 1, ... } }

civctl unit move 5 --to 3,4 -o json
# Returns: { "success": true, "data": {...}, "events": [...] }
```

Errors return: `{ "success": false, "error": "..." }`
