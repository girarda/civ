/**
 * AI Module - Public API for the AI extensibility system.
 *
 * Import this module to access AI functionality and trigger action registration.
 *
 * @example
 * ```typescript
 * import { AIController, buildAIContext, ContextBuilderDeps } from './ai';
 *
 * const controller = new AIController(engine, deps);
 * controller.executeTurn(playerId);
 * ```
 */

// Import actions to trigger auto-registration
import './actions';

// Re-export registry types and functions
export type { ActionDefinition, EntityType } from './registry/ActionDefinition';
export { ActionRegistry, getActionRegistry } from './registry/ActionRegistry';

// Re-export context types and builder
export type { AIContext } from './context/AIContext';
export { buildAIContext } from './context/ContextBuilder';
export type { ContextBuilderDeps } from './context/ContextBuilder';

// Re-export controller
export { AIController } from './controller/AIController';
export type { ScoredAction } from './controller/AIController';
