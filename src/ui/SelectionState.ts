/**
 * Reactive state management for the currently selected unit.
 * Supports subscribing to selection changes for UI updates.
 */

type SelectionListener = (unitEid: number | null) => void;

export class SelectionState {
  private selectedUnit: number | null = null;
  private listeners: SelectionListener[] = [];

  /**
   * Get the currently selected unit entity ID.
   */
  get(): number | null {
    return this.selectedUnit;
  }

  /**
   * Select a unit. Pass null to deselect.
   */
  select(unitEid: number | null): void {
    if (this.selectedUnit === unitEid) return;
    this.selectedUnit = unitEid;
    for (const listener of this.listeners) {
      listener(unitEid);
    }
  }

  /**
   * Deselect the current unit.
   */
  deselect(): void {
    this.select(null);
  }

  /**
   * Check if a specific unit is selected.
   */
  isSelected(unitEid: number): boolean {
    return this.selectedUnit === unitEid;
  }

  /**
   * Check if any unit is selected.
   */
  hasSelection(): boolean {
    return this.selectedUnit !== null;
  }

  /**
   * Subscribe to selection state changes.
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: SelectionListener): () => void {
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
    this.selectedUnit = null;
  }
}
