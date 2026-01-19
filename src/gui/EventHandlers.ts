/**
 * Event handlers that map game events to renderer calls.
 * Pure functions with no game logic - only rendering updates.
 */

import {
  UnitMovedEvent,
  CombatResolvedEvent,
  UnitDestroyedEvent,
  CityFoundedEvent,
  UnitSpawnedEvent,
  ProductionCompletedEvent,
  TurnStartedEvent,
} from '../engine/events/types';
import { UnitRenderer } from '../render/UnitRenderer';
import { CityRenderer } from '../render/CityRenderer';
import { TerritoryRenderer } from '../render/TerritoryRenderer';
import { SelectionState } from '../ui/SelectionState';
import { CityInfoPanel } from '../ui/CityInfoPanel';
import { TurnControls } from '../ui/TurnControls';
import { TilePosition } from '../hex/TilePosition';
import { UnitType } from '../unit/UnitType';

/**
 * Handle unit movement: update unit position in renderer.
 */
export function handleUnitMoved(event: UnitMovedEvent, unitRenderer: UnitRenderer): void {
  const pos = new TilePosition(event.toQ, event.toR);
  unitRenderer.updatePosition(event.unitEid, pos);
}

/**
 * Handle combat resolved: update health bars if units survive.
 * Unit death is handled separately by UnitDestroyedEvent.
 */
export function handleCombatResolved(
  _event: CombatResolvedEvent,
  _unitRenderer: UnitRenderer
): void {
  // Health bar updates would go here if we had health bars
  // For now, just a placeholder since UnitDestroyedEvent handles removal
}

/**
 * Handle unit destroyed: deselect if selected, remove from renderer.
 */
export function handleUnitDestroyed(
  event: UnitDestroyedEvent,
  unitRenderer: UnitRenderer,
  selectionState: SelectionState
): void {
  // Deselect if this unit was selected
  if (selectionState.isSelected(event.unitEid)) {
    selectionState.deselect();
  }

  // Remove from renderer
  unitRenderer.removeUnit(event.unitEid);
}

/**
 * Handle city founded: create city graphic and territory.
 */
export function handleCityFounded(
  event: CityFoundedEvent,
  cityRenderer: CityRenderer,
  territoryRenderer: TerritoryRenderer
): void {
  const pos = new TilePosition(event.q, event.r);

  // Create city graphic
  cityRenderer.createCityGraphic(event.cityEid, pos, event.cityName, event.playerId);

  // Update territory borders
  const territoryTiles = event.territoryTiles.map((t) => new TilePosition(t.q, t.r));
  territoryRenderer.updateTerritoryBorders(event.cityEid, territoryTiles, event.playerId);
}

/**
 * Handle unit spawned: create unit graphic in renderer.
 */
export function handleUnitSpawned(event: UnitSpawnedEvent, unitRenderer: UnitRenderer): void {
  const pos = new TilePosition(event.q, event.r);
  unitRenderer.createUnitGraphic(event.unitEid, pos, event.unitType as UnitType, event.playerId);
}

/**
 * Handle production completed: refresh city info panel.
 */
export function handleProductionCompleted(
  _event: ProductionCompletedEvent,
  cityInfoPanel: CityInfoPanel
): void {
  cityInfoPanel.refresh();
}

/**
 * Handle turn started: update turn display.
 */
export function handleTurnStarted(event: TurnStartedEvent, turnControls: TurnControls): void {
  turnControls.updateTurnDisplay(event.turnNumber);
}
