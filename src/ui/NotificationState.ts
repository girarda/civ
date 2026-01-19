/**
 * Notification types for categorizing messages.
 */
export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Debug = 'debug',
}

/**
 * A notification message with metadata.
 */
export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  timestamp: number;
  details?: string;
}

/**
 * Event types emitted by NotificationState.
 */
export type NotificationEvent =
  | { action: 'add'; notification: Notification }
  | { action: 'dismiss'; id: number }
  | { action: 'debug-toggle'; enabled: boolean };

type NotificationListener = (event: NotificationEvent) => void;

/**
 * Reactive state management for notifications.
 * Supports subscribing to state changes for UI updates.
 */
export class NotificationState {
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private nextId = 1;
  private debugEnabled = false;

  /**
   * Add a new notification.
   * @param type - The notification type
   * @param message - The main message text
   * @param details - Optional additional details
   * @returns The notification id, or -1 if debug notification was suppressed
   */
  push(type: NotificationType, message: string, details?: string): number {
    if (type === NotificationType.Debug && !this.debugEnabled) {
      return -1;
    }

    const notification: Notification = {
      id: this.nextId++,
      type,
      message,
      timestamp: Date.now(),
      details,
    };

    this.notifications.push(notification);
    this.notifyListeners({ action: 'add', notification });
    return notification.id;
  }

  /**
   * Remove a notification by id.
   */
  dismiss(id: number): void {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.notifyListeners({ action: 'dismiss', id });
    }
  }

  /**
   * Get the most recent notifications.
   * @param count - Maximum number of notifications to return
   */
  getRecent(count: number): Notification[] {
    return this.notifications.slice(-count);
  }

  /**
   * Check if debug mode is enabled.
   */
  isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Enable or disable debug mode.
   */
  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.notifyListeners({ action: 'debug-toggle', enabled });
  }

  /**
   * Subscribe to notification events.
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Reset state and remove all listeners.
   */
  clear(): void {
    this.notifications = [];
    this.listeners = [];
    this.debugEnabled = false;
  }

  private notifyListeners(event: NotificationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
