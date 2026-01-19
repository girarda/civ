import { NotificationState, NotificationType, Notification } from './NotificationState';

/**
 * Debug log overlay panel.
 * Displays debug notifications in a scrollable log and persists
 * visibility state to localStorage.
 */
export class DebugOverlay {
  private overlay: HTMLElement;
  private logContainer: HTMLElement;
  private state: NotificationState;
  private readonly MAX_ENTRIES = 100;

  constructor(state: NotificationState) {
    const overlay = document.getElementById('debug-overlay');
    const logContainer = document.getElementById('debug-log');
    if (!overlay || !logContainer) {
      throw new Error('DebugOverlay: Required DOM elements not found');
    }

    this.overlay = overlay;
    this.logContainer = logContainer;
    this.state = state;

    // Restore debug state from localStorage
    try {
      const savedState = localStorage.getItem('openciv-debug');
      if (savedState === 'true') {
        this.show();
      }
    } catch {
      // localStorage may not be available
    }

    state.subscribe((event) => {
      if (event.action === 'add' && event.notification.type === NotificationType.Debug) {
        this.appendEntry(event.notification);
      }
    });
  }

  show(): void {
    this.overlay.classList.remove('hidden');
    this.state.setDebugEnabled(true);
    try {
      localStorage.setItem('openciv-debug', 'true');
    } catch {
      // localStorage may not be available
    }
  }

  hide(): void {
    this.overlay.classList.add('hidden');
    this.state.setDebugEnabled(false);
    try {
      localStorage.setItem('openciv-debug', 'false');
    } catch {
      // localStorage may not be available
    }
  }

  toggle(): void {
    if (this.overlay.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }

  private appendEntry(notification: Notification): void {
    // Enforce max entries - remove oldest
    while (this.logContainer.children.length >= this.MAX_ENTRIES) {
      this.logContainer.firstChild?.remove();
    }

    const entry = document.createElement('div');
    entry.className = 'debug-entry';
    const time = new Date(notification.timestamp).toLocaleTimeString();
    entry.textContent = `[${time}] ${notification.message}`;
    if (notification.details) {
      entry.textContent += ` - ${notification.details}`;
    }

    this.logContainer.appendChild(entry);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }
}
