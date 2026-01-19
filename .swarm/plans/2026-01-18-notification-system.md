# Plan: Notification System

**Date**: 2026-01-18
**Status**: Ready for Implementation

## Overview

Implement a unified notification system for OpenCiv that handles both player-facing notifications (toast-style messages for game events) and togglable debug output (developer logging overlay). The system will follow existing codebase patterns: reactive state management with subscribers and DOM-based UI panels.

## Research Summary

Key findings from `/Users/alex/workspace/civ/.swarm/research/2026-01-18-notification-system.md`:

- **Reactive state pattern**: All state classes use `subscribe()` returning an unsubscribe function (see `HoverState`, `SelectionState`, `CityState`)
- **DOM panel pattern**: UI panels manage DOM elements with `show()`/`hide()` methods and `.hidden` CSS class (see `CityInfoPanel`, `TileInfoPanel`)
- **Scattered debug logging**: 10+ `console.log` calls in `main.ts` plus others in `CityProcessor.ts`
- **Fixed panel positioning**: Panels use CSS fixed positioning in corners with `z-index: 100`
- **Callback event pattern**: `CityProcessor` uses callback interfaces for async events

## Phased Implementation

### Phase 1: Core Notification State

Create the reactive notification state management following the `HoverState` pattern.

- [ ] Create `src/ui/NotificationState.ts` with:
  - `NotificationType` enum: `Info`, `Success`, `Warning`, `Error`, `Debug`
  - `Notification` interface with `id`, `type`, `message`, `timestamp`, `details`
  - `NotificationEvent` type for subscriber notifications
  - `NotificationState` class with:
    - `push(type, message, details?)` - add notification, return id
    - `dismiss(id)` - remove notification
    - `getRecent(count)` - get recent notifications
    - `isDebugEnabled()` / `setDebugEnabled(boolean)` - toggle debug mode
    - `subscribe(listener)` - returns unsubscribe function
    - `clear()` - reset state

**Code structure:**

```typescript
// src/ui/NotificationState.ts
export enum NotificationType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Debug = 'debug',
}

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  timestamp: number;
  details?: string;
}

export type NotificationEvent =
  | { action: 'add'; notification: Notification }
  | { action: 'dismiss'; id: number }
  | { action: 'debug-toggle'; enabled: boolean };

type NotificationListener = (event: NotificationEvent) => void;

export class NotificationState {
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private nextId = 1;
  private debugEnabled = false;

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

  dismiss(id: number): void {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.notifyListeners({ action: 'dismiss', id });
    }
  }

  getRecent(count: number): Notification[] {
    return this.notifications.slice(-count);
  }

  isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.notifyListeners({ action: 'debug-toggle', enabled });
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

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
```

### Phase 2: Notification Toast Panel

Create the player-facing toast notification UI component.

- [ ] Add notification container to `index.html`
- [ ] Create `src/ui/NotificationPanel.ts` with:
  - Constructor accepts `NotificationState`
  - Subscribe to state for `add` events (non-debug only)
  - Create toast DOM elements with auto-dismiss (5 seconds)
  - Stack toasts vertically, max 5 visible
  - Style toasts by notification type (color-coded borders)
- [ ] Add CSS styles to `src/style.css` for notification toasts

**DOM structure:**

```html
<!-- Add to index.html after game-container -->
<div id="notification-container"></div>
```

**Code structure:**

```typescript
// src/ui/NotificationPanel.ts
export class NotificationPanel {
  private container: HTMLElement;
  private toasts: Map<number, HTMLElement> = new Map();
  private readonly MAX_VISIBLE = 5;
  private readonly AUTO_DISMISS_MS = 5000;

  constructor(state: NotificationState) {
    const container = document.getElementById('notification-container');
    if (!container) throw new Error('NotificationPanel: Required DOM element not found');
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
    // Enforce max visible
    while (this.toasts.size >= this.MAX_VISIBLE) {
      const oldestId = this.toasts.keys().next().value;
      if (oldestId !== undefined) this.removeToast(oldestId);
    }

    const toast = document.createElement('div');
    toast.className = `notification-toast ${notification.type}`;
    toast.textContent = notification.message;
    toast.dataset.id = notification.id.toString();

    this.container.appendChild(toast);
    this.toasts.set(notification.id, toast);

    // Auto-dismiss
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
```

