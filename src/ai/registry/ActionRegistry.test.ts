import { describe, it, expect, beforeEach } from 'vitest';
import { ActionRegistry, getActionRegistry } from './ActionRegistry';
import { ActionDefinition, AIContext, EntityType } from './ActionDefinition';
import { GameCommand, COMMAND_TYPES } from '../../engine/commands/types';

// Mock action definitions for testing
function createMockAction(
  id: string,
  commandType: string,
  applicableTo: EntityType[]
): ActionDefinition<GameCommand> {
  return {
    id,
    commandType: commandType as typeof COMMAND_TYPES[keyof typeof COMMAND_TYPES],
    description: `Mock ${id} action`,
    applicableTo,
    generateCandidates: (_context: AIContext, _entityEid: number) => [],
    scoreCandidate: (_context: AIContext, _command: GameCommand) => 50,
  };
}

describe('ActionRegistry', () => {
  beforeEach(() => {
    // Reset singleton before each test
    ActionRegistry.resetInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ActionRegistry.getInstance();
      const instance2 = ActionRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return a new instance after reset', () => {
      const instance1 = ActionRegistry.getInstance();
      ActionRegistry.resetInstance();
      const instance2 = ActionRegistry.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getActionRegistry', () => {
    it('should return the singleton instance', () => {
      const registry1 = getActionRegistry();
      const registry2 = ActionRegistry.getInstance();
      expect(registry1).toBe(registry2);
    });
  });

  describe('register', () => {
    it('should register an action', () => {
      const registry = getActionRegistry();
      const action = createMockAction('TEST_ACTION', 'MOVE_UNIT', ['unit']);

      registry.register(action);

      expect(registry.hasAction('TEST_ACTION')).toBe(true);
    });

    it('should throw error on duplicate registration', () => {
      const registry = getActionRegistry();
      const action1 = createMockAction('DUPLICATE', 'MOVE_UNIT', ['unit']);
      const action2 = createMockAction('DUPLICATE', 'ATTACK', ['unit']);

      registry.register(action1);

      expect(() => registry.register(action2)).toThrow(
        "Action with ID 'DUPLICATE' is already registered"
      );
    });

    it('should provide helpful error message on duplicate', () => {
      const registry = getActionRegistry();
      const action = createMockAction('MY_ACTION', 'MOVE_UNIT', ['unit']);

      registry.register(action);

      try {
        registry.register(action);
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('MY_ACTION');
        expect((e as Error).message).toContain('unique ID');
      }
    });
  });

  describe('getAction', () => {
    it('should return registered action by ID', () => {
      const registry = getActionRegistry();
      const action = createMockAction('GET_TEST', 'MOVE_UNIT', ['unit']);

      registry.register(action);

      const retrieved = registry.getAction('GET_TEST');
      expect(retrieved).toBe(action);
    });

    it('should return undefined for unknown ID', () => {
      const registry = getActionRegistry();

      const result = registry.getAction('UNKNOWN_ACTION');

      expect(result).toBeUndefined();
    });
  });

  describe('getActionsFor', () => {
    it('should return actions applicable to unit entity type', () => {
      const registry = getActionRegistry();
      const unitAction = createMockAction('UNIT_ACTION', 'MOVE_UNIT', ['unit']);
      const cityAction = createMockAction('CITY_ACTION', 'SET_PRODUCTION', ['city']);
      const playerAction = createMockAction('PLAYER_ACTION', 'END_TURN', ['player']);

      registry.register(unitAction);
      registry.register(cityAction);
      registry.register(playerAction);

      const unitActions = registry.getActionsFor('unit');

      expect(unitActions).toHaveLength(1);
      expect(unitActions[0].id).toBe('UNIT_ACTION');
    });

    it('should return actions applicable to city entity type', () => {
      const registry = getActionRegistry();
      const unitAction = createMockAction('UNIT_ACTION', 'MOVE_UNIT', ['unit']);
      const cityAction = createMockAction('CITY_ACTION', 'SET_PRODUCTION', ['city']);

      registry.register(unitAction);
      registry.register(cityAction);

      const cityActions = registry.getActionsFor('city');

      expect(cityActions).toHaveLength(1);
      expect(cityActions[0].id).toBe('CITY_ACTION');
    });

    it('should return actions applicable to player entity type', () => {
      const registry = getActionRegistry();
      const unitAction = createMockAction('UNIT_ACTION', 'MOVE_UNIT', ['unit']);
      const playerAction = createMockAction('PLAYER_ACTION', 'END_TURN', ['player']);

      registry.register(unitAction);
      registry.register(playerAction);

      const playerActions = registry.getActionsFor('player');

      expect(playerActions).toHaveLength(1);
      expect(playerActions[0].id).toBe('PLAYER_ACTION');
    });

    it('should return actions that apply to multiple entity types', () => {
      const registry = getActionRegistry();
      const multiAction = createMockAction('MULTI_ACTION', 'ATTACK', ['unit', 'city']);

      registry.register(multiAction);

      const unitActions = registry.getActionsFor('unit');
      const cityActions = registry.getActionsFor('city');

      expect(unitActions).toContain(multiAction);
      expect(cityActions).toContain(multiAction);
    });

    it('should return empty array when no actions match', () => {
      const registry = getActionRegistry();
      const unitAction = createMockAction('UNIT_ONLY', 'MOVE_UNIT', ['unit']);

      registry.register(unitAction);

      const cityActions = registry.getActionsFor('city');

      expect(cityActions).toHaveLength(0);
    });
  });

  describe('getAllActions', () => {
    it('should return all registered actions', () => {
      const registry = getActionRegistry();
      const action1 = createMockAction('ACTION_1', 'MOVE_UNIT', ['unit']);
      const action2 = createMockAction('ACTION_2', 'ATTACK', ['unit']);
      const action3 = createMockAction('ACTION_3', 'END_TURN', ['player']);

      registry.register(action1);
      registry.register(action2);
      registry.register(action3);

      const allActions = registry.getAllActions();

      expect(allActions).toHaveLength(3);
      expect(allActions).toContain(action1);
      expect(allActions).toContain(action2);
      expect(allActions).toContain(action3);
    });

    it('should return empty array when no actions registered', () => {
      const registry = getActionRegistry();

      const allActions = registry.getAllActions();

      expect(allActions).toHaveLength(0);
    });
  });

  describe('hasAction', () => {
    it('should return true for registered action', () => {
      const registry = getActionRegistry();
      const action = createMockAction('EXISTS', 'MOVE_UNIT', ['unit']);

      registry.register(action);

      expect(registry.hasAction('EXISTS')).toBe(true);
    });

    it('should return false for unknown action', () => {
      const registry = getActionRegistry();

      expect(registry.hasAction('DOES_NOT_EXIST')).toBe(false);
    });
  });

  describe('getActionCount', () => {
    it('should return 0 when empty', () => {
      const registry = getActionRegistry();

      expect(registry.getActionCount()).toBe(0);
    });

    it('should return correct count after registrations', () => {
      const registry = getActionRegistry();
      const action1 = createMockAction('COUNT_1', 'MOVE_UNIT', ['unit']);
      const action2 = createMockAction('COUNT_2', 'ATTACK', ['unit']);

      registry.register(action1);
      expect(registry.getActionCount()).toBe(1);

      registry.register(action2);
      expect(registry.getActionCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all registered actions', () => {
      const registry = getActionRegistry();
      const action1 = createMockAction('CLEAR_1', 'MOVE_UNIT', ['unit']);
      const action2 = createMockAction('CLEAR_2', 'ATTACK', ['unit']);

      registry.register(action1);
      registry.register(action2);
      expect(registry.getActionCount()).toBe(2);

      registry.clear();

      expect(registry.getActionCount()).toBe(0);
      expect(registry.hasAction('CLEAR_1')).toBe(false);
      expect(registry.hasAction('CLEAR_2')).toBe(false);
    });
  });

  describe('resetInstance', () => {
    it('should clear all actions when singleton is reset', () => {
      const registry = getActionRegistry();
      const action = createMockAction('RESET_TEST', 'MOVE_UNIT', ['unit']);

      registry.register(action);
      expect(registry.getActionCount()).toBe(1);

      ActionRegistry.resetInstance();

      const newRegistry = getActionRegistry();
      expect(newRegistry.getActionCount()).toBe(0);
      expect(newRegistry.hasAction('RESET_TEST')).toBe(false);
    });
  });
});
