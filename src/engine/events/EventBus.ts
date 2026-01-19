/**
 * EventBus for game event publication and subscription.
 * Provides a decoupled way for components to communicate through events.
 */

import { GameEvent, GameEventType } from './types';

/** Handler function type for specific event types */
export type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;

/** Handler function for catching all events */
export type AllEventsHandler = (event: GameEventType) => void;

/**
 * Simple pub/sub event bus for game events.
 * Supports type-specific subscriptions and catch-all subscriptions.
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private allHandlers: Set<AllEventsHandler> = new Set();

  /**
   * Emit an event to all subscribed handlers.
   * @param event The event to emit
   */
  emit(event: GameEventType): void {
    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }

    // Notify catch-all handlers
    for (const handler of this.allHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in catch-all event handler:`, error);
      }
    }
  }

  /**
   * Subscribe to events of a specific type.
   * @param eventType The event type to subscribe to (e.g., 'UNIT_MOVED')
   * @param handler The handler function to call when event is emitted
   * @returns Unsubscribe function
   */
  subscribe<T extends GameEventType>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler as EventHandler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Subscribe to all events regardless of type.
   * @param handler The handler function to call for all events
   * @returns Unsubscribe function
   */
  subscribeAll(handler: AllEventsHandler): () => void {
    this.allHandlers.add(handler);

    return () => {
      this.allHandlers.delete(handler);
    };
  }

  /**
   * Check if there are any subscribers for a given event type.
   * @param eventType The event type to check
   */
  hasSubscribers(eventType: string): boolean {
    const handlers = this.handlers.get(eventType);
    return (handlers !== undefined && handlers.size > 0) || this.allHandlers.size > 0;
  }

  /**
   * Get the number of subscribers for a given event type (excluding catch-all).
   * @param eventType The event type to count
   */
  getSubscriberCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Get the number of catch-all subscribers.
   */
  getAllSubscriberCount(): number {
    return this.allHandlers.size;
  }

  /**
   * Remove all subscribers.
   */
  clear(): void {
    this.handlers.clear();
    this.allHandlers.clear();
  }
}
