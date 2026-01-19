/**
 * Combat preview state management.
 * Reactive state for showing expected combat outcomes before committing to attack.
 */

export interface CombatPreviewData {
  attackerName: string;
  defenderName: string;
  attackerCurrentHealth: number;
  attackerMaxHealth: number;
  attackerExpectedHealth: number; // After combat
  defenderCurrentHealth: number;
  defenderMaxHealth: number;
  defenderExpectedHealth: number; // After combat
  defenderModifiers: string[]; // e.g., ["Hills +25%", "Forest +25%"]
}

type PreviewListener = (data: CombatPreviewData | null) => void;

export class CombatPreviewState {
  private data: CombatPreviewData | null = null;
  private listeners: PreviewListener[] = [];

  /**
   * Show combat preview with the given data.
   */
  show(data: CombatPreviewData): void {
    this.data = data;
    this.notifyListeners();
  }

  /**
   * Hide the combat preview.
   */
  hide(): void {
    if (this.data !== null) {
      this.data = null;
      this.notifyListeners();
    }
  }

  /**
   * Get the current preview data, or null if hidden.
   */
  get(): CombatPreviewData | null {
    return this.data;
  }

  /**
   * Check if preview is currently visible.
   */
  isVisible(): boolean {
    return this.data !== null;
  }

  /**
   * Subscribe to preview state changes.
   * @returns Unsubscribe function to remove the listener
   */
  subscribe(listener: PreviewListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state change.
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.data);
    }
  }

  /**
   * Remove all listeners and reset state.
   */
  clear(): void {
    this.listeners = [];
    this.data = null;
  }
}
