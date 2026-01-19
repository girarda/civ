import { HoveredTile } from './HoverState';
import { calculateYields } from '../tile/TileYields';
import { Terrain } from '../tile/Terrain';

/**
 * Manages the tile information panel DOM element.
 * Shows/hides and updates content based on hovered tile.
 */
export class TileInfoPanel {
  private panel: HTMLElement;
  private coordsEl: HTMLElement;
  private terrainEl: HTMLElement;
  private featureEl: HTMLElement;
  private resourceEl: HTMLElement;
  private foodEl: HTMLElement;
  private productionEl: HTMLElement;
  private goldEl: HTMLElement;

  constructor() {
    const panel = document.getElementById('tile-info-panel');
    const coordsEl = document.getElementById('tile-coords');
    const terrainEl = document.getElementById('tile-terrain');
    const featureEl = document.getElementById('tile-feature');
    const resourceEl = document.getElementById('tile-resource');
    const foodEl = document.getElementById('yield-food');
    const productionEl = document.getElementById('yield-production');
    const goldEl = document.getElementById('yield-gold');

    if (
      !panel ||
      !coordsEl ||
      !terrainEl ||
      !featureEl ||
      !resourceEl ||
      !foodEl ||
      !productionEl ||
      !goldEl
    ) {
      throw new Error('TileInfoPanel: Required DOM elements not found');
    }

    this.panel = panel;
    this.coordsEl = coordsEl;
    this.terrainEl = terrainEl;
    this.featureEl = featureEl;
    this.resourceEl = resourceEl;
    this.foodEl = foodEl;
    this.productionEl = productionEl;
    this.goldEl = goldEl;
  }

  /** Show the panel with tile information */
  show(tile: HoveredTile): void {
    const yields = calculateYields(tile.terrain, tile.feature, tile.resource);

    this.coordsEl.textContent = `(${tile.position.q}, ${tile.position.r})`;
    this.terrainEl.textContent = this.formatTerrain(tile.terrain);
    this.featureEl.textContent = tile.feature ?? 'None';
    this.resourceEl.textContent = tile.resource ?? 'None';
    this.foodEl.textContent = yields.food.toString();
    this.productionEl.textContent = yields.production.toString();
    this.goldEl.textContent = yields.gold.toString();

    this.panel.classList.remove('hidden');
  }

  /** Hide the panel */
  hide(): void {
    this.panel.classList.add('hidden');
  }

  /**
   * Format terrain enum value for display.
   * "GrasslandHill" -> "Grassland Hill"
   */
  private formatTerrain(terrain: Terrain): string {
    return terrain.replace(/([A-Z])/g, ' $1').trim();
  }
}
