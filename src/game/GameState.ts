import { TurnPhase } from './TurnPhase';

export interface GameStateSnapshot {
  turnNumber: number;
  phase: TurnPhase;
  currentPlayer: number;
}

type GameStateListener = (state: GameStateSnapshot) => void;

/**
 * Reactive state management for game turn state.
 * Follows the HoverState pattern with listener subscriptions.
 */
export class GameState {
  private turnNumber: number = 1;
  private phase: TurnPhase = TurnPhase.PlayerAction;
  private currentPlayer: number = 0;
  private listeners: GameStateListener[] = [];

  /** Get the current turn number */
  getTurnNumber(): number {
    return this.turnNumber;
  }

  /** Get the current turn phase */
  getPhase(): TurnPhase {
    return this.phase;
  }

  /** Get the current player index */
  getCurrentPlayer(): number {
    return this.currentPlayer;
  }

  /** Get a snapshot of the current game state */
  getSnapshot(): GameStateSnapshot {
    return {
      turnNumber: this.turnNumber,
      phase: this.phase,
      currentPlayer: this.currentPlayer,
    };
  }

  /**
   * Advance to the next turn.
   * Transitions through TurnEnd -> TurnStart -> PlayerAction phases.
   */
  nextTurn(): void {
    // Transition to TurnEnd phase
    this.setPhase(TurnPhase.TurnEnd);

    // Increment turn number and transition to TurnStart
    this.turnNumber++;
    this.setPhase(TurnPhase.TurnStart);

    // Transition to PlayerAction phase
    this.setPhase(TurnPhase.PlayerAction);
  }

  /**
   * Set the current phase and notify listeners.
   */
  private setPhase(phase: TurnPhase): void {
    this.phase = phase;
    this.notifyListeners();
  }

  /** Notify all listeners of state change */
  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  /**
   * Subscribe to game state changes.
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: GameStateListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /** Remove all listeners and reset state */
  clear(): void {
    this.listeners = [];
    this.turnNumber = 1;
    this.phase = TurnPhase.PlayerAction;
    this.currentPlayer = 0;
  }
}
