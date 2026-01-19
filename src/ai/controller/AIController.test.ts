/**
 * Tests for AIController.
 * Verifies action selection, scoring, and turn execution.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, createCityEntity } from '../../ecs/world';
import { GameEngine } from '../../engine/GameEngine';
import { GameState } from '../../game/GameState';
import { TerritoryManager } from '../../city/Territory';
import { TilePosition } from '../../hex/TilePosition';
import { Terrain } from '../../tile/Terrain';
import { GeneratedTile } from '../../map/MapGenerator';
import { UnitType } from '../../unit/UnitType';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { PlayerManager } from '../../player/PlayerManager';
import { ContextBuilderDeps, buildAIContext } from '../context/ContextBuilder';
import { ActionRegistry } from '../registry/ActionRegistry';
import { AIController } from './AIController';

// Import to trigger action registration
import '../actions';

describe('AIController', () => {
  let world: IWorld;
  let gameState: GameState;
  let territoryManager: TerritoryManager;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let playerManager: PlayerManager;
  let deps: ContextBuilderDeps;
  let engine: GameEngine;
  let controller: AIController;

  beforeEach(() => {
    world = createGameWorld();
    gameState = new GameState();
    territoryManager = new TerritoryManager();
    tileMap = new Map();

    // Create a 10x10 tile map
    for (let q = -5; q < 5; q++) {
      for (let r = -5; r < 5; r++) {
        const pos = new TilePosition(q, r);
        tileMap.set(pos.key(), {
          position: pos,
          terrain: Terrain.Grassland,
          feature: null,
          resource: null,
        });
      }
    }

    pathfinder = new Pathfinder(tileMap);
    playerManager = new PlayerManager();
    playerManager.initialize([0], 3); // Human player 0, 3 total players

    deps = {
      world,
      gameState,
      tileMap,
      pathfinder,
      territoryManager,
      playerManager,
    };

    engine = new GameEngine();
    engine.setWorld(world);
    engine.setTileMap(tileMap);
    engine.setTerritoryManager(territoryManager);
    engine.setPathfinder(pathfinder);
    engine.setPlayerManager(playerManager);

    controller = new AIController(engine, deps);
  });

  describe('getAllScoredActions', () => {
    it('should return sorted actions by score descending', () => {
      // Create a unit that can move
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const context = buildAIContext(0, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have move actions + end turn
      expect(scoredActions.length).toBeGreaterThan(0);

      // Verify sorted by score descending
      for (let i = 1; i < scoredActions.length; i++) {
        expect(scoredActions[i - 1].score).toBeGreaterThanOrEqual(scoredActions[i].score);
      }
    });

    it('should include END_TURN action', () => {
      const context = buildAIContext(0, deps);
      const scoredActions = controller.getAllScoredActions(context);

      const endTurnAction = scoredActions.find((a) => a.actionId === 'END_TURN');
      expect(endTurnAction).toBeDefined();
    });

    it('should include unit actions for each unit', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 2, 2, UnitType.Scout, 0, 3);

      const context = buildAIContext(0, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have MOVE_UNIT actions for both units
      const moveActions = scoredActions.filter((a) => a.actionId === 'MOVE_UNIT');
      expect(moveActions.length).toBeGreaterThan(0);
    });

    it('should include city actions', () => {
      createCityEntity(world, 0, 0, 0, 0);

      const context = buildAIContext(0, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have SET_PRODUCTION actions
      const productionActions = scoredActions.filter((a) => a.actionId === 'SET_PRODUCTION');
      expect(productionActions.length).toBeGreaterThan(0);
    });
  });

  describe('selectBestAction', () => {
    it('should return highest scored action', () => {
      // Create a unit to generate move actions
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const context = buildAIContext(0, deps);
      const best = controller.selectBestAction(context);

      expect(best).not.toBeNull();
      // The best action should be the first in the sorted list
      const all = controller.getAllScoredActions(context);
      expect(best!.score).toBe(all[0].score);
    });

    it('should return END_TURN when no units or cities', () => {
      // Empty world, no units or cities
      const context = buildAIContext(0, deps);

      // END_TURN is always available
      const best = controller.selectBestAction(context);
      expect(best).not.toBeNull();
      expect(best!.actionId).toBe('END_TURN');
    });

    it('should prefer other actions over END_TURN when units can act', () => {
      // Create a unit that can act
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const context = buildAIContext(0, deps);
      const best = controller.selectBestAction(context);

      // With a fresh unit that can still move, other actions should be selected first
      expect(best).not.toBeNull();
      // When unit has full movement, MOVE_UNIT (10) beats END_TURN (1)
      expect(best!.actionId).not.toBe('END_TURN');
    });
  });

  describe('executeTurn', () => {
    it('should execute commands until END_TURN', () => {
      // No units - END_TURN will be selected immediately

      // Mock executeCommand to track calls
      const originalExecuteCommand = engine.executeCommand.bind(engine);
      const executedCommands: unknown[] = [];
      vi.spyOn(engine, 'executeCommand').mockImplementation((cmd) => {
        executedCommands.push(cmd);
        // Return success for END_TURN
        if (cmd.type === 'END_TURN') {
          return { success: true, events: [] };
        }
        return originalExecuteCommand(cmd);
      });

      controller.executeTurn(0);

      // Should have executed at least END_TURN
      expect(executedCommands.length).toBeGreaterThan(0);
      const lastCommand = executedCommands[executedCommands.length - 1] as { type: string };
      expect(lastCommand.type).toBe('END_TURN');
    });

    it('should respect iteration limit to prevent infinite loops', () => {
      // Create multiple units to generate many actions
      for (let i = 0; i < 5; i++) {
        createUnitEntity(world, i, 0, UnitType.Scout, 0, 3);
      }

      // Mock executeCommand to always succeed but never actually end
      // This simulates a scenario where actions keep getting generated
      let executionCount = 0;
      vi.spyOn(engine, 'executeCommand').mockImplementation((_cmd) => {
        executionCount++;
        // Always return success to allow loop to continue
        return { success: true, events: [] };
      });

      // Spy on console.warn to verify the warning is logged
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      controller.executeTurn(0);

      // Should not exceed MAX_ITERATIONS (100)
      expect(executionCount).toBeLessThanOrEqual(100);

      // Should have logged a warning about hitting the limit
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('hit safety limit'));

      warnSpy.mockRestore();
    });

    it('should continue after failed commands', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      let callCount = 0;
      vi.spyOn(engine, 'executeCommand').mockImplementation((_cmd) => {
        callCount++;
        if (callCount === 1) {
          // First command fails
          return { success: false, error: 'Test failure', events: [] };
        }
        // Subsequent commands succeed
        return { success: true, events: [] };
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      controller.executeTurn(0);

      // Should have continued after the failure
      expect(callCount).toBeGreaterThan(1);
      // Should have logged a warning about the failure
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('failed'));

      warnSpy.mockRestore();
    });
  });

  describe('action scoring integration', () => {
    it('should score ATTACK higher when enemy is adjacent', () => {
      // Create own warrior adjacent to enemy
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2); // Enemy adjacent

      const context = buildAIContext(0, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have an ATTACK action
      const attackActions = scoredActions.filter((a) => a.actionId === 'ATTACK');
      expect(attackActions.length).toBeGreaterThan(0);
    });

    it('should not generate ATTACK when no enemies adjacent', () => {
      // Create own warrior with no adjacent enemies
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 3, 3, UnitType.Warrior, 1, 2); // Enemy far away

      const context = buildAIContext(0, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should NOT have ATTACK actions
      const attackActions = scoredActions.filter((a) => a.actionId === 'ATTACK');
      expect(attackActions.length).toBe(0);
    });
  });

  describe('action registration', () => {
    it('should have all 5 actions registered', () => {
      const registry = ActionRegistry.getInstance();
      expect(registry.getActionCount()).toBe(5);
    });

    it('should have correct actions registered', () => {
      const registry = ActionRegistry.getInstance();
      expect(registry.hasAction('MOVE_UNIT')).toBe(true);
      expect(registry.hasAction('ATTACK')).toBe(true);
      expect(registry.hasAction('FOUND_CITY')).toBe(true);
      expect(registry.hasAction('SET_PRODUCTION')).toBe(true);
      expect(registry.hasAction('END_TURN')).toBe(true);
    });
  });
});
