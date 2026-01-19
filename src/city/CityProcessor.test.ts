import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, Position, OwnerComponent } from '../ecs/world';
import { CityComponent, PopulationComponent, ProductionComponent } from '../ecs/cityComponents';
import { TerritoryManager } from './Territory';
import { ProductionQueue } from './ProductionQueue';
import { CityProcessor, CityProcessorCallbacks, QueueAdvancedEvent } from './CityProcessor';
import { BuildableType, getBuildableCost } from './Buildable';
import { TilePosition } from '../hex/TilePosition';
import { GeneratedTile } from '../map/MapGenerator';
import { Terrain } from '../tile/Terrain';
import { addEntity, addComponent } from 'bitecs';

function createTileMap(
  tiles: Array<{ q: number; r: number; terrain: Terrain }>
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const t of tiles) {
    const position = new TilePosition(t.q, t.r);
    map.set(position.key(), {
      position,
      terrain: t.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}

function createCityEntity(world: IWorld, q: number, r: number, playerId: number): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, OwnerComponent, eid);
  addComponent(world, CityComponent, eid);
  addComponent(world, PopulationComponent, eid);
  addComponent(world, ProductionComponent, eid);

  Position.q[eid] = q;
  Position.r[eid] = r;
  OwnerComponent.playerId[eid] = playerId;
  CityComponent.nameIndex[eid] = 0;
  PopulationComponent.current[eid] = 1;
  PopulationComponent.foodStockpile[eid] = 0;
  PopulationComponent.foodForGrowth[eid] = 15;
  ProductionComponent.currentItem[eid] = 0;
  ProductionComponent.progress[eid] = 0;
  ProductionComponent.cost[eid] = 0;

  return eid;
}

