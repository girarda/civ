/**
 * City commands for civctl.
 */

import { Command } from 'commander';
import { loadOrCreateContext, saveContext } from '../context';
import { json, text } from '../formatters';
import { getOutputFormat, getStateFile, handleError } from '../utils';
import { BuildableType } from '../../city/Buildable';

/**
 * Parse production type from string.
 */
function parseProductionType(typeStr: string): BuildableType {
  const typeMap: Record<string, BuildableType> = {
    none: BuildableType.None,
    warrior: BuildableType.Warrior,
    scout: BuildableType.Scout,
    settler: BuildableType.Settler,
  };
  const result = typeMap[typeStr.toLowerCase()];
  if (result === undefined) {
    throw new Error(
      `Invalid production type: ${typeStr}. Valid types: none, warrior, scout, settler`
    );
  }
  return result;
}

export function registerCityCommands(program: Command): void {
  const city = program.command('city').description('City commands');

  // city list
  city
    .command('list')
    .description('List all cities')
    .option('-p, --player <id>', 'Filter by player ID')
    .action(function (this: Command, options: { player?: string }) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const playerId = options.player !== undefined ? parseInt(options.player, 10) : undefined;
        const cities = ctx.engine.getCities(playerId);

        if (format === 'json') {
          console.log(json.formatSuccess(cities));
        } else {
          console.log(text.formatCityList(cities));
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // city show
  city
    .command('show <eid>')
    .description('Show details of a specific city')
    .action(function (this: Command, eid: string) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const cityEid = parseInt(eid, 10);
        const cityData = ctx.engine.getCity(cityEid);

        if (!cityData) {
          throw new Error(`City ${cityEid} not found`);
        }

        if (format === 'json') {
          console.log(json.formatSuccess(cityData));
        } else {
          console.log(text.formatCity(cityData));
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // city production
  city
    .command('production <eid> <type>')
    .description('Set city production (warrior, scout, settler, none)')
    .action(function (this: Command, eid: string, type: string) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const cityEid = parseInt(eid, 10);
        const buildableType = parseProductionType(type);

        const cityData = ctx.engine.getCity(cityEid);
        if (!cityData) {
          throw new Error(`City ${cityEid} not found`);
        }

        const result = ctx.engine.executeCommand({
          type: 'SET_PRODUCTION',
          playerId: cityData.owner,
          cityEid,
          buildableType,
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Set production failed');
        }

        saveContext(ctx);
        const updatedCity = ctx.engine.getCity(cityEid);

        if (format === 'json') {
          console.log(json.formatSuccess(updatedCity, result.events));
        } else {
          const prodName = updatedCity?.production.currentItemName ?? type;
          console.log(
            text.formatCommandResult(`City ${cityData.name} now producing ${prodName}.`, result.events)
          );
        }
      } catch (err) {
        handleError(err, format);
      }
    });
}
