/**
 * CityRenderer - Renders cities as visual markers on hexes.
 * Similar to UnitRenderer but with city-specific styling.
 */

import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { PLAYER_COLORS } from './UnitRenderer';

const CITY_WIDTH = 24;
const CITY_HEIGHT = 18;

export class CityRenderer {
  private container: Container;
  private layout: HexGridLayout;
  private graphics: Map<number, Graphics> = new Map();
  private cityNames: Map<number, string> = new Map();

  constructor(container: Container, layout: HexGridLayout) {
    this.container = container;
    this.layout = layout;
  }

  /**
   * Create and add a city graphic.
   */
  createCityGraphic(
    eid: number,
    position: TilePosition,
    name: string,
    playerId: number
  ): Graphics {
    const worldPos = this.layout.hexToWorld(position);
    const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];

    const graphic = new Graphics();

    // Draw city marker as a house-like shape
    graphic.rect(-CITY_WIDTH / 2, -CITY_HEIGHT / 2, CITY_WIDTH, CITY_HEIGHT);
    graphic.fill({ color });
    graphic.stroke({ width: 2, color: 0x000000, alpha: 0.7 });

    // Draw roof triangle
    graphic.moveTo(-CITY_WIDTH / 2 - 2, -CITY_HEIGHT / 2);
    graphic.lineTo(0, -CITY_HEIGHT / 2 - 8);
    graphic.lineTo(CITY_WIDTH / 2 + 2, -CITY_HEIGHT / 2);
    graphic.closePath();
    graphic.fill({ color });
    graphic.stroke({ width: 2, color: 0x000000, alpha: 0.7 });

    graphic.position.set(worldPos.x, worldPos.y);

    // Add city name label below marker
    const style = new TextStyle({
      fontSize: 10,
      fontWeight: 'bold',
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 2 },
    });
    const nameText = new Text({ text: name, style });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(0, CITY_HEIGHT / 2 + 4);
    graphic.addChild(nameText);

    this.graphics.set(eid, graphic);
    this.cityNames.set(eid, name);
    this.container.addChild(graphic);
    return graphic;
  }

  /**
   * Update the position of a city graphic.
   */
  updatePosition(eid: number, position: TilePosition): void {
    const graphic = this.graphics.get(eid);
    if (graphic) {
      const worldPos = this.layout.hexToWorld(position);
      graphic.position.set(worldPos.x, worldPos.y);
    }
  }

  /**
   * Update the name of a city.
   */
  updateName(eid: number, name: string): void {
    const graphic = this.graphics.get(eid);
    if (graphic && graphic.children.length > 0) {
      const nameText = graphic.children[0] as Text;
      nameText.text = name;
      this.cityNames.set(eid, name);
    }
  }

  /**
   * Remove a city graphic.
   */
  removeCity(eid: number): void {
    const graphic = this.graphics.get(eid);
    if (graphic) {
      this.container.removeChild(graphic);
      graphic.destroy();
      this.graphics.delete(eid);
      this.cityNames.delete(eid);
    }
  }

  /**
   * Clear all city graphics.
   */
  clear(): void {
    for (const [eid] of this.graphics) {
      this.removeCity(eid);
    }
  }

  /**
   * Get the graphic for a city entity.
   */
  getGraphic(eid: number): Graphics | undefined {
    return this.graphics.get(eid);
  }

  /**
   * Check if a city graphic exists.
   */
  hasGraphic(eid: number): boolean {
    return this.graphics.has(eid);
  }

  /**
   * Get the number of rendered cities.
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
   * Get the city name for an entity.
   */
  getCityName(eid: number): string | undefined {
    return this.cityNames.get(eid);
  }
}
