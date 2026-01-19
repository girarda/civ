/**
 * Integration tests for PlayerManager with ECS.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, removeEntity, IWorld } from 'bitecs';
import { PlayerManager } from './PlayerManager';
import {
  Position,
  UnitComponent,
  OwnerComponent,
  MovementComponent,
  HealthComponent,
} from '../ecs/world';
import { CityComponent, PopulationComponent } from '../ecs/cityComponents';

/** Create a mock world */
function createMockWorld(): IWorld {
  return createWorld();
}

/** Helper to create a unit entity for testing */
function createUnitEntity(world: IWorld, playerId: number, q: number, r: number): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, UnitComponent, eid);
  addComponent(world, OwnerComponent, eid);
  addComponent(world, MovementComponent, eid);
  addComponent(world, HealthComponent, eid);
  Position.q[eid] = q;
  Position.r[eid] = r;
  OwnerComponent.playerId[eid] = playerId;
  UnitComponent.type[eid] = 0;
  MovementComponent.current[eid] = 2;
  MovementComponent.max[eid] = 2;
  HealthComponent.current[eid] = 100;
  HealthComponent.max[eid] = 100;
  return eid;
}

/** Helper to create a city entity for testing */
function createCityEntity(world: IWorld, playerId: number, q: number, r: number): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, CityComponent, eid);
  addComponent(world, OwnerComponent, eid);
  addComponent(world, PopulationComponent, eid);
  Position.q[eid] = q;
  Position.r[eid] = r;
  OwnerComponent.playerId[eid] = playerId;
  return eid;
}

describe('PlayerManager integration', () => {
  let manager: PlayerManager;
  let world: IWorld;

  beforeEach(() => {
    manager = new PlayerManager();
    world = createMockWorld();
    manager.initialize([0], 2);
  });

  describe('elimination detection', () => {
    it('should detect elimination after removing all units', () => {
      // Player 1 has one unit
      const unitEid = createUnitEntity(world, 1, 0, 0);

      // Verify not eliminated
      expect(manager.checkElimination(world, 1)).toBe(false);

      // Remove the unit (simulating combat death)
      removeEntity(world, unitEid);

      // Now player should be eliminated
      expect(manager.checkElimination(world, 1)).toBe(true);
      expect(manager.isPlayerEliminated(1)).toBe(true);
    });

    it('should not eliminate player with cities remaining', () => {
      // Player 1 has one unit and one city
      const unitEid = createUnitEntity(world, 1, 0, 0);
      createCityEntity(world, 1, 1, 0);

      // Remove the unit
      removeEntity(world, unitEid);

      // Player should not be eliminated (still has city)
      expect(manager.checkElimination(world, 1)).toBe(false);
      expect(manager.isPlayerEliminated(1)).toBe(false);
    });

    it('should fire elimination event', () => {
      const listener = vi.fn();
      manager.subscribe(listener);

      // Player 1 has no units or cities
      manager.checkElimination(world, 1);

      expect(listener).toHaveBeenCalledWith({
        type: 'eliminated',
        playerId: 1,
      });
    });

    it('should track elimination status after event', () => {
      // Player 1 starts with unit
      const unitEid = createUnitEntity(world, 1, 0, 0);

      // Remove the unit
      removeEntity(world, unitEid);

      // Check elimination
      manager.checkElimination(world, 1);

      // Verify player is in eliminated list
      const eliminated = manager.getEliminatedPlayers();
      expect(eliminated.find((p) => p.id === 1)).toBeDefined();

      // Verify player is not in active list
      const active = manager.getActivePlayers();
      expect(active.find((p) => p.id === 1)).toBeUndefined();
    });
  });

  describe('multiple players', () => {
    beforeEach(() => {
      manager.clear();
      manager.initialize([0], 4); // 4 players: 1 human, 3 AI
    });

    it('should track multiple eliminations independently', () => {
      // Give players 1 and 2 units
      const unit1 = createUnitEntity(world, 1, 0, 0);
      createUnitEntity(world, 2, 1, 0);
      // Player 3 has nothing

      // Check eliminations - only player 3 should be eliminated
      expect(manager.checkElimination(world, 1)).toBe(false);
      expect(manager.checkElimination(world, 2)).toBe(false);
      expect(manager.checkElimination(world, 3)).toBe(true);

      // Now eliminate player 1
      removeEntity(world, unit1);
      expect(manager.checkElimination(world, 1)).toBe(true);

      // Verify counts
      expect(manager.getActivePlayerCount()).toBe(2); // player 0 and 2
      expect(manager.getEliminatedPlayers().length).toBe(2); // player 1 and 3
    });
  });

  describe('reset behavior', () => {
    it('should properly reset on clear and reinitialize', () => {
      // Eliminate player 1
      manager.checkElimination(world, 1);
      expect(manager.isPlayerEliminated(1)).toBe(true);

      // Reset
      manager.clear();
      manager.initialize([0], 2);

      // Player 1 should be fresh
      expect(manager.isPlayerEliminated(1)).toBe(false);
      expect(manager.getActivePlayers().length).toBe(2);
    });
  });
});
