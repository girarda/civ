/**
 * Manages the city information panel DOM element.
 * Shows/hides and updates content based on selected city.
 */

import { IWorld } from 'bitecs';
import { CityComponent, PopulationComponent, ProductionComponent } from '../ecs/cityComponents';
import { TerritoryManager, getCityNameByIndex, calculateCityYields } from '../city';
import { getBuildableName, BuildableType } from '../city/Buildable';
import { GeneratedTile } from '../map/MapGenerator';

export class CityInfoPanel {
  private panel: HTMLElement;
  private nameEl: HTMLElement;
  private populationEl: HTMLElement;
  private growthEl: HTMLElement;
  private productionEl: HTMLElement;
  private foodEl: HTMLElement;
  private productionYieldEl: HTMLElement;
  private goldEl: HTMLElement;
  private currentCityEid: number | null = null;
  private currentTerritoryManager: TerritoryManager | null = null;
  private currentTileMap: Map<string, GeneratedTile> | null = null;

  constructor() {
    const panel = document.getElementById('city-info-panel');
    const nameEl = document.getElementById('city-name');
    const populationEl = document.getElementById('city-population');
    const growthEl = document.getElementById('city-growth');
    const productionEl = document.getElementById('city-production');
    const foodEl = document.getElementById('city-yield-food');
    const productionYieldEl = document.getElementById('city-yield-production');
    const goldEl = document.getElementById('city-yield-gold');

    if (
      !panel ||
      !nameEl ||
      !populationEl ||
      !growthEl ||
      !productionEl ||
      !foodEl ||
      !productionYieldEl ||
      !goldEl
    ) {
      throw new Error('CityInfoPanel: Required DOM elements not found');
    }

    this.panel = panel;
    this.nameEl = nameEl;
    this.populationEl = populationEl;
    this.growthEl = growthEl;
    this.productionEl = productionEl;
    this.foodEl = foodEl;
    this.productionYieldEl = productionYieldEl;
    this.goldEl = goldEl;
  }

  /**
   * Show the panel with city information.
   */
  show(
    cityEid: number,
    _world: IWorld,
    territoryManager: TerritoryManager,
    tileMap: Map<string, GeneratedTile>
  ): void {
    // Store context for refresh
    this.currentCityEid = cityEid;
    this.currentTerritoryManager = territoryManager;
    this.currentTileMap = tileMap;

    this.updateDisplay(cityEid, territoryManager, tileMap);
    this.panel.classList.remove('hidden');
  }

  /**
   * Update the display with current city data.
   */
  private updateDisplay(
    cityEid: number,
    territoryManager: TerritoryManager,
    tileMap: Map<string, GeneratedTile>
  ): void {
    // Get city data
    const nameIndex = CityComponent.nameIndex[cityEid];
    const name = getCityNameByIndex(nameIndex);
    const population = PopulationComponent.current[cityEid];
    const foodStockpile = PopulationComponent.foodStockpile[cityEid];
    const foodForGrowth = PopulationComponent.foodForGrowth[cityEid];
    const currentItem = ProductionComponent.currentItem[cityEid];
    const progress = ProductionComponent.progress[cityEid];
    const cost = ProductionComponent.cost[cityEid];

    // Calculate total yields from territory
    const yields = calculateCityYields(cityEid, territoryManager, tileMap);

    // Update display
    this.nameEl.textContent = name;
    this.populationEl.textContent = population.toString();
    this.growthEl.textContent = `${foodStockpile}/${foodForGrowth}`;

    if (currentItem > 0) {
      const itemName = getBuildableName(currentItem as BuildableType);
      this.productionEl.textContent = `${itemName} (${progress}/${cost})`;
    } else {
      this.productionEl.textContent = 'None';
    }

    this.foodEl.textContent = yields.food.toString();
    this.productionYieldEl.textContent = yields.production.toString();
    this.goldEl.textContent = yields.gold.toString();
  }

  /**
   * Refresh the display with current city data.
   * Call this after production changes.
   */
  refresh(): void {
    if (
      this.currentCityEid !== null &&
      this.currentTerritoryManager !== null &&
      this.currentTileMap !== null
    ) {
      this.updateDisplay(this.currentCityEid, this.currentTerritoryManager, this.currentTileMap);
    }
  }

  /**
   * Hide the panel.
   */
  hide(): void {
    this.panel.classList.add('hidden');
  }
}
