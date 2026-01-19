/**
 * GameEngine - Core game logic independent of rendering.
 * Holds all game state and provides methods to query and modify it.
 */

import { IWorld } from 'bitecs';
import { createGameWorld } from '../ecs/world';
import { GeneratedTile, MapGenerator } from '../map/MapGenerator';
import { MapConfig, MapSize } from '../map/MapConfig';
import { TerritoryManager } from '../city/Territory';
import { GameState } from '../game/GameState';
import { EventBus } from './events/EventBus';
import { GameEventType } from './events/types';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { PlayerManager } from '../player';
import {
  GameCommand,
  CommandResult,
  CommandType,
  commandSuccess,
  commandError,
  getValidator,
  getExecutor,
  MoveUnitValidatorDeps,
  AttackValidatorDeps,
  FoundCityValidatorDeps,
  SetProductionValidatorDeps,
  EndTurnValidatorDeps,
  MoveUnitExecutorDeps,
  AttackExecutorDeps,
  FoundCityExecutorDeps,
  SetProductionExecutorDeps,
  EndTurnExecutorDeps,
} from './commands';
import {
  GameStateSnapshot,
  UnitSnapshot,
  CitySnapshot,
  TileSnapshot,
  MapSnapshot,
  CompleteGameSnapshot,
} from './state/snapshots';
import {
  queryGameState,
  queryUnits,
  queryUnit,
  queryCities,
  queryCity,
  queryTile,
  queryMap,
  queryUnitsAtPosition,
  queryCityAtPosition,
} from './state/queries';

/** Configuration for creating a new game */
export interface GameConfig {
  mapSize?: MapSize;
  seed?: number;
  playerCount?: number;
}

/**
 * Core game engine that manages all game state.
 * This class has no rendering dependencies and can be used with any frontend.
 */
export class GameEngine {
  private world: IWorld;
  private tileMap: Map<string, GeneratedTile>;
  private territoryManager: TerritoryManager;
  private gameState: GameState;
  private eventBus: EventBus;
  private mapConfig: MapConfig;
  private playerCount: number;
  private pathfinder: Pathfinder | null = null;
  private playerManager: PlayerManager | null = null;

  constructor(config: GameConfig = {}) {
    // Initialize configuration
    this.mapConfig = new MapConfig({
      size: config.mapSize ?? MapSize.Duel,
      seed: config.seed ?? Math.floor(Math.random() * 100000),
    });
    this.playerCount = config.playerCount ?? 2;

    // Initialize core systems
    this.world = createGameWorld();
    this.tileMap = new Map();
    this.territoryManager = new TerritoryManager();
    this.gameState = new GameState();
    this.eventBus = new EventBus();

    // Generate initial map
    this.generateMap();
  }

  /**
   * Generate the map from the current configuration.
   */
  private generateMap(): void {
    this.tileMap.clear();
    const generator = new MapGenerator(this.mapConfig);
    const tiles = generator.generate();

    for (const tile of tiles) {
      this.tileMap.set(tile.position.key(), tile);
    }
  }

  // --- State Query Methods ---

  /**
   * Get a snapshot of the current game state.
   */
  getState(): GameStateSnapshot {
    return queryGameState(this.gameState, this.playerCount);
  }

  /**
   * Get snapshots of all units, optionally filtered by player.
   */
  getUnits(playerId?: number): UnitSnapshot[] {
    return queryUnits(this.world, playerId);
  }

  /**
   * Get a snapshot of a single unit by entity ID.
   */
  getUnit(eid: number): UnitSnapshot | null {
    return queryUnit(this.world, eid);
  }

  /**
   * Get snapshots of all cities, optionally filtered by player.
   */
  getCities(playerId?: number): CitySnapshot[] {
    return queryCities(this.world, this.territoryManager, this.tileMap, playerId);
  }

