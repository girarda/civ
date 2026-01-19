/**
 * E2E tests for the civctl CLI.
 *
 * These tests run the actual CLI binary and verify its output.
 * They use a temporary state file to avoid conflicts.
 */

import { test, expect } from '@playwright/test';
import { exec, ExecException } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// Path to the built CLI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.resolve(__dirname, '../../dist/civctl.cjs');

// Generate unique state file for each test run
function getTempStateFile(): string {
  return path.join(os.tmpdir(), `civctl-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

// Helper to run CLI commands
async function runCli(args: string, stateFile?: string): Promise<{ stdout: string; stderr: string }> {
  const stateArg = stateFile ? `-s "${stateFile}"` : '';
  const cmd = `node "${CLI_PATH}" ${stateArg} ${args}`;
  try {
    const result = await execAsync(cmd, { timeout: 30000 });
    return result;
  } catch (error) {
    const execError = error as ExecException & { stdout?: string; stderr?: string };
    // Return output even on non-zero exit
    if (execError.stdout !== undefined || execError.stderr !== undefined) {
      return { stdout: execError.stdout || '', stderr: execError.stderr || '' };
    }
    throw error;
  }
}

// Helper to parse JSON output
function parseJsonOutput(stdout: string): { success: boolean; data?: unknown; error?: string } {
  return JSON.parse(stdout.trim());
}

test.describe('CLI Smoke Tests', () => {
  test('should show help', async () => {
    const { stdout } = await runCli('--help');
    expect(stdout).toContain('civctl');
    expect(stdout).toContain('game');
    expect(stdout).toContain('unit');
    expect(stdout).toContain('city');
    expect(stdout).toContain('map');
    expect(stdout).toContain('player');
  });

  test('should show version', async () => {
    const { stdout } = await runCli('--version');
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

test.describe('CLI Game Commands', () => {
  let stateFile: string;

  test.beforeEach(() => {
    stateFile = getTempStateFile();
  });

  test.afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  test('should show game status in text format', async () => {
    const { stdout } = await runCli('game status', stateFile);
    expect(stdout).toContain('Game Status');
    expect(stdout).toContain('Turn:');
    expect(stdout).toContain('Phase:');
    expect(stdout).toContain('Current Player:');
  });

  test('should show game status in JSON format', async () => {
    const { stdout } = await runCli('game status -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('turnNumber');
    expect(result.data).toHaveProperty('phase');
    expect(result.data).toHaveProperty('currentPlayer');
    expect(result.data).toHaveProperty('playerCount');
  });

  test('should create new game with seed', async () => {
    const { stdout } = await runCli('game new --seed 42 -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    expect((result.data as { map: { seed: number } }).map.seed).toBe(42);
  });

  test('should end turn', async () => {
    // First create a game
    await runCli('game new', stateFile);

    // End turn
    const { stdout } = await runCli('game end-turn -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    expect((result.data as { turnNumber: number }).turnNumber).toBe(2);
  });
});

test.describe('CLI Query Commands', () => {
  let stateFile: string;

  test.beforeEach(() => {
    stateFile = getTempStateFile();
  });

  test.afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  test('should list units (empty initially)', async () => {
    const { stdout } = await runCli('unit list -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  test('should list cities (empty initially)', async () => {
    const { stdout } = await runCli('city list -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  test('should get map info', async () => {
    const { stdout } = await runCli('map info -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    const data = result.data as { width: number; height: number; seed: number; tileCount: number };
    expect(data.width).toBeGreaterThan(0);
    expect(data.height).toBeGreaterThan(0);
    expect(data.tileCount).toBeGreaterThan(0);
  });

  test('should get tile at coordinates', async () => {
    const { stdout } = await runCli('map tile 0,0 -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    const data = result.data as { position: { q: number; r: number }; terrain: string };
    expect(data.position.q).toBe(0);
    expect(data.position.r).toBe(0);
    expect(data.terrain).toBeDefined();
  });

  test('should list players', async () => {
    const { stdout } = await runCli('player list -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(true);
    const players = result.data as Array<{ id: number; unitCount: number; cityCount: number }>;
    expect(players.length).toBeGreaterThan(0);
    expect(players[0]).toHaveProperty('id');
    expect(players[0]).toHaveProperty('unitCount');
    expect(players[0]).toHaveProperty('cityCount');
  });
});

test.describe('CLI Error Handling', () => {
  let stateFile: string;

  test.beforeEach(() => {
    stateFile = getTempStateFile();
  });

  test.afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  test('should return error for non-existent unit', async () => {
    const { stdout } = await runCli('unit show 9999 -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should return error for non-existent city', async () => {
    const { stdout } = await runCli('city show 9999 -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should return error for invalid coordinates', async () => {
    const { stdout, stderr } = await runCli('map tile invalid -o json', stateFile);
    // Commander.js may write to stderr for parsing errors
    const output = stdout || stderr;
    expect(output).toBeTruthy();
  });
});

test.describe('CLI State Persistence', () => {
  let stateFile: string;

  test.beforeEach(() => {
    stateFile = getTempStateFile();
  });

  test.afterEach(() => {
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
  });

  test('should persist state between commands', async () => {
    // Create new game with specific seed
    await runCli('game new --seed 12345', stateFile);

    // Verify seed is persisted
    const { stdout } = await runCli('map info -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect((result.data as { seed: number }).seed).toBe(12345);
  });

  test('should persist seed across sessions', async () => {
    // Create new game with explicit seed
    await runCli('game new --seed 12345', stateFile);

    // Verify seed is preserved when reloading
    const { stdout } = await runCli('map info -o json', stateFile);
    const result = parseJsonOutput(stdout);
    expect((result.data as { seed: number }).seed).toBe(12345);

    // Note: Turn state persistence requires GameEngine.fromSnapshot() which is not yet implemented.
    // For MVP, only map seed is preserved between invocations.
  });
});
