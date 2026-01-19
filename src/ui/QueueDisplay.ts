/**
 * QueueDisplay shows the production queue for the selected city.
 */

import { BuildableType, getBuildableName, getBuildableCost } from '../city/Buildable';
import { CityProcessor } from '../city/CityProcessor';
import { ProductionComponent } from '../ecs/cityComponents';
import { TerritoryManager, calculateCityYields } from '../city';
import { GeneratedTile } from '../map/MapGenerator';
import { calculateQueueTurns } from '../city/ProductionTurns';

export class QueueDisplay {
  private container: HTMLElement;
  private cityProcessor: CityProcessor;
  private territoryManager: TerritoryManager;
  private tileMap: Map<string, GeneratedTile>;
  private currentCityEid: number | null = null;

  constructor(
    cityProcessor: CityProcessor,
    territoryManager: TerritoryManager,
    tileMap: Map<string, GeneratedTile>
  ) {
    const container = document.getElementById('production-queue');
    if (!container) {
      throw new Error('QueueDisplay: production-queue container not found');
    }
    this.container = container;
    this.cityProcessor = cityProcessor;
    this.territoryManager = territoryManager;
    this.tileMap = tileMap;
  }

  setCityEid(cityEid: number | null): void {
    this.currentCityEid = cityEid;
    this.refresh();
  }

  setTerritoryManager(territoryManager: TerritoryManager): void {
    this.territoryManager = territoryManager;
  }

  setTileMap(tileMap: Map<string, GeneratedTile>): void {
    this.tileMap = tileMap;
  }

  refresh(): void {
    this.container.innerHTML = '';

    if (this.currentCityEid === null) return;

    const queue = this.cityProcessor.getQueue(this.currentCityEid);
    if (queue.length === 0) {
      this.container.innerHTML = '<div class="queue-empty">No items queued</div>';
      return;
    }

    // Calculate turn estimates
    const currentProgress = ProductionComponent.progress[this.currentCityEid];
    const currentCost = ProductionComponent.cost[this.currentCityEid];
    const yields = calculateCityYields(this.currentCityEid, this.territoryManager, this.tileMap);
    const queueCosts = queue.map((item) => getBuildableCost(item));

    // Skip first element (current production turns) since we only show queue
    const turnEstimates = calculateQueueTurns(
      currentProgress,
      currentCost,
      queueCosts,
      yields.production
    ).slice(1);

    queue.forEach((item, index) => {
      const element = this.renderQueueItem(item, index, turnEstimates[index]);
      this.container.appendChild(element);
    });
  }

  private renderQueueItem(item: BuildableType, index: number, turns: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'queue-item';

    const name = getBuildableName(item);
    const cost = getBuildableCost(item);
    const turnsText = turns === Infinity ? '?' : turns.toString();

    div.innerHTML = `
      <span class="queue-item-name">${name} (${cost})</span>
      <span class="queue-item-turns">${turnsText} turns</span>
      <button class="queue-item-remove" title="Remove from queue">&times;</button>
    `;

    const removeBtn = div.querySelector('.queue-item-remove') as HTMLButtonElement;
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleRemove(index);
    });

    return div;
  }

  private handleRemove(index: number): void {
    if (this.currentCityEid === null) return;
    this.cityProcessor.removeFromQueue(this.currentCityEid, index);
    this.refresh();
  }
}
