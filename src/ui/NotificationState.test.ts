import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationState, NotificationType, NotificationEvent } from './NotificationState';

describe('NotificationState', () => {
  let state: NotificationState;

  beforeEach(() => {
    state = new NotificationState();
  });

  describe('push', () => {
    it('should add a notification and return its id', () => {
      const id = state.push(NotificationType.Info, 'Test message');
      expect(id).toBe(1);

      const recent = state.getRecent(10);
      expect(recent).toHaveLength(1);
      expect(recent[0].message).toBe('Test message');
      expect(recent[0].type).toBe(NotificationType.Info);
    });

    it('should increment ids for each notification', () => {
      const id1 = state.push(NotificationType.Info, 'First');
      const id2 = state.push(NotificationType.Info, 'Second');
      const id3 = state.push(NotificationType.Info, 'Third');

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(id3).toBe(3);
    });

    it('should include timestamp on notifications', () => {
      const before = Date.now();
      state.push(NotificationType.Info, 'Test');
      const after = Date.now();

      const recent = state.getRecent(1);
      expect(recent[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(recent[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should include optional details', () => {
      state.push(NotificationType.Debug, 'Message', 'Extra details');

      state.setDebugEnabled(true);
      state.push(NotificationType.Debug, 'Message', 'Extra details');

      const recent = state.getRecent(10);
      expect(recent[0].details).toBe('Extra details');
    });

    it('should suppress debug notifications when debug mode is disabled', () => {
      const id = state.push(NotificationType.Debug, 'Debug message');
      expect(id).toBe(-1);

      const recent = state.getRecent(10);
      expect(recent).toHaveLength(0);
    });

    it('should allow debug notifications when debug mode is enabled', () => {
      state.setDebugEnabled(true);
      const id = state.push(NotificationType.Debug, 'Debug message');

      expect(id).toBe(1);
      const recent = state.getRecent(10);
      expect(recent).toHaveLength(1);
    });

    it('should notify listeners on add', () => {
      const listener = vi.fn();
      state.subscribe(listener);

      state.push(NotificationType.Success, 'Test');

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as NotificationEvent;
      expect(event.action).toBe('add');
      if (event.action === 'add') {
        expect(event.notification.message).toBe('Test');
      }
    });
  });

  describe('dismiss', () => {
    it('should remove notification by id', () => {
      const id = state.push(NotificationType.Info, 'Test');
      expect(state.getRecent(10)).toHaveLength(1);

      state.dismiss(id);
      expect(state.getRecent(10)).toHaveLength(0);
    });

    it('should not error when dismissing non-existent id', () => {
      expect(() => state.dismiss(999)).not.toThrow();
    });

    it('should notify listeners on dismiss', () => {
      const id = state.push(NotificationType.Info, 'Test');
      const listener = vi.fn();
      state.subscribe(listener);

      state.dismiss(id);

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as NotificationEvent;
      expect(event.action).toBe('dismiss');
      if (event.action === 'dismiss') {
        expect(event.id).toBe(id);
      }
    });
  });

  describe('getRecent', () => {
    it('should return empty array when no notifications', () => {
      expect(state.getRecent(10)).toEqual([]);
    });

    it('should return most recent notifications', () => {
      state.push(NotificationType.Info, 'First');
      state.push(NotificationType.Info, 'Second');
      state.push(NotificationType.Info, 'Third');

      const recent = state.getRecent(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].message).toBe('Second');
      expect(recent[1].message).toBe('Third');
    });

    it('should return all if count exceeds available', () => {
      state.push(NotificationType.Info, 'Only one');

      const recent = state.getRecent(100);
      expect(recent).toHaveLength(1);
    });
  });

  describe('debug mode', () => {
    it('should default to disabled', () => {
      expect(state.isDebugEnabled()).toBe(false);
    });

    it('should toggle debug mode', () => {
      state.setDebugEnabled(true);
      expect(state.isDebugEnabled()).toBe(true);

      state.setDebugEnabled(false);
      expect(state.isDebugEnabled()).toBe(false);
    });

    it('should notify listeners on debug toggle', () => {
      const listener = vi.fn();
      state.subscribe(listener);

      state.setDebugEnabled(true);

      expect(listener).toHaveBeenCalledTimes(1);
      const event = listener.mock.calls[0][0] as NotificationEvent;
      expect(event.action).toBe('debug-toggle');
      if (event.action === 'debug-toggle') {
        expect(event.enabled).toBe(true);
      }
    });
  });

  describe('subscribe', () => {
    it('should return unsubscribe function', () => {
      const listener = vi.fn();
      const unsubscribe = state.subscribe(listener);

      state.push(NotificationType.Info, 'Test');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      state.push(NotificationType.Info, 'Test 2');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should support multiple listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      state.subscribe(listener1);
      state.subscribe(listener2);

      state.push(NotificationType.Info, 'Test');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('should remove all notifications', () => {
      state.push(NotificationType.Info, 'Test 1');
      state.push(NotificationType.Info, 'Test 2');

      state.clear();

      expect(state.getRecent(10)).toHaveLength(0);
    });

    it('should remove all listeners', () => {
      const listener = vi.fn();
      state.subscribe(listener);

      state.push(NotificationType.Info, 'Before clear');
      expect(listener).toHaveBeenCalledTimes(1);

      state.clear();

      // This won't notify since listeners are cleared
      state.push(NotificationType.Info, 'After clear');
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should reset debug mode', () => {
      state.setDebugEnabled(true);
      state.clear();
      expect(state.isDebugEnabled()).toBe(false);
    });
  });

  describe('notification types', () => {
    it('should handle all notification types', () => {
      state.push(NotificationType.Info, 'Info');
      state.push(NotificationType.Success, 'Success');
      state.push(NotificationType.Warning, 'Warning');
      state.push(NotificationType.Error, 'Error');

      const recent = state.getRecent(10);
      expect(recent).toHaveLength(4);
      expect(recent.map((n) => n.type)).toEqual([
        NotificationType.Info,
        NotificationType.Success,
        NotificationType.Warning,
        NotificationType.Error,
      ]);
    });
  });
});
