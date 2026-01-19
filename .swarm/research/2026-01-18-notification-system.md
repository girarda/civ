# Research: Notification System

**Date**: 2026-01-18
**Status**: Complete

## Summary

Research into implementing a notification system for OpenCiv reveals that the codebase already has a well-established reactive state management pattern using a subscriber/listener model. The game currently uses `console.log` for debug output scattered across multiple files. A notification system should leverage the existing patterns while introducing a unified approach for both player-facing notifications (toast/event log) and togglable debug output.

## Key Discoveries

- **Consistent reactive pattern exists** - All state classes (`HoverState`, `SelectionState`, `CityState`, `GameState`, `CombatPreviewState`, `PlayerManager`) use the same subscriber pattern with `subscribe()` returning an unsubscribe function
- **UI panels follow DOM-based pattern** - Panels like `TileInfoPanel`, `CityInfoPanel`, `CombatPreviewPanel` manage DOM elements directly with `show()`/`hide()` methods and `.hidden` CSS class
- **Callbacks used for async events** - `CityProcessor` uses callback interfaces (`onProductionCompleted`, `onPopulationGrowth`) to notify when events occur
- **No centralized logging** - Debug output is scattered as `console.log` calls in `main.ts`, `CityProcessor.ts`, etc.
- **PlayerManager has event subscription** - Already emits events like `{type: 'eliminated', playerId}` via subscriber pattern
- **Fixed panel positioning** - UI panels use CSS fixed positioning (bottom-left for tile info, bottom-right for city info, etc.)

## Architecture Overview

### Current Event/Notification Patterns

```
Player Action (click, keypress)
       |
       v
State Update (SelectionState, CityState, etc.)
       |
       v
Subscriber Notification (listener callbacks)
       |
       v
UI Update (Panel.show/hide, console.log)
```

### Existing State Management Pattern

From `/Users/alex/workspace/civ/src/ui/HoverState.ts`:

```typescript
type HoverListener = (tile: HoveredTile | null) => void;

export class HoverState {
  private current: HoveredTile | null = null;
  private listeners: HoverListener[] = [];

  set(tile: HoveredTile | null): void {
    this.current = tile;
    for (const listener of this.listeners) {
      listener(tile);
    }
  }

  subscribe(listener: HoverListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}
```

### Existing Debug Logging Locations

| File | Line | Debug Output |
|------|------|--------------|
| `/Users/alex/workspace/civ/src/main.ts` | 60 | `'OpenCiv initializing...'` |
| `/Users/alex/workspace/civ/src/main.ts` | 152 | Player elimination |
| `/Users/alex/workspace/civ/src/main.ts` | 171 | Production completed |
| `/Users/alex/workspace/civ/src/main.ts` | 174 | Population growth |
| `/Users/alex/workspace/civ/src/main.ts` | 322 | Map generated |
| `/Users/alex/workspace/civ/src/main.ts` | 338 | Turn started |
| `/Users/alex/workspace/civ/src/main.ts` | 356 | Turn ending |
| `/Users/alex/workspace/civ/src/main.ts` | 548-549 | Combat result |
| `/Users/alex/workspace/civ/src/main.ts` | 596,602,626,637 | City founding |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | 120 | No spawn position |

## Patterns Found

### 1. Reactive State Class Pattern

All state management follows this structure:
- Private state variable
- Private listeners array
- `get()` method to retrieve current state
- `set()`/`select()` method to update state and notify
- `subscribe(listener)` returning unsubscribe function
- `clear()` to reset state and listeners

### 2. Panel UI Pattern

From `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts`:

```typescript
export class CityInfoPanel {
  private panel: HTMLElement;
  // ... element references

  constructor() {
    const panel = document.getElementById('city-info-panel');
    if (!panel) throw new Error('Required DOM elements not found');
    this.panel = panel;
  }

  show(...): void {
    // Update content
    this.panel.classList.remove('hidden');
  }

  hide(): void {
    this.panel.classList.add('hidden');
  }
}
```

### 3. Callback Interface Pattern

From `/Users/alex/workspace/civ/src/city/CityProcessor.ts`:

```typescript
export interface CityProcessorCallbacks {
  onProductionCompleted?: (event: ProductionCompletedEvent) => void;
  onPopulationGrowth?: (event: PopulationGrowthEvent) => void;
}
```

### 4. CSS Panel Styling Pattern

From `/Users/alex/workspace/civ/src/style.css`:

```css
#city-info-panel {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(26, 26, 46, 0.95);
  border: 2px solid #6a8a6a;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 220px;
  color: #e0e0e0;
  font-family: 'Segoe UI', sans-serif;
  z-index: 100;
  transition: opacity 0.15s ease;
}

#city-info-panel.hidden {
  opacity: 0;
  pointer-events: none;
}
```

