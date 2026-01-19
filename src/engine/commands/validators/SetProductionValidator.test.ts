import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createCityEntity } from '../../../ecs/world';
import { validateSetProduction, SetProductionValidatorDeps } from './SetProductionValidator';
import { SetProductionCommand } from '../types';
import { BuildableType } from '../../../city/Buildable';

/**
 * Create a SetProductionCommand for testing.
 */
function createSetProductionCommand(
  cityEid: number,
  buildableType: number,
  playerId: number = 0
): SetProductionCommand {
  return {
    type: 'SET_PRODUCTION',
    playerId,
    cityEid,
    buildableType,
  };
}

describe('SetProductionValidator', () => {
  let world: IWorld;
  let deps: SetProductionValidatorDeps;

  beforeEach(() => {
    world = createGameWorld();
    deps = { world };
  });

  describe('valid production', () => {
    it('should pass validation for valid city and BuildableType.Warrior', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Warrior);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should pass validation for BuildableType.Settler', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Settler);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(true);
    });

    it('should pass validation for BuildableType.Scout', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.Scout);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(true);
    });

    it('should pass validation for BuildableType.None', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, BuildableType.None);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(true);
    });
  });

  describe('city existence', () => {
    it('should fail validation when city does not exist', () => {
      const command = createSetProductionCommand(999, BuildableType.Warrior);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('City does not exist');
    });
  });

  describe('invalid buildable type', () => {
    it('should fail validation for negative buildable type', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      const command = createSetProductionCommand(cityEid, -1);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid buildable type');
    });

    it('should fail validation for out-of-range buildable type', () => {
      const cityEid = createCityEntity(world, 0, 0, 0, 0);
      // BuildableType enum goes from None (0) to Settler (3)
      const command = createSetProductionCommand(cityEid, 99);

      const result = validateSetProduction(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid buildable type');
    });
  });
});
