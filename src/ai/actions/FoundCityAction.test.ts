import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, createCityEntity } from '../../ecs/world';
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
import { FoundCityAction } from './FoundCityAction';

describe('FoundCityAction', () => {
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

    // Create a tile map with valid founding locations
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
      expect(FoundCityAction.id).toBe('FOUND_CITY');
    });

    it('should have correct command type', () => {
      expect(FoundCityAction.commandType).toBe('FOUND_CITY');
    });

    it('should be applicable to unit entity type', () => {
      expect(FoundCityAction.applicableTo).toContain('unit');
    });

    it('should not be applicable to city or player', () => {
      expect(FoundCityAction.applicableTo).not.toContain('city');
      expect(FoundCityAction.applicableTo).not.toContain('player');
    });
  });

  describe('generateCandidates', () => {
    it('should return empty for non-Settler units', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when unit not found', () => {
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, 999);

      expect(candidates).toHaveLength(0);
    });

    it('should return single candidate for valid Settler', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(1);
    });

    it('should return correct command structure', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, eid);

      expect(candidates[0].type).toBe('FOUND_CITY');
      expect(candidates[0].playerId).toBe(0);
      expect(candidates[0].settlerEid).toBe(eid);
    });

    it('should return empty when city already exists at position', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      createCityEntity(world, 0, 0, 1, 0); // Enemy city at same position
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when terrain is water', () => {
      // Add water tile
      const waterPos = new TilePosition(1, 1);
      tileMap.set(waterPos.key(), {
        position: waterPos,
        terrain: Terrain.Ocean,
        feature: null,
        resource: null,
      });

      const eid = createUnitEntity(world, 1, 1, UnitType.Settler, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when terrain is impassable (Mountain)', () => {
      // Add mountain tile
      const mountainPos = new TilePosition(1, 1);
      tileMap.set(mountainPos.key(), {
        position: mountainPos,
        terrain: Terrain.Mountain,
        feature: null,
        resource: null,
      });

      const eid = createUnitEntity(world, 1, 1, UnitType.Settler, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = FoundCityAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });
  });

  describe('scoreCandidate', () => {
    it('should return 70 for any valid command', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      const context = buildAIContext(0, deps);
      const candidates = FoundCityAction.generateCandidates(context, eid);

      const score = FoundCityAction.scoreCandidate(context, candidates[0]);

      expect(score).toBe(70);
    });
  });

  describe('auto-registration', () => {
    it('should be registered when module is imported', () => {
      const registry = ActionRegistry.getInstance();
      registry.register(FoundCityAction);

      expect(registry.hasAction('FOUND_CITY')).toBe(true);
    });
  });
});
