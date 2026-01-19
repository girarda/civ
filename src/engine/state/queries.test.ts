import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, createCityEntity } from '../../ecs/world';
import { GameState } from '../../game/GameState';
import { TurnPhase } from '../../game/TurnPhase';
import { TerritoryManager } from '../../city/Territory';
import { TilePosition } from '../../hex/TilePosition';
import { Terrain } from '../../tile/Terrain';
import { GeneratedTile } from '../../map/MapGenerator';
import { UnitType } from '../../unit/UnitType';
import {
  queryGameState,
  queryUnits,
  queryUnit,
  queryCities,
  queryCity,
  queryTile,
  queryUnitsAtPosition,
  queryCityAtPosition,
} from './queries';
import { isSerializable } from './snapshots';

describe('State Queries', () => {
  let world: IWorld;
  let gameState: GameState;
  let territoryManager: TerritoryManager;
  let tileMap: Map<string, GeneratedTile>;

  beforeEach(() => {
    world = createGameWorld();
    gameState = new GameState();
    territoryManager = new TerritoryManager();
    tileMap = new Map();

    // Create some test tiles
    for (let q = 0; q < 5; q++) {
      for (let r = 0; r < 5; r++) {
        const pos = new TilePosition(q, r);
        tileMap.set(pos.key(), {
          position: pos,
          terrain: Terrain.Grassland,
          feature: null,
          resource: null,
        });
      }
    }
  });

  describe('queryGameState', () => {
    it('should return correct turn number', () => {
      const snapshot = queryGameState(gameState);
      expect(snapshot.turnNumber).toBe(1);
    });

    it('should return correct phase', () => {
      const snapshot = queryGameState(gameState);
      expect(snapshot.phase).toBe(TurnPhase.PlayerAction);
    });

    it('should return correct current player', () => {
      const snapshot = queryGameState(gameState);
      expect(snapshot.currentPlayer).toBe(0);
    });

    it('should include player count', () => {
      const snapshot = queryGameState(gameState, 4);
      expect(snapshot.playerCount).toBe(4);
    });

    it('should be JSON serializable', () => {
      const snapshot = queryGameState(gameState);
      expect(isSerializable(snapshot)).toBe(true);
    });
  });

  describe('queryUnits', () => {
    it('should return empty array when no units', () => {
      const units = queryUnits(world);
      expect(units).toHaveLength(0);
    });

    it('should return all units when no filter', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Scout, 1, 3);

      const units = queryUnits(world);
      expect(units).toHaveLength(2);
    });

    it('should filter by playerId', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Scout, 1, 3);

      const player0Units = queryUnits(world, 0);
      expect(player0Units).toHaveLength(1);
      expect(player0Units[0].owner).toBe(0);

      const player1Units = queryUnits(world, 1);
      expect(player1Units).toHaveLength(1);
      expect(player1Units[0].owner).toBe(1);
    });

    it('should include correct unit data', () => {
      const eid = createUnitEntity(world, 2, 3, UnitType.Warrior, 0, 2);

      const units = queryUnits(world);
      expect(units[0].eid).toBe(eid);
      expect(units[0].type).toBe(UnitType.Warrior);
      expect(units[0].typeName).toBe('Warrior');
      expect(units[0].position).toEqual({ q: 2, r: 3 });
      expect(units[0].movement.max).toBe(2);
    });

    it('should include capabilities', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Settler, 0, 2);

      const units = queryUnits(world);
      const warrior = units.find((u) => u.type === UnitType.Warrior)!;
      const settler = units.find((u) => u.type === UnitType.Settler)!;

      expect(warrior.capabilities.canAttack).toBe(true);
      expect(warrior.capabilities.canFoundCity).toBe(false);

      expect(settler.capabilities.canAttack).toBe(false);
      expect(settler.capabilities.canFoundCity).toBe(true);
    });

    it('should be JSON serializable', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const units = queryUnits(world);
      expect(isSerializable(units)).toBe(true);
    });
  });

  describe('queryUnit', () => {
    it('should return null for non-existent unit', () => {
      const unit = queryUnit(world, 999);
      expect(unit).toBeNull();
    });

    it('should return correct unit data', () => {
      const eid = createUnitEntity(world, 2, 3, UnitType.Scout, 1, 3);

      const unit = queryUnit(world, eid);
      expect(unit).not.toBeNull();
      expect(unit!.eid).toBe(eid);
      expect(unit!.type).toBe(UnitType.Scout);
      expect(unit!.owner).toBe(1);
    });
  });

  describe('queryCities', () => {
    it('should return empty array when no cities', () => {
      const cities = queryCities(world, territoryManager, tileMap);
      expect(cities).toHaveLength(0);
    });

    it('should return all cities when no filter', () => {
      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 2, 2, 1, 1);

      const cities = queryCities(world, territoryManager, tileMap);
      expect(cities).toHaveLength(2);
    });

    it('should filter by playerId', () => {
      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 2, 2, 1, 1);

      const player0Cities = queryCities(world, territoryManager, tileMap, 0);
      expect(player0Cities).toHaveLength(1);
      expect(player0Cities[0].owner).toBe(0);
    });

    it('should include correct yields calculation', () => {
      const cityEid = createCityEntity(world, 2, 2, 0, 0);
      const cityPos = new TilePosition(2, 2);
      territoryManager.initializeTerritory(cityEid, cityPos);

      const cities = queryCities(world, territoryManager, tileMap);
      expect(cities[0].yields.food).toBeGreaterThanOrEqual(0);
      expect(cities[0].yields.production).toBeGreaterThanOrEqual(0);
    });

    it('should include production info', () => {
      createCityEntity(world, 0, 0, 0, 0);

      const cities = queryCities(world, territoryManager, tileMap);
      expect(cities[0].production).toBeDefined();
      expect(cities[0].production.currentItemName).toBeDefined();
    });

    it('should be JSON serializable', () => {
      createCityEntity(world, 0, 0, 0, 0);
      const cities = queryCities(world, territoryManager, tileMap);
      expect(isSerializable(cities)).toBe(true);
    });
  });

  describe('queryCity', () => {
    it('should return null for non-existent city', () => {
      const city = queryCity(world, 999, territoryManager, tileMap);
      expect(city).toBeNull();
    });

    it('should return correct city data', () => {
      const eid = createCityEntity(world, 2, 2, 1, 0);

      const city = queryCity(world, eid, territoryManager, tileMap);
      expect(city).not.toBeNull();
      expect(city!.eid).toBe(eid);
      expect(city!.owner).toBe(1);
      expect(city!.position).toEqual({ q: 2, r: 2 });
    });
  });

  describe('queryTile', () => {
    it('should return null for non-existent tile', () => {
      const tile = queryTile(tileMap, world, territoryManager, 100, 100);
      expect(tile).toBeNull();
    });

    it('should return correct tile data', () => {
      const tile = queryTile(tileMap, world, territoryManager, 2, 2);
      expect(tile).not.toBeNull();
      expect(tile!.position).toEqual({ q: 2, r: 2 });
      expect(tile!.terrain).toBe(Terrain.Grassland);
    });

    it('should include terrain properties', () => {
      const tile = queryTile(tileMap, world, territoryManager, 0, 0);
      expect(tile!.isPassable).toBe(true);
      expect(tile!.isWater).toBe(false);
      expect(tile!.movementCost).toBe(1);
    });

    it('should indicate unit presence', () => {
      createUnitEntity(world, 1, 1, UnitType.Warrior, 0, 2);

      const tileWithUnit = queryTile(tileMap, world, territoryManager, 1, 1);
      const tileWithoutUnit = queryTile(tileMap, world, territoryManager, 0, 0);

      expect(tileWithUnit!.hasUnit).toBe(true);
      expect(tileWithoutUnit!.hasUnit).toBe(false);
    });

    it('should indicate city presence', () => {
      createCityEntity(world, 2, 2, 0, 0);

      const tileWithCity = queryTile(tileMap, world, territoryManager, 2, 2);
      const tileWithoutCity = queryTile(tileMap, world, territoryManager, 0, 0);

      expect(tileWithCity!.hasCity).toBe(true);
      expect(tileWithoutCity!.hasCity).toBe(false);
    });

    it('should include ownership info', () => {
      const cityEid = createCityEntity(world, 2, 2, 0, 0);
      const cityPos = new TilePosition(2, 2);
      territoryManager.initializeTerritory(cityEid, cityPos);

      const ownedTile = queryTile(tileMap, world, territoryManager, 2, 2);
      const unownedTile = queryTile(tileMap, world, territoryManager, 0, 0);

      expect(ownedTile!.owner).toBe(cityEid);
      expect(unownedTile!.owner).toBeNull();
    });

    it('should be JSON serializable', () => {
      const tile = queryTile(tileMap, world, territoryManager, 0, 0);
      expect(isSerializable(tile)).toBe(true);
    });
  });

  describe('queryUnitsAtPosition', () => {
    it('should return null when no unit at position', () => {
      const unit = queryUnitsAtPosition(world, 0, 0);
      expect(unit).toBeNull();
    });

    it('should return unit at position', () => {
      const eid = createUnitEntity(world, 2, 3, UnitType.Warrior, 0, 2);

      const unit = queryUnitsAtPosition(world, 2, 3);
      expect(unit).not.toBeNull();
      expect(unit!.eid).toBe(eid);
    });
  });

  describe('queryCityAtPosition', () => {
    it('should return null when no city at position', () => {
      const city = queryCityAtPosition(world, territoryManager, tileMap, 0, 0);
      expect(city).toBeNull();
    });

    it('should return city at position', () => {
      const eid = createCityEntity(world, 2, 2, 0, 0);

      const city = queryCityAtPosition(world, territoryManager, tileMap, 2, 2);
      expect(city).not.toBeNull();
      expect(city!.eid).toBe(eid);
    });
  });

  describe('Snapshot Serialization', () => {
    it('should produce identical JSON after round-trip', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createCityEntity(world, 2, 2, 0, 0);

      const units = queryUnits(world);
      const cities = queryCities(world, territoryManager, tileMap);
      const gameSnapshot = queryGameState(gameState);

      // Round-trip through JSON
      const unitsRoundTrip = JSON.parse(JSON.stringify(units));
      const citiesRoundTrip = JSON.parse(JSON.stringify(cities));
      const gameRoundTrip = JSON.parse(JSON.stringify(gameSnapshot));

      expect(unitsRoundTrip).toEqual(units);
      expect(citiesRoundTrip).toEqual(cities);
      expect(gameRoundTrip).toEqual(gameSnapshot);
    });
  });
});