## Key Files

| File | Purpose |
|------|---------|
| `/Users/alex/workspace/civ/src/ui/HoverState.ts` | Reference implementation of reactive state pattern |
| `/Users/alex/workspace/civ/src/ui/CityInfoPanel.ts` | Reference implementation of DOM panel pattern |
| `/Users/alex/workspace/civ/src/combat/CombatPreview.ts` | Example of data-driven state (CombatPreviewData) |
| `/Users/alex/workspace/civ/src/city/CityProcessor.ts` | Example of callback event pattern |
| `/Users/alex/workspace/civ/src/player/PlayerManager.ts` | Example of event subscription with event types |
| `/Users/alex/workspace/civ/src/main.ts` | Integration point where events are wired to console.log |
| `/Users/alex/workspace/civ/index.html` | DOM structure for UI panels |
| `/Users/alex/workspace/civ/src/style.css` | Panel styling patterns |

## Recommendations

### Option A: Unified Notification System (Recommended)

Create a single notification system that handles both player-facing and debug notifications with different severity levels and display modes.

**Architecture:**

```
NotificationState (reactive state)
       |
       +-- Player notifications (toast panel)
       |
       +-- Debug notifications (debug overlay, console)
```

**Implementation:**

1. **NotificationState** (`/Users/alex/workspace/civ/src/ui/NotificationState.ts`):

```typescript
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
  details?: string; // For debug notifications
}

export class NotificationState {
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private nextId = 1;
  private debugEnabled = false;

  push(type: NotificationType, message: string, details?: string): number {
    // Skip debug notifications if not enabled
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

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    this.notifyListeners({ action: 'debug-toggle', enabled });
  }

  // ... subscribe, dismiss, getRecent, etc.
}
```

2. **NotificationPanel** (`/Users/alex/workspace/civ/src/ui/NotificationPanel.ts`):

Toast-style notifications in top-left area, auto-dismiss after ~5 seconds:

```typescript
export class NotificationPanel {
  private container: HTMLElement;
  private state: NotificationState;

  constructor(state: NotificationState) {
    // Create container dynamically or from DOM
    this.state = state;
    state.subscribe(this.handleNotification.bind(this));
  }

  private handleNotification(event: NotificationEvent): void {
    if (event.action === 'add' && event.notification.type !== NotificationType.Debug) {
      this.showToast(event.notification);
    }
  }

  private showToast(notification: Notification): void {
    // Create toast element, auto-dismiss after timeout
  }
}
```

3. **DebugOverlay** (`/Users/alex/workspace/civ/src/ui/DebugOverlay.ts`):

Optional scrolling log in corner, toggled via keyboard shortcut (e.g., F12 or `~`):

```typescript
export class DebugOverlay {
  private container: HTMLElement;
  private state: NotificationState;
  private visible = false;

  constructor(state: NotificationState) {
    this.state = state;
    state.subscribe(this.handleNotification.bind(this));
  }

  toggle(): void {
    this.visible = !this.visible;
    this.state.setDebugEnabled(this.visible);
    this.container.classList.toggle('hidden', !this.visible);
  }

  private handleNotification(event: NotificationEvent): void {
    if (event.notification?.type === NotificationType.Debug) {
      this.appendLog(event.notification);
    }
  }
}
```

4. **Integration in main.ts**:

```typescript
// Create notification system
const notificationState = new NotificationState();
const notificationPanel = new NotificationPanel(notificationState);
const debugOverlay = new DebugOverlay(notificationState);

// Shortcut to toggle debug
window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === 'F12') {
    debugOverlay.toggle();
  }
});

// Replace console.log calls:
notificationState.push(NotificationType.Success, 'Unit produced', `Warrior spawned at (${q},${r})`);
notificationState.push(NotificationType.Debug, 'Map generated', `Seed: ${seed}, ${tiles.length} tiles`);
```

### Option B: Separate Systems

Keep player notifications and debug logging as entirely separate systems.

**Pros:**
- Simpler individual implementations
- Debug system can be more comprehensive (stack traces, etc.)

**Cons:**
- Duplicated patterns
- Harder to correlate player events with debug info
- More files to maintain

### Option C: Event Bus Pattern

Create a central event bus that multiple UI components can subscribe to.

```typescript
type GameEvent =
  | { type: 'unit-produced'; unitType: UnitType; position: TilePosition }
  | { type: 'city-founded'; name: string; position: TilePosition }
  | { type: 'combat-result'; attacker: string; defender: string; outcome: string }
  | { type: 'turn-started'; turnNumber: number }
  | { type: 'debug'; category: string; message: string };

class EventBus {
  emit(event: GameEvent): void;
  subscribe(handler: (event: GameEvent) => void): () => void;
  subscribeType<T extends GameEvent['type']>(type: T, handler: ...): () => void;
}
```

