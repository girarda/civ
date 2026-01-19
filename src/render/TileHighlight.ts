import { Graphics, Container } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';

const DEFAULT_HIGHLIGHT_COLOR = 0xffffff;
const DEFAULT_HIGHLIGHT_ALPHA = 0.4;
const DEFAULT_STROKE_WIDTH = 3;

/**
 * Visual highlight for hovered tiles.
 * Renders a semi-transparent overlay with a distinct border.
 */
export class TileHighlight {
  private graphic: Graphics;
  private layout: HexGridLayout;
  private currentPosition: TilePosition | null = null;
  private highlightColor: number = DEFAULT_HIGHLIGHT_COLOR;

  constructor(container: Container, layout: HexGridLayout) {
    this.layout = layout;
    this.graphic = new Graphics();
    this.graphic.visible = false;
    container.addChild(this.graphic);
  }

  /** Show highlight at the specified hex position */
  show(position: TilePosition): void {
    // Skip redraw if position hasn't changed
    if (this.currentPosition && this.currentPosition.equals(position)) {
      return;
    }

    this.currentPosition = position;
    this.redraw();
    this.graphic.visible = true;
  }

  /** Hide the highlight */
  hide(): void {
    this.graphic.visible = false;
    this.currentPosition = null;
  }

  /** Set the highlight color */
  setColor(color: number): void {
    this.highlightColor = color;
    if (this.currentPosition) {
      this.redraw();
    }
  }

  /** Check if highlight is currently visible */
  isVisible(): boolean {
    return this.graphic.visible;
  }

  /** Get the currently highlighted position */
  getPosition(): TilePosition | null {
    return this.currentPosition;
  }

  private redraw(): void {
    if (!this.currentPosition) return;

    const worldPos = this.layout.hexToWorld(this.currentPosition);
    const corners = this.layout.hexCorners(this.currentPosition);

    // Compute local corner coordinates once
    const localCorners = corners.flatMap((c) => [c.x - worldPos.x, c.y - worldPos.y]);

    this.graphic.clear();

    // Draw filled hex with alpha
    this.graphic.poly(localCorners);
    this.graphic.fill({
      color: this.highlightColor,
      alpha: DEFAULT_HIGHLIGHT_ALPHA,
    });

    // Draw distinct border
    this.graphic.poly(localCorners);
    this.graphic.stroke({
      width: DEFAULT_STROKE_WIDTH,
      color: this.highlightColor,
      alpha: 0.9,
    });

    this.graphic.position.set(worldPos.x, worldPos.y);
  }

  /** Clean up resources */
  destroy(): void {
    this.graphic.destroy();
  }
}
