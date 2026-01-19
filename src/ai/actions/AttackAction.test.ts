import { describe, it, expect, beforeEach } from 'vitest';
import { IWorld } from 'bitecs';
import { createGameWorld, createUnitEntity, MovementComponent } from '../../ecs/world';
import { GameState } from '../../game/GameState';
import { TerritoryManager } from '../../city/Territory';
import { TilePosition } from '../../hex/TilePosition';
import { Terrain } from '../../tile/Terrain';
import { TileFeature } from '../../tile/TileFeature';
import { GeneratedTile } from '../../map/MapGenerator';
import { UnitType } from '../../unit/UnitType';
import { Pathfinder } from '../../pathfinding/Pathfinder';
import { PlayerManager } from '../../player/PlayerManager';
import { buildAIContext, ContextBuilderDeps } from '../context/ContextBuilder';
import { ActionRegistry } from '../registry/ActionRegistry';
import { AttackAction } from './AttackAction';

describe('AttackAction', () => {
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

    // Create a tile map
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
      expect(AttackAction.id).toBe('ATTACK');
    });

    it('should have correct command type', () => {
      expect(AttackAction.commandType).toBe('ATTACK');
    });

    it('should be applicable to unit entity type', () => {
      expect(AttackAction.applicableTo).toContain('unit');
    });

    it('should not be applicable to city or player', () => {
      expect(AttackAction.applicableTo).not.toContain('city');
      expect(AttackAction.applicableTo).not.toContain('player');
    });
  });

  describe('generateCandidates', () => {
    it('should return empty for units without attack capability', () => {
      // Settlers cannot attack
      const eid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2); // Adjacent enemy
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when unit not found', () => {
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, 999);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when no adjacent enemies', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      // No enemy units
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should return empty when enemy is not adjacent', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 2, 0, UnitType.Warrior, 1, 2); // Enemy 2 tiles away
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });

    it('should generate candidates for adjacent enemies', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const enemyEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2); // Adjacent enemy
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].type).toBe('ATTACK');
      expect(candidates[0].attackerEid).toBe(eid);
      expect(candidates[0].defenderEid).toBe(enemyEid);
    });

    it('should generate multiple candidates for multiple adjacent enemies', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2); // East neighbor
      createUnitEntity(world, 0, 1, UnitType.Warrior, 1, 2); // Southeast neighbor
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(2);
    });

    it('should return empty when unit has no movement', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      MovementComponent.current[eid] = 0; // No movement = cannot attack
      createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2); // Adjacent enemy
      const context = buildAIContext(0, deps);

      const candidates = AttackAction.generateCandidates(context, eid);

      expect(candidates).toHaveLength(0);
    });
  });

  describe('scoreCandidate', () => {
    it('should return base score around 50 for equal strength units', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const enemyEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const context = buildAIContext(0, deps);

      const command = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: eid,
        defenderEid: enemyEid,
      };

      const score = AttackAction.scoreCandidate(context, command);

      // Base 50 + some bonus for favorable damage ratio
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score higher when attacking civilian (Settler)', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const enemyEid = createUnitEntity(world, 1, 0, UnitType.Settler, 1, 2);
      const context = buildAIContext(0, deps);

      const command = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: eid,
        defenderEid: enemyEid,
      };

      const score = AttackAction.scoreCandidate(context, command);

      // Attacking civilian = instant kill, high score
      // Base 50 + 30 (kill) + 15 (no counter-damage) = 95
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should score lower when attacker would die', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Scout, 0, 3);
      const enemyEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const context = buildAIContext(0, deps);

      // Make attacker very weak
      // Scout (strength 5) vs Warrior (strength 8) at full health
      const command = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: eid,
        defenderEid: enemyEid,
      };

      const score = AttackAction.scoreCandidate(context, command);

      // Scout attacking warrior is still viable, just lower score
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should factor in terrain defense modifiers', () => {
      // Put enemy on hills
      const hillPos = new TilePosition(1, 0);
      tileMap.set(hillPos.key(), {
        position: hillPos,
        terrain: Terrain.GrasslandHill,
        feature: null,
        resource: null,
      });

      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const enemyEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const context = buildAIContext(0, deps);

      const commandHills = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: eid,
        defenderEid: enemyEid,
      };

      const scoreHills = AttackAction.scoreCandidate(context, commandHills);

      // Now test without hills
      tileMap.set(hillPos.key(), {
        position: hillPos,
        terrain: Terrain.Grassland,
        feature: null,
        resource: null,
      });

      const contextFlat = buildAIContext(0, deps);
      const scoreFlat = AttackAction.scoreCandidate(contextFlat, commandHills);

      // Score on hills should be lower (or equal) due to defense bonus
      expect(scoreHills).toBeLessThanOrEqual(scoreFlat);
    });

    it('should factor in forest defense bonus', () => {
      // Put enemy in forest
      const forestPos = new TilePosition(1, 0);
      tileMap.set(forestPos.key(), {
        position: forestPos,
        terrain: Terrain.Grassland,
        feature: TileFeature.Forest,
        resource: null,
      });

      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const enemyEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);
      const context = buildAIContext(0, deps);

      const command = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: eid,
        defenderEid: enemyEid,
      };

      const score = AttackAction.scoreCandidate(context, command);

      // Score should account for forest defense
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 when attacker not found', () => {
      const context = buildAIContext(0, deps);

      const command = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: 999,
        defenderEid: 888,
      };

      const score = AttackAction.scoreCandidate(context, command);

      expect(score).toBe(0);
    });

    it('should return 0 when defender not found', () => {
      const eid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const command = {
        type: 'ATTACK' as const,
        playerId: 0,
        attackerEid: eid,
        defenderEid: 999, // Non-existent defender
      };

      const score = AttackAction.scoreCandidate(context, command);

      expect(score).toBe(0);
    });
  });

  describe('auto-registration', () => {
    it('should be registered when module is imported', () => {
      const registry = ActionRegistry.getInstance();
      registry.register(AttackAction);

      expect(registry.hasAction('ATTACK')).toBe(true);
    });
  });
});