**Pros:**
- Very flexible
- Decoupled components
- Can add new listeners without modifying emitters

**Cons:**
- More complex than needed for current codebase
- Strays from existing simple callback patterns

## Implementation Plan

### Phase 1: Core Notification System (2-3 hours)

**Files to create:**
- `src/ui/NotificationState.ts` - Reactive state for notifications
- `src/ui/NotificationPanel.ts` - Toast UI component
- `src/ui/DebugOverlay.ts` - Debug log UI component

**Files to modify:**
- `index.html` - Add notification containers
- `src/style.css` - Style notification toasts and debug overlay
- `src/ui/index.ts` - Export new modules

### Phase 2: Integration (1-2 hours)

**Files to modify:**
- `src/main.ts` - Initialize notification system, replace console.log calls
- `src/city/CityProcessor.ts` - Emit notifications via callback

### Phase 3: Debug Toggle (1 hour)

**Files to modify:**
- `src/main.ts` - Add keyboard shortcut for debug toggle
- `src/ui/DebugOverlay.ts` - Implement toggle visibility

## CSS Styling Suggestions

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
  animation: slideIn 0.3s ease, fadeOut 0.3s ease 4.7s;
  pointer-events: auto;
}

.notification-toast.success { border-color: #6a9a6a; }
.notification-toast.warning { border-color: #9a9a6a; }
.notification-toast.error { border-color: #9a4a4a; }

@keyframes slideIn {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Debug Overlay */
#debug-overlay {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 400px;
  max-height: 300px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 12px;
  color: #0f0;
  overflow-y: auto;
  z-index: 300;
}

#debug-overlay.hidden {
  display: none;
}

.debug-entry {
  margin: 2px 0;
  padding: 2px 4px;
  border-bottom: 1px solid #222;
}

.debug-entry.error { color: #f66; }
.debug-entry.warn { color: #ff6; }
```

## Player-Facing Notification Examples

| Event | Notification |
|-------|--------------|
| Unit produced | "Warrior ready in Rome" (success) |
| Population growth | "Rome grows to size 3" (info) |
| Enemy eliminated | "The Aztecs have been eliminated!" (info) |
| Combat victory | "Your Warrior defeated the enemy Scout" (success) |
| City founded | "You founded the city of Memphis" (success) |
| Turn started | "Turn 5" (info, optional) |
| Cannot found city | "Cannot found city here" (warning) |

## Debug Notification Examples

| Category | Message |
|----------|---------|
| `[MAP]` | `Generated seed: 42, 400 tiles` |
| `[ECS]` | `Created unit entity #15 at (5,3)` |
| `[TURN]` | `Turn 5 start - resetting 3 units` |
| `[COMBAT]` | `Warrior(#12) vs Scout(#7): 15 dmg / 22 dmg` |
| `[CITY]` | `Processing production for city #3: 8/40` |

## Open Questions

1. **Notification persistence**: Should notifications be stored in a log that players can review later, or are transient toasts sufficient for MVP?
   - Recommendation: Toasts only for MVP. Add event log panel in future.

2. **Notification sounds**: Should important notifications have audio cues?
   - Recommendation: Defer. Audio system is out of scope.

3. **Notification queue management**: What happens if many notifications fire at once?
   - Recommendation: Stack toasts with max visible (e.g., 5), auto-dismiss oldest.

4. **Debug filter categories**: Should debug overlay have category filters?
   - Recommendation: Yes, but optional enhancement. Start with all-or-nothing toggle.

5. **Hot reload debug state**: Should debug mode persist across page refreshes?
   - Recommendation: Store in localStorage. `localStorage.setItem('openciv-debug', 'true')`

6. **Notification positioning conflicts**: The top-left area may conflict with other future UI elements.
   - Recommendation: Use top-center for important notifications, top-left for transient info.

## Conclusion

The recommended approach is **Option A: Unified Notification System** because:

1. It follows existing codebase patterns (reactive state with subscribers)
2. It separates concerns (state vs UI) like existing code
3. It provides a single integration point for both player and debug output
4. The debug toggle feature aligns with development needs
5. It's extensible for future enhancements (event log, categories, etc.)

**Estimated total effort**: 4-6 hours for full implementation including styling and integration.

**Immediate next steps**:
1. Create `NotificationState.ts` following `HoverState.ts` pattern
2. Add DOM containers to `index.html`
3. Create `NotificationPanel.ts` for toast display
4. Wire up to existing event sources in `main.ts`
5. Add debug toggle via keyboard shortcut
