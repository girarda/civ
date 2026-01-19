/**
 * VictoryOverlay - Displays victory/defeat screen when game ends.
 */

import { VictoryResult } from '../victory/VictoryTypes';

export class VictoryOverlay {
  private overlay: HTMLElement;
  private titleEl: HTMLElement;
  private typeEl: HTMLElement;
  private messageEl: HTMLElement;
  private turnEl: HTMLElement;
  private playAgainBtn: HTMLElement;
  private panel: HTMLElement;

  constructor() {
    this.overlay = document.getElementById('victory-overlay')!;
    this.panel = this.overlay.querySelector('.victory-panel')!;
    this.titleEl = document.getElementById('victory-title')!;
    this.typeEl = document.getElementById('victory-type')!;
    this.messageEl = document.getElementById('victory-message')!;
    this.turnEl = document.getElementById('victory-turn')!;
    this.playAgainBtn = document.getElementById('play-again-btn')!;
  }

  /**
   * Show victory screen for the winner.
   */
  showVictory(result: VictoryResult): void {
    this.panel.classList.remove('defeat');
    this.titleEl.textContent = 'Victory!';
    this.typeEl.textContent = `${result.type} Victory`;
    this.messageEl.textContent = 'You have conquered all opponents!';
    this.turnEl.textContent = result.turnNumber.toString();
    this.overlay.classList.remove('hidden');
  }

  /**
   * Show defeat screen for the loser.
   */
  showDefeat(result: VictoryResult): void {
    this.panel.classList.add('defeat');
    this.titleEl.textContent = 'Defeat!';
    this.typeEl.textContent = `${result.type} Victory`;
    this.messageEl.textContent = `${result.winnerName} has conquered all opponents!`;
    this.turnEl.textContent = result.turnNumber.toString();
    this.overlay.classList.remove('hidden');
  }

  /**
   * Hide the overlay.
   */
  hide(): void {
    this.overlay.classList.add('hidden');
  }

  /**
   * Register callback for play again button.
   */
  onPlayAgain(callback: () => void): void {
    this.playAgainBtn.addEventListener('click', callback);
  }
}
