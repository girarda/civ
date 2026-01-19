/**
 * ProductionUI handles the production selection buttons in the city info panel.
 * Allows players to select what a city should produce.
 */

import {
  BuildableType,
  getAvailableBuildables,
  getBuildableName,
  getBuildableCost,
} from '../city/Buildable';
import { ProductionComponent } from '../ecs/cityComponents';

export interface ProductionUICallbacks {
  onProductionSelected: (cityEid: number, buildableType: BuildableType) => void;
  onProductionQueued?: (cityEid: number, buildableType: BuildableType) => void;
}

/**
 * Manages production selection buttons for cities.
 */
export class ProductionUI {
  private container: HTMLElement;
  private buttons: Map<BuildableType, HTMLButtonElement> = new Map();
  private currentCityEid: number | null = null;
  private callbacks: ProductionUICallbacks;

  constructor(callbacks: ProductionUICallbacks) {
    const container = document.getElementById('production-buttons');
    if (!container) {
      throw new Error('ProductionUI: production-buttons container not found');
    }
    this.container = container;
    this.callbacks = callbacks;
    this.createButtons();
  }

  /**
   * Create buttons for each buildable type.
   */
  private createButtons(): void {
    const buildables = getAvailableBuildables();
    for (const buildable of buildables) {
      const name = getBuildableName(buildable);
      const cost = getBuildableCost(buildable);

      const button = document.createElement('button');
      button.className = 'production-btn';
      button.textContent = `${name} (${cost})`;
      button.dataset.type = buildable.toString();
      button.title = 'Click to build, Shift+click to queue';

      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent click from bubbling to canvas
        this.handleClick(buildable, e.shiftKey);
      });

      this.container.appendChild(button);
      this.buttons.set(buildable, button);
    }
  }

  /**
   * Handle button click - set or queue production for current city.
   */
  private handleClick(buildableType: BuildableType, shiftKey: boolean): void {
    if (this.currentCityEid === null) return;

    if (shiftKey && this.callbacks.onProductionQueued) {
      this.callbacks.onProductionQueued(this.currentCityEid, buildableType);
    } else {
      this.callbacks.onProductionSelected(this.currentCityEid, buildableType);
      this.updateActiveButton(buildableType);
    }
  }

  /**
   * Update which button is highlighted as active.
   */
  private updateActiveButton(activeType: BuildableType): void {
    for (const [type, button] of this.buttons) {
      if (type === activeType) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  /**
   * Set the current city for production selection.
   * Updates button states based on city's current production.
   */
  setCityEid(cityEid: number | null): void {
    this.currentCityEid = cityEid;

    if (cityEid === null) {
      // Clear active state when no city selected
      for (const button of this.buttons.values()) {
        button.classList.remove('active');
      }
      return;
    }

    // Update active button based on city's current production
    const currentItem = ProductionComponent.currentItem[cityEid] as BuildableType;
    this.updateActiveButton(currentItem);
  }

  /**
   * Refresh the active button state for the current city.
   * Call this after production changes.
   */
  refresh(): void {
    if (this.currentCityEid !== null) {
      const currentItem = ProductionComponent.currentItem[this.currentCityEid] as BuildableType;
      this.updateActiveButton(currentItem);
    }
  }

  /**
   * Update visual feedback when queue is full.
   */
  setQueueFull(isFull: boolean): void {
    for (const button of this.buttons.values()) {
      if (isFull) {
        button.title = 'Queue is full';
      } else {
        button.title = 'Click to build, Shift+click to queue';
      }
    }
  }
}
