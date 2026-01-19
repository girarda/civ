/**
 * System for handling unit selection via mouse clicks.
 * Handles coordinate conversion from screen space to hex coordinates and queries units.
 */

import { IWorld } from 'bitecs';
import { HexGridLayout, Vec2 } from '../hex/HexGridLayout';
import { CameraController } from '../render/CameraController';
import { SelectionState } from './SelectionState';
import { getUnitAtPosition } from '../ecs/unitSystems';

export class SelectionSystem {
  private layout: HexGridLayout;
  private camera: CameraController;
  private world: IWorld;
  private selectionState: SelectionState;
  private canvas: HTMLCanvasElement | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    layout: HexGridLayout,
    camera: CameraController,
    world: IWorld,
    selectionState: SelectionState
  ) {
    this.layout = layout;
    this.camera = camera;
    this.world = world;
    this.selectionState = selectionState;
  }

  /**
   * Convert screen coordinates to world coordinates,
   * accounting for camera position and zoom level.
   */
  screenToWorld(screenX: number, screenY: number): Vec2 {
    const cameraPos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    return {
      x: (screenX - cameraPos.x) / zoom,
      y: (screenY - cameraPos.y) / zoom,
    };
  }

  /**
   * Handle click event and update selection state.
   */
  handleClick(event: MouseEvent): void {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    const hexPos = this.layout.worldToHex(worldPos);
    const unitEid = getUnitAtPosition(this.world, hexPos.q, hexPos.r);
    this.selectionState.select(unitEid);
  }

  /**
   * Handle keyboard events for selection.
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Escape') {
      this.selectionState.deselect();
    }
  }

  /**
   * Attach event listeners to the canvas and window.
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);

    canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  /**
   * Remove event listeners.
   */
  detach(): void {
    if (this.canvas && this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    this.canvas = null;
    this.clickHandler = null;
    this.keyHandler = null;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.detach();
    this.selectionState.clear();
  }

  /**
   * Update the world reference (e.g., after regeneration).
   */
  setWorld(world: IWorld): void {
    this.world = world;
  }
}
