import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld, entityExists } from 'bitecs';
import { createGameWorld, createUnitEntity, Position, OwnerComponent } from '../ecs/world';
import { CityComponent, PopulationComponent } from '../ecs/cityComponents';
import { TerritoryManager } from './Territory';
import { canFoundCity, getFoundCityBlockReason, foundCity, tryFoundCity } from './CityFounder';
import { TilePosition } from '../hex/TilePosition';
import { UnitType } from '../unit/UnitType';
import { GeneratedTile } from '../map/MapGenerator';
import { Terrain } from '../tile/Terrain';

function createTileMap(tiles: Array<{ q: number; r: number; terrain: Terrain }>): Map<string, GeneratedTile> {
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

describe('CityFounder', () => {
  let world: IWorld;
  let territoryManager: TerritoryManager;
  let tileMap: Map<string, GeneratedTile>;

  beforeEach(() => {
    world = createGameWorld();
    territoryManager = new TerritoryManager();
    // Create a basic tile map with various terrains
    tileMap = createTileMap([
      { q: 0, r: 0, terrain: Terrain.Grassland },
      { q: 1, r: 0, terrain: Terrain.Plains },
      { q: -1, r: 0, terrain: Terrain.Ocean },
      { q: 0, r: 1, terrain: Terrain.Mountain },
      { q: 1, r: 1, terrain: Terrain.Coast },
      { q: 5, r: 5, terrain: Terrain.Grassland },
    ]);
  });

  describe('canFoundCity', () => {
    it('should return true for Settler on valid land', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      expect(canFoundCity(world, settlerEid, tileMap)).toBe(true);
    });

    it('should return false for non-Settler units', () => {
      const warriorEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      expect(canFoundCity(world, warriorEid, tileMap)).toBe(false);
    });

    it('should return false for Scout', () => {
      const scoutEid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);
      expect(canFoundCity(world, scoutEid, tileMap)).toBe(false);
    });

    it('should return false on ocean tile', () => {
      const settlerEid = createUnitEntity(world, -1, 0, UnitType.Settler, 0, 2);
      expect(canFoundCity(world, settlerEid, tileMap)).toBe(false);
    });

    it('should return false on coast tile', () => {
      const settlerEid = createUnitEntity(world, 1, 1, UnitType.Settler, 0, 2);
      expect(canFoundCity(world, settlerEid, tileMap)).toBe(false);
    });

    it('should return false on mountain tile', () => {
      const settlerEid = createUnitEntity(world, 0, 1, UnitType.Settler, 0, 2);
      expect(canFoundCity(world, settlerEid, tileMap)).toBe(false);
    });

    it('should return false where city already exists', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      // First founding
      foundCity(world, settlerEid, 0, territoryManager);

      // Try founding another city at same position
      const settler2Eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      expect(canFoundCity(world, settler2Eid, tileMap)).toBe(false);
    });

    it('should return false for non-existent tile', () => {
      const settlerEid = createUnitEntity(world, 99, 99, UnitType.Settler, 0, 2);
      expect(canFoundCity(world, settlerEid, tileMap)).toBe(false);
    });
  });

  describe('getFoundCityBlockReason', () => {
    it('should return null for valid founding', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      expect(getFoundCityBlockReason(world, settlerEid, tileMap)).toBe(null);
    });

    it('should return reason for non-Settler', () => {
      const warriorEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      expect(getFoundCityBlockReason(world, warriorEid, tileMap)).toBe('Only Settlers can found cities');
    });

    it('should return reason for water tile', () => {
      const settlerEid = createUnitEntity(world, -1, 0, UnitType.Settler, 0, 2);
      expect(getFoundCityBlockReason(world, settlerEid, tileMap)).toBe('Cannot found city on water');
    });

    it('should return reason for mountain', () => {
      const settlerEid = createUnitEntity(world, 0, 1, UnitType.Settler, 0, 2);
      expect(getFoundCityBlockReason(world, settlerEid, tileMap)).toBe('Cannot found city on impassable terrain');
    });

    it('should return reason for existing city', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      foundCity(world, settlerEid, 0, territoryManager);

      const settler2Eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      expect(getFoundCityBlockReason(world, settler2Eid, tileMap)).toBe('A city already exists here');
    });
  });

  describe('foundCity', () => {
    it('should create city at settler position', () => {
      const settlerEid = createUnitEntity(world, 5, 3, UnitType.Settler, 0, 2);
      const result = foundCity(world, settlerEid, 0, territoryManager);

      expect(result.success).toBe(true);
      expect(result.cityEid).toBeDefined();
      expect(Position.q[result.cityEid!]).toBe(5);
      expect(Position.r[result.cityEid!]).toBe(3);
    });

    it('should create city with correct owner', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 2, 2);
      const result = foundCity(world, settlerEid, 0, territoryManager);

      expect(OwnerComponent.playerId[result.cityEid!]).toBe(2);
    });

    it('should create city with correct name index', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const result = foundCity(world, settlerEid, 5, territoryManager);

      expect(CityComponent.nameIndex[result.cityEid!]).toBe(5);
    });

    it('should initialize territory for city', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const result = foundCity(world, settlerEid, 0, territoryManager);

      expect(territoryManager.getTileCount(result.cityEid!)).toBe(7);
      expect(territoryManager.isOwnedBy(0, 0, result.cityEid!)).toBe(true);
    });

    it('should remove settler from world', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      foundCity(world, settlerEid, 0, territoryManager);

      // Settler should be removed from world
      expect(entityExists(world, settlerEid)).toBe(false);
    });

    it('should call onCityFounded callback', () => {
      const settlerEid = createUnitEntity(world, 3, 4, UnitType.Settler, 0, 2);
      let callbackCityEid: number | null = null;
      let callbackPosition: TilePosition | null = null;

      foundCity(world, settlerEid, 0, territoryManager, (cityEid, position) => {
        callbackCityEid = cityEid;
        callbackPosition = position;
      });

      expect(callbackCityEid).not.toBe(null);
      expect(callbackPosition!.q).toBe(3);
      expect(callbackPosition!.r).toBe(4);
    });

    it('should create city with initial population of 1', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const result = foundCity(world, settlerEid, 0, territoryManager);

      expect(PopulationComponent.current[result.cityEid!]).toBe(1);
    });
  });

  describe('tryFoundCity', () => {
    it('should found city when valid', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const result = tryFoundCity(world, settlerEid, tileMap, territoryManager);

      expect(result.success).toBe(true);
      expect(result.cityEid).toBeDefined();
    });

    it('should return error when invalid', () => {
      const warriorEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const result = tryFoundCity(world, warriorEid, tileMap, territoryManager);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only Settlers can found cities');
    });

    it('should use correct name index based on player city count', () => {
      // Create first city for player 0
      const settler1 = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const result1 = tryFoundCity(world, settler1, tileMap, territoryManager);
      expect(CityComponent.nameIndex[result1.cityEid!]).toBe(0); // First city

      // Create second city for player 0
      const settler2 = createUnitEntity(world, 5, 5, UnitType.Settler, 0, 2);
      const result2 = tryFoundCity(world, settler2, tileMap, territoryManager);
      expect(CityComponent.nameIndex[result2.cityEid!]).toBe(1); // Second city

      // Create first city for player 1
      const settler3 = createUnitEntity(world, 1, 0, UnitType.Settler, 1, 2);
      const result3 = tryFoundCity(world, settler3, tileMap, territoryManager);
      expect(CityComponent.nameIndex[result3.cityEid!]).toBe(0); // First city for player 1
    });

    it('should call callback when founding succeeds', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      let callbackCalled = false;

      tryFoundCity(world, settlerEid, tileMap, territoryManager, () => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(true);
    });

    it('should not call callback when founding fails', () => {
      const warriorEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      let callbackCalled = false;

      tryFoundCity(world, warriorEid, tileMap, territoryManager, () => {
        callbackCalled = true;
      });

      expect(callbackCalled).toBe(false);
    });
  });
});
