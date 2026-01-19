/**
 * PlayerManager - Manages player state throughout the game.
 * Provides queries for active players and elimination tracking.
 */

import { IWorld } from 'bitecs';
import { Player, PlayerSnapshot, PlayerEvent, PLAYER_COLORS, MAX_PLAYERS } from './Player';
import { getUnitsForPlayer } from '../ecs/unitSystems';
import { getCitiesForPlayer } from '../ecs/citySystems';

type PlayerListener = (event: PlayerEvent) => void;

/**
 * Manages player state throughout the game.
 * Provides queries for active players and elimination tracking.
 */
export class PlayerManager {
  private players: Map<number, Player> = new Map();
  private listeners: PlayerListener[] = [];

  /**
   * Initialize players for a new game.
   * @param humanPlayerIds - IDs of human-controlled players (typically [0])
   * @param totalPlayers - Total number of players (human + AI)
   */
  initialize(humanPlayerIds: number[], totalPlayers: number): void {
    this.players.clear();

    const effectiveTotal = Math.min(totalPlayers, MAX_PLAYERS);
    for (let id = 0; id < effectiveTotal; id++) {
      const isHuman = humanPlayerIds.includes(id);
      this.players.set(id, {
        id,
        name: isHuman ? `Player ${id + 1}` : `AI ${id}`,
        color: PLAYER_COLORS[id % PLAYER_COLORS.length],
        isHuman,
        isEliminated: false,
      });
    }
  }

  /** Get a player by ID */
  getPlayer(id: number): PlayerSnapshot | undefined {
    return this.players.get(id);
  }

  /** Get all players */
  getAllPlayers(): PlayerSnapshot[] {
    return Array.from(this.players.values());
  }

  /** Get active (non-eliminated) players */
  getActivePlayers(): PlayerSnapshot[] {
    return this.getAllPlayers().filter((p) => !p.isEliminated);
  }

  /** Get human players */
  getHumanPlayers(): PlayerSnapshot[] {
    return this.getAllPlayers().filter((p) => p.isHuman);
  }

  /** Get AI players */
  getAIPlayers(): PlayerSnapshot[] {
    return this.getAllPlayers().filter((p) => !p.isHuman);
  }

  /** Get eliminated players */
  getEliminatedPlayers(): PlayerSnapshot[] {
    return this.getAllPlayers().filter((p) => p.isEliminated);
  }

  /** Check if a player is eliminated */
  isPlayerEliminated(id: number): boolean {
    return this.players.get(id)?.isEliminated ?? false;
  }

  /** Get the number of active players */
  getActivePlayerCount(): number {
    return this.getActivePlayers().length;
  }

  /** Get total player count */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Check if a player should be eliminated (0 units and 0 cities).
   * Call after combat or city capture.
   * @returns true if player was eliminated, false otherwise
   */
  checkElimination(world: IWorld, playerId: number): boolean {
    const player = this.players.get(playerId);
    if (!player || player.isEliminated) return false;

    const units = getUnitsForPlayer(world, playerId);
    const cities = getCitiesForPlayer(world, playerId);

    if (units.length === 0 && cities.length === 0) {
      player.isEliminated = true;
      this.notify({ type: 'eliminated', playerId });
      return true;
    }
    return false;
  }

  /**
   * Manually mark a player as eliminated.
   * Use for scenarios like surrender or disconnection.
   */
  eliminatePlayer(playerId: number): void {
    const player = this.players.get(playerId);
    if (player && !player.isEliminated) {
      player.isEliminated = true;
      this.notify({ type: 'eliminated', playerId });
    }
  }

  /**
   * Get player color (convenience method for renderers).
   * Falls back to first color if player not found.
   */
  getPlayerColor(id: number): number {
    return this.players.get(id)?.color ?? PLAYER_COLORS[0];
  }

  /**
   * Get player name.
   * Falls back to "Unknown" if player not found.
   */
  getPlayerName(id: number): string {
    return this.players.get(id)?.name ?? 'Unknown';
  }

  /** Subscribe to player events */
  subscribe(listener: PlayerListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  }

  private notify(event: PlayerEvent): void {
    // Create a shallow copy to avoid mutation during iteration
    const listeners = [...this.listeners];
    for (const listener of listeners) {
      listener(event);
    }
  }

  /** Clear all state */
  clear(): void {
    this.players.clear();
    this.listeners = [];
  }
}
