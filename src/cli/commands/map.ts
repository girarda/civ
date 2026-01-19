/**
 * Map commands for civctl.
 */

import { Command } from 'commander';
import { loadOrCreateContext, parseCoords } from '../context';
import { json, text } from '../formatters';
import { getOutputFormat, getStateFile, handleError } from '../utils';

export function registerMapCommands(program: Command): void {
  const map = program.command('map').description('Map commands');

  // map tile
  map
    .command('tile <coords>')
    .description('Get tile information at coordinates (format: q,r)')
    .action(function (this: Command, coords: string) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const { q, r } = parseCoords(coords);
        const tile = ctx.engine.getTile(q, r);

        if (!tile) {
          throw new Error(`Tile at (${q}, ${r}) not found`);
        }

        if (format === 'json') {
          console.log(json.formatSuccess(tile));
        } else {
          console.log(text.formatTile(tile));
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // map info
  map
    .command('info')
    .description('Get map dimensions and seed')
    .action(function (this: Command) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const mapData = ctx.engine.getMap();

        // Return summary without all tiles
        const mapInfo = {
          width: mapData.width,
          height: mapData.height,
          seed: mapData.seed,
          tileCount: mapData.tileCount,
        };

        if (format === 'json') {
          console.log(json.formatSuccess(mapInfo));
        } else {
          console.log(text.formatMapInfo(mapData));
        }
      } catch (err) {
        handleError(err, format);
      }
    });
}
