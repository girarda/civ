/**
 * Result types for command validation and execution.
 */

import { GameEventType } from '../events/types';

/** Result of validating a command */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Result of executing a command */
export interface CommandResult {
  success: boolean;
  error?: string;
  events: GameEventType[];
}

/** Helper to create a successful validation result */
export function validationSuccess(): ValidationResult {
  return { valid: true };
}

/** Helper to create a failed validation result */
export function validationError(error: string): ValidationResult {
  return { valid: false, error };
}

/** Helper to create a successful command result */
export function commandSuccess(events: GameEventType[]): CommandResult {
  return { success: true, events };
}

/** Helper to create a failed command result */
export function commandError(error: string): CommandResult {
  return { success: false, error, events: [] };
}
