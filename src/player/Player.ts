/**
 * Player types and constants for the Player/Faction tracking system.
 */

/** Maximum number of players supported */
export const MAX_PLAYERS = 8;

/** Player color palette (expanded from PLAYER_COLORS in UnitRenderer.ts) */
export const PLAYER_COLORS: readonly number[] = [
  0x3498db, // Blue (Player 0)
  0xe74c3c, // Red (Player 1)
  0x2ecc71, // Green (Player 2)
  0xf39c12, // Orange (Player 3)
  0x9b59b6, // Purple (Player 4)
  0x1abc9c, // Teal (Player 5)
  0xe91e63, // Pink (Player 6)
  0x795548, // Brown (Player 7)
];

/** Core player data */
export interface Player {
  readonly id: number; // Matches OwnerComponent.playerId
  name: string; // "Player 1", faction name, etc.
  color: number; // Hex color for rendering
  isHuman: boolean; // true for human players
  isEliminated: boolean; // true when defeated
}

/** Read-only player data for external use */
export type PlayerSnapshot = Readonly<Player>;

/** Event types for player state changes */
export type PlayerEventType = 'eliminated' | 'added' | 'updated';

export interface PlayerEvent {
  type: PlayerEventType;
  playerId: number;
}
