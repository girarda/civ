import { describe, it, expect, beforeEach } from 'vitest';
import { createGameWorld, createCityEntity, Position, OwnerComponent } from './world';
import {
  cityQuery,
  getCityAtPosition,
  getCitiesForPlayer,
  getAllCities,
  hasCityAtPosition,
  getCityCountForPlayer,
} from './citySystems';
import { CityComponent, PopulationComponent, ProductionComponent } from './cityComponents';
import { IWorld } from 'bitecs';

describe('citySystems', () => {
  let world: IWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe('createCityEntity', () => {
    it('should create city with correct position', () => {
      const eid = createCityEntity(world, 5, 3, 0, 0);

      expect(Position.q[eid]).toBe(5);
      expect(Position.r[eid]).toBe(3);
    });

    it('should create city with correct owner', () => {
      const eid = createCityEntity(world, 0, 0, 2, 0);

      expect(OwnerComponent.playerId[eid]).toBe(2);
    });

    it('should create city with correct name index', () => {
      const eid = createCityEntity(world, 0, 0, 0, 5);

      expect(CityComponent.nameIndex[eid]).toBe(5);
    });

    it('should create city with default population of 1', () => {
      const eid = createCityEntity(world, 0, 0, 0, 0);

      expect(PopulationComponent.current[eid]).toBe(1);
    });

    it('should create city with specified initial population', () => {
      const eid = createCityEntity(world, 0, 0, 0, 0, 3);

      expect(PopulationComponent.current[eid]).toBe(3);
    });

    it('should initialize food stockpile to 0', () => {
      const eid = createCityEntity(world, 0, 0, 0, 0);

      expect(PopulationComponent.foodStockpile[eid]).toBe(0);
    });

    it('should calculate food for growth based on population', () => {
      const eid1 = createCityEntity(world, 0, 0, 0, 0, 1);
      const eid2 = createCityEntity(world, 5, 5, 0, 0, 3);

      // BASE (15) + pop * MULTIPLIER (6)
      expect(PopulationComponent.foodForGrowth[eid1]).toBe(21); // 15 + 1*6
      expect(PopulationComponent.foodForGrowth[eid2]).toBe(33); // 15 + 3*6
    });

    it('should initialize production to nothing', () => {
      const eid = createCityEntity(world, 0, 0, 0, 0);

      expect(ProductionComponent.currentItem[eid]).toBe(0);
      expect(ProductionComponent.progress[eid]).toBe(0);
      expect(ProductionComponent.cost[eid]).toBe(0);
    });
  });

  describe('cityQuery', () => {
    it('should return empty array when no cities', () => {
      const cities = cityQuery(world);
      expect(cities.length).toBe(0);
    });

    it('should return city entities', () => {
      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 5, 5, 1, 1);

      const cities = cityQuery(world);
      expect(cities.length).toBe(2);
    });
  });

  describe('getCityAtPosition', () => {
    it('should return null when no city at position', () => {
      expect(getCityAtPosition(world, 0, 0)).toBe(null);
    });

    it('should return city entity at position', () => {
      const eid = createCityEntity(world, 5, 3, 0, 0);

      expect(getCityAtPosition(world, 5, 3)).toBe(eid);
    });

    it('should return null for different position', () => {
      createCityEntity(world, 5, 3, 0, 0);

      expect(getCityAtPosition(world, 5, 4)).toBe(null);
      expect(getCityAtPosition(world, 4, 3)).toBe(null);
    });
  });

  describe('getCitiesForPlayer', () => {
    it('should return empty array when player has no cities', () => {
      expect(getCitiesForPlayer(world, 0)).toEqual([]);
    });

    it('should return only cities belonging to player', () => {
      const city1 = createCityEntity(world, 0, 0, 0, 0);
      const city2 = createCityEntity(world, 5, 5, 0, 1);
      const city3 = createCityEntity(world, 10, 10, 1, 2);

      const player0Cities = getCitiesForPlayer(world, 0);
      expect(player0Cities).toContain(city1);
      expect(player0Cities).toContain(city2);
      expect(player0Cities).not.toContain(city3);
      expect(player0Cities.length).toBe(2);

      const player1Cities = getCitiesForPlayer(world, 1);
      expect(player1Cities).toContain(city3);
      expect(player1Cities.length).toBe(1);
    });
  });

  describe('getAllCities', () => {
    it('should return empty array when no cities', () => {
      expect(getAllCities(world)).toEqual([]);
    });

    it('should return all cities', () => {
      const city1 = createCityEntity(world, 0, 0, 0, 0);
      const city2 = createCityEntity(world, 5, 5, 1, 1);
      const city3 = createCityEntity(world, 10, 10, 2, 2);

      const cities = getAllCities(world);
      expect(cities).toContain(city1);
      expect(cities).toContain(city2);
      expect(cities).toContain(city3);
      expect(cities.length).toBe(3);
    });
  });

  describe('hasCityAtPosition', () => {
    it('should return false when no city at position', () => {
      expect(hasCityAtPosition(world, 0, 0)).toBe(false);
    });

    it('should return true when city exists at position', () => {
      createCityEntity(world, 5, 3, 0, 0);

      expect(hasCityAtPosition(world, 5, 3)).toBe(true);
    });
  });

  describe('getCityCountForPlayer', () => {
    it('should return 0 when player has no cities', () => {
      expect(getCityCountForPlayer(world, 0)).toBe(0);
    });

    it('should return correct count for player', () => {
      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 5, 5, 0, 1);
      createCityEntity(world, 10, 10, 1, 2);

      expect(getCityCountForPlayer(world, 0)).toBe(2);
      expect(getCityCountForPlayer(world, 1)).toBe(1);
      expect(getCityCountForPlayer(world, 2)).toBe(0);
    });
  });
});
