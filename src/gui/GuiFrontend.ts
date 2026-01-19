/**
 * GuiFrontend - Coordinates between GameEngine events and renderer updates.
 * Subscribes to engine events and routes them to appropriate renderers.
 */

import { GameEngine } from '../engine/GameEngine';
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
import {
  handleUnitMoved,
  handleCombatResolved,
  handleUnitDestroyed,
  handleCityFounded,
  handleUnitSpawned,
  handleProductionCompleted,
  handleTurnStarted,
} from './EventHandlers';

/** Renderer dependencies for GuiFrontend */
export interface GuiRenderers {
  unitRenderer: UnitRenderer;
  cityRenderer: CityRenderer;
  territoryRenderer: TerritoryRenderer;
}

/** UI dependencies for GuiFrontend */
export interface GuiUI {
  selectionState: SelectionState;
  cityInfoPanel: CityInfoPanel;
  turnControls: TurnControls;
}

/**
 * GuiFrontend coordinates rendering updates in response to game events.
 * It subscribes to the GameEngine's EventBus and updates renderers accordingly.
 */
export class GuiFrontend {
  private engine: GameEngine;
  private unitRenderer: UnitRenderer;
  private cityRenderer: CityRenderer;
  private territoryRenderer: TerritoryRenderer;
  private selectionState: SelectionState;
  private cityInfoPanel: CityInfoPanel;
  private turnControls: TurnControls;
  private unsubscribers: Array<() => void> = [];

  constructor(engine: GameEngine, renderers: GuiRenderers, ui: GuiUI) {
    this.engine = engine;
    this.unitRenderer = renderers.unitRenderer;
    this.cityRenderer = renderers.cityRenderer;
    this.territoryRenderer = renderers.territoryRenderer;
    this.selectionState = ui.selectionState;
    this.cityInfoPanel = ui.cityInfoPanel;
    this.turnControls = ui.turnControls;
  }

  /**
   * Initialize event subscriptions.
   * Call this after constructing to start receiving events.
   */
  initialize(): void {
    // Subscribe to unit events
    this.unsubscribers.push(
      this.engine.on<UnitMovedEvent>('UNIT_MOVED', (e) => {
        try {
          handleUnitMoved(e, this.unitRenderer);
        } catch (err) {
          console.error('Error handling UNIT_MOVED event:', err);
        }
      })
    );

    this.unsubscribers.push(
      this.engine.on<CombatResolvedEvent>('COMBAT_RESOLVED', (e) => {
        try {
          handleCombatResolved(e, this.unitRenderer);
        } catch (err) {
          console.error('Error handling COMBAT_RESOLVED event:', err);
        }
      })
    );

    this.unsubscribers.push(
      this.engine.on<UnitDestroyedEvent>('UNIT_DESTROYED', (e) => {
        try {
          handleUnitDestroyed(e, this.unitRenderer, this.selectionState);
        } catch (err) {
          console.error('Error handling UNIT_DESTROYED event:', err);
        }
      })
    );

    this.unsubscribers.push(
      this.engine.on<UnitSpawnedEvent>('UNIT_SPAWNED', (e) => {
        try {
          handleUnitSpawned(e, this.unitRenderer);
        } catch (err) {
          console.error('Error handling UNIT_SPAWNED event:', err);
        }
      })
    );

    // Subscribe to city events
    this.unsubscribers.push(
      this.engine.on<CityFoundedEvent>('CITY_FOUNDED', (e) => {
        try {
          handleCityFounded(e, this.cityRenderer, this.territoryRenderer);
        } catch (err) {
          console.error('Error handling CITY_FOUNDED event:', err);
        }
      })
    );

    this.unsubscribers.push(
      this.engine.on<ProductionCompletedEvent>('PRODUCTION_COMPLETED', (e) => {
        try {
          handleProductionCompleted(e, this.cityInfoPanel);
        } catch (err) {
          console.error('Error handling PRODUCTION_COMPLETED event:', err);
        }
      })
    );

    // Subscribe to turn events
    this.unsubscribers.push(
      this.engine.on<TurnStartedEvent>('TURN_STARTED', (e) => {
        try {
          handleTurnStarted(e, this.turnControls);
        } catch (err) {
          console.error('Error handling TURN_STARTED event:', err);
        }
      })
    );
  }

  /**
   * Clean up all event subscriptions.
   * Call this when the frontend is being destroyed.
   */
  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
  }

  /**
   * Get the selection state (for external access if needed).
   */
  getSelectionState(): SelectionState {
    return this.selectionState;
  }

  /**
   * Get the unit renderer (for external access if needed).
   */
  getUnitRenderer(): UnitRenderer {
    return this.unitRenderer;
  }

  /**
   * Get the city renderer (for external access if needed).
   */
  getCityRenderer(): CityRenderer {
    return this.cityRenderer;
  }

  /**
   * Get the territory renderer (for external access if needed).
   */
  getTerritoryRenderer(): TerritoryRenderer {
    return this.territoryRenderer;
  }
}
