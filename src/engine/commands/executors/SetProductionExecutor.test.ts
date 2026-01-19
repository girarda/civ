import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createCityEntity } from '../../../ecs/world';
import { ProductionComponent } from '../../../ecs/citySystems';
import { executeSetProduction, SetProductionExecutorDeps } from './SetProductionExecutor';
import { SetProductionCommand } from '../types';
import { BuildableType, getBuildableCost } from '../../../city/Buildable';
import { ProductionChangedEvent } from '../../events/types';

/**
 * Create a SetProductionCommand for testing.
 */
function createSetProductionCommand(
  cityEid: number,
  buildableType: BuildableType,
  playerId: number = 0
): SetProductionCommand {
  return {
    type: 'SET_PRODUCTION',
    playerId,
    cityEid,
    buildableType,
  };
}

describe('SetProductionExecutor', () => {
  let world: IWorld;
  let deps: SetProductionExecutorDeps;

  beforeEach(() => {
    world = createGameWorld();
    deps = {};
  });

  describe('event emission', () => {
    it('should emit ProductionChangedEvent with correct fields', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Warrior, 0);

      const events = executeSetProduction(command, deps);

      expect(events).toHaveLength(1);
      const event = events[0] as ProductionChangedEvent;
      expect(event.type).toBe('PRODUCTION_CHANGED');
      expect(event.cityEid).toBe(cityEid);
      expect(event.newItem).toBe(BuildableType.Warrior);
      expect(event.playerId).toBe(0);
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('state changes', () => {
    it('should update ProductionComponent.currentItem correctly', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Warrior, 0);

      executeSetProduction(command, deps);

      expect(ProductionComponent.currentItem[cityEid]).toBe(BuildableType.Warrior);
    });

    it('should reset production progress to 0', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      // Simulate some existing progress
      ProductionComponent.progress[cityEid] = 50;
      const command = createSetProductionCommand(cityEid, BuildableType.Warrior, 0);

      executeSetProduction(command, deps);

      expect(ProductionComponent.progress[cityEid]).toBe(0);
    });

    it('should set correct production cost for Warrior', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Warrior, 0);

      executeSetProduction(command, deps);

      const expectedCost = getBuildableCost(BuildableType.Warrior);
      expect(ProductionComponent.cost[cityEid]).toBe(expectedCost);
    });

    it('should set correct production cost for Scout', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Scout, 0);

      executeSetProduction(command, deps);

      const expectedCost = getBuildableCost(BuildableType.Scout);
      expect(ProductionComponent.cost[cityEid]).toBe(expectedCost);
    });

    it('should set correct production cost for Settler', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Settler, 0);

      executeSetProduction(command, deps);

      const expectedCost = getBuildableCost(BuildableType.Settler);
      expect(ProductionComponent.cost[cityEid]).toBe(expectedCost);
    });

    it('should set cost to 0 for BuildableType.None', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      // First set some production
      ProductionComponent.currentItem[cityEid] = BuildableType.Warrior;
      ProductionComponent.cost[cityEid] = 40;

      const command = createSetProductionCommand(cityEid, BuildableType.None, 0);
      executeSetProduction(command, deps);

      expect(ProductionComponent.currentItem[cityEid]).toBe(BuildableType.None);
      expect(ProductionComponent.cost[cityEid]).toBe(0);
    });
  });

  describe('changing production', () => {
    it('should correctly change from one buildable to another', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);

      // Set initial production to Warrior
      executeSetProduction(createSetProductionCommand(cityEid, BuildableType.Warrior, 0), deps);
      expect(ProductionComponent.currentItem[cityEid]).toBe(BuildableType.Warrior);

      // Change to Settler
      executeSetProduction(createSetProductionCommand(cityEid, BuildableType.Settler, 0), deps);
      expect(ProductionComponent.currentItem[cityEid]).toBe(BuildableType.Settler);
      expect(ProductionComponent.progress[cityEid]).toBe(0); // Progress reset
      expect(ProductionComponent.cost[cityEid]).toBe(getBuildableCost(BuildableType.Settler));
    });
  });
});
