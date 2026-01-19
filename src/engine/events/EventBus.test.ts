import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from './EventBus';
import { UnitMovedEvent, CombatResolvedEvent, createEvent } from './types';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('subscribe and emit', () => {
    it('should receive emitted events of subscribed type', () => {
      const handler = vi.fn();
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler);

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should not receive events of different types', () => {
      const handler = vi.fn();
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler);

      const event = createEvent<CombatResolvedEvent>({
        type: 'COMBAT_RESOLVED',
        attackerEid: 1,
        defenderEid: 2,
        attackerDamage: 10,
        defenderDamage: 15,
        attackerSurvives: true,
        defenderSurvives: true,
        attackerRemainingHealth: 90,
        defenderRemainingHealth: 85,
        playerId: 0,
      });

      eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler1);
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler2);

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving events after unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler);

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should not affect other subscribers when unsubscribing', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const unsubscribe1 = eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler1);
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', handler2);

      unsubscribe1();

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribeAll', () => {
    it('should receive all event types', () => {
      const handler = vi.fn();
      eventBus.subscribeAll(handler);

      const moveEvent = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      const combatEvent = createEvent<CombatResolvedEvent>({
        type: 'COMBAT_RESOLVED',
        attackerEid: 1,
        defenderEid: 2,
        attackerDamage: 10,
        defenderDamage: 15,
        attackerSurvives: true,
        defenderSurvives: true,
        attackerRemainingHealth: 90,
        defenderRemainingHealth: 85,
        playerId: 0,
      });

      eventBus.emit(moveEvent);
      eventBus.emit(combatEvent);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, moveEvent);
      expect(handler).toHaveBeenNthCalledWith(2, combatEvent);
    });

    it('should receive events alongside type-specific subscribers', () => {
      const allHandler = vi.fn();
      const moveHandler = vi.fn();

      eventBus.subscribeAll(allHandler);
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', moveHandler);

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);

      expect(allHandler).toHaveBeenCalledTimes(1);
      expect(moveHandler).toHaveBeenCalledTimes(1);
    });

    it('should stop receiving after unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.subscribeAll(handler);

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      eventBus.emit(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasSubscribers', () => {
    it('should return false when no subscribers', () => {
      expect(eventBus.hasSubscribers('UNIT_MOVED')).toBe(false);
    });

    it('should return true when type-specific subscriber exists', () => {
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', vi.fn());
      expect(eventBus.hasSubscribers('UNIT_MOVED')).toBe(true);
    });

    it('should return true when catch-all subscriber exists', () => {
      eventBus.subscribeAll(vi.fn());
      expect(eventBus.hasSubscribers('UNIT_MOVED')).toBe(true);
    });
  });

  describe('getSubscriberCount', () => {
    it('should return 0 for no subscribers', () => {
      expect(eventBus.getSubscriberCount('UNIT_MOVED')).toBe(0);
    });

    it('should return correct count for type-specific subscribers', () => {
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', vi.fn());
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', vi.fn());
      expect(eventBus.getSubscriberCount('UNIT_MOVED')).toBe(2);
    });

    it('should not count catch-all subscribers', () => {
      eventBus.subscribeAll(vi.fn());
      expect(eventBus.getSubscriberCount('UNIT_MOVED')).toBe(0);
    });
  });

  describe('getAllSubscriberCount', () => {
    it('should return 0 for no catch-all subscribers', () => {
      expect(eventBus.getAllSubscriberCount()).toBe(0);
    });

    it('should return correct count for catch-all subscribers', () => {
      eventBus.subscribeAll(vi.fn());
      eventBus.subscribeAll(vi.fn());
      expect(eventBus.getAllSubscriberCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all subscribers', () => {
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', vi.fn());
      eventBus.subscribeAll(vi.fn());

      expect(eventBus.hasSubscribers('UNIT_MOVED')).toBe(true);

      eventBus.clear();

      expect(eventBus.hasSubscribers('UNIT_MOVED')).toBe(false);
      expect(eventBus.getSubscriberCount('UNIT_MOVED')).toBe(0);
      expect(eventBus.getAllSubscriberCount()).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should continue emitting to other handlers if one throws', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });
      const successHandler = vi.fn();

      // Mock console.error to prevent test output noise
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', errorHandler);
      eventBus.subscribe<UnitMovedEvent>('UNIT_MOVED', successHandler);

      const event = createEvent<UnitMovedEvent>({
        type: 'UNIT_MOVED',
        unitEid: 1,
        fromQ: 0,
        fromR: 0,
        toQ: 1,
        toR: 1,
        remainingMovement: 1,
        playerId: 0,
      });

      eventBus.emit(event);

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