**CSS additions:**

```css
/* Notification Container */
#notification-container {
  position: fixed;
  top: 70px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 200;
  pointer-events: none;
  max-width: 320px;
}

/* Toast Notification */
.notification-toast {
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid #4a4a6a;
  border-radius: 8px;
  padding: 10px 16px;
  color: #e0e0e0;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  animation: slideIn 0.3s ease;
  pointer-events: auto;
}

.notification-toast.info {
  border-color: #4a6a9a;
}
.notification-toast.success {
  border-color: #6a9a6a;
}
.notification-toast.warning {
  border-color: #9a9a6a;
}
.notification-toast.error {
  border-color: #9a4a4a;
}

.notification-toast.fade-out {
  animation: fadeOut 0.3s ease forwards;
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

### Phase 3: Debug Overlay

Create the togglable debug log overlay for developer use.

- [ ] Add debug overlay container to `index.html`
- [ ] Create `src/ui/DebugOverlay.ts` with:
  - Constructor accepts `NotificationState`
  - Subscribe to state for debug notifications and debug-toggle events
  - Append log entries to scrollable container
  - Toggle visibility with `show()`/`hide()` methods
  - Auto-scroll to bottom on new entries
  - Limit stored entries (e.g., last 100)
- [ ] Add CSS styles for debug overlay

**DOM structure:**

```html
<!-- Add to index.html before script tag -->
<div id="debug-overlay" class="hidden">
  <div class="debug-header">Debug Log (` to close)</div>
  <div id="debug-log"></div>
</div>
```

**Code structure:**

```typescript
// src/ui/DebugOverlay.ts
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
    const savedState = localStorage.getItem('openciv-debug');
    if (savedState === 'true') {
      this.show();
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
    localStorage.setItem('openciv-debug', 'true');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
    this.state.setDebugEnabled(false);
    localStorage.setItem('openciv-debug', 'false');
  }

  toggle(): void {
    if (this.overlay.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }

  private appendEntry(notification: Notification): void {
    // Enforce max entries
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
```

**CSS additions:**

```css
/* Debug Overlay */
#debug-overlay {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 400px;
  max-height: 300px;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #333;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #0f0;
  z-index: 300;
  display: flex;
  flex-direction: column;
}

#debug-overlay.hidden {
  display: none;
}

.debug-header {
  padding: 6px 8px;
  background: #222;
  border-bottom: 1px solid #333;
  color: #888;
  font-size: 11px;
}

#debug-log {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  max-height: 260px;
}

.debug-entry {
  margin: 2px 0;
  padding: 2px 4px;
  border-bottom: 1px solid #222;
  word-wrap: break-word;
}
```

### Phase 4: Integration and Migration

Wire up the notification system and migrate existing `console.log` calls.

- [ ] Export new modules from `src/ui/index.ts`
- [ ] Initialize notification system in `src/main.ts`:
  - Create `NotificationState` instance
  - Create `NotificationPanel` instance
  - Create `DebugOverlay` instance
  - Add keyboard handler for backtick (`) to toggle debug overlay
- [ ] Migrate existing `console.log` calls to use `notificationState.push()`:
  - Player-facing events: Success/Info notifications
  - Debug/development events: Debug notifications
- [ ] Update `CityProcessor` callbacks to emit player notifications

**Integration in main.ts:**

```typescript
// Import new modules
import { NotificationState, NotificationType, NotificationPanel, DebugOverlay } from './ui';

// Create notification system (early in main())
const notificationState = new NotificationState();
const notificationPanel = new NotificationPanel(notificationState);
const debugOverlay = new DebugOverlay(notificationState);

// Add keyboard handler for debug toggle
window.addEventListener('keydown', (e) => {
  if (e.key === '`') {
    debugOverlay.toggle();
  }
});

// Example migrations:
// Before: console.log('OpenCiv initializing...');
// After:  notificationState.push(NotificationType.Debug, '[INIT] OpenCiv initializing...');

// Before: console.log(`Map generated with seed: ${seed}, ${tiles.length} tiles`);
// After:  notificationState.push(NotificationType.Debug, '[MAP] Generated', `Seed: ${seed}, ${tiles.length} tiles`);

// Before: console.log(`Production completed in city ${cityEid}: unit ${unitEid} spawned`);
// After:  notificationState.push(NotificationType.Success, 'Unit ready', `${unitName} completed in ${cityName}`);
```

**Console.log migration mapping:**

| Location | Old Log | New Notification |
|----------|---------|------------------|
| Line 60 | `'OpenCiv initializing...'` | Debug: `[INIT] Initializing...` |
| Line 152 | Player elimination | Success: `${name} eliminated!` |
| Line 171 | Production completed | Success: `${unitName} ready in ${city}` |
| Line 174 | Population growth | Info: `${city} grows to ${pop}` |
| Line 322 | Map generated | Debug: `[MAP] Generated` |
| Line 338 | Turn started | Debug: `[TURN] Turn ${n} started` |
| Line 356 | Turn ending | Debug: `[TURN] Turn ${n} ending` |
| Line 548-549 | Combat result | Debug: `[COMBAT] Result` |
| Line 596-626 | City founding | Success: `Founded ${name}` |
| Line 637 | Failed to found | Warning: `Cannot found city` |

## Files to Create/Modify

| File | Action |
|------|--------|
| `/Users/alex/workspace/civ/src/ui/NotificationState.ts` | Create |
| `/Users/alex/workspace/civ/src/ui/NotificationPanel.ts` | Create |
| `/Users/alex/workspace/civ/src/ui/DebugOverlay.ts` | Create |
| `/Users/alex/workspace/civ/src/ui/index.ts` | Modify - add exports |
| `/Users/alex/workspace/civ/index.html` | Modify - add DOM containers |
| `/Users/alex/workspace/civ/src/style.css` | Modify - add notification styles |
| `/Users/alex/workspace/civ/src/main.ts` | Modify - initialize and migrate logs |

## Success Criteria

- [ ] **Phase 1**: `NotificationState` class created with working `push()`, `subscribe()`, and `setDebugEnabled()` methods
- [ ] **Phase 2**: Toast notifications appear in top-left when player events fire
- [ ] **Phase 2**: Toasts auto-dismiss after 5 seconds
- [ ] **Phase 2**: Maximum 5 toasts visible at once
- [ ] **Phase 3**: Debug overlay toggles with backtick key (`)
- [ ] **Phase 3**: Debug state persists across page refreshes via localStorage
- [ ] **Phase 4**: All existing `console.log` calls migrated to notification system
- [ ] **Phase 4**: Player receives Success notification when unit production completes
- [ ] **Phase 4**: Player receives Info notification when city population grows
- [ ] **Phase 4**: Debug overlay shows detailed logging when enabled
- [ ] **Phase 4**: No TypeScript errors, all tests pass

## Dependencies & Integration

- **Depends on**: Existing UI infrastructure (`index.html`, `src/style.css`, `src/ui/index.ts`)
- **Consumed by**: All game systems that need to communicate with the player or developer
- **Integration points**:
  - `CityProcessor` callbacks (`onProductionCompleted`, `onPopulationGrowth`)
  - `PlayerManager` events (`eliminated`)
  - `CombatExecutor` results
  - Map generation events
  - Turn system events

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Debug overlay may conflict with tile-info-panel position (both bottom-left) | Use higher z-index for debug overlay; consider moving tile-info-panel when debug active |
| Many notifications firing at once (e.g., multiple production completions) | Enforce max visible toasts, auto-dismiss oldest |
| Performance impact from frequent DOM updates in debug mode | Limit stored debug entries to 100, only update when visible |
| localStorage not available | Wrap in try-catch, default to debug disabled |
| Debug toggle key (`) conflicts with future chat input | Use F12 as alternative; document key binding |

## Testing Notes

- Manual testing: Enable debug mode, perform actions, verify log entries appear
- Manual testing: Complete production, verify toast notification appears
- Manual testing: Refresh page with debug enabled, verify state persists
- Unit tests: `NotificationState` can be tested in isolation for subscribe/push behavior
