import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createCityEntity } from '../../ecs/world';
import { GameState } from '../../game/GameState';
import { TerritoryManager } from '../../city/Territory';
import { TilePosition } from '../../hex/TilePosition';
import { Terrain } from '../../tile/Terrain';
import { GeneratedTile } from '../../map/MapGenerator';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { PlayerManager } from '../../player/PlayerManager';
import { buildAIContext, ContextBuilderDeps } from '../context/ContextBuilder';
import { ActionRegistry } from '../registry/ActionRegistry';
import { SetProductionAction } from './SetProductionAction';
import { BuildableType } from '../../city/Buildable';

describe('SetProductionAction', () => {
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
      expect(SetProductionAction.id).toBe('SET_PRODUCTION');
    });

    it('should have correct command type', () => {
      expect(SetProductionAction.commandType).toBe('SET_PRODUCTION');
    });

    it('should be applicable to city entity type', () => {
      expect(SetProductionAction.applicableTo).toContain('city');
    });

    it('should not be applicable to unit or player', () => {
      expect(SetProductionAction.applicableTo).not.toContain('unit');
      expect(SetProductionAction.applicableTo).not.toContain('player');
    });
  });

  describe('generateCandidates', () => {
    it('should generate 3 candidates (Warrior, Scout, Settler)', () => {
      const context = buildAIContext(0, deps);

      const candidates = SetProductionAction.generateCandidates(context, 123);

      expect(candidates).toHaveLength(3);
    });

    it('should include all buildable types', () => {
      const context = buildAIContext(0, deps);

      const candidates = SetProductionAction.generateCandidates(context, 123);
      const buildableTypes = candidates.map((c) => c.buildableType);

      expect(buildableTypes).toContain(BuildableType.Warrior);
      expect(buildableTypes).toContain(BuildableType.Scout);
      expect(buildableTypes).toContain(BuildableType.Settler);
    });

    it('should set correct cityEid on each candidate', () => {
      const context = buildAIContext(0, deps);

      const candidates = SetProductionAction.generateCandidates(context, 456);

      for (const candidate of candidates) {
        expect(candidate.cityEid).toBe(456);
      }
    });

    it('should set correct playerId on each candidate', () => {
      const context = buildAIContext(1, deps);

      const candidates = SetProductionAction.generateCandidates(context, 123);

      for (const candidate of candidates) {
        expect(candidate.playerId).toBe(1);
      }
    });
  });

  describe('scoreCandidate', () => {
    describe('Settler scoring', () => {
      it('should score Settler at 80 when less than 3 cities', () => {
        // Create 2 cities
        createCityEntity(world, 0, 0, 0, 0);
        createCityEntity(world, 1, 1, 0, 1);
        const context = buildAIContext(0, deps);

        const command = {
          type: 'SET_PRODUCTION' as const,
          playerId: 0,
          cityEid: 1,
          buildableType: BuildableType.Settler,
        };

        const score = SetProductionAction.scoreCandidate(context, command);

        expect(score).toBe(80);
      });

      it('should score Settler at 40 when 3 or more cities', () => {
        // Create 3 cities
        createCityEntity(world, 0, 0, 0, 0);
        createCityEntity(world, 1, 1, 0, 1);
        createCityEntity(world, 2, 2, 0, 2);
        const context = buildAIContext(0, deps);

        const command = {
          type: 'SET_PRODUCTION' as const,
          playerId: 0,
          cityEid: 1,
          buildableType: BuildableType.Settler,
        };

        const score = SetProductionAction.scoreCandidate(context, command);

        expect(score).toBe(40);
      });
    });

    describe('Warrior scoring', () => {
      it('should score Warrior at 50', () => {
        const context = buildAIContext(0, deps);

        const command = {
          type: 'SET_PRODUCTION' as const,
          playerId: 0,
          cityEid: 1,
          buildableType: BuildableType.Warrior,
        };

        const score = SetProductionAction.scoreCandidate(context, command);

        expect(score).toBe(50);
      });
    });

    describe('Scout scoring', () => {
      it('should score Scout at 30', () => {
        const context = buildAIContext(0, deps);

        const command = {
          type: 'SET_PRODUCTION' as const,
          playerId: 0,
          cityEid: 1,
          buildableType: BuildableType.Scout,
        };

        const score = SetProductionAction.scoreCandidate(context, command);

        expect(score).toBe(30);
      });
    });
  });

  describe('auto-registration', () => {
    it('should be registered when module is imported', () => {
      const registry = ActionRegistry.getInstance();
      registry.register(SetProductionAction);

      expect(registry.hasAction('SET_PRODUCTION')).toBe(true);
    });
  });
});
