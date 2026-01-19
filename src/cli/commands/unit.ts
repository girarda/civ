/**
 * Unit commands for civctl.
 */

import { Command } from 'commander';
import { loadOrCreateContext, saveContext, parseCoords } from '../context';
import { json, text } from '../formatters';
import { getOutputFormat, getStateFile, handleError } from '../utils';

export function registerUnitCommands(program: Command): void {
  const unit = program.command('unit').description('Unit commands');

  // unit list
  unit
    .command('list')
    .description('List all units')
    .option('-p, --player <id>', 'Filter by player ID')
    .action(function (this: Command, options: { player?: string }) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const playerId = options.player !== undefined ? parseInt(options.player, 10) : undefined;
        const units = ctx.engine.getUnits(playerId);

        if (format === 'json') {
          console.log(json.formatSuccess(units));
        } else {
          console.log(text.formatUnitList(units));
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // unit show
  unit
    .command('show <eid>')
    .description('Show details of a specific unit')
    .action(function (this: Command, eid: string) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const unitEid = parseInt(eid, 10);
        const unitData = ctx.engine.getUnit(unitEid);

        if (!unitData) {
          throw new Error(`Unit ${unitEid} not found`);
        }

        if (format === 'json') {
          console.log(json.formatSuccess(unitData));
        } else {
          console.log(text.formatUnit(unitData));
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // unit move
  unit
    .command('move <eid>')
    .description('Move unit to target hex')
    .requiredOption('--to <q,r>', 'Target coordinates')
    .action(function (this: Command, eid: string, options: { to: string }) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const unitEid = parseInt(eid, 10);
        const target = parseCoords(options.to);

        const unitData = ctx.engine.getUnit(unitEid);
        if (!unitData) {
          throw new Error(`Unit ${unitEid} not found`);
        }

        const result = ctx.engine.executeCommand({
          type: 'MOVE_UNIT',
          playerId: unitData.owner,
          unitEid,
          targetQ: target.q,
          targetR: target.r,
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Move failed');
        }

        saveContext(ctx);
        const updatedUnit = ctx.engine.getUnit(unitEid);

        if (format === 'json') {
          console.log(json.formatSuccess(updatedUnit, result.events));
        } else {
          console.log(
            text.formatCommandResult(
              `Unit ${unitEid} moved to (${target.q}, ${target.r}).`,
              result.events
            )
          );
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // unit attack
  unit
    .command('attack <eid>')
    .description('Attack enemy unit')
    .requiredOption('--target <defenderEid>', 'Target unit entity ID')
    .action(function (this: Command, eid: string, options: { target: string }) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const attackerEid = parseInt(eid, 10);
        const defenderEid = parseInt(options.target, 10);

        const attackerData = ctx.engine.getUnit(attackerEid);
        if (!attackerData) {
          throw new Error(`Attacker unit ${attackerEid} not found`);
        }

        const result = ctx.engine.executeCommand({
          type: 'ATTACK',
          playerId: attackerData.owner,
          attackerEid,
          defenderEid,
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Attack failed');
        }

        saveContext(ctx);

        // Get updated state of both units (they may be dead)
        const updatedAttacker = ctx.engine.getUnit(attackerEid);
        const updatedDefender = ctx.engine.getUnit(defenderEid);

        if (format === 'json') {
          console.log(
            json.formatSuccess(
              {
                attacker: updatedAttacker,
                defender: updatedDefender,
              },
              result.events
            )
          );
        } else {
          const attackerStatus = updatedAttacker
            ? `Attacker HP: ${updatedAttacker.health.current}/${updatedAttacker.health.max}`
            : 'Attacker destroyed';
          const defenderStatus = updatedDefender
            ? `Defender HP: ${updatedDefender.health.current}/${updatedDefender.health.max}`
            : 'Defender destroyed';
          console.log(
            text.formatCommandResult(
              `Combat resolved. ${attackerStatus}. ${defenderStatus}.`,
              result.events
            )
          );
        }
      } catch (err) {
        handleError(err, format);
      }
    });

  // unit found-city
  unit
    .command('found-city <eid>')
    .description('Found city with settler')
    .option('--name <cityName>', 'Name for the new city')
    .action(function (this: Command, eid: string, options: { name?: string }) {
      const format = getOutputFormat(this);
      const stateFile = getStateFile(this);

      try {
        const ctx = loadOrCreateContext(stateFile);
        const settlerEid = parseInt(eid, 10);

        const settlerData = ctx.engine.getUnit(settlerEid);
        if (!settlerData) {
          throw new Error(`Settler unit ${settlerEid} not found`);
        }

        const result = ctx.engine.executeCommand({
          type: 'FOUND_CITY',
          playerId: settlerData.owner,
          settlerEid,
          cityName: options.name,
        });

        if (!result.success) {
          throw new Error(result.error ?? 'Found city failed');
        }

        saveContext(ctx);

        // Get the new city (it's at the settler's former position)
        const city = ctx.engine.getCityAtPosition(settlerData.position.q, settlerData.position.r);

        if (format === 'json') {
          console.log(json.formatSuccess(city, result.events));
        } else {
          const cityName = city?.name ?? 'Unknown';
          console.log(
            text.formatCommandResult(
              `City "${cityName}" founded at (${settlerData.position.q}, ${settlerData.position.r}).`,
              result.events
            )
          );
        }
      } catch (err) {
        handleError(err, format);
      }
    });
}
