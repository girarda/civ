import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import {
  createGameWorld,
  createUnitEntity,
  createCityEntity,
  MovementComponent,
  unitQuery,
} from '../../../ecs/world';
import { PopulationComponent, ProductionComponent } from '../../../ecs/citySystems';
import { executeEndTurn, EndTurnExecutorDeps } from './EndTurnExecutor';
import { EndTurnCommand } from '../types';
import { TerritoryManager } from '../../../city/Territory';
import { GameState } from '../../../game/GameState';
import { TilePosition } from '../../../hex/TilePosition';
import { GeneratedTile } from '../../../map/MapGenerator';
import { Terrain } from '../../../tile/Terrain';
import { UnitType } from '../../../unit/UnitType';
import { BuildableType, getBuildableCost } from '../../../city/Buildable';
import {
  TurnEndedEvent,
  TurnStartedEvent,
  ProductionCompletedEvent,
  UnitSpawnedEvent,
  PopulationGrowthEvent,
} from '../../events/types';

/**
 * Helper to create a tile map for testing.
 */
function createTileMap(
  tiles: { q: number; r: number; terrain: Terrain }[]
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    const position = new TilePosition(tile.q, tile.r);
    map.set(position.key(), {
      position,
      terrain: tile.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}

/**
 * Create an EndTurnCommand for testing.
 */
function createEndTurnCommand(playerId: number = 0): EndTurnCommand {
  return {
    type: 'END_TURN',
    playerId,
  };
}

describe('EndTurnExecutor', () => {
  let world: IWorld;
  let gameState: GameState;
  let territoryManager: TerritoryManager;
  let tileMap: Map<string, GeneratedTile>;
  let deps: EndTurnExecutorDeps;

  beforeEach(() => {
    world = createGameWorld();
    gameState = new GameState();
    territoryManager = new TerritoryManager();
    // Create a tile map with productive tiles
    // Grassland: 2 food, 0 prod. Plains: 1 food, 1 prod
    tileMap = createTileMap([
      { q: 0, r: 0, terrain: Terrain.Grassland }, // City center: 2 food
      { q: 1, r: 0, terrain: Terrain.Grassland }, // 2 food
      { q: -1, r: 0, terrain: Terrain.Grassland }, // 2 food
      { q: 0, r: 1, terrain: Terrain.Grassland }, // 2 food
      { q: 0, r: -1, terrain: Terrain.Grassland }, // 2 food
      { q: 1, r: -1, terrain: Terrain.Grassland }, // 2 food
      { q: -1, r: 1, terrain: Terrain.Grassland }, // 2 food
    ]);
    // Total: 7 tiles * 2 food = 14 food per turn
    deps = { world, gameState, territoryManager, tileMap };
  });

  describe('turn events', () => {
    it('should emit TurnEndedEvent with correct turn number', () => {
      const command = createEndTurnCommand(0);

      const events = executeEndTurn(command, deps);

      const turnEndedEvent = events.find((e) => e.type === 'TURN_ENDED') as TurnEndedEvent;
      expect(turnEndedEvent).toBeDefined();
      expect(turnEndedEvent.turnNumber).toBe(1); // Initial turn
      expect(turnEndedEvent.timestamp).toBeDefined();
    });

    it('should emit TurnStartedEvent with incremented turn number', () => {
      const command = createEndTurnCommand(0);

      const events = executeEndTurn(command, deps);

      const turnStartedEvent = events.find((e) => e.type === 'TURN_STARTED') as TurnStartedEvent;
      expect(turnStartedEvent).toBeDefined();
      expect(turnStartedEvent.turnNumber).toBe(2); // Incremented
      expect(turnStartedEvent.currentPlayer).toBe(0);
      expect(turnStartedEvent.timestamp).toBeDefined();
    });
  });

  describe('movement reset', () => {
    it('should reset all unit movement points', () => {
      const unit1 = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const unit2 = createUnitEntity(world, 1, 0, UnitType.Scout, 0, 3);
      // Drain movement points
      MovementComponent.current[unit1] = 0;
      MovementComponent.current[unit2] = 1;

      const command = createEndTurnCommand(0);
      executeEndTurn(command, deps);

      expect(MovementComponent.current[unit1]).toBe(MovementComponent.max[unit1]);
      expect(MovementComponent.current[unit2]).toBe(MovementComponent.max[unit2]);
    });
  });

  describe('game state advancement', () => {
    it('should advance game state turn number', () => {
      const command = createEndTurnCommand(0);

      executeEndTurn(command, deps);

      expect(gameState.getTurnNumber()).toBe(2);
    });
  });

  describe('city production', () => {
    it('should emit ProductionCompletedEvent when production finishes', () => {
      // Create a productive tile map with Plains (1 food, 1 prod each)
      const productiveTileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Plains },
        { q: 1, r: 0, terrain: Terrain.Plains },
        { q: -1, r: 0, terrain: Terrain.Plains },
        { q: 0, r: 1, terrain: Terrain.Plains },
        { q: 0, r: -1, terrain: Terrain.Plains },
        { q: 1, r: -1, terrain: Terrain.Plains },
        { q: -1, r: 1, terrain: Terrain.Plains },
      ]);
      const productiveDeps = { ...deps, tileMap: productiveTileMap };

      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set up production for Warrior
      const warriorCost = getBuildableCost(BuildableType.Warrior); // 40
      ProductionComponent.currentItem[cityEid] = BuildableType.Warrior;
      ProductionComponent.cost[cityEid] = warriorCost;
      // City produces 7 prod/turn (7 Plains * 1 prod)
      // Set progress so it will complete: 40 - 7 = 33
      ProductionComponent.progress[cityEid] = warriorCost - 7;

      const command = createEndTurnCommand(0);
      const events = executeEndTurn(command, productiveDeps);

      const productionEvent = events.find(
        (e) => e.type === 'PRODUCTION_COMPLETED'
      ) as ProductionCompletedEvent;
      expect(productionEvent).toBeDefined();
      expect(productionEvent.cityEid).toBe(cityEid);
      expect(productionEvent.producedItem).toBe(BuildableType.Warrior);
      expect(productionEvent.playerId).toBe(0);
    });

    it('should emit UnitSpawnedEvent when production completes unit', () => {
      // Create a productive tile map with Plains (1 food, 1 prod each)
      const productiveTileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Plains },
        { q: 1, r: 0, terrain: Terrain.Plains },
        { q: -1, r: 0, terrain: Terrain.Plains },
        { q: 0, r: 1, terrain: Terrain.Plains },
        { q: 0, r: -1, terrain: Terrain.Plains },
        { q: 1, r: -1, terrain: Terrain.Plains },
        { q: -1, r: 1, terrain: Terrain.Plains },
      ]);
      const productiveDeps = { ...deps, tileMap: productiveTileMap };

      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      const warriorCost = getBuildableCost(BuildableType.Warrior); // 40
      ProductionComponent.currentItem[cityEid] = BuildableType.Warrior;
      ProductionComponent.cost[cityEid] = warriorCost;
      // City produces 7 prod/turn (7 Plains * 1 prod)
      ProductionComponent.progress[cityEid] = warriorCost - 7;

      const command = createEndTurnCommand(0);
      const events = executeEndTurn(command, productiveDeps);

      const spawnEvent = events.find((e) => e.type === 'UNIT_SPAWNED') as UnitSpawnedEvent;
      expect(spawnEvent).toBeDefined();
      expect(spawnEvent.unitType).toBe(UnitType.Warrior);
      expect(spawnEvent.q).toBe(0);
      expect(spawnEvent.r).toBe(0);
      expect(spawnEvent.playerId).toBe(0);
    });

    it('should spawn unit when production completes', () => {
      // Create a productive tile map with Plains (1 food, 1 prod each)
      const productiveTileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Plains },
        { q: 1, r: 0, terrain: Terrain.Plains },
        { q: -1, r: 0, terrain: Terrain.Plains },
        { q: 0, r: 1, terrain: Terrain.Plains },
        { q: 0, r: -1, terrain: Terrain.Plains },
        { q: 1, r: -1, terrain: Terrain.Plains },
        { q: -1, r: 1, terrain: Terrain.Plains },
      ]);
      const productiveDeps = { ...deps, tileMap: productiveTileMap };

      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      const warriorCost = getBuildableCost(BuildableType.Warrior); // 40
      ProductionComponent.currentItem[cityEid] = BuildableType.Warrior;
      ProductionComponent.cost[cityEid] = warriorCost;
      // City produces 7 prod/turn
      ProductionComponent.progress[cityEid] = warriorCost - 7;

      const unitsBefore = unitQuery(world).length;

      const command = createEndTurnCommand(0);
      executeEndTurn(command, productiveDeps);

      const unitsAfter = unitQuery(world).length;
      expect(unitsAfter).toBe(unitsBefore + 1);
    });

    it('should reset production after completion', () => {
      // Create a productive tile map with Plains (1 food, 1 prod each)
      const productiveTileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Plains },
        { q: 1, r: 0, terrain: Terrain.Plains },
        { q: -1, r: 0, terrain: Terrain.Plains },
        { q: 0, r: 1, terrain: Terrain.Plains },
        { q: 0, r: -1, terrain: Terrain.Plains },
        { q: 1, r: -1, terrain: Terrain.Plains },
        { q: -1, r: 1, terrain: Terrain.Plains },
      ]);
      const productiveDeps = { ...deps, tileMap: productiveTileMap };

      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      const warriorCost = getBuildableCost(BuildableType.Warrior); // 40
      ProductionComponent.currentItem[cityEid] = BuildableType.Warrior;
      ProductionComponent.cost[cityEid] = warriorCost;
      // City produces 7 prod/turn
      ProductionComponent.progress[cityEid] = warriorCost - 7;

      const command = createEndTurnCommand(0);
      executeEndTurn(command, productiveDeps);

      expect(ProductionComponent.currentItem[cityEid]).toBe(0);
      expect(ProductionComponent.progress[cityEid]).toBe(0);
      expect(ProductionComponent.cost[cityEid]).toBe(0);
    });
  });

  describe('city growth', () => {
    it('should emit PopulationGrowthEvent when city grows', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set up food stockpile to nearly trigger growth
      // Growth threshold for pop 1 is 15 + 1*6 = 21
      // City yields with Grassland: 7 tiles * 2 food = 14 food
      // Consumption: population 1 * 2 = 2 food
      // Net food: 14 - 2 = 12 per turn
      // Set stockpile so it will exceed threshold after processing
      PopulationComponent.foodStockpile[cityEid] = 10; // 10 + 12 = 22 > 21

      const command = createEndTurnCommand(0);
      const events = executeEndTurn(command, deps);

      const growthEvent = events.find((e) => e.type === 'POPULATION_GROWTH') as PopulationGrowthEvent;
      expect(growthEvent).toBeDefined();
      expect(growthEvent.cityEid).toBe(cityEid);
      expect(growthEvent.newPopulation).toBe(2);
      expect(growthEvent.playerId).toBe(0);
    });

    it('should update population when city grows', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));
      // Set stockpile to trigger growth (10 + 12 net = 22 > 21 threshold)
      PopulationComponent.foodStockpile[cityEid] = 10;

      const command = createEndTurnCommand(0);
      executeEndTurn(command, deps);

      expect(PopulationComponent.current[cityEid]).toBe(2);
    });
  });

  describe('no production', () => {
    it('should not emit production events when no production is set', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));
      // currentItem defaults to 0 (None)

      const command = createEndTurnCommand(0);
      const events = executeEndTurn(command, deps);

      const productionEvents = events.filter(
        (e) => e.type === 'PRODUCTION_COMPLETED' || e.type === 'UNIT_SPAWNED'
      );
      expect(productionEvents).toHaveLength(0);
    });
  });
});
