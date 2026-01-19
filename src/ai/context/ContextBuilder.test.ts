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
import { buildAIContext, ContextBuilderDeps } from './ContextBuilder';

describe('ContextBuilder', () => {
  let world: IWorld;
  let gameState: GameState;
  let territoryManager: TerritoryManager;
  let tileMap: Map<string, GeneratedTile>;
  let pathfinder: Pathfinder;
  let playerManager: PlayerManager;
  let deps: ContextBuilderDeps;

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
  });

  describe('buildAIContext - basic properties', () => {
    it('should build context with correct playerId', () => {
      const context = buildAIContext(1, deps);

      expect(context.playerId).toBe(1);
    });

    it('should include core references', () => {
      const context = buildAIContext(0, deps);

      expect(context.world).toBe(world);
      expect(context.gameState).toBe(gameState);
      expect(context.tileMap).toBe(tileMap);
      expect(context.pathfinder).toBe(pathfinder);
      expect(context.territoryManager).toBe(territoryManager);
      expect(context.playerManager).toBe(playerManager);
    });
  });

  describe('buildAIContext - own units', () => {
    it('should return empty array when player has no units', () => {
      const context = buildAIContext(0, deps);

      expect(context.myUnits).toHaveLength(0);
    });

    it('should include only units belonging to the player', () => {
      // Create units for different players
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Scout, 0, 3);
      createUnitEntity(world, 2, 0, UnitType.Warrior, 1, 2);

      const context = buildAIContext(0, deps);

      expect(context.myUnits).toHaveLength(2);
      expect(context.myUnits.every((u) => u.owner === 0)).toBe(true);
    });
  });

  describe('buildAIContext - own cities', () => {
    it('should return empty array when player has no cities', () => {
      const context = buildAIContext(0, deps);

      expect(context.myCities).toHaveLength(0);
    });

    it('should include only cities belonging to the player', () => {
      // Create cities for different players
      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 2, 2, 1, 1);

      const context = buildAIContext(0, deps);

      expect(context.myCities).toHaveLength(1);
      expect(context.myCities[0].owner).toBe(0);
    });
  });

  describe('buildAIContext - enemy units', () => {
    it('should group enemy units by player ID', () => {
      // Create units for player 1 and 2
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);
      createUnitEntity(world, 1, 0, UnitType.Scout, 1, 3);
      createUnitEntity(world, 2, 0, UnitType.Warrior, 2, 2);

      const context = buildAIContext(0, deps);

      expect(context.enemyUnits.get(1)).toHaveLength(2);
      expect(context.enemyUnits.get(2)).toHaveLength(1);
      expect(context.enemyUnits.has(0)).toBe(false); // No entry for own player
    });

    it('should not include own units in enemy map', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);

      const context = buildAIContext(0, deps);

      expect(context.enemyUnits.has(0)).toBe(false);
    });
  });

  describe('buildAIContext - enemy cities', () => {
    it('should group enemy cities by player ID', () => {
      createCityEntity(world, 0, 0, 1, 0);
      createCityEntity(world, 2, 2, 2, 1);

      const context = buildAIContext(0, deps);

      expect(context.enemyCities.get(1)).toHaveLength(1);
      expect(context.enemyCities.get(2)).toHaveLength(1);
    });

    it('should not include own cities in enemy map', () => {
      createCityEntity(world, 0, 0, 0, 0);
      createCityEntity(world, 2, 2, 1, 1);

      const context = buildAIContext(0, deps);

      expect(context.enemyCities.has(0)).toBe(false);
    });
  });

  describe('getTile helper', () => {
    it('should return tile data for valid position', () => {
      const context = buildAIContext(0, deps);

      const tile = context.getTile(0, 0);

      expect(tile).not.toBeNull();
      expect(tile!.terrain).toBe(Terrain.Grassland);
    });

    it('should return null for invalid position', () => {
      const context = buildAIContext(0, deps);

      const tile = context.getTile(100, 100);

      expect(tile).toBeNull();
    });
  });

  describe('getEnemyUnitAt helper', () => {
    it('should return enemy unit at position', () => {
      const eid = createUnitEntity(world, 1, 1, UnitType.Warrior, 1, 2);
      const context = buildAIContext(0, deps);

      const enemy = context.getEnemyUnitAt(1, 1);

      expect(enemy).not.toBeNull();
      expect(enemy!.eid).toBe(eid);
    });

    it('should return null for empty position', () => {
      const context = buildAIContext(0, deps);

      const enemy = context.getEnemyUnitAt(0, 0);

      expect(enemy).toBeNull();
    });

    it('should return null for own unit position', () => {
      createUnitEntity(world, 1, 1, UnitType.Warrior, 0, 2);
      const context = buildAIContext(0, deps);

      const enemy = context.getEnemyUnitAt(1, 1);

      expect(enemy).toBeNull();
    });
  });

  describe('getAdjacentEnemies helper', () => {
    it('should return empty array when no adjacent enemies', () => {
      const context = buildAIContext(0, deps);

      const enemies = context.getAdjacentEnemies(0, 0);

      expect(enemies).toHaveLength(0);
    });

    it('should return adjacent enemy units', () => {
      // Place enemy units adjacent to (0, 0)
      createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2); // East neighbor
      createUnitEntity(world, 0, 1, UnitType.Scout, 1, 3); // Southeast neighbor

      const context = buildAIContext(0, deps);

      const enemies = context.getAdjacentEnemies(0, 0);

      expect(enemies).toHaveLength(2);
    });

    it('should not return non-adjacent enemy units', () => {
      // Place enemy unit 2 tiles away
      createUnitEntity(world, 2, 0, UnitType.Warrior, 1, 2);

      const context = buildAIContext(0, deps);

      const enemies = context.getAdjacentEnemies(0, 0);

      expect(enemies).toHaveLength(0);
    });

    it('should not return own units as adjacent enemies', () => {
      // Place own unit adjacent
      createUnitEntity(world, 1, 0, UnitType.Warrior, 0, 2);

      const context = buildAIContext(0, deps);

      const enemies = context.getAdjacentEnemies(0, 0);

      expect(enemies).toHaveLength(0);
    });

    it('should return correct enemies around different positions', () => {
      // Create an enemy at (2, 2)
      createUnitEntity(world, 2, 2, UnitType.Warrior, 1, 2);

      const context = buildAIContext(0, deps);

      // Check from adjacent position
      const enemies = context.getAdjacentEnemies(2, 1);
      expect(enemies).toHaveLength(1);
      expect(enemies[0].position.q).toBe(2);
      expect(enemies[0].position.r).toBe(2);

      // Check from non-adjacent position
      const noEnemies = context.getAdjacentEnemies(0, 0);
      expect(noEnemies).toHaveLength(0);
    });
  });

  describe('buildAIContext - eliminated players', () => {
    it('should not include eliminated players in enemy maps', () => {
      createUnitEntity(world, 0, 0, UnitType.Warrior, 1, 2);
      playerManager.eliminatePlayer(1);

      const context = buildAIContext(0, deps);

      // Eliminated player 1 should not be in the enemy units map
      // because getActivePlayers() filters them out
      expect(context.enemyUnits.has(1)).toBe(false);
    });
  });
});
