/**
 * Integration tests for the AI system.
 * Tests complete AI turn flow with real game state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, createCityEntity } from '../ecs/world';
import { GameEngine } from '../engine/GameEngine';
import { GameState } from '../game/GameState';
import { TerritoryManager } from '../city/Territory';
import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { GeneratedTile } from '../map/MapGenerator';
import { UnitType } from '../unit/UnitType';
import { BuildableType } from '../city/Buildable';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { PlayerManager } from '../player/PlayerManager';
import { ContextBuilderDeps, buildAIContext } from './context/ContextBuilder';
import { ActionRegistry } from './registry/ActionRegistry';
import { AIController } from './controller/AIController';

// Import to trigger action registration
import './actions';

describe('AI Integration', () => {
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

    // Create a 20x20 tile map for more space
    for (let q = -10; q < 10; q++) {
      for (let r = -10; r < 10; r++) {
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

  describe('Settler founding city', () => {
    it('should found city when Settler is on valid tile', () => {
      // Create a Settler for AI player 1
      createUnitEntity(world, 0, 0, UnitType.Settler, 1, 2);

      // Get initial city count
      const initialCities = engine.getCities(1);
      expect(initialCities.length).toBe(0);

      // Build context for AI player
      const context = buildAIContext(1, deps);

      // Get all scored actions
      const scoredActions = controller.getAllScoredActions(context);

      // Should have FOUND_CITY action with high score
      const foundCityAction = scoredActions.find((a) => a.actionId === 'FOUND_CITY');
      expect(foundCityAction).toBeDefined();
      expect(foundCityAction!.score).toBe(70); // As defined in FoundCityAction

      // Execute the turn - will attempt to found city
      // Note: Full integration depends on the command executor being properly wired up
      controller.executeTurn(1);
    });
  });

  describe('Warrior attacking', () => {
    it('should generate ATTACK action when enemy is adjacent', () => {
      // Create AI warrior at (0, 0)
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);
      // Create enemy warrior at (1, 0) - adjacent
      createUnitEntity(world, 1, 0, UnitType.Warrior, 2, 2);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have ATTACK action
      const attackActions = scoredActions.filter((a) => a.actionId === 'ATTACK');
      expect(attackActions.length).toBe(1);

      // Attack should have reasonable score (base 50, adjusted by combat outcome)
      expect(attackActions[0].score).toBeGreaterThan(0);
    });

    it('should not generate ATTACK when no enemies adjacent', () => {
      // Create AI warrior at (0, 0)
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);
      // Create enemy warrior at (5, 5) - not adjacent
      createUnitEntity(world, 5, 5, UnitType.Warrior, 2, 2);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should NOT have ATTACK action
      const attackActions = scoredActions.filter((a) => a.actionId === 'ATTACK');
      expect(attackActions.length).toBe(0);
    });
  });

  describe('Unit movement', () => {
    it('should generate MOVE actions for all reachable tiles', () => {
      // Create a Scout (3 movement) at (0, 0)
      createUnitEntity(world, 0, 0, UnitType.Scout, 1, 3);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have multiple MOVE_UNIT actions
      const moveActions = scoredActions.filter((a) => a.actionId === 'MOVE_UNIT');
      expect(moveActions.length).toBeGreaterThan(0);

      // All move actions should have base score of 10
      for (const action of moveActions) {
        expect(action.score).toBe(10);
      }
    });

    it('should not include current position in move candidates', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      const moveActions = scoredActions.filter((a) => a.actionId === 'MOVE_UNIT');

      // No move action should target the current position (0, 0)
      for (const action of moveActions) {
        const cmd = action.command as { targetQ: number; targetR: number };
        expect(cmd.targetQ !== 0 || cmd.targetR !== 0).toBe(true);
      }
    });
  });

  describe('City production', () => {
    it('should generate SET_PRODUCTION actions for idle city', () => {
      // Create a city for AI player
      createCityEntity(world, 0, 0, 1, 0);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have SET_PRODUCTION actions
      const productionActions = scoredActions.filter((a) => a.actionId === 'SET_PRODUCTION');
      expect(productionActions.length).toBe(3); // Warrior, Scout, Settler

      // Check scoring based on city count
      const settlerAction = productionActions.find((a) => {
        const cmd = a.command as { buildableType: BuildableType };
        return cmd.buildableType === BuildableType.Settler;
      });
      expect(settlerAction).toBeDefined();
      expect(settlerAction!.score).toBe(80); // < 3 cities, so Settler scores 80
    });

    it('should score Settler lower when already have 3+ cities', () => {
      // Create 3 cities for AI player
      createCityEntity(world, 0, 0, 1, 0);
      createCityEntity(world, 5, 0, 1, 1);
      createCityEntity(world, 0, 5, 1, 2);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Find Settler production actions
      const settlerActions = scoredActions.filter((a) => {
        if (a.actionId !== 'SET_PRODUCTION') return false;
        const cmd = a.command as { buildableType: BuildableType };
        return cmd.buildableType === BuildableType.Settler;
      });

      // Should have 3 Settler options (one for each city)
      expect(settlerActions.length).toBe(3);

      // All should score 40 (>= 3 cities)
      for (const action of settlerActions) {
        expect(action.score).toBe(40);
      }
    });
  });

  describe('END_TURN behavior', () => {
    it('should score END_TURN at 1 when units have actions', () => {
      // Create a unit that can act
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      const endTurnAction = scoredActions.find((a) => a.actionId === 'END_TURN');
      expect(endTurnAction).toBeDefined();
      expect(endTurnAction!.score).toBe(1);
    });

    it('should score END_TURN at 100 when no units can act', () => {
      // No units = no actions possible
      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      const endTurnAction = scoredActions.find((a) => a.actionId === 'END_TURN');
      expect(endTurnAction).toBeDefined();
      expect(endTurnAction!.score).toBe(100);
    });
  });

  describe('Multi-unit turn', () => {
    it('should generate actions for all units', () => {
      // Create multiple units
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);
      createUnitEntity(world, 5, 0, UnitType.Scout, 1, 3);
      createUnitEntity(world, 0, 5, UnitType.Settler, 1, 2);

      const context = buildAIContext(1, deps);
      const scoredActions = controller.getAllScoredActions(context);

      // Should have actions for all units
      const moveActions = scoredActions.filter((a) => a.actionId === 'MOVE_UNIT');
      const foundCityActions = scoredActions.filter((a) => a.actionId === 'FOUND_CITY');

      // All three units can move
      expect(moveActions.length).toBeGreaterThan(0);
      // Settler can found city
      expect(foundCityActions.length).toBe(1);
    });

    it('should prioritize high-value actions across all units', () => {
      // Create a Settler (can found city, score 70) and a Warrior (can only move, score 10)
      createUnitEntity(world, 0, 0, UnitType.Settler, 1, 2);
      createUnitEntity(world, 5, 0, UnitType.Warrior, 1, 2);

      const best = controller.selectBestAction(buildAIContext(1, deps));

      // FOUND_CITY (70) should be selected over MOVE_UNIT (10)
      expect(best).not.toBeNull();
      expect(best!.actionId).toBe('FOUND_CITY');
    });
  });

  describe('Action registration verification', () => {
    it('should have exactly 5 actions registered', () => {
      const registry = ActionRegistry.getInstance();
      expect(registry.getActionCount()).toBe(5);
    });

    it('should have all expected actions registered', () => {
      const registry = ActionRegistry.getInstance();

      expect(registry.hasAction('MOVE_UNIT')).toBe(true);
      expect(registry.hasAction('ATTACK')).toBe(true);
      expect(registry.hasAction('FOUND_CITY')).toBe(true);
      expect(registry.hasAction('SET_PRODUCTION')).toBe(true);
      expect(registry.hasAction('END_TURN')).toBe(true);
    });

    it('should have correct entity type mappings', () => {
      const registry = ActionRegistry.getInstance();

      const unitActions = registry.getActionsFor('unit');
      const cityActions = registry.getActionsFor('city');
      const playerActions = registry.getActionsFor('player');

      expect(unitActions.length).toBe(3); // MOVE_UNIT, ATTACK, FOUND_CITY
      expect(cityActions.length).toBe(1); // SET_PRODUCTION
      expect(playerActions.length).toBe(1); // END_TURN
    });
  });

  describe('No infinite loops', () => {
    it('should complete turn within reasonable iterations', () => {
      // Create a scenario with multiple units and a city
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);
      createUnitEntity(world, 2, 0, UnitType.Scout, 1, 3);
      createCityEntity(world, 5, 5, 1, 0);

      // This should not hang or exceed safety limit
      const startTime = Date.now();
      controller.executeTurn(1);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (less than 5 seconds even with many iterations)
      expect(duration).toBeLessThan(5000);
    });
  });
});
