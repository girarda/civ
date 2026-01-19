import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import { createUnitEntity, createCityEntity } from '../ecs/world';
import { Pathfinder } from '../pathfinding/Pathfinder';
import { TilePosition } from '../hex/TilePosition';
import { GeneratedTile } from '../map/MapGenerator';
import { Terrain } from '../tile/Terrain';
import { UnitType } from '../unit/UnitType';
import { MoveUnitCommand, AttackCommand, FoundCityCommand, SetProductionCommand, EndTurnCommand } from './commands/types';
import { BuildableType } from '../city/Buildable';
import { GameEventType, UnitMovedEvent, CombatResolvedEvent, CityFoundedEvent, ProductionChangedEvent, TurnEndedEvent, TurnStartedEvent } from './events/types';

/**
 * Helper to create a simple tile map for testing.
 */
function createTileMap(
  tiles: { q: number; r: number; terrain: Terrain }[]
): Map<string, GeneratedTile> {
  const map = new Map<string, GeneratedTile>();
  for (const tile of tiles) {
    const position = new TilePosition(tile.q, tile.r);
    map.set(position.key(), {
      position,
      terrain: tile.terrain,
      feature: null,
      resource: null,
    });
  }
  return map;
}

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine({ seed: 12345 });
  });

  describe('initialization', () => {
    it('should create game with initial state', () => {
      const state = engine.getState();
      expect(state.turnNumber).toBe(1);
      expect(state.currentPlayer).toBe(0);
    });

    it('should generate a map on creation', () => {
      const map = engine.getMap();
      expect(map.tiles.length).toBeGreaterThan(0);
    });

    it('should start with no units', () => {
      const units = engine.getUnits();
      expect(units).toHaveLength(0);
    });

    it('should start with no cities', () => {
      const cities = engine.getCities();
      expect(cities).toHaveLength(0);
    });
  });

  describe('command execution - MoveUnit', () => {
    it('should move a unit when valid', () => {
      // Set up a simple tile map
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);
      const pathfinder = new Pathfinder(tileMap);
      engine.setPathfinder(pathfinder);

      // Create a unit
      const world = engine.getWorld();
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const command: MoveUnitCommand = {
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid,
        targetQ: 1,
        targetR: 0,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('UNIT_MOVED');

      // Verify unit moved
      const unit = engine.getUnit(unitEid);
      expect(unit?.position.q).toBe(1);
      expect(unit?.position.r).toBe(0);
    });

    it('should fail move for non-existent unit', () => {
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);
      engine.setPathfinder(new Pathfinder(tileMap));

      const command: MoveUnitCommand = {
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid: 999,
        targetQ: 1,
        targetR: 0,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unit does not exist');
    });

    it('should emit UnitMovedEvent on successful move', () => {
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);
      engine.setPathfinder(new Pathfinder(tileMap));

      const world = engine.getWorld();
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const emittedEvents: GameEventType[] = [];
      engine.on<UnitMovedEvent>('UNIT_MOVED', (event) => {
        emittedEvents.push(event);
      });

      const command: MoveUnitCommand = {
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid,
        targetQ: 1,
        targetR: 0,
      };

      engine.executeCommand(command);

      expect(emittedEvents).toHaveLength(1);
      const event = emittedEvents[0] as UnitMovedEvent;
      expect(event.unitEid).toBe(unitEid);
      expect(event.fromQ).toBe(0);
      expect(event.toQ).toBe(1);
    });
  });

  describe('command execution - Attack', () => {
    it('should execute attack when valid', () => {
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 1, 2);

      const command: AttackCommand = {
        type: 'ATTACK',
        playerId: 0,
        attackerEid,
        defenderEid,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(true);
      const combatEvent = result.events.find((e) => e.type === 'COMBAT_RESOLVED') as CombatResolvedEvent;
      expect(combatEvent).toBeDefined();
      expect(combatEvent.attackerEid).toBe(attackerEid);
      expect(combatEvent.defenderEid).toBe(defenderEid);
    });

    it('should fail attack on friendly unit', () => {
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const attackerEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      const defenderEid = createUnitEntity(world, 1, 0, UnitType.Warrior, 0, 2); // Same owner

      const command: AttackCommand = {
        type: 'ATTACK',
        playerId: 0,
        attackerEid,
        defenderEid,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot attack friendly unit');
    });
  });

  describe('command execution - FoundCity', () => {
    it('should found city when valid', () => {
      const tileMap = createTileMap([
        { q: 5, r: 5, terrain: Terrain.Grassland },
        { q: 6, r: 5, terrain: Terrain.Grassland },
        { q: 4, r: 5, terrain: Terrain.Grassland },
        { q: 5, r: 6, terrain: Terrain.Grassland },
        { q: 5, r: 4, terrain: Terrain.Grassland },
        { q: 6, r: 4, terrain: Terrain.Grassland },
        { q: 4, r: 6, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const settlerEid = createUnitEntity(world, 5, 5, UnitType.Settler, 0, 2);

      const command: FoundCityCommand = {
        type: 'FOUND_CITY',
        playerId: 0,
        settlerEid,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(true);
      const cityEvent = result.events.find((e) => e.type === 'CITY_FOUNDED') as CityFoundedEvent;
      expect(cityEvent).toBeDefined();
      expect(cityEvent.q).toBe(5);
      expect(cityEvent.r).toBe(5);
      expect(cityEvent.playerId).toBe(0);

      // Verify city was created
      const cities = engine.getCities();
      expect(cities).toHaveLength(1);
      expect(cities[0].position.q).toBe(5);
      expect(cities[0].position.r).toBe(5);
    });

    it('should fail found city on water', () => {
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Ocean },
      ]);
      engine.setTileMap(tileMap);

      const world = engine.getWorld();
      const settlerEid = createUnitEntity(world, 0, 0, UnitType.Settler, 0, 2);

      const command: FoundCityCommand = {
        type: 'FOUND_CITY',
        playerId: 0,
        settlerEid,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot found city on water');
    });
  });

  describe('command execution - SetProduction', () => {
    it('should set production when valid', () => {
      const world = engine.getWorld();
      const cityEid = createCityEntity(world, 0, 0, 0, 0);

      const command: SetProductionCommand = {
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid,
        buildableType: BuildableType.Warrior,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(true);
      const prodEvent = result.events.find((e) => e.type === 'PRODUCTION_CHANGED') as ProductionChangedEvent;
      expect(prodEvent).toBeDefined();
      expect(prodEvent.newItem).toBe(BuildableType.Warrior);
    });

    it('should fail for non-existent city', () => {
      const command: SetProductionCommand = {
        type: 'SET_PRODUCTION',
        playerId: 0,
        cityEid: 999,
        buildableType: BuildableType.Warrior,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('City does not exist');
    });
  });

  describe('command execution - EndTurn', () => {
    it('should advance turn when valid', () => {
      const command: EndTurnCommand = {
        type: 'END_TURN',
        playerId: 0,
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(true);

      const turnEndedEvent = result.events.find((e) => e.type === 'TURN_ENDED') as TurnEndedEvent;
      expect(turnEndedEvent).toBeDefined();
      expect(turnEndedEvent.turnNumber).toBe(1);

      const turnStartedEvent = result.events.find((e) => e.type === 'TURN_STARTED') as TurnStartedEvent;
      expect(turnStartedEvent).toBeDefined();
      expect(turnStartedEvent.turnNumber).toBe(2);

      // Verify state advanced
      const state = engine.getState();
      expect(state.turnNumber).toBe(2);
    });

    it('should fail for wrong player', () => {
      const command: EndTurnCommand = {
        type: 'END_TURN',
        playerId: 1, // Wrong player (current is 0)
      };

      const result = engine.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe("It is not player 1's turn");
    });
  });

  describe('event bus', () => {
    it('should allow subscribing to all events', () => {
      const tileMap = createTileMap([
        { q: 0, r: 0, terrain: Terrain.Grassland },
        { q: 1, r: 0, terrain: Terrain.Grassland },
      ]);
      engine.setTileMap(tileMap);
      engine.setPathfinder(new Pathfinder(tileMap));

      const world = engine.getWorld();
      const unitEid = createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);

      const allEvents: GameEventType[] = [];
      engine.onAny((event) => {
        allEvents.push(event);
      });

      // Move unit
      engine.executeCommand({
        type: 'MOVE_UNIT',
        playerId: 0,
        unitEid,
        targetQ: 1,
        targetR: 0,
      });

      expect(allEvents).toHaveLength(1);
      expect(allEvents[0].type).toBe('UNIT_MOVED');
    });

    it('should allow unsubscribing from events', () => {
      const events: GameEventType[] = [];
      const unsubscribe = engine.onAny((event) => {
        events.push(event);
      });

      // Unsubscribe
      unsubscribe();

      // End turn
      engine.executeCommand({
        type: 'END_TURN',
        playerId: 0,
      });

      // Should not receive event
      expect(events).toHaveLength(0);
    });
  });

  describe('state queries', () => {
    it('should query units by player', () => {
      const world = engine.getWorld();
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 1, 0, UnitType.Warrior, 0, 2);
      createUnitEntity(world, 2, 0, UnitType.Warrior, 1, 2);

      const player0Units = engine.getUnits(0);
      expect(player0Units).toHaveLength(2);

      const player1Units = engine.getUnits(1);
      expect(player1Units).toHaveLength(1);
    });

    it('should query single unit', () => {
      const world = engine.getWorld();
      const unitEid = createUnitEntity(world, 3, 4, UnitType.Scout, 0, 3);

      const unit = engine.getUnit(unitEid);

      expect(unit).not.toBeNull();
      expect(unit?.eid).toBe(unitEid);
      expect(unit?.position.q).toBe(3);
      expect(unit?.position.r).toBe(4);
      expect(unit?.type).toBe(UnitType.Scout);
    });

    it('should return null for non-existent unit', () => {
      const unit = engine.getUnit(999);
      expect(unit).toBeNull();
    });

    it('should get complete snapshot', () => {
      const world = engine.getWorld();
      createUnitEntity(world, 0, 0, UnitType.Warrior, 0, 2);
      createCityEntity(world, 1, 1, 0, 0);

      const snapshot = engine.getCompleteSnapshot();

      expect(snapshot.gameState.turnNumber).toBe(1);
      expect(snapshot.units).toHaveLength(1);
      expect(snapshot.cities).toHaveLength(1);
      expect(snapshot.map.tiles.length).toBeGreaterThan(0);
      expect(snapshot.timestamp).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset game state', () => {
      // End a turn to advance state
      engine.executeCommand({ type: 'END_TURN', playerId: 0 });
      expect(engine.getState().turnNumber).toBe(2);

      // Reset
      engine.reset();

      expect(engine.getState().turnNumber).toBe(1);
      expect(engine.getUnits()).toHaveLength(0);
      expect(engine.getCities()).toHaveLength(0);
    });

    it('should regenerate map with new seed', () => {
      const originalMap = engine.getMap();
      const originalSeed = originalMap.seed;

      engine.reset(99999);

      const newMap = engine.getMap();
      expect(newMap.seed).toBe(99999);
      expect(newMap.seed).not.toBe(originalSeed);
    });
  });
});
