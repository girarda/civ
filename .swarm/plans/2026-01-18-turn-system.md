# Turn System Implementation Plan

**Created**: 2026-01-18
**Status**: Draft
**Dependencies**: None (can use placeholder units/cities)
**Unlocks**: Production, Combat resolution, AI turns

## Overview

Implement a turn-based game state system following the existing reactive state patterns in the codebase. This includes turn state management, turn processing logic, and UI controls for advancing turns.

## Success Criteria

1. Turn number displays and increments correctly
2. "End Turn" button advances the turn
3. Turn phase transitions work correctly (start → action → end)
4. Unit movement points reset at turn start (placeholder/stub)
5. Production and growth processing hooks exist (placeholder/stub)
6. All existing tests pass
7. New unit tests cover turn state transitions

## Phase 1: Game State Foundation

**Goal**: Create the core reactive state management for turns

### Files to Create

**src/game/GameState.ts**
```typescript
// Following HoverState pattern with:
// - Turn number tracking
// - Turn phase enum (Start, Action, End)
// - Player tracking (for future multiplayer)
// - Listener subscription system
// - get/set methods with validation
```

**src/game/TurnPhase.ts**
```typescript
// Enum for turn phases:
// - TurnStart: Beginning of turn processing
// - PlayerAction: Player can take actions
// - TurnEnd: End of turn processing
```

**src/game/index.ts**
```typescript
// Export all game state modules
```

### Implementation Details

- `GameState` class with private `turnNumber`, `phase`, `currentPlayer` fields
- `subscribe(listener)` returning unsubscribe function
- `nextTurn()` method that transitions through phases
- `getCurrentTurn()`, `getPhase()`, `getCurrentPlayer()` getters
- Singleton export pattern or instance created in main.ts

## Phase 2: Turn UI Controls

**Goal**: Add End Turn button and turn display

### HTML Changes

**index.html**
```html
<!-- Add to existing UI structure -->
<div id="turn-display">Turn 1</div>
<button id="end-turn-btn">End Turn</button>
```

### Files to Create

**src/ui/TurnControls.ts**
```typescript
// Following MapControls pattern:
// - Constructor finds DOM elements
// - Validates elements exist
// - Sets up click listener with callback
// - updateTurnDisplay(turnNumber) method
// - setEnabled(enabled) for button state
// - attach/detach lifecycle methods
```

### CSS Updates

**src/style.css**
```css
/* Turn controls styling */
#turn-display { /* positioned in UI area */ }
#end-turn-btn { /* styled button */ }
```

## Phase 3: Turn Processing System

**Goal**: Create turn transition logic with hooks for future systems

### Files to Create

**src/game/TurnSystem.ts**
```typescript
// Turn processing orchestrator:
// - processTurnStart(): Reset movement, apply start-of-turn effects
// - processTurnEnd(): Apply end-of-turn effects, prepare for next turn
// - Placeholder hooks for:
//   - resetUnitMovement() - stub for future unit system
//   - processProduction() - stub for future city system
//   - updateGrowth() - stub for future city system
```

### Integration with ECS

- Create queries for future unit/city components (stubs)
- System functions that will process entities each turn
- Keep as no-ops until unit/city systems are implemented

## Phase 4: Main.ts Integration

**Goal**: Wire everything together

### Changes to main.ts

```typescript
// Initialize game state
const gameState = new GameState();

// Initialize turn controls
const turnControls = new TurnControls((newTurn) => {
  // Callback when End Turn clicked
});

// Subscribe to game state changes
gameState.subscribe((state) => {
  turnControls.updateTurnDisplay(state.turnNumber);
});

// Wire up End Turn button
turnControls.onEndTurn(() => {
  gameState.nextTurn();
});
```

## Phase 5: Testing

**Goal**: Ensure turn system works correctly

### Unit Tests (src/game/__tests__/)

**GameState.test.ts**
- Initial state is turn 1, PlayerAction phase
- nextTurn() increments turn number
- Phase transitions work correctly
- Subscribers are notified on state change
- Unsubscribe prevents further notifications

**TurnSystem.test.ts**
- processTurnStart() is called at turn start
- processTurnEnd() is called at turn end
- Placeholder hooks are invoked

### E2E Tests (e2e/)

**turn-system.spec.ts**
- End Turn button is visible
- Clicking End Turn increments display
- Turn number persists across interactions

## Implementation Order

1. **Phase 1**: GameState.ts, TurnPhase.ts - Core state management
2. **Phase 2**: TurnControls.ts, HTML/CSS - UI elements
3. **Phase 3**: TurnSystem.ts - Processing logic
4. **Phase 4**: main.ts integration - Wire everything
5. **Phase 5**: Tests - Verify functionality

## File Structure After Implementation

```
src/
├── game/                    (NEW)
│   ├── GameState.ts        (Reactive turn state)
│   ├── TurnPhase.ts        (Phase enum)
│   ├── TurnSystem.ts       (Turn processing)
│   ├── index.ts            (Exports)
│   └── __tests__/
│       ├── GameState.test.ts
│       └── TurnSystem.test.ts
├── ui/
│   ├── TurnControls.ts     (NEW - End Turn button)
│   └── ...existing
├── main.ts                  (Updated integration)
└── style.css                (Updated with turn UI styles)

e2e/
└── turn-system.spec.ts      (NEW)
```

## Notes

- No turn timer implementation (per user request)
- Placeholder/stub implementations for unit movement and city production
- Single-player focus initially (currentPlayer can be expanded later)
- Event-driven architecture - no polling in game loop
- Follow existing patterns: HoverState for state, MapControls for UI
