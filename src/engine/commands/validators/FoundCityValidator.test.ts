import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, createCityEntity } from '../../../ecs/world';
import { validateFoundCity, FoundCityValidatorDeps } from './FoundCityValidator';
import { FoundCityCommand } from '../types';
import { TilePosition } from '../../../hex/TilePosition';
import { GeneratedTile } from '../../../map/MapGenerator';
import { Terrain } from '../../../tile/Terrain';
import { UnitType } from '../../../unit/UnitType';

/**
 * Helper to create a simple tile map for testing.
 */
function createTileMap(
  tiles: { q: number; r: number; terrain: Terrain }[]
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    const position = new TilePosition(tile.q, tile.r);
    map.set(position.key(), {
      position,
      terrain: tile.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}

/**
 * Create a FoundCityCommand for testing.
 */
function createFoundCityCommand(settlerEid: number, playerId: number = 0): FoundCityCommand {
  return {
    type: 'FOUND_CITY',
    playerId,
    settlerEid,
  };
}

describe('FoundCityValidator', () => {
  let world: IWorld;
  let tileMap: Map<string, GeneratedTile>;
  let deps: FoundCityValidatorDeps;

  beforeEach(() => {
    world = createGameWorld();
    tileMap = createTileMap([
      { q: 0, r: 0, terrain: Terrain.Grassland },
      { q: 1, r: 0, terrain: Terrain.Plains },
      { q: 2, r: 0, terrain: Terrain.Ocean },
      { q: 0, r: 1, terrain: Terrain.Mountain },
      { q: 1, r: 1, terrain: Terrain.Coast },
      { q: 2, r: 1, terrain: Terrain.Desert },
    ]);
    deps = { world, tileMap };
  });

  describe('valid founding', () => {
    it('should pass validation for settler on valid land (Grassland)', () => {
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass validation for settler on Plains', () => {
      const settlerEid = createUnitEntity(world, 1, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(true);
    });

    it('should pass validation for settler on Desert', () => {
      const settlerEid = createUnitEntity(world, 2, 1, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(true);
    });
  });

  describe('settler existence', () => {
    it('should fail validation when settler does not exist', () => {
      const command = createFoundCityCommand(999);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Settler does not exist');
    });
  });

  describe('unit type', () => {
    it('should fail validation when unit is not a settler (Warrior)', () => {
      const warriorEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createFoundCityCommand(warriorEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only Settlers can found cities');
    });

    it('should fail validation when unit is Scout', () => {
      const scoutEid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);
      const command = createFoundCityCommand(scoutEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only Settlers can found cities');
    });
  });

  describe('terrain restrictions', () => {
    it('should fail validation when settler is on water (Ocean)', () => {
      const settlerEid = createUnitEntity(world, 2, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot found city on water');
    });

    it('should fail validation when settler is on Coast', () => {
      const settlerEid = createUnitEntity(world, 1, 1, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot found city on water');
    });

    it('should fail validation when settler is on Mountain', () => {
      const settlerEid = createUnitEntity(world, 0, 1, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot found city on impassable terrain');
    });
  });

  describe('existing city', () => {
    it('should fail validation when city already exists at position', () => {
      // Create a city at (0,0)
      createCityEntity(world, 0, 0, 1, 0);

      // Try to found another city at the same position
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const command = createFoundCityCommand(settlerEid);

      const result = validateFoundCity(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('A city already exists here');
    });
  });
});
