/**
 * Manages map controls UI and keyboard shortcuts.
 * Displays current seed and provides map regeneration functionality.
 */
export class MapControls {
  private seedDisplay: HTMLElement;
  private regenerateBtn: HTMLElement;
  private currentSeed: number;
  private onRegenerate: (seed: number) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  /**
   * Create a new MapControls instance.
   * @param onRegenerate - Callback invoked with new seed when regeneration is triggered
   */
  constructor(onRegenerate: (seed: number) => void) {
    const seedDisplay = document.getElementById('seed-display');
    const regenerateBtn = document.getElementById('regenerate-btn');

    if (!seedDisplay || !regenerateBtn) {
      throw new Error('Map controls elements not found in DOM');
    }

    this.seedDisplay = seedDisplay;
    this.regenerateBtn = regenerateBtn;
    this.currentSeed = 42;
    this.onRegenerate = onRegenerate;

    this.regenerateBtn.addEventListener('click', () => this.regenerate());

    this.keyHandler = (e: KeyboardEvent) => {
      // Only handle R if not typing in an input
      if (e.code === 'KeyR' && !(e.target instanceof HTMLInputElement)) {
        this.regenerate();
      }
    };
  }

  /**
   * Update the displayed seed value.
   * @param seed - The seed to display
   */
  setSeed(seed: number): void {
    this.currentSeed = seed;
    this.seedDisplay.textContent = `Seed: ${seed}`;
  }

  /**
   * Get the current seed value.
   */
  getSeed(): number {
    return this.currentSeed;
  }

  /**
   * Generate a new random seed.
   * @returns A random seed between 0 and 999999
   */
  generateNewSeed(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Trigger map regeneration with a new random seed.
   */
  private regenerate(): void {
    const newSeed = this.generateNewSeed();
    this.setSeed(newSeed);
    this.onRegenerate(newSeed);
  }

  /**
   * Attach keyboard handler for R key.
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
