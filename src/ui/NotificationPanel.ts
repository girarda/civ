import { NotificationState, NotificationType, Notification } from './NotificationState';

/**
 * UI panel for displaying toast notifications.
 * Subscribes to NotificationState and displays non-debug notifications
 * as auto-dismissing toasts.
 */
export class NotificationPanel {
  private container: HTMLElement;
  private toasts: Map<number, HTMLElement> = new Map();
  private readonly MAX_VISIBLE = 5;
  private readonly AUTO_DISMISS_MS = 5000;

  constructor(state: NotificationState) {
    const container = document.getElementById('notification-container');
    if (!container) {
      throw new Error('NotificationPanel: Required DOM element not found');
    }
    this.container = container;

    state.subscribe((event) => {
      if (event.action === 'add' && event.notification.type !== NotificationType.Debug) {
        this.showToast(event.notification);
      } else if (event.action === 'dismiss') {
        this.removeToast(event.id);
      }
    });
  }

  private showToast(notification: Notification): void {
    // Enforce max visible - remove oldest if at limit
    while (this.toasts.size >= this.MAX_VISIBLE) {
      const oldestId = this.toasts.keys().next().value;
      if (oldestId !== undefined) {
        this.removeToast(oldestId);
      }
    }

    const toast = document.createElement('div');
    toast.className = `notification-toast ${notification.type}`;
    toast.textContent = notification.message;
    toast.dataset.id = notification.id.toString();

    this.container.appendChild(toast);
    this.toasts.set(notification.id, toast);

    // Auto-dismiss after delay
    setTimeout(() => this.removeToast(notification.id), this.AUTO_DISMISS_MS);
  }

  private removeToast(id: number): void {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
        this.toasts.delete(id);
      }, 300);
    }
  }
}
