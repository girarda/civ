#!/usr/bin/env node
/**
 * civctl - Command-line interface for OpenCiv
 *
 * Enables programmatic game control through the GameEngine API.
 * Designed for AI agents and automation.
 */

import { Command } from 'commander';
import { registerGameCommands } from './commands/game';
import { registerUnitCommands } from './commands/unit';
import { registerCityCommands } from './commands/city';
import { registerMapCommands } from './commands/map';
import { registerPlayerCommands } from './commands/player';

const program = new Command();

program
  .name('civctl')
  .description('Command-line interface for OpenCiv game control')
  .version('0.1.0')
  .option('-o, --output <format>', 'Output format: text or json', 'text')
  .option('-s, --state <file>', 'State file for persistence', '.civctl-state.json');

// Register command groups
registerGameCommands(program);
registerUnitCommands(program);
registerCityCommands(program);
registerMapCommands(program);
registerPlayerCommands(program);

// Parse and execute
program.parse();
