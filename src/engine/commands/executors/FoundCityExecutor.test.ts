import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld, entityExists } from 'bitecs';
import { createGameWorld, createUnitEntity, Position, OwnerComponent } from '../../../ecs/world';
import { CityComponent, PopulationComponent } from '../../../ecs/cityComponents';
import { executeFoundCity, FoundCityExecutorDeps } from './FoundCityExecutor';
import { FoundCityCommand } from '../types';
import { TerritoryManager } from '../../../city/Territory';
import { UnitType } from '../../../unit/UnitType';
import { CityFoundedEvent, UnitDestroyedEvent } from '../../events/types';

/**
 * Create a FoundCityCommand for testing.
 */
function createFoundCityCommand(
  settlerEid: number,
  playerId: number = 0,
  cityName?: string
): FoundCityCommand {
  return {
    type: 'FOUND_CITY',
    playerId,
    settlerEid,
    cityName,
  };
}

describe('FoundCityExecutor', () => {
  let world: IWorld;
  let territoryManager: TerritoryManager;
  let deps: FoundCityExecutorDeps;

  beforeEach(() => {
    world = createGameWorld();
    territoryManager = new TerritoryManager();
    deps = { world, territoryManager };
  });

  describe('event emission', () => {
    it('should emit CityFoundedEvent with correct fields', () => {
      const settlerEid = createUnitEntity(world, 5, 3, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      expect(cityEvent).toBeDefined();
      expect(cityEvent.cityEid).toBeDefined();
      expect(cityEvent.settlerEid).toBe(settlerEid);
      expect(cityEvent.q).toBe(5);
      expect(cityEvent.r).toBe(3);
      expect(cityEvent.playerId).toBe(0);
      expect(cityEvent.cityName).toBeDefined();
      expect(cityEvent.territoryTiles).toBeDefined();
      expect(cityEvent.territoryTiles.length).toBe(7); // Initial radius of 1 = 7 tiles
      expect(cityEvent.timestamp).toBeDefined();
    });

    it('should emit UnitDestroyedEvent for settler', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      const events = executeFoundCity(command, deps);

      const destroyedEvent = events.find((e) => e.type === 'UNIT_DESTROYED') as UnitDestroyedEvent;
      expect(destroyedEvent).toBeDefined();
      expect(destroyedEvent.unitEid).toBe(settlerEid);
      expect(destroyedEvent.q).toBe(0);
      expect(destroyedEvent.r).toBe(0);
      expect(destroyedEvent.playerId).toBe(0);
    });
  });

  describe('state changes', () => {
    it('should create city entity at correct position', () => {
      const settlerEid = createUnitEntity(world, 3, 4, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const cityEid = cityEvent.cityEid;
      expect(Position.q[cityEid]).toBe(3);
      expect(Position.r[cityEid]).toBe(4);
    });

    it('should create city with correct owner', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 2, 2);
      const command = createFoundCityCommand(settlerEid, 2);

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const cityEid = cityEvent.cityEid;
      expect(OwnerComponent.playerId[cityEid]).toBe(2);
    });

    it('should remove settler from ECS', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      executeFoundCity(command, deps);

      expect(entityExists(world, settlerEid)).toBe(false);
    });

    it('should initialize territory for city', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const cityEid = cityEvent.cityEid;
      expect(territoryManager.getTileCount(cityEid)).toBe(7); // Initial radius = 1 -> 7 tiles
      expect(territoryManager.isOwnedBy(0, 0, cityEid)).toBe(true);
    });

    it('should create city with initial population of 1', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const cityEid = cityEvent.cityEid;
      expect(PopulationComponent.current[cityEid]).toBe(1);
    });
  });

  describe('city naming', () => {
    it('should use provided city name when given', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0, 'Custom City');

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      expect(cityEvent.cityName).toBe('Custom City');
    });

    it('should generate city name when not provided', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid, 0);

      const events = executeFoundCity(command, deps);

      const cityEvent = events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      expect(cityEvent.cityName).toBeDefined();
      expect(cityEvent.cityName.length).toBeGreaterThan(0);
    });

    it('should use correct name index based on player city count', () => {
      // First city for player 0
      const settler1 = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const events1 = executeFoundCity(createFoundCityCommand(settler1, 0), deps);
      const city1Event = events1.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const city1Eid = city1Event.cityEid;
      expect(CityComponent.nameIndex[city1Eid]).toBe(0);

      // Second city for player 0
      const settler2 = createUnitEntity(world, 5, 0, UnitType.Settler, 0, 2);
      const events2 = executeFoundCity(createFoundCityCommand(settler2, 0), deps);
      const city2Event = events2.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const city2Eid = city2Event.cityEid;
      expect(CityComponent.nameIndex[city2Eid]).toBe(1);

      // First city for player 1
      const settler3 = createUnitEntity(world, 10, 0, UnitType.Settler, 1, 2);
      const events3 = executeFoundCity(createFoundCityCommand(settler3, 1), deps);
      const city3Event = events3.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      const city3Eid = city3Event.cityEid;
      expect(CityComponent.nameIndex[city3Eid]).toBe(0); // First city for this player
    });
  });
});
