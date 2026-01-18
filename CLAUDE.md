# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCiv is a Civilization-style 4X strategy game built with Rust and Bevy 0.14. The project is in early development with foundational hex grid and terrain systems implemented.

## Build Commands

```bash
cargo build              # Build the project (uses dynamic linking for faster iteration)
cargo run                # Run the game
cargo test               # Run all tests
cargo test <test_name>   # Run a specific test
cargo clippy             # Run linter
cargo fmt                # Format code
```

## Architecture

### Module Structure

- `src/main.rs` - Application entry point, configures Bevy app with window settings
- `src/lib.rs` - Library crate exposing modules for testing
- `src/hex/` - Hex coordinate system
  - `coord.rs` - `TilePosition` component wrapping `hexx::Hex` for Bevy ECS
  - `layout.rs` - `HexGridLayout` resource for hex-to-world coordinate conversions
- `src/plugins/` - Bevy plugins
  - `hex_plugin.rs` - `HexPlugin` initializes hex grid resources
- `src/tile/` - Tile data
  - `terrain.rs` - `Terrain` enum with 14 terrain types, yields, and movement costs

### Key Dependencies

- **Bevy 0.14** - Game engine with `dynamic_linking` feature for faster dev builds
- **hexx 0.17** - Hex grid math library (note: uses different `bevy_reflect` version, so `TilePosition` cannot derive `Reflect`)
- **noise 0.9** - Procedural generation (not yet integrated)

### Coordinate System

Uses axial hex coordinates via `hexx`. The `TilePosition` component wraps `hexx::Hex` and provides:
- Neighbor queries, range/ring iterators, distance calculations
- Deref to underlying `Hex` for direct access to hexx methods

`HexGridLayout` resource handles hex-to-world-position conversions. Default: 32-pixel pointy-top hexes.

### Terrain System

`Terrain` enum models 14 terrain types with yields based on OpenCiv's data:
- Base terrains: Grassland, Plains, Desert, Tundra, Snow
- Hill variants: GrasslandHill, PlainsHill, DesertHill, TundraHill, SnowHill
- Special: Mountain (impassable), Coast, Ocean, Lake