describe('CityProcessor', () => {
  let world: IWorld;
  let territoryManager: TerritoryManager;
  let productionQueue: ProductionQueue;
  let tileMap: Map<string, GeneratedTile>;
  let callbacks: CityProcessorCallbacks;
  let processor: CityProcessor;

  beforeEach(() => {
    world = createGameWorld();
    territoryManager = new TerritoryManager();
    productionQueue = new ProductionQueue();

    // Create a basic tile map with grassland tiles for production
    const tiles: Array<{ q: number; r: number; terrain: Terrain }> = [];
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        tiles.push({ q, r, terrain: Terrain.Grassland });
      }
    }
    tileMap = createTileMap(tiles);

    callbacks = {
      onProductionCompleted: vi.fn(),
      onPopulationGrowth: vi.fn(),
      onQueueAdvanced: vi.fn(),
    };

    processor = new CityProcessor(world, territoryManager, tileMap, productionQueue, callbacks);
  });

  describe('queueItem', () => {
    it('should start production immediately if city is idle', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      const result = processor.queueItem(cityEid, BuildableType.Warrior);

      expect(result).toBe(true);
      expect(ProductionComponent.currentItem[cityEid]).toBe(BuildableType.Warrior);
      expect(ProductionComponent.cost[cityEid]).toBe(getBuildableCost(BuildableType.Warrior));
      expect(productionQueue.getQueue(cityEid)).toEqual([]);
    });

    it('should add to queue if city has production', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set current production
      processor.setProduction(cityEid, BuildableType.Warrior);

      // Queue another item
      const result = processor.queueItem(cityEid, BuildableType.Scout);

      expect(result).toBe(true);
      expect(productionQueue.getQueue(cityEid)).toEqual([BuildableType.Scout]);
    });

    it('should return false when queue is full', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set current production
      processor.setProduction(cityEid, BuildableType.Warrior);

      // Fill queue
      for (let i = 0; i < 5; i++) {
        processor.queueItem(cityEid, BuildableType.Scout);
      }

      // Try to add one more
      const result = processor.queueItem(cityEid, BuildableType.Settler);

      expect(result).toBe(false);
      expect(productionQueue.getQueueLength(cityEid)).toBe(5);
    });
  });

  describe('getQueue', () => {
    it('should return empty array for city with no queue', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);

      expect(processor.getQueue(cityEid)).toEqual([]);
    });

    it('should return queued items', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      processor.setProduction(cityEid, BuildableType.Warrior);
      processor.queueItem(cityEid, BuildableType.Scout);
      processor.queueItem(cityEid, BuildableType.Settler);

      expect(processor.getQueue(cityEid)).toEqual([BuildableType.Scout, BuildableType.Settler]);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove item at index', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      processor.setProduction(cityEid, BuildableType.Warrior);
      processor.queueItem(cityEid, BuildableType.Scout);
      processor.queueItem(cityEid, BuildableType.Settler);

      processor.removeFromQueue(cityEid, 0);

      expect(processor.getQueue(cityEid)).toEqual([BuildableType.Settler]);
    });
  });

  describe('isQueueFull', () => {
    it('should return false for empty queue', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      expect(processor.isQueueFull(cityEid)).toBe(false);
    });

    it('should return true for full queue', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      processor.setProduction(cityEid, BuildableType.Warrior);
      for (let i = 0; i < 5; i++) {
        processor.queueItem(cityEid, BuildableType.Scout);
      }

      expect(processor.isQueueFull(cityEid)).toBe(true);
    });
  });

  describe('production overflow', () => {
    it('should advance queue when production completes', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set up production
      processor.setProduction(cityEid, BuildableType.Warrior);
      processor.queueItem(cityEid, BuildableType.Scout);

      // Simulate production completion by setting progress >= cost
      const warriorCost = getBuildableCost(BuildableType.Warrior);
      ProductionComponent.progress[cityEid] = warriorCost;

      // Process turn end
      processor.processTurnEnd();

      // Should have advanced to Scout
      expect(ProductionComponent.currentItem[cityEid]).toBe(BuildableType.Scout);
      expect(callbacks.onQueueAdvanced).toHaveBeenCalled();
    });

    it('should apply capped overflow to next item', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set up production
      processor.setProduction(cityEid, BuildableType.Warrior);
      processor.queueItem(cityEid, BuildableType.Scout);

      // Simulate production with overflow
      const warriorCost = getBuildableCost(BuildableType.Warrior);
      const overflow = 30;
      ProductionComponent.progress[cityEid] = warriorCost + overflow;

      // Process turn end
      processor.processTurnEnd();

      // Check overflow was applied (capped at 50% of Scout cost)
      const scoutCost = getBuildableCost(BuildableType.Scout);
      const maxOverflow = Math.floor(scoutCost * 0.5);
      const expectedProgress = Math.min(overflow, maxOverflow);

      expect(ProductionComponent.progress[cityEid]).toBe(expectedProgress);
    });

    it('should reset to idle when queue is empty', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set up production with empty queue
      processor.setProduction(cityEid, BuildableType.Warrior);

      // Simulate production completion
      const warriorCost = getBuildableCost(BuildableType.Warrior);
      ProductionComponent.progress[cityEid] = warriorCost;

      // Process turn end
      processor.processTurnEnd();

      // Should be idle
      expect(ProductionComponent.currentItem[cityEid]).toBe(0);
      expect(ProductionComponent.progress[cityEid]).toBe(0);
      expect(ProductionComponent.cost[cityEid]).toBe(0);
      expect(callbacks.onQueueAdvanced).not.toHaveBeenCalled();
    });

    it('should notify onQueueAdvanced with correct data', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Set up production with multiple items in queue
      processor.setProduction(cityEid, BuildableType.Warrior);
      processor.queueItem(cityEid, BuildableType.Scout);
      processor.queueItem(cityEid, BuildableType.Settler);

      // Simulate production with some overflow
      const warriorCost = getBuildableCost(BuildableType.Warrior);
      const overflow = 10;
      ProductionComponent.progress[cityEid] = warriorCost + overflow;

      // Process turn end
      processor.processTurnEnd();

      // Check callback was called with correct data
      expect(callbacks.onQueueAdvanced).toHaveBeenCalledWith(
        expect.objectContaining({
          cityEid,
          nextItem: BuildableType.Scout,
          remainingQueue: 1, // Settler still in queue
        })
      );

      // Check overflowApplied is reasonable
      const call = (callbacks.onQueueAdvanced as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as QueueAdvancedEvent;
      const scoutCost = getBuildableCost(BuildableType.Scout);
      const maxOverflow = Math.floor(scoutCost * 0.5);
      expect(call.overflowApplied).toBeLessThanOrEqual(maxOverflow);
      expect(call.overflowApplied).toBeLessThanOrEqual(overflow);
    });
  });

  describe('setProductionQueue', () => {
    it('should allow replacing the production queue', () => {
      const cityEid = createCityEntity(world, 0, 0, 0);
      territoryManager.initializeTerritory(cityEid, new TilePosition(0, 0));

      // Add item to original queue
      processor.setProduction(cityEid, BuildableType.Warrior);
      processor.queueItem(cityEid, BuildableType.Scout);

      // Create new queue
      const newQueue = new ProductionQueue();
      processor.setProductionQueue(newQueue);

      // Original queue items should not be accessible
      expect(processor.getQueue(cityEid)).toEqual([]);
    });
  });
});
