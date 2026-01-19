/**
 * JSON output formatting for CLI commands.
 */

export interface CLIResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  events?: unknown[];
}

export function formatSuccess<T>(data: T, events?: unknown[]): string {
  const result: CLIResult<T> = { success: true, data };
  if (events && events.length > 0) {
    result.events = events;
  }
  return JSON.stringify(result, null, 2);
}

export function formatError(error: string): string {
  const result: CLIResult = { success: false, error };
  return JSON.stringify(result, null, 2);
}

export function formatRaw<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}
