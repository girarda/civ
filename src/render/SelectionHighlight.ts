/**
 * Visual selection indicator for selected units.
 * Renders a ring/glow around the selected unit.
 */

import { Graphics, Container } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';

const SELECTION_COLOR = 0xffff00; // Yellow for selection
const SELECTION_ALPHA = 0.6;
const SELECTION_RING_RADIUS = 18;
const SELECTION_STROKE_WIDTH = 3;

export class SelectionHighlight {
  private graphic: Graphics;
  private layout: HexGridLayout;
  private currentPosition: TilePosition | null = null;

  constructor(container: Container, layout: HexGridLayout) {
    this.layout = layout;
    this.graphic = new Graphics();
    this.graphic.visible = false;
    container.addChild(this.graphic);
  }

  /**
   * Show selection highlight at the specified hex position.
   */
  show(position: TilePosition): void {
    if (this.currentPosition && this.currentPosition.equals(position)) {
      return;
    }

    this.currentPosition = position;
    this.redraw();
    this.graphic.visible = true;
  }

  /**
   * Hide the selection highlight.
   */
  hide(): void {
    this.graphic.visible = false;
    this.currentPosition = null;
  }

  /**
   * Check if highlight is currently visible.
   */
  isVisible(): boolean {
    return this.graphic.visible;
  }

  /**
   * Get the currently highlighted position.
   */
  getPosition(): TilePosition | null {
    return this.currentPosition;
  }

  private redraw(): void {
    if (!this.currentPosition) return;

    const worldPos = this.layout.hexToWorld(this.currentPosition);

    this.graphic.clear();

    // Draw selection ring around unit
    this.graphic.circle(0, 0, SELECTION_RING_RADIUS);
    this.graphic.stroke({
      width: SELECTION_STROKE_WIDTH,
      color: SELECTION_COLOR,
      alpha: SELECTION_ALPHA,
    });

    this.graphic.position.set(worldPos.x, worldPos.y);
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.graphic.destroy();
  }
}
