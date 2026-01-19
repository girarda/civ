/**
 * Executor for EndTurnCommand.
 * Processes turn end including city production and movement reset.
 */

import { IWorld } from 'bitecs';
import { EndTurnCommand } from '../types';
import {
  GameEventType,
  createEvent,
  TurnEndedEvent,
  TurnStartedEvent,
  ProductionCompletedEvent,
  UnitSpawnedEvent,
  PopulationGrowthEvent,
} from '../../events/types';
import {
  Position,
  OwnerComponent,
  MovementComponent,
  createUnitEntity,
  unitQuery,
} from '../../../ecs/world';
import { PopulationComponent, ProductionComponent, getAllCities } from '../../../ecs/citySystems';
import { TilePosition } from '../../../hex/TilePosition';
import { TerritoryManager } from '../../../city/Territory';
import { GeneratedTile } from '../../../map/MapGenerator';
import { calculateCityYields, calculateNetFood } from '../../../city/CityYields';
import { buildableToUnitType } from '../../../city/Buildable';
import {
  calculateGrowthThreshold,
  FOOD_PER_POPULATION,
  DEFAULT_CITY_NAMES,
} from '../../../city/CityData';
import { UNIT_TYPE_DATA } from '../../../unit/UnitType';
import { GameState } from '../../../game/GameState';
import { CityComponent } from '../../../ecs/cityComponents';

export interface EndTurnExecutorDeps {
  world: IWorld;
  gameState: GameState;
  territoryManager: TerritoryManager;
  tileMap: Map<string, GeneratedTile>;
}

/**
 * Execute an EndTurnCommand.
 * Updates ECS state and returns events to emit.
 */
export function executeEndTurn(
  _command: EndTurnCommand,
  deps: EndTurnExecutorDeps
): GameEventType[] {
  const { world, gameState, territoryManager, tileMap } = deps;

  const events: GameEventType[] = [];
  const currentTurn = gameState.getTurnNumber();

  // Emit TurnEndedEvent
  const turnEndedEvent = createEvent<TurnEndedEvent>({
    type: 'TURN_ENDED',
    turnNumber: currentTurn,
  });
  events.push(turnEndedEvent);

  // Process all cities
  const cities = getAllCities(world);
  for (const cityEid of cities) {
    // Process production
    const productionEvents = processProduction(cityEid, world, territoryManager, tileMap);
    events.push(...productionEvents);

    // Process growth
    const growthEvents = processGrowth(cityEid, world, territoryManager, tileMap);
    events.push(...growthEvents);
  }

  // Reset movement points for all units
  const units = unitQuery(world);
  for (const eid of units) {
    MovementComponent.current[eid] = MovementComponent.max[eid];
  }

  // Advance turn (this modifies gameState)
  gameState.nextTurn();

  // Emit TurnStartedEvent
  const newTurn = gameState.getTurnNumber();
  const currentPlayer = gameState.getCurrentPlayer();
  const turnStartedEvent = createEvent<TurnStartedEvent>({
    type: 'TURN_STARTED',
    turnNumber: newTurn,
    currentPlayer,
  });
  events.push(turnStartedEvent);

  return events;
}

/**
 * Process production for a single city.
 */
function processProduction(
  cityEid: number,
  world: IWorld,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>
): GameEventType[] {
  const events: GameEventType[] = [];

  const currentItem = ProductionComponent.currentItem[cityEid];
  if (currentItem === 0) return events; // No production

  // Calculate yields
  const yields = calculateCityYields(cityEid, territoryManager, tileMap);

  // Add production progress
  const newProgress = ProductionComponent.progress[cityEid] + yields.production;
  const cost = ProductionComponent.cost[cityEid];

  if (newProgress >= cost) {
    // Production complete
    const unitType = buildableToUnitType(currentItem);
    if (unitType !== null) {
      const q = Position.q[cityEid];
      const r = Position.r[cityEid];
      const playerId = OwnerComponent.playerId[cityEid];
      const position = new TilePosition(q, r);
      const cityName = DEFAULT_CITY_NAMES[CityComponent.nameIndex[cityEid]] ?? `City ${cityEid}`;

      // Create unit
      const unitData = UNIT_TYPE_DATA[unitType];
      const unitEid = createUnitEntity(
        world,
        position.q,
        position.r,
        unitType,
        playerId,
        unitData.movement
      );

      // Emit ProductionCompletedEvent
      const productionEvent = createEvent<ProductionCompletedEvent>({
        type: 'PRODUCTION_COMPLETED',
        cityEid,
        cityName,
        producedItem: currentItem,
        unitEid,
        playerId,
      });
      events.push(productionEvent);

      // Emit UnitSpawnedEvent
      const spawnEvent = createEvent<UnitSpawnedEvent>({
        type: 'UNIT_SPAWNED',
        unitEid,
        unitType,
        q: position.q,
        r: position.r,
        playerId,
      });
      events.push(spawnEvent);

      // Reset production
      ProductionComponent.currentItem[cityEid] = 0;
      ProductionComponent.progress[cityEid] = 0;
      ProductionComponent.cost[cityEid] = 0;
    }
  } else {
    ProductionComponent.progress[cityEid] = newProgress;
  }

  return events;
}

/**
 * Process population growth for a single city.
 */
function processGrowth(
  cityEid: number,
  _world: IWorld,
  territoryManager: TerritoryManager,
  tileMap: Map<string, GeneratedTile>
): GameEventType[] {
  const events: GameEventType[] = [];

  // Calculate yields
  const yields = calculateCityYields(cityEid, territoryManager, tileMap);
  const population = PopulationComponent.current[cityEid];

  // Calculate net food
  const netFood = calculateNetFood(yields.food, population, FOOD_PER_POPULATION);

  // Update stockpile
  const currentStockpile = PopulationComponent.foodStockpile[cityEid];
  const newStockpile = Math.max(0, currentStockpile + netFood);
  const foodForGrowth = PopulationComponent.foodForGrowth[cityEid];

  if (newStockpile >= foodForGrowth) {
    // Population grows
    const newPopulation = population + 1;
    const playerId = OwnerComponent.playerId[cityEid];

    PopulationComponent.current[cityEid] = newPopulation;
    PopulationComponent.foodStockpile[cityEid] = newStockpile - foodForGrowth;
    PopulationComponent.foodForGrowth[cityEid] = calculateGrowthThreshold(newPopulation);

    // Emit PopulationGrowthEvent
    const growthEvent = createEvent<PopulationGrowthEvent>({
      type: 'POPULATION_GROWTH',
      cityEid,
      newPopulation,
      playerId,
    });
    events.push(growthEvent);
  } else {
    PopulationComponent.foodStockpile[cityEid] = newStockpile;
  }

  return events;
}
