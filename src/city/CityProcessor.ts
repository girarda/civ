/**
 * CityProcessor handles city turn processing.
 * Processes production and growth for all cities.
 */

import { IWorld } from 'bitecs';
import { Position, OwnerComponent, createUnitEntity } from '../ecs/world';
import { PopulationComponent, ProductionComponent } from '../ecs/cityComponents';
import { getAllCities } from '../ecs/citySystems';
import { TerritoryManager } from './Territory';
import { calculateCityYields, calculateNetFood } from './CityYields';
import { BuildableType, buildableToUnitType, getBuildableCost } from './Buildable';
import { ProductionQueue } from './ProductionQueue';
import { calculateGrowthThreshold, FOOD_PER_POPULATION } from './CityData';
import { UNIT_TYPE_DATA } from '../unit/UnitType';
import { TilePosition } from '../hex/TilePosition';
import { GeneratedTile } from '../map/MapGenerator';
import { GameState } from '../game/GameState';

export interface ProductionCompletedEvent {
  cityEid: number;
  unitEid: number;
  unitType: number;
  position: TilePosition;
  playerId: number;
}

export interface PopulationGrowthEvent {
  cityEid: number;
  newPopulation: number;
}

export interface QueueAdvancedEvent {
  cityEid: number;
  nextItem: BuildableType;
  remainingQueue: number;
  overflowApplied: number;
}

export interface CityProcessorCallbacks {
  onProductionCompleted?: (event: ProductionCompletedEvent) => void;
  onPopulationGrowth?: (event: PopulationGrowthEvent) => void;
  onQueueAdvanced?: (event: QueueAdvancedEvent) => void;
}

/** Overflow cap as percentage of next item's cost */
const OVERFLOW_CAP_PERCENT = 0.5;

/**
 * Processes cities at turn end.
 */
export class CityProcessor {
  private world: IWorld;
  private territoryManager: TerritoryManager;
  private tileMap: Map<string, GeneratedTile>;
  private callbacks: CityProcessorCallbacks;
  private productionQueue: ProductionQueue;
  private gameState: GameState | null = null;

  constructor(
    world: IWorld,
    territoryManager: TerritoryManager,
    tileMap: Map<string, GeneratedTile>,
    productionQueue: ProductionQueue,
    callbacks: CityProcessorCallbacks = {},
    gameState?: GameState
  ) {
    this.world = world;
    this.territoryManager = territoryManager;
    this.tileMap = tileMap;
    this.productionQueue = productionQueue;
    this.callbacks = callbacks;
    this.gameState = gameState ?? null;
  }

  /**
   * Update references after world regeneration.
   */
  setWorld(world: IWorld): void {
    this.world = world;
  }

  setTerritoryManager(territoryManager: TerritoryManager): void {
    this.territoryManager = territoryManager;
  }

  setTileMap(tileMap: Map<string, GeneratedTile>): void {
    this.tileMap = tileMap;
  }

  setProductionQueue(productionQueue: ProductionQueue): void {
    this.productionQueue = productionQueue;
  }

  setGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  /**
   * Process all cities for turn end.
   */
  processTurnEnd(): void {
    // Skip processing if game is over
    if (this.gameState?.isGameOver()) {
      return;
    }

    const cities = getAllCities(this.world);
    for (const cityEid of cities) {
      this.processProduction(cityEid);
      this.processGrowth(cityEid);
    }
  }

  /**
   * Process production for a single city.
   */
  private processProduction(cityEid: number): void {
    const currentItem = ProductionComponent.currentItem[cityEid];
    if (currentItem === 0) return; // No production

    // Calculate yields
    const yields = calculateCityYields(cityEid, this.territoryManager, this.tileMap);

    // Add production progress
    const newProgress = ProductionComponent.progress[cityEid] + yields.production;
    const cost = ProductionComponent.cost[cityEid];

    if (newProgress >= cost) {
      // Production complete
      this.completeProduction(cityEid, currentItem);
    } else {
      ProductionComponent.progress[cityEid] = newProgress;
    }
  }

