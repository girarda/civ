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
import { buildableToUnitType, getBuildableCost } from './Buildable';
import { calculateGrowthThreshold, FOOD_PER_POPULATION } from './CityData';
import { UNIT_TYPE_DATA } from '../unit/UnitType';
import { TilePosition } from '../hex/TilePosition';
import { GeneratedTile } from '../map/MapGenerator';

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

export interface CityProcessorCallbacks {
  onProductionCompleted?: (event: ProductionCompletedEvent) => void;
  onPopulationGrowth?: (event: PopulationGrowthEvent) => void;
}

/**
 * Processes cities at turn end.
 */
export class CityProcessor {
  private world: IWorld;
  private territoryManager: TerritoryManager;
  private tileMap: Map<string, GeneratedTile>;
  private callbacks: CityProcessorCallbacks;

  constructor(
    world: IWorld,
    territoryManager: TerritoryManager,
    tileMap: Map<string, GeneratedTile>,
    callbacks: CityProcessorCallbacks = {}
  ) {
    this.world = world;
    this.territoryManager = territoryManager;
    this.tileMap = tileMap;
    this.callbacks = callbacks;
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

  /**
   * Process all cities for turn end.
   */
  processTurnEnd(): void {
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

    // Reset production
    ProductionComponent.currentItem[cityEid] = 0;
    ProductionComponent.progress[cityEid] = 0;
    ProductionComponent.cost[cityEid] = 0;

    // Notify callback
    if (this.callbacks.onProductionCompleted) {
      this.callbacks.onProductionCompleted({
        cityEid,
        unitEid,
        unitType,
        position: spawnPos,
        playerId,
      });
    }
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
}
