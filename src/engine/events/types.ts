/**
 * Game event type definitions for the EventBus.
 * All events are serializable to JSON for potential replay/networking.
 */

import { UnitType } from '../../unit/UnitType';

/** Base interface for all game events */
export interface GameEvent {
  type: string;
  timestamp: number;
}

/** Emitted when a unit moves to a new position */
export interface UnitMovedEvent extends GameEvent {
  type: 'UNIT_MOVED';
  unitEid: number;
  fromQ: number;
  fromR: number;
  toQ: number;
  toR: number;
  remainingMovement: number;
  playerId: number;
}

/** Emitted when combat is resolved between two units */
export interface CombatResolvedEvent extends GameEvent {
  type: 'COMBAT_RESOLVED';
  attackerEid: number;
  defenderEid: number;
  attackerDamage: number;
  defenderDamage: number;
  attackerSurvives: boolean;
  defenderSurvives: boolean;
  attackerRemainingHealth: number;
  defenderRemainingHealth: number;
  playerId: number;
}

/** Emitted when a city is founded */
export interface CityFoundedEvent extends GameEvent {
  type: 'CITY_FOUNDED';
  cityEid: number;
  settlerEid: number;
  q: number;
  r: number;
  cityName: string;
  playerId: number;
  territoryTiles: Array<{ q: number; r: number }>;
}

/** Emitted when a unit is spawned (from production or game start) */
export interface UnitSpawnedEvent extends GameEvent {
  type: 'UNIT_SPAWNED';
  unitEid: number;
  unitType: UnitType;
  q: number;
  r: number;
  playerId: number;
}

/** Emitted when a unit is destroyed */
export interface UnitDestroyedEvent extends GameEvent {
  type: 'UNIT_DESTROYED';
  unitEid: number;
  q: number;
  r: number;
  playerId: number;
}

/** Emitted when a turn ends */
export interface TurnEndedEvent extends GameEvent {
  type: 'TURN_ENDED';
  turnNumber: number;
}

/** Emitted when a new turn starts */
export interface TurnStartedEvent extends GameEvent {
  type: 'TURN_STARTED';
  turnNumber: number;
  currentPlayer: number;
}

/** Emitted when city production is completed */
export interface ProductionCompletedEvent extends GameEvent {
  type: 'PRODUCTION_COMPLETED';
  cityEid: number;
  cityName: string;
  producedItem: number; // BuildableType
  unitEid?: number; // If unit was produced
  playerId: number;
}

/** Emitted when production is changed for a city */
export interface ProductionChangedEvent extends GameEvent {
  type: 'PRODUCTION_CHANGED';
  cityEid: number;
  newItem: number; // BuildableType
  playerId: number;
}

/** Emitted when city population grows */
export interface PopulationGrowthEvent extends GameEvent {
  type: 'POPULATION_GROWTH';
  cityEid: number;
  newPopulation: number;
  playerId: number;
}

/** Union type of all game events */
export type GameEventType =
  | UnitMovedEvent
  | CombatResolvedEvent
  | CityFoundedEvent
  | UnitSpawnedEvent
  | UnitDestroyedEvent
  | TurnEndedEvent
  | TurnStartedEvent
  | ProductionCompletedEvent
  | ProductionChangedEvent
  | PopulationGrowthEvent;

/** Input type for createEvent - event data without timestamp */
export type EventInput<T extends GameEvent> = Omit<T, 'timestamp'>;

/** Helper function to create event with timestamp */
export function createEvent<T extends GameEvent>(
  event: EventInput<T>
): T {
  return {
    ...event,
    timestamp: Date.now(),
  } as T;
}

/** Type guard helpers for event types */
export function isUnitMovedEvent(event: GameEvent): event is UnitMovedEvent {
  return event.type === 'UNIT_MOVED';
}

export function isCombatResolvedEvent(event: GameEvent): event is CombatResolvedEvent {
  return event.type === 'COMBAT_RESOLVED';
}

export function isCityFoundedEvent(event: GameEvent): event is CityFoundedEvent {
  return event.type === 'CITY_FOUNDED';
}

export function isUnitSpawnedEvent(event: GameEvent): event is UnitSpawnedEvent {
  return event.type === 'UNIT_SPAWNED';
}

export function isUnitDestroyedEvent(event: GameEvent): event is UnitDestroyedEvent {
  return event.type === 'UNIT_DESTROYED';
}

export function isTurnEndedEvent(event: GameEvent): event is TurnEndedEvent {
  return event.type === 'TURN_ENDED';
}

export function isTurnStartedEvent(event: GameEvent): event is TurnStartedEvent {
  return event.type === 'TURN_STARTED';
}

export function isProductionCompletedEvent(event: GameEvent): event is ProductionCompletedEvent {
  return event.type === 'PRODUCTION_COMPLETED';
}

export function isProductionChangedEvent(event: GameEvent): event is ProductionChangedEvent {
  return event.type === 'PRODUCTION_CHANGED';
}

export function isPopulationGrowthEvent(event: GameEvent): event is PopulationGrowthEvent {
  return event.type === 'POPULATION_GROWTH';
}
