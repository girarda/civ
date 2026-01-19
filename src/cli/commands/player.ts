/**
 * Player commands for civctl.
 */

import { Command } from 'commander';
import { loadOrCreateContext } from '../context';
import { json, text } from '../formatters';
import { getOutputFormat, getStateFile, handleError } from '../utils';

export function registerPlayerCommands(program: Command): void {
  const player = program.command('player').description('Player commands');

  // player list
  player
    .command('list')
    .description('List all players with unit/city counts')
    .action(function (this: Command) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const state = ctx.engine.getState();
        const allUnits = ctx.engine.getUnits();
        const allCities = ctx.engine.getCities();

        // Count units and cities by owner in a single pass
        const unitCounts: Record<number, number> = {};
        const cityCounts: Record<number, number> = {};

        for (const u of allUnits) {
          unitCounts[u.owner] = (unitCounts[u.owner] ?? 0) + 1;
        }
        for (const c of allCities) {
          cityCounts[c.owner] = (cityCounts[c.owner] ?? 0) + 1;
        }

        const players: Array<{ id: number; unitCount: number; cityCount: number }> = [];
        for (let i = 0; i < state.playerCount; i++) {
          players.push({
            id: i,
            unitCount: unitCounts[i] ?? 0,
            cityCount: cityCounts[i] ?? 0,
          });
        }

        if (format === 'json') {
          console.log(json.formatSuccess(players));
        } else {
          console.log(text.formatPlayerList(players));
        }
      } catch (err) {
        handleError(err, format);
      }
    });
}