  /**
   * Get a snapshot of a single city by entity ID.
   */
  getCity(eid: number): CitySnapshot | null {
    return queryCity(this.world, eid, this.territoryManager, this.tileMap);
  }

  /**
   * Get a snapshot of a tile at the given coordinates.
   */
  getTile(q: number, r: number): TileSnapshot | null {
    return queryTile(this.tileMap, this.world, this.territoryManager, q, r);
  }

  /**
   * Get a snapshot of the entire map.
   */
  getMap(): MapSnapshot {
    const [width, height] = this.mapConfig.getDimensions();
    return queryMap(this.tileMap, this.world, this.territoryManager, {
      width,
      height,
      seed: this.mapConfig.seed,
    });
  }

  /**
   * Get a unit at a specific position.
   */
  getUnitAtPosition(q: number, r: number): UnitSnapshot | null {
    return queryUnitsAtPosition(this.world, q, r);
  }

  /**
   * Get a city at a specific position.
   */
  getCityAtPosition(q: number, r: number): CitySnapshot | null {
    return queryCityAtPosition(this.world, this.territoryManager, this.tileMap, q, r);
  }

  /**
   * Get a complete snapshot of the entire game state.
   * Useful for save/load or debugging.
   */
  getCompleteSnapshot(): CompleteGameSnapshot {
    return {
      gameState: this.getState(),
      map: this.getMap(),
      units: this.getUnits(),
      cities: this.getCities(),
      timestamp: Date.now(),
    };
  }

  // --- Event Bus Access ---

  /**
   * Get the event bus for subscribing to game events.
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Subscribe to a specific event type.
   */
  on<T extends GameEventType>(eventType: T['type'], handler: (event: T) => void): () => void {
    return this.eventBus.subscribe(eventType, handler);
  }

  /**
   * Subscribe to all events.
   */
  onAny(handler: (event: GameEventType) => void): () => void {
    return this.eventBus.subscribeAll(handler);
  }

  // --- Internal Access (for executors and integration) ---

  /**
   * Get the ECS world. For use by command executors.
   */
  getWorld(): IWorld {
    return this.world;
  }

  /**
   * Get the tile map. For use by command executors.
   */
  getTileMap(): Map<string, GeneratedTile> {
    return this.tileMap;
  }

  /**
   * Get the territory manager. For use by command executors.
   */
  getTerritoryManager(): TerritoryManager {
    return this.territoryManager;
  }

  /**
   * Get the raw game state. For use by command executors.
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get the map configuration.
   */
  getMapConfig(): MapConfig {
    return this.mapConfig;
  }

  /**
   * Get the player count.
   */
  getPlayerCount(): number {
    return this.playerCount;
  }

  // --- Reset and Regeneration ---

  /**
   * Reset the game with a new map seed.
   */
  reset(seed?: number): void {
    // Create new map config with new seed
    if (seed !== undefined) {
      this.mapConfig = this.mapConfig.withSeed(seed);
    }

    // Reset all state
    this.world = createGameWorld();
    this.tileMap.clear();
    this.territoryManager.clear();
    this.gameState.clear();
    this.eventBus.clear();

    // Regenerate map
    this.generateMap();
  }

  /**
   * Set the ECS world (for integration with existing game).
   */
  setWorld(world: IWorld): void {
    this.world = world;
  }

  /**
   * Set the tile map (for integration with existing game).
   */
  setTileMap(tileMap: Map<string, GeneratedTile>): void {
    this.tileMap = tileMap;
  }

  /**
   * Set the territory manager (for integration with existing game).
   */
  setTerritoryManager(territoryManager: TerritoryManager): void {
    this.territoryManager = territoryManager;
  }

  /**
   * Emit an event through the event bus.
   */
  emit(event: GameEventType): void {
    this.eventBus.emit(event);
  }

  // --- Command Execution ---

  /**
   * Set the pathfinder for command validation/execution.
   */
  setPathfinder(pathfinder: Pathfinder): void {
    this.pathfinder = pathfinder;
  }

