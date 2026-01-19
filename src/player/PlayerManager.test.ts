/**
 * Unit tests for PlayerManager.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent, IWorld } from 'bitecs';
import { PlayerManager } from './PlayerManager';
import { PLAYER_COLORS, MAX_PLAYERS } from './Player';
import {
  Position,
  UnitComponent,
  OwnerComponent,
  MovementComponent,
  HealthComponent,
} from '../ecs/world';
import { CityComponent, PopulationComponent } from '../ecs/cityComponents';

/** Create a mock world with Position, UnitComponent, OwnerComponent, etc. */
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

describe('PlayerManager', () => {
  let manager: PlayerManager;

  beforeEach(() => {
    manager = new PlayerManager();
  });

  describe('initialize()', () => {
    it('should create correct number of players', () => {
      manager.initialize([0], 4);
      expect(manager.getPlayerCount()).toBe(4);
    });

    it('should correctly mark human vs AI players', () => {
      manager.initialize([0], 3);
      const players = manager.getAllPlayers();

      expect(players[0].isHuman).toBe(true);
      expect(players[1].isHuman).toBe(false);
      expect(players[2].isHuman).toBe(false);
    });

    it('should handle multiple human players', () => {
      manager.initialize([0, 1], 4);
      const players = manager.getAllPlayers();

      expect(players[0].isHuman).toBe(true);
      expect(players[1].isHuman).toBe(true);
      expect(players[2].isHuman).toBe(false);
      expect(players[3].isHuman).toBe(false);
    });

    it('should assign correct colors from palette', () => {
      manager.initialize([0], 4);
      const players = manager.getAllPlayers();

      expect(players[0].color).toBe(PLAYER_COLORS[0]);
      expect(players[1].color).toBe(PLAYER_COLORS[1]);
      expect(players[2].color).toBe(PLAYER_COLORS[2]);
      expect(players[3].color).toBe(PLAYER_COLORS[3]);
    });

    it('should clamp to MAX_PLAYERS', () => {
      manager.initialize([0], 20);
      expect(manager.getPlayerCount()).toBe(MAX_PLAYERS);
    });

    it('should wrap colors when exceeding palette size', () => {
      manager.initialize([0], 8);
      const players = manager.getAllPlayers();
      expect(players[0].color).toBe(PLAYER_COLORS[0]);
      expect(players[7].color).toBe(PLAYER_COLORS[7]);
    });

    it('should initialize all players as not eliminated', () => {
      manager.initialize([0], 4);
      for (const player of manager.getAllPlayers()) {
        expect(player.isEliminated).toBe(false);
      }
    });

    it('should assign correct names', () => {
      manager.initialize([0], 3);
      const players = manager.getAllPlayers();

      expect(players[0].name).toBe('Player 1');
      expect(players[1].name).toBe('AI 1');
      expect(players[2].name).toBe('AI 2');
    });

    it('should clear existing players when re-initializing', () => {
      manager.initialize([0], 4);
      manager.initialize([0], 2);
      expect(manager.getPlayerCount()).toBe(2);
    });
  });

  describe('getPlayer()', () => {
    beforeEach(() => {
      manager.initialize([0], 3);
    });

    it('should return correct player', () => {
      const player = manager.getPlayer(1);
      expect(player).toBeDefined();
      expect(player!.id).toBe(1);
      expect(player!.name).toBe('AI 1');
    });

    it('should return undefined for invalid ID', () => {
      expect(manager.getPlayer(99)).toBeUndefined();
    });

    it('should return undefined for negative ID', () => {
      expect(manager.getPlayer(-1)).toBeUndefined();
    });
  });

  describe('getAllPlayers()', () => {
    it('should return all players', () => {
      manager.initialize([0], 4);
      const players = manager.getAllPlayers();
      expect(players.length).toBe(4);
    });

    it('should return empty array when not initialized', () => {
      expect(manager.getAllPlayers()).toEqual([]);
    });
  });

  describe('getActivePlayers()', () => {
    it('should exclude eliminated players', () => {
      manager.initialize([0], 3);
      manager.eliminatePlayer(1);

      const active = manager.getActivePlayers();
      expect(active.length).toBe(2);
      expect(active.find((p) => p.id === 1)).toBeUndefined();
    });

    it('should return all players when none eliminated', () => {
      manager.initialize([0], 4);
      expect(manager.getActivePlayers().length).toBe(4);
    });
  });

  describe('getHumanPlayers()', () => {
    it('should return only human players', () => {
      manager.initialize([0, 2], 4);
      const humans = manager.getHumanPlayers();

      expect(humans.length).toBe(2);
      expect(humans.find((p) => p.id === 0)).toBeDefined();
      expect(humans.find((p) => p.id === 2)).toBeDefined();
    });
  });

  describe('getAIPlayers()', () => {
    it('should return only AI players', () => {
      manager.initialize([0], 4);
      const ais = manager.getAIPlayers();

      expect(ais.length).toBe(3);
      expect(ais.every((p) => !p.isHuman)).toBe(true);
    });
  });

  describe('getEliminatedPlayers()', () => {
    it('should return only eliminated players', () => {
      manager.initialize([0], 4);
      manager.eliminatePlayer(1);
      manager.eliminatePlayer(2);

      const eliminated = manager.getEliminatedPlayers();
      expect(eliminated.length).toBe(2);
      expect(eliminated.every((p) => p.isEliminated)).toBe(true);
    });
  });

  describe('isPlayerEliminated()', () => {
    it('should return true for eliminated player', () => {
      manager.initialize([0], 3);
      manager.eliminatePlayer(1);
      expect(manager.isPlayerEliminated(1)).toBe(true);
    });

    it('should return false for active player', () => {
      manager.initialize([0], 3);
      expect(manager.isPlayerEliminated(0)).toBe(false);
    });

    it('should return false for invalid ID', () => {
      manager.initialize([0], 3);
      expect(manager.isPlayerEliminated(99)).toBe(false);
    });
  });

  describe('getActivePlayerCount()', () => {
    it('should return count of active players', () => {
      manager.initialize([0], 4);
      expect(manager.getActivePlayerCount()).toBe(4);

      manager.eliminatePlayer(1);
      expect(manager.getActivePlayerCount()).toBe(3);
    });
  });

  describe('checkElimination()', () => {
    it('should mark player eliminated when 0 units and 0 cities', () => {
      const world = createMockWorld();
      manager.initialize([0], 2);

      // Player 1 has no units or cities
      const wasEliminated = manager.checkElimination(world, 1);
      expect(wasEliminated).toBe(true);
      expect(manager.isPlayerEliminated(1)).toBe(true);
    });

    it('should not eliminate player with units', () => {
      const world = createMockWorld();
      manager.initialize([0], 2);

      // Give player 1 a unit
      createUnitEntity(world, 1, 0, 0);

      const wasEliminated = manager.checkElimination(world, 1);
      expect(wasEliminated).toBe(false);
      expect(manager.isPlayerEliminated(1)).toBe(false);
    });

    it('should not eliminate player with cities', () => {
      const world = createMockWorld();
      manager.initialize([0], 2);

      // Give player 1 a city
      createCityEntity(world, 1, 0, 0);

      const wasEliminated = manager.checkElimination(world, 1);
      expect(wasEliminated).toBe(false);
      expect(manager.isPlayerEliminated(1)).toBe(false);
    });

    it('should return false for already eliminated player', () => {
      const world = createMockWorld();
      manager.initialize([0], 2);

      manager.eliminatePlayer(1);
      const wasEliminated = manager.checkElimination(world, 1);
      expect(wasEliminated).toBe(false);
    });

    it('should return false for invalid player', () => {
      const world = createMockWorld();
      manager.initialize([0], 2);

      const wasEliminated = manager.checkElimination(world, 99);
      expect(wasEliminated).toBe(false);
    });

    it('should notify listeners when player is eliminated', () => {
      const world = createMockWorld();
      manager.initialize([0], 2);

      const listener = vi.fn();
      manager.subscribe(listener);

      manager.checkElimination(world, 1);

      expect(listener).toHaveBeenCalledWith({
        type: 'eliminated',
        playerId: 1,
      });
    });
  });

  describe('eliminatePlayer()', () => {
    it('should mark player as eliminated', () => {
      manager.initialize([0], 3);
      manager.eliminatePlayer(1);
      expect(manager.isPlayerEliminated(1)).toBe(true);
    });

    it('should notify listeners', () => {
      manager.initialize([0], 3);
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.eliminatePlayer(1);

      expect(listener).toHaveBeenCalledWith({
        type: 'eliminated',
        playerId: 1,
      });
    });

    it('should not notify if already eliminated', () => {
      manager.initialize([0], 3);
      manager.eliminatePlayer(1);

      const listener = vi.fn();
      manager.subscribe(listener);
      manager.eliminatePlayer(1);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should do nothing for invalid player', () => {
      manager.initialize([0], 3);
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.eliminatePlayer(99);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getPlayerColor()', () => {
    it('should return correct color', () => {
      manager.initialize([0], 4);
      expect(manager.getPlayerColor(0)).toBe(PLAYER_COLORS[0]);
      expect(manager.getPlayerColor(2)).toBe(PLAYER_COLORS[2]);
    });

    it('should return fallback for invalid ID', () => {
      manager.initialize([0], 4);
      expect(manager.getPlayerColor(99)).toBe(PLAYER_COLORS[0]);
    });
  });

  describe('getPlayerName()', () => {
    it('should return correct name', () => {
      manager.initialize([0], 3);
      expect(manager.getPlayerName(0)).toBe('Player 1');
      expect(manager.getPlayerName(1)).toBe('AI 1');
    });

    it('should return fallback for invalid ID', () => {
      manager.initialize([0], 3);
      expect(manager.getPlayerName(99)).toBe('Unknown');
    });
  });

  describe('subscribe()', () => {
    it('should add listener', () => {
      manager.initialize([0], 3);
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.eliminatePlayer(1);

      expect(listener).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      manager.initialize([0], 3);
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);

      unsubscribe();
      manager.eliminatePlayer(1);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      manager.initialize([0], 3);
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      manager.subscribe(listener1);
      manager.subscribe(listener2);

      manager.eliminatePlayer(1);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should remove all players', () => {
      manager.initialize([0], 4);
      manager.clear();
      expect(manager.getPlayerCount()).toBe(0);
    });

    it('should remove all listeners', () => {
      manager.initialize([0], 4);
      const listener = vi.fn();
      manager.subscribe(listener);

      manager.clear();
      manager.initialize([0], 2);
      manager.eliminatePlayer(1);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
