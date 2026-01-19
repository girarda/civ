/**
 * Tests for action auto-registration.
 * Verifies that importing the AI module registers all actions.
 */

import { describe, it, expect } from 'vitest';
import { ActionRegistry } from '../registry/ActionRegistry';
import { COMMAND_TYPES } from '../../engine/commands/types';

// Import to trigger action registration
import '../index';

describe('Action auto-registration', () => {
  it('registers all 5 actions when importing the AI module', () => {
    const registry = ActionRegistry.getInstance();
    expect(registry.getActionCount()).toBe(5);
  });

  it('registers MOVE_UNIT action', () => {
    const registry = ActionRegistry.getInstance();
    expect(registry.hasAction('MOVE_UNIT')).toBe(true);

    const action = registry.getAction('MOVE_UNIT');
    expect(action).toBeDefined();
    expect(action!.commandType).toBe(COMMAND_TYPES.MOVE_UNIT);
    expect(action!.applicableTo).toContain('unit');
  });

  it('registers ATTACK action', () => {
    const registry = ActionRegistry.getInstance();
    expect(registry.hasAction('ATTACK')).toBe(true);

    const action = registry.getAction('ATTACK');
    expect(action).toBeDefined();
    expect(action!.commandType).toBe(COMMAND_TYPES.ATTACK);
    expect(action!.applicableTo).toContain('unit');
  });

  it('registers FOUND_CITY action', () => {
    const registry = ActionRegistry.getInstance();
    expect(registry.hasAction('FOUND_CITY')).toBe(true);

    const action = registry.getAction('FOUND_CITY');
    expect(action).toBeDefined();
    expect(action!.commandType).toBe(COMMAND_TYPES.FOUND_CITY);
    expect(action!.applicableTo).toContain('unit');
  });

  it('registers SET_PRODUCTION action', () => {
    const registry = ActionRegistry.getInstance();
    expect(registry.hasAction('SET_PRODUCTION')).toBe(true);

    const action = registry.getAction('SET_PRODUCTION');
    expect(action).toBeDefined();
    expect(action!.commandType).toBe(COMMAND_TYPES.SET_PRODUCTION);
    expect(action!.applicableTo).toContain('city');
  });

  it('registers END_TURN action', () => {
    const registry = ActionRegistry.getInstance();
    expect(registry.hasAction('END_TURN')).toBe(true);

    const action = registry.getAction('END_TURN');
    expect(action).toBeDefined();
    expect(action!.commandType).toBe(COMMAND_TYPES.END_TURN);
    expect(action!.applicableTo).toContain('player');
  });

  it('has correct entity type mappings', () => {
    const registry = ActionRegistry.getInstance();

    // Unit actions
    const unitActions = registry.getActionsFor('unit');
    expect(unitActions.length).toBe(3); // MOVE_UNIT, ATTACK, FOUND_CITY
    const unitActionIds = unitActions.map((a) => a.id).sort();
    expect(unitActionIds).toEqual(['ATTACK', 'FOUND_CITY', 'MOVE_UNIT']);

    // City actions
    const cityActions = registry.getActionsFor('city');
    expect(cityActions.length).toBe(1); // SET_PRODUCTION
    expect(cityActions[0].id).toBe('SET_PRODUCTION');

    // Player actions
    const playerActions = registry.getActionsFor('player');
    expect(playerActions.length).toBe(1); // END_TURN
    expect(playerActions[0].id).toBe('END_TURN');
  });

  it('all action IDs match COMMAND_TYPES values', () => {
    const registry = ActionRegistry.getInstance();
    const allActions = registry.getAllActions();

    for (const action of allActions) {
      // Verify action ID is a valid COMMAND_TYPES key
      expect(Object.values(COMMAND_TYPES)).toContain(action.id);
      // Verify commandType matches the ID
      expect(action.commandType).toBe(action.id);
    }
  });
});
