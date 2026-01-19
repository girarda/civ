import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity } from '../../ecs/world';
import { GameState } from '../../game/GameState';
import { TerritoryManager } from '../../city/Territory';
import { TilePosition } from '../../hex/TilePosition';
import { Terrain } from '../../tile/Terrain';
import { GeneratedTile } from '../../map/MapGenerator';
import { UnitType } from '../../unit/UnitType';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { PlayerManager } from '../../player/PlayerManager';
import { buildAIContext, ContextBuilderDeps } from '../context/ContextBuilder';
import { ActionRegistry } from '../registry/ActionRegistry';
import { EndTurnAction } from './EndTurnAction';

describe('EndTurnAction', () => {
  let world: IWorld;
  let gameState: GameState;
  let territoryManager: TerritoryManager;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let playerManager: PlayerManager;
  let deps: ContextBuilderDeps;

  beforeEach(() => {
    // Reset registry to avoid test pollution
    ActionRegistry.resetInstance();

    world = createGameWorld();
    gameState = new GameState();
    territoryManager = new TerritoryManager();
    tileMap = new Map();

    // Create a small tile map
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
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
    playerManager.initialize([0], 2);

    deps = {
      world,
      gameState,
      tileMap,
      pathfinder,
      territoryManager,
      playerManager,
    };
  });

  describe('action properties', () => {
    it('should have correct id', () => {
      expect(EndTurnAction.id).toBe('END_TURN');
    });

    it('should have correct command type', () => {
      expect(EndTurnAction.commandType).toBe('END_TURN');
    });

    it('should be applicable to player entity type', () => {
      expect(EndTurnAction.applicableTo).toContain('player');
    });

    it('should not be applicable to unit or city', () => {
      expect(EndTurnAction.applicableTo).not.toContain('unit');
      expect(EndTurnAction.applicableTo).not.toContain('city');
    });
  });

  describe('generateCandidates', () => {
    it('should generate exactly one candidate', () => {
      const context = buildAIContext(0, deps);

      const candidates = EndTurnAction.generateCandidates(context, -1);

      expect(candidates).toHaveLength(1);
    });

    it('should generate command with correct type', () => {
      const context = buildAIContext(0, deps);

      const candidates = EndTurnAction.generateCandidates(context, -1);

      expect(candidates[0].type).toBe('END_TURN');
    });

    it('should generate command with correct playerId', () => {
      const context = buildAIContext(1, deps);

      const candidates = EndTurnAction.generateCandidates(context, -1);

      expect(candidates[0].playerId).toBe(1);
    });
  });

  describe('scoreCandidate', () => {
    it('should return 100 when no units have actions', () => {
      // No units created
      const context = buildAIContext(0, deps);
      const command = EndTurnAction.generateCandidates(context, -1)[0];

      const score = EndTurnAction.scoreCandidate(context, command);

      expect(score).toBe(100);
    });

    it('should return 1 when units can move', () => {
      // Create a unit that can move
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);
      const command = EndTurnAction.generateCandidates(context, -1)[0];

      const score = EndTurnAction.scoreCandidate(context, command);

      expect(score).toBe(1);
    });

    it('should return 1 when units can attack', () => {
      // Create a warrior that can attack
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);
      const command = EndTurnAction.generateCandidates(context, -1)[0];

      const score = EndTurnAction.scoreCandidate(context, command);

      expect(score).toBe(1);
    });

    it('should return 1 when settler can found city', () => {
      // Create a settler
      createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const context = buildAIContext(0, deps);
      const command = EndTurnAction.generateCandidates(context, -1)[0];

      const score = EndTurnAction.scoreCandidate(context, command);

      expect(score).toBe(1);
    });
  });

  describe('auto-registration', () => {
    it('should be registered when module is imported', () => {
      // Import triggers registration
      const registry = ActionRegistry.getInstance();
      registry.register(EndTurnAction);

      expect(registry.hasAction('END_TURN')).toBe(true);
    });
  });
});
