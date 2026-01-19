/**
 * Shared utilities for CLI commands.
 */

import { Command } from 'commander';
import { json, text, OutputFormat } from './formatters';

/**
 * Get the output format from the parent command options.
 */
export function getOutputFormat(cmd: Command): OutputFormat {
  const opts = cmd.optsWithGlobals();
  return opts.output === 'json' ? 'json' : 'text';
}

/**
 * Get the state file from the parent command options.
 */
export function getStateFile(cmd: Command): string {
  const opts = cmd.optsWithGlobals();
  return opts.state || '.civctl-state.json';
}

/**
 * Handle command errors with proper formatting.
 */
export function handleError(err: unknown, format: OutputFormat): never {
  const message = err instanceof Error ? err.message : String(err);
  if (format === 'json') {
    console.log(json.formatError(message));
  } else {
    console.log(text.formatError(message));
  }
  process.exit(1);
}
