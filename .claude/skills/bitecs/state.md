---
name: typescript-state-machine
description: Creates a game state machine with transitions and handlers. Use when the user asks to create, generate, or add a game state, screen, phase, mode, or flow control.
user-invocable: true
---

# Create State Machine

## Purpose
Generate a TypeScript state machine for managing game phases and transitions.

## Input
$ARGUMENTS

If $ARGUMENTS is empty, ask for the state names and transitions.

## Instructions

1. Define states as TypeScript enum
2. Create StateMachine class with current state
3. Add enter/exit handlers for state lifecycle
4. Include transition validation (optional)
5. Show state-conditional system execution
6. Provide subscription mechanism for UI updates

## Output Format

### State Definition

```typescript
// state/GameState.ts

export enum GameState {
  Menu = 'Menu',
  Loading = 'Loading',
  Playing = 'Playing',
  Paused = 'Paused',
  GameOver = 'GameOver',
}

// Turn phase substates
export enum TurnPhase {
  PlayerMove = 'PlayerMove',
  PlayerAction = 'PlayerAction',
  AITurn = 'AITurn',
  Environment = 'Environment',
}
```

### StateMachine Implementation

```typescript
// state/StateMachine.ts

type StateHandler = () => void;
type StateChangeListener<T> = (newState: T, oldState: T) => void;

export class StateMachine<T extends string> {
  private state: T;
  private enterHandlers = new Map<T, StateHandler>();
  private exitHandlers = new Map<T, StateHandler>();
  private listeners = new Set<StateChangeListener<T>>();
  private validTransitions: Map<T, Set<T>> | null = null;

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * Gets the current state.
   */
  getState(): T {
    return this.state;
  }

  /**
   * Checks if currently in a specific state.
   */
  isState(state: T): boolean {
    return this.state === state;
  }

  /**
   * Transitions to a new state.
   * @throws Error if transition is invalid
   */
  transition(newState: T): void {
    if (newState === this.state) return;

    // Validate transition if rules defined
    if (this.validTransitions) {
      const allowed = this.validTransitions.get(this.state);
      if (!allowed?.has(newState)) {
        throw new Error(`Invalid transition from ${this.state} to ${newState}`);
      }
    }

    const oldState = this.state;

    // Exit current state
    const exitHandler = this.exitHandlers.get(this.state);
    if (exitHandler) exitHandler();

    // Update state
    this.state = newState;

    // Enter new state
    const enterHandler = this.enterHandlers.get(newState);
    if (enterHandler) enterHandler();

    // Notify listeners
    for (const listener of this.listeners) {
      listener(newState, oldState);
    }
  }

  /**
   * Registers a handler for entering a state.
   */
  onEnter(state: T, handler: StateHandler): this {
    this.enterHandlers.set(state, handler);
    return this;
  }

  /**
   * Registers a handler for exiting a state.
   */
  onExit(state: T, handler: StateHandler): this {
    this.exitHandlers.set(state, handler);
    return this;
  }

  /**
   * Subscribes to state changes.
   * @returns Unsubscribe function
   */
  subscribe(listener: StateChangeListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Defines valid state transitions.
   */
  setTransitions(transitions: Record<T, T[]>): this {
    this.validTransitions = new Map();
    for (const [from, toStates] of Object.entries(transitions)) {
      this.validTransitions.set(from as T, new Set(toStates as T[]));
    }
    return this;
  }
}
```

## Usage Examples

```typescript
import { StateMachine } from './state/StateMachine';
import { GameState, TurnPhase } from './state/GameState';

// Create state machine with initial state
const gameState = new StateMachine<GameState>(GameState.Menu);
const turnPhase = new StateMachine<TurnPhase>(TurnPhase.PlayerMove);

// Define valid transitions
gameState.setTransitions({
  [GameState.Menu]: [GameState.Loading],
  [GameState.Loading]: [GameState.Playing],
  [GameState.Playing]: [GameState.Paused, GameState.GameOver],
  [GameState.Paused]: [GameState.Playing, GameState.Menu],
  [GameState.GameOver]: [GameState.Menu],
});

// Register state handlers
gameState
  .onEnter(GameState.Playing, () => {
    console.log('Game started');
    initializeGame();
  })
  .onExit(GameState.Playing, () => {
    console.log('Game paused or ended');
    saveGameProgress();
  })
  .onEnter(GameState.Paused, () => {
    showPauseMenu();
  });

// Subscribe to changes (for UI updates)
const unsubscribe = gameState.subscribe((newState, oldState) => {
  console.log(`State changed: ${oldState} -> ${newState}`);
  updateUI(newState);
});

// Transition
gameState.transition(GameState.Loading);
gameState.transition(GameState.Playing);
```

## State-Conditional System Execution

```typescript
import { World } from 'bitecs';
import { gameState, turnPhase } from './state';
import { GameState, TurnPhase } from './state/GameState';

// Systems array per state
const playingSystems = [inputSystem, selectionSystem, movementSystem];
const pausedSystems = [pauseMenuSystem];
const alwaysSystems = [renderSystem, audioSystem];

function gameLoop(world: World, delta: number): void {
  // Always run these
  for (const system of alwaysSystems) {
    system(world);
  }

  // State-specific systems
  switch (gameState.getState()) {
    case GameState.Playing:
      for (const system of playingSystems) {
        system(world);
      }

      // Turn phase subsystems
      if (turnPhase.isState(TurnPhase.AITurn)) {
        aiSystem(world);
      }
      break;

    case GameState.Paused:
      for (const system of pausedSystems) {
        system(world);
      }
      break;
  }
}
```

## Common Patterns

| Pattern | Use Case |
|---------|----------|
| Flat states | Simple game flow (menu, play, pause) |
| Nested machines | Complex flows (game state + turn phase) |
| Transition validation | Prevent invalid state changes |
| State handlers | Setup/cleanup on enter/exit |

## If unclear
- Start with flat enum (add nesting if needed)
- Use string enums for debuggability
- Validate transitions only if needed
