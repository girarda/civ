/**
 * Reactive state management for the currently selected city.
 * Supports subscribing to selection changes for UI updates.
 */

type CitySelectionListener = (cityEid: number | null) => void;

export class CityState {
  private selectedCity: number | null = null;
  private listeners: CitySelectionListener[] = [];

  /**
   * Get the currently selected city entity ID.
   */
  get(): number | null {
    return this.selectedCity;
  }

  /**
   * Select a city. Pass null to deselect.
   */
  select(cityEid: number | null): void {
    if (this.selectedCity === cityEid) return;
    this.selectedCity = cityEid;
    for (const listener of this.listeners) {
      listener(cityEid);
    }
  }

  /**
   * Deselect the current city.
   */
  deselect(): void {
    this.select(null);
  }

  /**
   * Check if a specific city is selected.
   */
  isSelected(cityEid: number): boolean {
    return this.selectedCity === cityEid;
  }

  /**
   * Check if any city is selected.
   */
  hasSelection(): boolean {
    return this.selectedCity !== null;
  }

  /**
   * Subscribe to city selection state changes.
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: CitySelectionListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Remove all listeners and reset state.
   */
  clear(): void {
    this.listeners = [];
    this.selectedCity = null;
  }
}
