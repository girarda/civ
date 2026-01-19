import { describe, it, expect } from 'vitest';
import { createEngine } from '../context';
import { createCityEntity } from '../../ecs/world';
import { BuildableType } from '../../city/Buildable';

describe('CLI City Commands', () => {
  describe('city list', () => {
    it('should return all cities', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();

      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 5, 5, 1, 0);

      const cities = engine.getCities();
      expect(cities).toHaveLength(2);
    });

    it('should filter cities by player', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();

      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 5, 5, 0, 0);
      createCityEntity(world, 10, 10, 1, 0);

      const player0Cities = engine.getCities(0);
      expect(player0Cities).toHaveLength(2);
      expect(player0Cities.every((c) => c.owner === 0)).toBe(true);

      const player1Cities = engine.getCities(1);
      expect(player1Cities).toHaveLength(1);
      expect(player1Cities[0].owner).toBe(1);
    });
  });

  describe('city show', () => {
    it('should return city details', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();
      const eid = createCityEntity(world, 5, 7, 0, 0);

      const city = engine.getCity(eid);

      expect(city).not.toBeNull();
      expect(city!.eid).toBe(eid);
      expect(city!.position.q).toBe(5);
      expect(city!.position.r).toBe(7);
      expect(city!.owner).toBe(0);
      expect(city!.population).toBeGreaterThan(0);
      expect(city!.production).toBeDefined();
    });

    it('should return null for non-existent city', () => {
      const engine = createEngine({ seed: 12345 });
      const city = engine.getCity(9999);
      expect(city).toBeNull();
    });
  });

  describe('city production', () => {
    it('should set production to warrior', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();
      const cityEid = createCityEntity(world, 0, 0, 0, 0);

      const result = engine.executeCommand({
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid,
        buildableType: BuildableType.Warrior,
      });

      expect(result.success).toBe(true);
      expect(result.events.some((e) => e.type === 'PRODUCTION_CHANGED')).toBe(true);

      const city = engine.getCity(cityEid);
      expect(city!.production.currentItem).toBe(BuildableType.Warrior);
    });

    it('should set production to scout', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();
      const cityEid = createCityEntity(world, 0, 0, 0, 0);

      const result = engine.executeCommand({
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid,
        buildableType: BuildableType.Scout,
      });

      expect(result.success).toBe(true);

      const city = engine.getCity(cityEid);
      expect(city!.production.currentItem).toBe(BuildableType.Scout);
    });

    it('should set production to settler', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();
      const cityEid = createCityEntity(world, 0, 0, 0, 0);

      const result = engine.executeCommand({
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid,
        buildableType: BuildableType.Settler,
      });

      expect(result.success).toBe(true);

      const city = engine.getCity(cityEid);
      expect(city!.production.currentItem).toBe(BuildableType.Settler);
    });

    it('should set production to none', () => {
      const engine = createEngine({ seed: 12345 });
      const world = engine.getWorld();
      const cityEid = createCityEntity(world, 0, 0, 0, 0);

      // First set to warrior
      engine.executeCommand({
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid,
        buildableType: BuildableType.Warrior,
      });

      // Then set to none
      const result = engine.executeCommand({
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid,
        buildableType: BuildableType.None,
      });

      expect(result.success).toBe(true);

      const city = engine.getCity(cityEid);
      expect(city!.production.currentItem).toBe(BuildableType.None);
    });

    it('should fail for non-existent city', () => {
      const engine = createEngine({ seed: 12345 });

      const result = engine.executeCommand({
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid: 9999,
        buildableType: BuildableType.Warrior,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('City does not exist');
    });
  });
});
