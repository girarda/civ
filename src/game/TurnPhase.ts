/**
 * Phases of a turn in the game loop.
 */
export enum TurnPhase {
  /** Beginning of turn processing - reset movement, apply start-of-turn effects */
  TurnStart = 'TurnStart',
  /** Player can take actions */
  PlayerAction = 'PlayerAction',
  /** End of turn processing - apply end-of-turn effects */
  TurnEnd = 'TurnEnd',
}
