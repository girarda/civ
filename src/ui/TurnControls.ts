/**
 * Manages turn controls UI including turn display and End Turn button.
 * Follows the MapControls pattern with callback-based interaction.
 */
export class TurnControls {
  private turnDisplay: HTMLElement;
  private endTurnBtn: HTMLButtonElement;
  private onEndTurnCallback: (() => void) | null = null;
  private keyHandler: (e: KeyboardEvent) => void;

  /**
   * Create a new TurnControls instance.
   * @throws Error if DOM elements are not found
   */
  constructor() {
    const turnDisplay = document.getElementById('turn-display');
    const endTurnBtn = document.getElementById('end-turn-btn');

    if (!turnDisplay || !endTurnBtn) {
      throw new Error('Turn controls elements not found in DOM');
    }

    this.turnDisplay = turnDisplay;
    this.endTurnBtn = endTurnBtn as HTMLButtonElement;

    this.endTurnBtn.addEventListener('click', () => this.handleEndTurn());

    this.keyHandler = (e: KeyboardEvent) => {
      // Handle Enter key for End Turn (when not typing in an input)
      if (e.code === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        this.handleEndTurn();
      }
    };
  }

  /**
   * Set the callback for when End Turn is clicked.
   * @param callback - Function to call when End Turn is triggered
   */
  onEndTurn(callback: () => void): void {
    this.onEndTurnCallback = callback;
  }

  /**
   * Update the displayed turn number.
   * @param turnNumber - The turn number to display
   */
  updateTurnDisplay(turnNumber: number): void {
    this.turnDisplay.textContent = `Turn ${turnNumber}`;
  }

  /**
   * Enable or disable the End Turn button.
   * @param enabled - Whether the button should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.endTurnBtn.disabled = !enabled;
  }

  /**
   * Handle End Turn button click.
   */
  private handleEndTurn(): void {
    if (this.onEndTurnCallback && !this.endTurnBtn.disabled) {
      this.onEndTurnCallback();
    }
  }

  /**
   * Attach keyboard handler for Enter key.
   * Call this after construction to enable keyboard shortcuts.
   */
  attachKeyboardHandler(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Remove keyboard handler.
   * Call this for cleanup when the controls are no longer needed.
   */
  detachKeyboardHandler(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }
}