  /**
   * Get the pathfinder.
   */
  getPathfinder(): Pathfinder | null {
    return this.pathfinder;
  }

  /**
   * Set the player manager for command execution.
   */
  setPlayerManager(playerManager: PlayerManager): void {
    this.playerManager = playerManager;
  }

  /**
   * Get the player manager.
   */
  getPlayerManager(): PlayerManager | null {
    return this.playerManager;
  }

  /**
   * Execute a game command.
   * Validates the command, executes it, and emits resulting events.
   * @returns CommandResult with success status and emitted events
   */
  executeCommand(command: GameCommand): CommandResult {
    // Get validator for command type
    const validator = getValidator(command.type as CommandType);
    const validatorDeps = this.getValidatorDeps(command.type as CommandType);
    const validation = validator(command, validatorDeps);

    if (!validation.valid) {
      return commandError(validation.error ?? 'Validation failed');
    }

    // Get executor for command type
    const executor = getExecutor(command.type as CommandType);
    const executorDeps = this.getExecutorDeps(command.type as CommandType);
    const events = executor(command, executorDeps);

    // Emit all events
    for (const event of events) {
      this.eventBus.emit(event);
    }

    return commandSuccess(events);
  }

  /**
   * Get validator dependencies for a command type.
   */
  private getValidatorDeps(
    commandType: CommandType
  ):
    | MoveUnitValidatorDeps
    | AttackValidatorDeps
    | FoundCityValidatorDeps
    | SetProductionValidatorDeps
    | EndTurnValidatorDeps {
    switch (commandType) {
      case 'MOVE_UNIT':
        if (!this.pathfinder) {
          throw new Error('Pathfinder not set on GameEngine');
        }
        return {
          world: this.world,
          pathfinder: this.pathfinder,
        } as MoveUnitValidatorDeps;

      case 'ATTACK':
        return {
          world: this.world,
          gameState: this.gameState,
        } as AttackValidatorDeps;

      case 'FOUND_CITY':
        return {
          world: this.world,
          tileMap: this.tileMap,
        } as FoundCityValidatorDeps;

      case 'SET_PRODUCTION':
        return {
          world: this.world,
        } as SetProductionValidatorDeps;

      case 'END_TURN':
        return {
          gameState: this.gameState,
        } as EndTurnValidatorDeps;

      default: {
        const _exhaustiveCheck: never = commandType;
        throw new Error(`Unknown command type: ${_exhaustiveCheck}`);
      }
    }
  }

  /**
   * Get executor dependencies for a command type.
   */
  private getExecutorDeps(
    commandType: CommandType
  ):
    | MoveUnitExecutorDeps
    | AttackExecutorDeps
    | FoundCityExecutorDeps
    | SetProductionExecutorDeps
    | EndTurnExecutorDeps {
    switch (commandType) {
      case 'MOVE_UNIT':
        if (!this.pathfinder) {
          throw new Error('Pathfinder not set on GameEngine');
        }
        return {
          world: this.world,
          pathfinder: this.pathfinder,
        } as MoveUnitExecutorDeps;

      case 'ATTACK':
        return {
          world: this.world,
          tileMap: this.tileMap,
          playerManager: this.playerManager ?? undefined,
        } as AttackExecutorDeps;

      case 'FOUND_CITY':
        return {
          world: this.world,
          territoryManager: this.territoryManager,
        } as FoundCityExecutorDeps;

      case 'SET_PRODUCTION':
        return {
          world: this.world,
        } as SetProductionExecutorDeps;

      case 'END_TURN':
        return {
          world: this.world,
          gameState: this.gameState,
          territoryManager: this.territoryManager,
          tileMap: this.tileMap,
        } as EndTurnExecutorDeps;

      default: {
        const _exhaustiveCheck: never = commandType;
        throw new Error(`Unknown command type: ${_exhaustiveCheck}`);
      }
    }
  }
}
