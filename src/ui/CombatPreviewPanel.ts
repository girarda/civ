/**
 * Manages the combat preview panel DOM element.
 * Shows/hides and updates content based on combat preview state.
 */

import { CombatPreviewData } from '../combat/CombatPreview';

export class CombatPreviewPanel {
  private panel: HTMLElement;
  private attackerNameEl: HTMLElement;
  private attackerHealthEl: HTMLElement;
  private attackerExpectedEl: HTMLElement;
  private attackerHealthFillEl: HTMLElement;
  private attackerExpectedFillEl: HTMLElement;
  private defenderNameEl: HTMLElement;
  private defenderHealthEl: HTMLElement;
  private defenderExpectedEl: HTMLElement;
  private defenderHealthFillEl: HTMLElement;
  private defenderExpectedFillEl: HTMLElement;
  private defenderModifiersEl: HTMLElement;

  constructor() {
    const panel = document.getElementById('combat-preview');
    const attackerNameEl = document.getElementById('attacker-name');
    const attackerHealthEl = document.getElementById('attacker-health');
    const attackerExpectedEl = document.getElementById('attacker-expected');
    const attackerHealthFillEl = document.getElementById('attacker-health-fill');
    const attackerExpectedFillEl = document.getElementById('attacker-expected-fill');
    const defenderNameEl = document.getElementById('defender-name');
    const defenderHealthEl = document.getElementById('defender-health');
    const defenderExpectedEl = document.getElementById('defender-expected');
    const defenderHealthFillEl = document.getElementById('defender-health-fill');
    const defenderExpectedFillEl = document.getElementById('defender-expected-fill');
    const defenderModifiersEl = document.getElementById('defender-modifiers');

    if (
      !panel ||
      !attackerNameEl ||
      !attackerHealthEl ||
      !attackerExpectedEl ||
      !attackerHealthFillEl ||
      !attackerExpectedFillEl ||
      !defenderNameEl ||
      !defenderHealthEl ||
      !defenderExpectedEl ||
      !defenderHealthFillEl ||
      !defenderExpectedFillEl ||
      !defenderModifiersEl
    ) {
      throw new Error('CombatPreviewPanel: Required DOM elements not found');
    }

    this.panel = panel;
    this.attackerNameEl = attackerNameEl;
    this.attackerHealthEl = attackerHealthEl;
    this.attackerExpectedEl = attackerExpectedEl;
    this.attackerHealthFillEl = attackerHealthFillEl;
    this.attackerExpectedFillEl = attackerExpectedFillEl;
    this.defenderNameEl = defenderNameEl;
    this.defenderHealthEl = defenderHealthEl;
    this.defenderExpectedEl = defenderExpectedEl;
    this.defenderHealthFillEl = defenderHealthFillEl;
    this.defenderExpectedFillEl = defenderExpectedFillEl;
    this.defenderModifiersEl = defenderModifiersEl;
  }

  /** Show the panel with combat preview data */
  show(data: CombatPreviewData): void {
    // Update attacker info
    this.attackerNameEl.textContent = data.attackerName;
    this.attackerHealthEl.textContent = data.attackerCurrentHealth.toString();
    this.attackerExpectedEl.textContent = Math.max(0, data.attackerExpectedHealth).toString();
    this.attackerHealthFillEl.style.width = `${(data.attackerCurrentHealth / data.attackerMaxHealth) * 100}%`;
    this.attackerExpectedFillEl.style.width = `${(Math.max(0, data.attackerExpectedHealth) / data.attackerMaxHealth) * 100}%`;

    // Update defender info
    this.defenderNameEl.textContent = data.defenderName;
    this.defenderHealthEl.textContent = data.defenderCurrentHealth.toString();
    this.defenderExpectedEl.textContent = Math.max(0, data.defenderExpectedHealth).toString();
    this.defenderHealthFillEl.style.width = `${(data.defenderCurrentHealth / data.defenderMaxHealth) * 100}%`;
    this.defenderExpectedFillEl.style.width = `${(Math.max(0, data.defenderExpectedHealth) / data.defenderMaxHealth) * 100}%`;

    // Update modifiers
    if (data.defenderModifiers.length > 0) {
      this.defenderModifiersEl.textContent = 'Defense: ' + data.defenderModifiers.join(', ');
    } else {
      this.defenderModifiersEl.textContent = '';
    }

    this.panel.classList.remove('hidden');
  }

  /** Hide the panel */
  hide(): void {
    this.panel.classList.add('hidden');
  }
}