  /**
   * Complete production and spawn unit.
   */
  private completeProduction(cityEid: number, buildableType: number): void {
    const unitType = buildableToUnitType(buildableType);
    if (unitType === null) return;

    const q = Position.q[cityEid];
    const r = Position.r[cityEid];
    const playerId = OwnerComponent.playerId[cityEid];
    const position = new TilePosition(q, r);

    // Calculate overflow before spawning
    const progress = ProductionComponent.progress[cityEid];
    const cost = ProductionComponent.cost[cityEid];
    const overflow = Math.max(0, progress - cost);

    // Find spawn position (city tile or adjacent)
    const spawnPos = this.findSpawnPosition(position);
    if (!spawnPos) {
      console.log('No valid spawn position for unit');
      return;
    }

    // Create unit
    const unitData = UNIT_TYPE_DATA[unitType];
    const unitEid = createUnitEntity(
      this.world,
      spawnPos.q,
      spawnPos.r,
      unitType,
      playerId,
      unitData.movement
    );

    // Notify production completed callback
    if (this.callbacks.onProductionCompleted) {
      this.callbacks.onProductionCompleted({
        cityEid,
        unitEid,
        unitType,
        position: spawnPos,
        playerId,
      });
    }

    // Advance queue
    const nextItem = this.productionQueue.dequeue(cityEid);
    if (nextItem !== null) {
      const overflowApplied = this.startProduction(cityEid, nextItem, overflow);

      if (this.callbacks.onQueueAdvanced) {
        this.callbacks.onQueueAdvanced({
          cityEid,
          nextItem,
          remainingQueue: this.productionQueue.getQueueLength(cityEid),
          overflowApplied,
        });
      }
    } else {
      // Reset to idle
      ProductionComponent.currentItem[cityEid] = 0;
      ProductionComponent.progress[cityEid] = 0;
      ProductionComponent.cost[cityEid] = 0;
    }
  }

  /**
   * Start production of an item with optional overflow from previous item.
   * Returns the amount of overflow actually applied.
   */
  private startProduction(cityEid: number, buildable: BuildableType, overflow: number = 0): number {
    const cost = getBuildableCost(buildable);
    const maxOverflow = Math.floor(cost * OVERFLOW_CAP_PERCENT);
    const cappedOverflow = Math.min(overflow, maxOverflow);

    ProductionComponent.currentItem[cityEid] = buildable;
    ProductionComponent.progress[cityEid] = cappedOverflow;
    ProductionComponent.cost[cityEid] = cost;

    return cappedOverflow;
  }

  /**
   * Find a valid position to spawn a unit near a city.
   * Prefers the city tile, then adjacent tiles.
   */
  private findSpawnPosition(cityPos: TilePosition): TilePosition | null {
    // For MVP, just spawn on city tile (stacking allowed for now)
    return cityPos;
  }

  /**
   * Process population growth for a single city.
   */
  private processGrowth(cityEid: number): void {
    // Calculate yields
    const yields = calculateCityYields(cityEid, this.territoryManager, this.tileMap);
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
      PopulationComponent.current[cityEid] = newPopulation;
      PopulationComponent.foodStockpile[cityEid] = newStockpile - foodForGrowth;
      PopulationComponent.foodForGrowth[cityEid] = calculateGrowthThreshold(newPopulation);

      if (this.callbacks.onPopulationGrowth) {
        this.callbacks.onPopulationGrowth({
          cityEid,
          newPopulation,
        });
      }
    } else {
      PopulationComponent.foodStockpile[cityEid] = newStockpile;
    }
  }

  /**
   * Set production for a city.
   */
  setProduction(cityEid: number, buildableType: number): void {
    // Block production changes if game is over
    if (this.gameState?.isGameOver()) {
      return;
    }

    const cost = getBuildableCost(buildableType);
    ProductionComponent.currentItem[cityEid] = buildableType;
    ProductionComponent.progress[cityEid] = 0;
    ProductionComponent.cost[cityEid] = cost;
  }

  /**
   * Clear production for a city.
   */
  clearProduction(cityEid: number): void {
    ProductionComponent.currentItem[cityEid] = 0;
    ProductionComponent.progress[cityEid] = 0;
    ProductionComponent.cost[cityEid] = 0;
  }

  /**
   * Add an item to a city's production queue.
   * If city has no current production, starts the item immediately.
   */
  queueItem(cityEid: number, buildable: BuildableType): boolean {
    // If no current production, start immediately
    if (ProductionComponent.currentItem[cityEid] === 0) {
      this.setProduction(cityEid, buildable);
      return true;
    }
    return this.productionQueue.enqueue(cityEid, buildable);
  }

  /**
   * Get the production queue for a city.
   */
  getQueue(cityEid: number): readonly BuildableType[] {
    return this.productionQueue.getQueue(cityEid);
  }

  /**
   * Remove an item from a city's production queue.
   */
  removeFromQueue(cityEid: number, index: number): void {
    this.productionQueue.remove(cityEid, index);
  }

  /**
   * Check if a city's queue is full.
   */
  isQueueFull(cityEid: number): boolean {
    return this.productionQueue.isFull(cityEid);
  }
}
