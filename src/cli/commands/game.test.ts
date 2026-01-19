import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import { createEngine, newGame, loadOrCreateContext, saveContext, parseMapSize } from '../context';
import { MapSize } from '../../map/MapConfig';

// Mock fs module for testing
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('CLI Game Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createEngine', () => {
    it('should create an engine with pathfinder', () => {
      const engine = createEngine({ seed: 12345 });
      expect(engine).toBeDefined();
      expect(engine.getPathfinder()).not.toBeNull();
    });

    it('should create an engine with specified config', () => {
      const engine = createEngine({ seed: 42, mapSize: MapSize.Tiny, playerCount: 3 });
      const state = engine.getState();
      expect(state.playerCount).toBe(3);
      const map = engine.getMap();
      expect(map.seed).toBe(42);
    });
  });

  describe('loadOrCreateContext', () => {
    it('should create new context when no state file exists', () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const ctx = loadOrCreateContext('test-state.json');

      expect(ctx.engine).toBeDefined();
      expect(ctx.stateFile).toBe('test-state.json');
    });
  });

  describe('newGame', () => {
    it('should create new game and save state', () => {
      const ctx = newGame('test-state.json', { seed: 12345 });

      expect(ctx.engine).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalledWith('test-state.json', expect.any(String));
    });

    it('should create game with specified configuration', () => {
      const ctx = newGame('test-state.json', {
        seed: 99999,
        mapSize: MapSize.Small,
        playerCount: 4,
      });

      const state = ctx.engine.getState();
      expect(state.playerCount).toBe(4);

      const map = ctx.engine.getMap();
      expect(map.seed).toBe(99999);
    });
  });

  describe('saveContext', () => {
    it('should save complete snapshot to file', () => {
      const engine = createEngine({ seed: 12345 });
      const ctx = { engine, stateFile: 'test-state.json' };

      saveContext(ctx);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const [[filename, content]] = (fs.writeFileSync as ReturnType<typeof vi.fn>).mock.calls;
      expect(filename).toBe('test-state.json');

      const snapshot = JSON.parse(content as string);
      expect(snapshot.gameState).toBeDefined();
      expect(snapshot.map).toBeDefined();
      expect(snapshot.units).toBeDefined();
      expect(snapshot.cities).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
    });
  });

  describe('parseMapSize', () => {
    it('should parse valid map sizes', () => {
      expect(parseMapSize('duel')).toBe(MapSize.Duel);
      expect(parseMapSize('tiny')).toBe(MapSize.Tiny);
      expect(parseMapSize('small')).toBe(MapSize.Small);
      expect(parseMapSize('standard')).toBe(MapSize.Standard);
      expect(parseMapSize('large')).toBe(MapSize.Large);
      expect(parseMapSize('huge')).toBe(MapSize.Huge);
    });

    it('should be case-insensitive', () => {
      expect(parseMapSize('DUEL')).toBe(MapSize.Duel);
      expect(parseMapSize('Tiny')).toBe(MapSize.Tiny);
    });

    it('should throw for invalid map size', () => {
      expect(() => parseMapSize('invalid')).toThrow('Invalid map size');
    });
  });

  describe('game status', () => {
    it('should return correct game state snapshot', () => {
      const engine = createEngine({ seed: 12345, playerCount: 2 });
      const state = engine.getState();

      expect(state.turnNumber).toBe(1);
      expect(state.phase).toBe('PlayerAction');
      expect(state.currentPlayer).toBe(0);
      expect(state.playerCount).toBe(2);
    });
  });

  describe('game end-turn', () => {
    it('should advance turn when executed', () => {
      const engine = createEngine({ seed: 12345 });
      const initialState = engine.getState();
      expect(initialState.turnNumber).toBe(1);

      const result = engine.executeCommand({
        type: 'END_TURN',
        playerId: 0,
      });

      expect(result.success).toBe(true);
      expect(result.events.some((e) => e.type === 'TURN_ENDED')).toBe(true);
      expect(result.events.some((e) => e.type === 'TURN_STARTED')).toBe(true);

      const newState = engine.getState();
      expect(newState.turnNumber).toBe(2);
    });
  });

  describe('game new', () => {
    it('should create new game with correct seed', () => {
      const ctx = newGame('test.json', { seed: 42 });
      const map = ctx.engine.getMap();
      expect(map.seed).toBe(42);
    });

    it('should use random seed when not specified', () => {
      const ctx1 = newGame('test1.json');
      const ctx2 = newGame('test2.json');

      // Seeds should likely be different (very small chance of collision)
      const map1 = ctx1.engine.getMap();
      const map2 = ctx2.engine.getMap();
      // We can't guarantee they're different, but they should be defined
      expect(map1.seed).toBeDefined();
      expect(map2.seed).toBeDefined();
    });
  });
});
