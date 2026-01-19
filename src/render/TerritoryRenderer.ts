/**
 * TerritoryRenderer - Renders territory borders and overlays.
 * Shows which tiles belong to which city using semi-transparent overlays.
 */

import { Graphics, Container } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { PLAYER_COLORS } from '../player';

const TERRITORY_ALPHA = 0.15;
const BORDER_ALPHA = 0.5;
const BORDER_WIDTH = 2;

export class TerritoryRenderer {
  private container: Container;
  private layout: HexGridLayout;
  private territoryGraphics: Map<number, Graphics> = new Map();

  constructor(container: Container, layout: HexGridLayout) {
    this.container = container;
    this.layout = layout;
  }

  /**
   * Update territory rendering for a city.
   * @param cityEid - City entity ID
   * @param tiles - Array of tile positions owned by the city
   * @param playerId - Owning player ID for color
   */
  updateTerritoryBorders(cityEid: number, tiles: TilePosition[], playerId: number): void {
    // Remove existing graphics for this city
    this.removeTerritoryForCity(cityEid);

    if (tiles.length === 0) return;

    const color = PLAYER_COLORS[playerId % PLAYER_COLORS.length];
    const graphic = new Graphics();

    // Get hex points for drawing
    const hexPoints = this.layout.getHexPoints();

    // Draw overlay for each tile
    for (const tile of tiles) {
      const worldPos = this.layout.hexToWorld(tile);

      // Draw semi-transparent overlay
      graphic.poly(hexPoints.map((p) => ({ x: p.x + worldPos.x, y: p.y + worldPos.y })));
      graphic.fill({ color, alpha: TERRITORY_ALPHA });
    }

    // Draw borders - for outer edges only
    // We need to identify edges that are on the border (not shared with another owned tile)
    const tileSet = new Set(tiles.map((t) => t.key()));

    for (const tile of tiles) {
      const worldPos = this.layout.hexToWorld(tile);
      const neighbors = tile.neighbors();

      for (let i = 0; i < 6; i++) {
        const neighbor = neighbors[i];
        // If neighbor is not owned by this city, draw a border edge
        if (!tileSet.has(neighbor.key())) {
          const p1 = hexPoints[i];
          const p2 = hexPoints[(i + 1) % 6];

          graphic.moveTo(worldPos.x + p1.x, worldPos.y + p1.y);
          graphic.lineTo(worldPos.x + p2.x, worldPos.y + p2.y);
          graphic.stroke({ width: BORDER_WIDTH, color, alpha: BORDER_ALPHA });
        }
      }
    }

    this.territoryGraphics.set(cityEid, graphic);
    this.container.addChildAt(graphic, 0); // Add at bottom of container
  }

  /**
   * Remove territory graphics for a specific city.
   */
  removeTerritoryForCity(cityEid: number): void {
    const graphic = this.territoryGraphics.get(cityEid);
    if (graphic) {
      this.container.removeChild(graphic);
      graphic.destroy();
      this.territoryGraphics.delete(cityEid);
    }
  }

  /**
   * Clear all territory graphics.
   */
  clear(): void {
    for (const [cityEid] of this.territoryGraphics) {
      this.removeTerritoryForCity(cityEid);
    }
  }

  /**
   * Get the number of cities with rendered territory.
   */
  getCount(): number {
    return this.territoryGraphics.size;
  }

  /**
   * Check if territory is rendered for a city.
   */
  hasTerritoryGraphic(cityEid: number): boolean {
    return this.territoryGraphics.has(cityEid);
  }
}
