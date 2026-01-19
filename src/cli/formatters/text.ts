/**
 * Human-readable text output formatting for CLI commands.
 */

import {
  GameStateSnapshot,
  UnitSnapshot,
  CitySnapshot,
  TileSnapshot,
  MapSnapshot,
} from '../../engine/state/snapshots';

export function formatGameState(state: GameStateSnapshot): string {
  const lines = [
    '=== Game Status ===',
    `Turn: ${state.turnNumber}`,
    `Phase: ${state.phase}`,
    `Current Player: ${state.currentPlayer}`,
    `Player Count: ${state.playerCount}`,
  ];
  return lines.join('\n');
}

export function formatUnitList(units: UnitSnapshot[]): string {
  if (units.length === 0) {
    return 'No units found.';
  }

  const lines = ['=== Units ==='];
  for (const unit of units) {
    lines.push(
      `[${unit.eid}] ${unit.typeName} (P${unit.owner}) at (${unit.position.q},${unit.position.r}) ` +
        `HP: ${unit.health.current}/${unit.health.max} MP: ${unit.movement.current}/${unit.movement.max}`
    );
  }
  return lines.join('\n');
}

export function formatUnit(unit: UnitSnapshot): string {
  const lines = [
    `=== Unit ${unit.eid}: ${unit.typeName} ===`,
    `Owner: Player ${unit.owner}`,
    `Position: (${unit.position.q}, ${unit.position.r})`,
    `Health: ${unit.health.current}/${unit.health.max}`,
    `Movement: ${unit.movement.current}/${unit.movement.max}`,
    `Can Move: ${unit.capabilities.canMove}`,
    `Can Attack: ${unit.capabilities.canAttack}`,
    `Can Found City: ${unit.capabilities.canFoundCity}`,
  ];
  return lines.join('\n');
}

export function formatCityList(cities: CitySnapshot[]): string {
  if (cities.length === 0) {
    return 'No cities found.';
  }

  const lines = ['=== Cities ==='];
  for (const city of cities) {
    const prodInfo =
      city.production.currentItemName !== 'None'
        ? ` producing ${city.production.currentItemName} (${city.production.progress}/${city.production.cost})`
        : '';
    lines.push(
      `[${city.eid}] ${city.name} (P${city.owner}) at (${city.position.q},${city.position.r}) ` +
        `Pop: ${city.population}${prodInfo}`
    );
  }
  return lines.join('\n');
}

export function formatCity(city: CitySnapshot): string {
  const lines = [
    `=== City ${city.eid}: ${city.name} ===`,
    `Owner: Player ${city.owner}`,
    `Position: (${city.position.q}, ${city.position.r})`,
    `Population: ${city.population}`,
    `Food: ${city.foodStockpile}/${city.foodForGrowth}`,
    `Territory: ${city.territoryTileCount} tiles`,
    '',
    '--- Production ---',
    `Current: ${city.production.currentItemName}`,
    `Progress: ${city.production.progress}/${city.production.cost}`,
    `Turns Remaining: ${city.production.turnsRemaining ?? 'N/A'}`,
    '',
    '--- Yields ---',
    `Food: ${city.yields.food}`,
    `Production: ${city.yields.production}`,
    `Gold: ${city.yields.gold}`,
    `Science: ${city.yields.science}`,
    `Culture: ${city.yields.culture}`,
    `Faith: ${city.yields.faith}`,
  ];
  return lines.join('\n');
}

export function formatTile(tile: TileSnapshot): string {
  const lines = [
    `=== Tile (${tile.position.q}, ${tile.position.r}) ===`,
    `Terrain: ${tile.terrainName}`,
  ];

  if (tile.featureName) {
    lines.push(`Feature: ${tile.featureName}`);
  }
  if (tile.resourceName) {
    lines.push(`Resource: ${tile.resourceName}`);
  }

  lines.push('');
  lines.push('--- Properties ---');
  lines.push(`Passable: ${tile.isPassable}`);
  lines.push(`Water: ${tile.isWater}`);
  lines.push(`Hill: ${tile.isHill}`);
  lines.push(`Movement Cost: ${tile.movementCost}`);

  if (tile.owner !== null) {
    lines.push(`Owner: Player ${tile.owner}`);
  }

  lines.push(`Has Unit: ${tile.hasUnit}`);
  lines.push(`Has City: ${tile.hasCity}`);

  lines.push('');
  lines.push('--- Yields ---');
  lines.push(`Food: ${tile.yields.food}`);
  lines.push(`Production: ${tile.yields.production}`);
  lines.push(`Gold: ${tile.yields.gold}`);
  lines.push(`Science: ${tile.yields.science}`);
  lines.push(`Culture: ${tile.yields.culture}`);
  lines.push(`Faith: ${tile.yields.faith}`);

  return lines.join('\n');
}

export function formatMapInfo(map: MapSnapshot): string {
  const lines = [
    '=== Map Info ===',
    `Dimensions: ${map.width} x ${map.height}`,
    `Seed: ${map.seed}`,
    `Total Tiles: ${map.tileCount}`,
  ];
  return lines.join('\n');
}

export function formatPlayerList(
  players: Array<{ id: number; unitCount: number; cityCount: number }>
): string {
  const lines = ['=== Players ==='];
  for (const player of players) {
    lines.push(`Player ${player.id}: ${player.unitCount} units, ${player.cityCount} cities`);
  }
  return lines.join('\n');
}

export function formatCommandResult(message: string, events?: unknown[]): string {
  const lines = [message];
  if (events && events.length > 0) {
    lines.push('');
    lines.push('Events:');
    for (const event of events) {
      lines.push(`  - ${JSON.stringify(event)}`);
    }
  }
  return lines.join('\n');
}

export function formatError(error: string): string {
  return `Error: ${error}`;
}
