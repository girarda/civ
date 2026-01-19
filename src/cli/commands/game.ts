/**
 * Game commands for civctl.
 */

import { Command } from 'commander';
import { loadOrCreateContext, saveContext, newGame, parseMapSize } from '../context';
import { json, text } from '../formatters';
import { getOutputFormat, getStateFile, handleError } from '../utils';

export function registerGameCommands(program: Command): void {
  const game = program.command('game').description('Game state commands');

  // game status
  game
    .command('status')
    .description('Show current game state')
    .action(function (this: Command) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const state = ctx.engine.getState();

        if (format === 'json') {
          console.log(json.formatSuccess(state));
        } else {
          console.log(text.formatGameState(state));
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // game end-turn
  game
    .command('end-turn')
    .description("End current player's turn")
    .action(function (this: Command) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const currentPlayer = ctx.engine.getState().currentPlayer;

        const result = ctx.engine.executeCommand({
          type: 'END_TURN',
          playerId: currentPlayer,
        });

        if (!result.success) {
          throw new Error(result.error ?? 'End turn failed');
        }

        saveContext(ctx);
        const newState = ctx.engine.getState();

        if (format === 'json') {
          console.log(json.formatSuccess(newState, result.events));
        } else {
          console.log(
            text.formatCommandResult(`Turn ended. Now turn ${newState.turnNumber}.`, result.events)
          );
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // game new
  game
    .command('new')
    .description('Start a new game')
    .option('--seed <seed>', 'Random seed for map generation')
    .option('--size <size>', 'Map size: duel, tiny, small, standard, large, huge', 'duel')
    .option('--players <count>', 'Number of players', '2')
    .action(function (this: Command, options: { seed?: string; size?: string; players?: string }) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const seed = options.seed ? parseInt(options.seed, 10) : undefined;
        const mapSize = parseMapSize(options.size || 'duel');
        const playerCount = parseInt(options.players || '2', 10);

        const ctx = newGame(stateFile, { seed, mapSize, playerCount });
        const state = ctx.engine.getState();
        const mapInfo = ctx.engine.getMap();

        if (format === 'json') {
          console.log(
            json.formatSuccess({
              state,
              map: { width: mapInfo.width, height: mapInfo.height, seed: mapInfo.seed },
            })
          );
        } else {
          console.log(`New game created with seed ${mapInfo.seed}.`);
          console.log(text.formatGameState(state));
        }
      } catch (err) {
        handleError(err, format);
      }
    });
}
