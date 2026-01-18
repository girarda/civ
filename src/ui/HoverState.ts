import { TilePosition } from '../hex/TilePosition';
import { Terrain } from '../tile/Terrain';
import { TileFeature } from '../tile/TileFeature';

export interface HoveredTile {
  position: TilePosition;
  terrain: Terrain;
  feature: TileFeature | null;
}

type HoverListener = (tile: HoveredTile | null) => void;

/**
 * Reactive state management for the currently hovered tile.
 * Supports subscribing to state changes for UI updates.
 */
export class HoverState {
  private current: HoveredTile | null = null;
  private listeners: HoverListener[] = [];

  /** Get the currently hovered tile, or null if no tile is hovered */
  get(): HoveredTile | null {
    return this.current;
  }

  /** Update the hovered tile and notify all listeners */
  set(tile: HoveredTile | null): void {
    // Skip update if both are null (no change)
    if (this.current === null && tile === null) return;

    // Skip update if hovering over the same tile position
    if (
      this.current &&
      tile &&
      this.current.position.equals(tile.position)
    ) {
      return;
    }

    this.current = tile;
    for (const listener of this.listeners) {
      listener(tile);
    }
  }

  /**
   * Subscribe to hover state changes.
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: HoverListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /** Remove all listeners */
  clear(): void {
    this.listeners = [];
    this.current = null;
  }
}
