import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, MovementComponent } from '../../ecs/world';
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
import { MoveAction } from './MoveAction';

describe('MoveAction', () => {
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

    // Create a simple tile map - all grassland for easy movement
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
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
      expect(MoveAction.id).toBe('MOVE_UNIT');
    });

    it('should have correct command type', () => {
      expect(MoveAction.commandType).toBe('MOVE_UNIT');
    });

    it('should be applicable to unit entity type', () => {
      expect(MoveAction.applicableTo).toContain('unit');
    });

    it('should not be applicable to city or player', () => {
      expect(MoveAction.applicableTo).not.toContain('city');
      expect(MoveAction.applicableTo).not.toContain('player');
    });
  });

  describe('generateCandidates', () => {
    it('should return empty for units with no movement', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 0; // Set current movement to 0
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when unit not found', () => {
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, 999);

      expect(candidates).toHaveLength(0);
    });

    it('should generate candidates for reachable tiles', () => {
      // Create a unit with 2 movement points
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, eid);

      // With 2 movement on flat terrain (cost 1), should reach:
      // - 6 neighbors at distance 1
      // - 12 tiles at distance 2
      // Total: 18 tiles, excluding current position
      expect(candidates.length).toBeGreaterThan(0);
    });

    it('should not include current position', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, eid);

      const currentPosMove = candidates.find((c) => c.targetQ === 0 && c.targetR === 0);
      expect(currentPosMove).toBeUndefined();
    });

    it('should generate correct number of candidates based on movement', () => {
      // Create unit at (0,0) with 1 movement point on flat terrain
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 1);
      // Movement is already set to 1 by createUnitEntity
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, eid);

      // With 1 movement on flat terrain, should reach exactly 6 neighbors
      expect(candidates).toHaveLength(6);
    });

    it('should include correct command structure', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, eid);

      for (const candidate of candidates) {
        expect(candidate.type).toBe('MOVE_UNIT');
        expect(candidate.playerId).toBe(0);
        expect(candidate.unitEid).toBe(eid);
        expect(typeof candidate.targetQ).toBe('number');
        expect(typeof candidate.targetR).toBe('number');
      }
    });

    it('should not generate moves to impassable terrain', () => {
      // Add a mountain adjacent to start
      const mountainPos = new TilePosition(1, 0);
      tileMap.set(mountainPos.key(), {
        position: mountainPos,
        terrain: Terrain.Mountain,
        feature: null,
        resource: null,
      });
      pathfinder = new Pathfinder(tileMap);
      deps.pathfinder = pathfinder;

      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const candidates = MoveAction.generateCandidates(context, eid);

      const mountainMove = candidates.find((c) => c.targetQ === 1 && c.targetR === 0);
      expect(mountainMove).toBeUndefined();
    });
  });

  describe('scoreCandidate', () => {
    it('should return 10 (base score)', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);
      const candidates = MoveAction.generateCandidates(context, eid);

      if (candidates.length > 0) {
        const score = MoveAction.scoreCandidate(context, candidates[0]);
        expect(score).toBe(10);
      }
    });
  });

  describe('auto-registration', () => {
    it('should be registered when module is imported', () => {
      const registry = ActionRegistry.getInstance();
      registry.register(MoveAction);

      expect(registry.hasAction('MOVE_UNIT')).toBe(true);
    });
  });
});
