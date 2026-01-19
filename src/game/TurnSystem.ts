import { GameState } from './GameState';
import { TurnPhase } from './TurnPhase';

/**
 * Callbacks for turn processing hooks.
 * These will be populated as unit/city systems are implemented.
 */
export interface TurnProcessingHooks {
  /** Called at turn start - reset unit movement points, apply start-of-turn effects */
  onTurnStart?: () => void;
  /** Called at turn end - apply end-of-turn effects, process production/growth */
  onTurnEnd?: () => void;
}

/**
 * Orchestrates turn processing with hooks for game systems.
 * Coordinates with GameState to trigger effects at appropriate phases.
 */
export class TurnSystem {
  private gameState: GameState;
  private hooks: TurnProcessingHooks;
  private unsubscribe: (() => void) | null = null;

  constructor(gameState: GameState, hooks: TurnProcessingHooks = {}) {
    this.gameState = gameState;
    this.hooks = hooks;
  }

  /**
   * Start listening to game state changes.
   * Triggers hooks based on phase transitions.
   */
  attach(): void {
    this.unsubscribe = this.gameState.subscribe((state) => {
      switch (state.phase) {
        case TurnPhase.TurnStart:
          this.processTurnStart();
          break;
        case TurnPhase.TurnEnd:
          this.processTurnEnd();
          break;
      }
    });
  }

  /**
   * Stop listening to game state changes.
   */
  detach(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Process start-of-turn effects.
   * - Reset unit movement (stub)
   * - Apply start-of-turn effects
   */
  private processTurnStart(): void {
    this.resetUnitMovement();
    this.hooks.onTurnStart?.();
  }

  /**
   * Process end-of-turn effects.
   * - Process production (stub)
   * - Update growth (stub)
   * - Apply end-of-turn effects
   */
  private processTurnEnd(): void {
    this.processProduction();
    this.updateGrowth();
    this.hooks.onTurnEnd?.();
  }

  /**
   * Stub: Reset movement points for all units.
   * Will be implemented when unit system is added.
   */
  private resetUnitMovement(): void {
    // TODO: Implement when unit system is added
    // Query all units and reset their movement points
  }

  /**
   * Stub: Process production for all cities.
   * Will be implemented when city system is added.
   */
  private processProduction(): void {
    // TODO: Implement when city system is added
    // Query all cities and process their production queues
  }

  /**
   * Stub: Update population growth for all cities.
   * Will be implemented when city system is added.
   */
  private updateGrowth(): void {
    // TODO: Implement when city system is added
    // Query all cities and update their population growth
  }
}
