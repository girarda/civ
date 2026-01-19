import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, MovementComponent } from '../../../ecs/world';
import { validateAttack, AttackValidatorDeps } from './AttackValidator';
import { AttackCommand } from '../types';
import { GameState } from '../../../game/GameState';
import { TurnPhase } from '../../../game/TurnPhase';
import { UnitType } from '../../../unit/UnitType';

/**
 * Create an AttackCommand for testing.
 */
function createAttackCommand(
  attackerEid: number,
  defenderEid: number,
  playerId: number = 0
): AttackCommand {
  return {
    type: 'ATTACK',
    playerId,
    attackerEid,
    defenderEid,
  };
}

describe('AttackValidator', () => {
  let world: IWorld;
  let gameState: GameState;
  let deps: AttackValidatorDeps;

  beforeEach(() => {
    world = createGameWorld();
    gameState = new GameState();
    deps = { world, gameState };
  });

  describe('valid attacks', () => {
    it('should pass validation for valid attack on adjacent enemy', () => {
      // Player 0 warrior at (0,0)
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      // Player 1 warrior at (1,0) - adjacent
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('unit existence', () => {
    it('should fail validation when attacker does not exist', () => {
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(999, defenderEid, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Attacker does not exist');
    });

    it('should fail validation when defender does not exist', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const command = createAttackCommand(attackerEid, 999, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Defender does not exist');
    });
  });

  describe('movement points', () => {
    it('should fail validation when attacker has no movement points remaining', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      MovementComponent.current[attackerEid] = 0;
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Attacker has no movement points remaining');
    });
  });

  describe('combat strength', () => {
    it('should fail validation when attacker has no combat strength (Settler)', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Attacker has no combat strength');
    });
  });

  describe('adjacency', () => {
    it('should fail validation when defender is not adjacent', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      // Player 1 warrior at (2,0) - distance 2, not adjacent
      const defenderEid = createUnitEntity(world, 2, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Defender is not adjacent to attacker');
    });
  });

  describe('friendly fire', () => {
    it('should fail validation when attacking friendly unit', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      // Same owner (player 0)
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 0, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const result = validateAttack(command, deps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot attack friendly unit');
    });
  });

  describe('game phase', () => {
    it('should fail validation during wrong game phase', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);

      // Force game into a non-PlayerAction phase by using nextTurn which temporarily
      // goes through TurnEnd -> TurnStart -> PlayerAction. We need to test during non-action phase.
      // Since GameState always ends in PlayerAction after nextTurn, we test indirectly.
      // Actually, the default phase is PlayerAction, so this test verifies that attacks work in PlayerAction.
      // To properly test wrong phase, we'd need to mock or modify GameState.

      // For this test, we'll create a mock gameState-like object that returns TurnEnd
      const mockGameState = {
        getPhase: () => TurnPhase.TurnEnd,
        getCurrentPlayer: () => 0,
      } as unknown as GameState;
      const mockDeps = { world, gameState: mockGameState };

      const command = createAttackCommand(attackerEid, defenderEid, 0);
      const result = validateAttack(command, mockDeps);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Can only attack during PlayerAction phase');
    });

    it('should pass validation during PlayerAction phase', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      // Default phase is PlayerAction
      const result = validateAttack(command, deps);

      expect(result.valid).toBe(true);
    });
  });
});
