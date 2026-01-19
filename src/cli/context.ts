/**
 * CLI context - manages GameEngine initialization and state persistence.
 */

import * as fs from 'fs';
import { GameEngine, GameConfig } from '../engine/GameEngine';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { MapSize } from '../map/MapConfig';
import { CompleteGameSnapshot } from '../engine/state/snapshots';

const DEFAULT_STATE_FILE = '.civctl-state.json';

export interface CLIContext {
  engine: GameEngine;
  stateFile: string;
}

/**
 * Parse map size from string.
 */
export function parseMapSize(size: string): MapSize {
  const sizeMap: Record<string, MapSize> = {
    duel: MapSize.Duel,
    tiny: MapSize.Tiny,
    small: MapSize.Small,
    standard: MapSize.Standard,
    large: MapSize.Large,
    huge: MapSize.Huge,
  };
  const result = sizeMap[size.toLowerCase()];
  if (!result) {
    throw new Error(
      `Invalid map size: ${size}. Valid sizes: duel, tiny, small, standard, large, huge`
    );
  }
  return result;
}

/**
 * Create a new GameEngine with pathfinder initialized.
 */
export function createEngine(config: GameConfig = {}): GameEngine {
  const engine = new GameEngine(config);
  const pathfinder = new Pathfinder(engine.getTileMap());
  engine.setPathfinder(pathfinder);
  return engine;
}

/**
 * Load game state from file, or create a new game if no state exists.
 */
export function loadOrCreateContext(stateFile: string = DEFAULT_STATE_FILE): CLIContext {
  if (fs.existsSync(stateFile)) {
    try {
      const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf-8')) as CompleteGameSnapshot;
      // For MVP, we regenerate with the same seed since fromSnapshot isn't implemented
      const engine = createEngine({
        seed: savedState.map.seed,
        mapSize: getSizeFromDimensions(savedState.map.width),
        playerCount: savedState.gameState.playerCount,
      });
      return { engine, stateFile };
    } catch {
      // If we can't load, create a new game
      console.error(`Warning: Could not load state from ${stateFile}, creating new game.`);
    }
  }
  const engine = createEngine();
  return { engine, stateFile };
}

/**
 * Save game state to file.
 */
export function saveContext(ctx: CLIContext): void {
  const snapshot = ctx.engine.getCompleteSnapshot();
  fs.writeFileSync(ctx.stateFile, JSON.stringify(snapshot, null, 2));
}

/**
 * Create a fresh game and save it.
 */
export function newGame(
  stateFile: string = DEFAULT_STATE_FILE,
  config: GameConfig = {}
): CLIContext {
  const engine = createEngine(config);
  const ctx = { engine, stateFile };
  saveContext(ctx);
  return ctx;
}

/**
 * Get map size from width dimension.
 */
function getSizeFromDimensions(width: number): MapSize {
  // MAP_DIMENSIONS mapping
  if (width <= 48) return MapSize.Duel;
  if (width <= 56) return MapSize.Tiny;
  if (width <= 68) return MapSize.Small;
  if (width <= 80) return MapSize.Standard;
  if (width <= 104) return MapSize.Large;
  return MapSize.Huge;
}

/**
 * Parse coordinate string "q,r" into numbers.
 */
export function parseCoords(coordStr: string): { q: number; r: number } {
  const parts = coordStr.split(',');
  if (parts.length !== 2) {
    throw new Error(`Invalid coordinate format: ${coordStr}. Expected format: q,r`);
  }
  const q = parseInt(parts[0], 10);
  const r = parseInt(parts[1], 10);
  if (isNaN(q) || isNaN(r)) {
    throw new Error(`Invalid coordinates: ${coordStr}. Both q and r must be integers.`);
  }
  return { q, r };
}
