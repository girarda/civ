/**
 * Game Engine Module
 *
 * Provides the core game logic independent of rendering.
 * This module can be used by both GUI (PixiJS) and CLI frontends.
 */

// Main engine class
export { GameEngine } from './GameEngine';
export type { GameConfig } from './GameEngine';

// Event system
export { EventBus } from './events/EventBus';
export type { EventHandler, AllEventsHandler } from './events/EventBus';
export {
  createEvent,
  isUnitMovedEvent,
  isCombatResolvedEvent,
  isCityFoundedEvent,
  isUnitSpawnedEvent,
  isUnitDestroyedEvent,
  isTurnEndedEvent,
  isTurnStartedEvent,
  isProductionCompletedEvent,
  isProductionChangedEvent,
  isPopulationGrowthEvent,
  isGameOverEvent,
} from './events/types';
export type {
  GameEvent,
  GameEventType,
  UnitMovedEvent,
  CombatResolvedEvent,
  CityFoundedEvent,
  UnitSpawnedEvent,
  UnitDestroyedEvent,
  TurnEndedEvent,
  TurnStartedEvent,
  ProductionCompletedEvent,
  ProductionChangedEvent,
  PopulationGrowthEvent,
  GameOverEvent,
} from './events/types';

// State snapshots
export { serializeSnapshot, deserializeSnapshot, isSerializable } from './state/snapshots';
export type {
  GameStateSnapshot,
  UnitSnapshot,
  CitySnapshot,
  TileSnapshot,
  MapSnapshot,
  YieldsSnapshot,
  ProductionSnapshot,
  CompleteGameSnapshot,
} from './state/snapshots';

// State queries
export {
  queryGameState,
  queryUnits,
  queryUnit,
  queryCities,
  queryCity,
  queryTile,
  queryMap,
  queryUnitsAtPosition,
  queryCityAtPosition,
} from './state/queries';
