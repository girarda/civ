/**
 * UnitRenderer - Renders units as colored circles with letter indicators on hexes.
 */

import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { UnitType, getUnitLetter } from '../unit/UnitType';

/** Player colors for unit rendering */
export const PLAYER_COLORS: readonly number[] = [
  0x3498db, // Blue (Player 0)
  0xe74c3c, // Red (Player 1)
  0x2ecc71, // Green (Player 2)
  0xf39c12, // Orange (Player 3)
  0x9b59b6, // Purple (Player 4)
  0x1abc9c, // Teal (Player 5)
];

const UNIT_RADIUS = 12;

export class UnitRenderer {
  private container: Container;
  private layout: HexGridLayout;
  private graphics: Map<number, Graphics> = new Map();

  constructor(container: Container, layout: HexGridLayout) {
    this.container = container;
    this.layout = layout;
  }

  /**
   * Create and add a unit graphic.
   */
  createUnitGraphic(
    eid: number,
    position: TilePosition,
    unitType: UnitType,
    playerId: number
  ): Graphics {
    const worldPos = this.layout.hexToWorld(position);
    const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

    const graphic = new Graphics();
    graphic.circle(0, 0, UNIT_RADIUS);
    graphic.fill({ color });
    graphic.stroke({ width: 2, color: 0x000000, alpha: 0.5 });
    graphic.position.set(worldPos.x, worldPos.y);

    // Add letter abbreviation
    const letter = getUnitLetter(unitType);
    const style = new TextStyle({
      fontSize: 12,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    const text = new Text({ text: letter, style });
    text.anchor.set(0.5);
    graphic.addChild(text);

    this.graphics.set(eid, graphic);
    this.container.addChild(graphic);
    return graphic;
  }

  /**
   * Update the position of a unit graphic.
   */
  updatePosition(eid: number, position: TilePosition): void {
    const graphic = this.graphics.get(eid);
    if (graphic) {
      const worldPos = this.layout.hexToWorld(position);
      graphic.position.set(worldPos.x, worldPos.y);
    }
  }

  /**
   * Remove a unit graphic.
   */
  removeUnit(eid: number): void {
    const graphic = this.graphics.get(eid);
    if (graphic) {
      this.container.removeChild(graphic);
      graphic.destroy();
      this.graphics.delete(eid);
    }
  }

  /**
   * Clear all unit graphics.
   */
  clear(): void {
    for (const [eid] of this.graphics) {
      this.removeUnit(eid);
    }
  }

  /**
   * Get the graphic for a unit entity.
   */
  getGraphic(eid: number): Graphics | undefined {
    return this.graphics.get(eid);
  }

  /**
   * Check if a unit graphic exists.
   */
  hasGraphic(eid: number): boolean {
    return this.graphics.has(eid);
  }

  /**
   * Get the number of rendered units.
   */
  getCount(): number {
    return this.graphics.size;
  }

  /**
   * Get the container.
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Get the layout.
   */
  getLayout(): HexGridLayout {
    return this.layout;
  }
}
