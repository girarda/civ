/**
 * Singleton registry for AI action definitions.
 * Actions register themselves on import for automatic discovery.
 */

import { ActionDefinition, EntityType } from './ActionDefinition';
import { GameCommand } from '../../engine/commands/types';

/**
 * Singleton registry that manages all action definitions.
 *
 * Actions self-register by calling register() when their modules are imported.
 * The AI controller queries this registry to discover available actions.
 */
export class ActionRegistry {
  private static instance: ActionRegistry | null = null;

  /** Map of action ID to action definition */
  private actions: Map<string, ActionDefinition<GameCommand>> = new Map();

  /** Private constructor to enforce singleton pattern */
  private constructor() {}

  /**
   * Get the singleton instance.
   */
  static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  /**
   * Reset the singleton instance.
   * Used for testing to ensure clean state between tests.
   */
  static resetInstance(): void {
    ActionRegistry.instance = null;
  }

  /**
   * Register an action definition.
   * @throws Error if an action with the same ID is already registered
   */
  register<TCommand extends GameCommand>(definition: ActionDefinition<TCommand>): void {
    if (this.actions.has(definition.id)) {
      throw new Error(
        `Action with ID '${definition.id}' is already registered. ` +
          `Each action must have a unique ID.`
      );
    }
    // Cast is safe because ActionDefinition<TCommand> extends ActionDefinition<GameCommand>
    this.actions.set(definition.id, definition as ActionDefinition<GameCommand>);
  }

  /**
   * Get an action by ID.
   * @returns The action definition or undefined if not found
   */
  getAction(id: string): ActionDefinition<GameCommand> | undefined {
    return this.actions.get(id);
  }

  /**
   * Get all actions applicable to a specific entity type.
   * @param entityType - The entity type to filter by
   * @returns Array of matching action definitions
   */
  getActionsFor(entityType: EntityType): ActionDefinition<GameCommand>[] {
    const matching: ActionDefinition<GameCommand>[] = [];
    for (const action of this.actions.values()) {
      if (action.applicableTo.includes(entityType)) {
        matching.push(action);
      }
    }
    return matching;
  }

  /**
   * Get all registered actions.
   */
  getAllActions(): ActionDefinition<GameCommand>[] {
    return Array.from(this.actions.values());
  }

  /**
   * Check if an action is registered.
   */
  hasAction(id: string): boolean {
    return this.actions.has(id);
  }

  /**
   * Get the number of registered actions.
   */
  getActionCount(): number {
    return this.actions.size;
  }

  /**
   * Clear all registered actions.
   * Used for testing.
   */
  clear(): void {
    this.actions.clear();
  }
}

/**
 * Convenience function to get the action registry singleton.
 */
export function getActionRegistry(): ActionRegistry {
  return ActionRegistry.getInstance();
}
