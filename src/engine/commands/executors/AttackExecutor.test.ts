import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld, entityExists } from 'bitecs';
import {
  createGameWorld,
  createUnitEntity,
  MovementComponent,
  HealthComponent,
} from '../../../ecs/world';
import { executeAttack, AttackExecutorDeps } from './AttackExecutor';
import { AttackCommand } from '../types';
import { TilePosition } from '../../../hex/TilePosition';
import { GeneratedTile } from '../../../map/MapGenerator';
import { Terrain } from '../../../tile/Terrain';
import { TileFeature } from '../../../tile/TileFeature';
import { UnitType } from '../../../unit/UnitType';
import { CombatResolvedEvent, UnitDestroyedEvent } from '../../events/types';

/**
 * Helper to create a simple tile map for testing.
 */
function createTileMap(
  tiles: { q: number; r: number; terrain: Terrain; feature?: TileFeature }[]
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    const position = new TilePosition(tile.q, tile.r);
    map.set(position.key(), {
      position,
      terrain: tile.terrain,
      feature: tile.feature ?? null,
      resource: null,
    });
  }
  return map;
}

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

describe('AttackExecutor', () => {
  let world: IWorld;
  let tileMap: Map<string, GeneratedTile>;
  let deps: AttackExecutorDeps;

  beforeEach(() => {
    world = createGameWorld();
    tileMap = createTileMap([
      { q: 0, r: 0, terrain: Terrain.Grassland },
      { q: 1, r: 0, terrain: Terrain.Grassland },
      { q: 2, r: 0, terrain: Terrain.GrasslandHill }, // Hills for defense testing
      { q: 0, r: 1, terrain: Terrain.Grassland, feature: TileFeature.Forest },
    ]);
    deps = { world, tileMap };
  });

  describe('event emission', () => {
    it('should emit CombatResolvedEvent with correct damage values', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const events = executeAttack(command, deps);

      const combatEvent = events.find((e) => e.type === 'COMBAT_RESOLVED') as CombatResolvedEvent;
      expect(combatEvent).toBeDefined();
      expect(combatEvent.attackerEid).toBe(attackerEid);
      expect(combatEvent.defenderEid).toBe(defenderEid);
      expect(combatEvent.attackerDamage).toBeGreaterThan(0);
      expect(combatEvent.defenderDamage).toBeGreaterThan(0);
      expect(combatEvent.playerId).toBe(0);
      expect(combatEvent.timestamp).toBeDefined();
    });
  });

  describe('damage application', () => {
    it('should apply damage to both units', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      executeAttack(command, deps);

      expect(HealthComponent.current[attackerEid]).toBeLessThan(100);
      expect(HealthComponent.current[defenderEid]).toBeLessThan(100);
    });

    it('should consume all attacker movement points', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      executeAttack(command, deps);

      expect(MovementComponent.current[attackerEid]).toBe(0);
    });
  });

  describe('unit death', () => {
    it('should emit UnitDestroyedEvent when defender dies', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      // Weaken defender so they die
      HealthComponent.current[defenderEid] = 10;
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const events = executeAttack(command, deps);

      const destroyedEvent = events.find(
        (e) => e.type === 'UNIT_DESTROYED' && (e as UnitDestroyedEvent).unitEid === defenderEid
      ) as UnitDestroyedEvent;
      expect(destroyedEvent).toBeDefined();
      expect(destroyedEvent.unitEid).toBe(defenderEid);
      expect(destroyedEvent.playerId).toBe(1);
    });

    it('should remove dead defender from ECS', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      HealthComponent.current[defenderEid] = 10;
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      executeAttack(command, deps);

      expect(entityExists(world, defenderEid)).toBe(false);
    });

    it('should emit UnitDestroyedEvent when attacker dies', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      // Weaken attacker significantly
      HealthComponent.current[attackerEid] = 5;
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const events = executeAttack(command, deps);

      const destroyedEvent = events.find(
        (e) => e.type === 'UNIT_DESTROYED' && (e as UnitDestroyedEvent).unitEid === attackerEid
      ) as UnitDestroyedEvent;
      expect(destroyedEvent).toBeDefined();
      expect(destroyedEvent.unitEid).toBe(attackerEid);
      expect(destroyedEvent.playerId).toBe(0);
    });

    it('should remove dead attacker from ECS', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      HealthComponent.current[attackerEid] = 5;
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      executeAttack(command, deps);

      expect(entityExists(world, attackerEid)).toBe(false);
    });
  });

  describe('terrain defense bonus', () => {
    it('should apply terrain defense bonus correctly (hills)', () => {
      // Attacker at (1,0), defender on hills at (2,0)
      const attackerEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 2, 0, UnitType.Warrior, 1, 2);

      const command = createAttackCommand(attackerEid, defenderEid, 0);
      const events = executeAttack(command, deps);

      const combatEvent = events.find((e) => e.type === 'COMBAT_RESOLVED') as CombatResolvedEvent;
      // With +25% defense, defender takes less damage
      // Equal strength (8 vs 8), defender effective = 8 * 1.25 = 10
      // Expected defender damage = 30 * (8/10) = 24
      expect(combatEvent.defenderDamage).toBe(24);
    });

    it('should apply feature defense bonus correctly (forest)', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      // Defender in forest at (0,1)
      const defenderEid = createUnitEntity(world, 0, 1, UnitType.Warrior, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const events = executeAttack(command, deps);

      const combatEvent = events.find((e) => e.type === 'COMBAT_RESOLVED') as CombatResolvedEvent;
      // Forest provides +25% defense
      expect(combatEvent.defenderDamage).toBe(24);
    });
  });

  describe('zero-strength defender', () => {
    it('should instant kill zero-strength defender (Settler)', () => {
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Settler, 1, 2);
      const command = createAttackCommand(attackerEid, defenderEid, 0);

      const events = executeAttack(command, deps);

      const combatEvent = events.find((e) => e.type === 'COMBAT_RESOLVED') as CombatResolvedEvent;
      expect(combatEvent.defenderDamage).toBe(100); // Instant kill
      expect(combatEvent.attackerDamage).toBe(0); // No counter damage
      expect(combatEvent.defenderSurvives).toBe(false);

      // Settler should be removed
      expect(entityExists(world, defenderEid)).toBe(false);
    });
  });
});
