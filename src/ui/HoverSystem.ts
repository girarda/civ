import { HexGridLayout, Vec2 } from '../hex/HexGridLayout';
import { CameraController } from '../render/CameraController';
import { GeneratedTile } from '../map/MapGenerator';
import { HoverState, HoveredTile } from './HoverState';

/**
 * System for detecting which tile the mouse is hovering over.
 * Handles coordinate conversion from screen space to hex coordinates.
 */
export class HoverSystem {
  private layout: HexGridLayout;
  private camera: CameraController;
  private tileMap: Map<string, GeneratedTile>;
  private hoverState: HoverState;
  private canvas: HTMLCanvasElement | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: (() => void) | null = null;

  constructor(
    layout: HexGridLayout,
    camera: CameraController,
    tileMap: Map<string, GeneratedTile>,
    hoverState: HoverState
  ) {
    this.layout = layout;
    this.camera = camera;
    this.tileMap = tileMap;
    this.hoverState = hoverState;
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
   * Handle mouse move event and update hover state.
   * @returns The hovered tile or null if cursor is off-map
   */
  handleMouseMove(event: MouseEvent): HoveredTile | null {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    const hexPos = this.layout.worldToHex(worldPos);
    const key = hexPos.key();
    const tile = this.tileMap.get(key);

    if (tile) {
      const hoveredTile: HoveredTile = {
        position: tile.position,
        terrain: tile.terrain,
        feature: tile.feature,
        resource: tile.resource,
      };
      this.hoverState.set(hoveredTile);
      return hoveredTile;
    } else {
      this.hoverState.set(null);
      return null;
    }
  }

  /** Attach event listeners to the canvas */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.mouseLeaveHandler = () => this.hoverState.set(null);

    canvas.addEventListener('mousemove', this.mouseMoveHandler);
    canvas.addEventListener('mouseleave', this.mouseLeaveHandler);
  }

  /** Remove event listeners from the canvas */
  detach(): void {
    if (this.canvas && this.mouseMoveHandler && this.mouseLeaveHandler) {
      this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
      this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
    }
    this.canvas = null;
    this.mouseMoveHandler = null;
    this.mouseLeaveHandler = null;
  }

  /** Clean up resources */
  destroy(): void {
    this.detach();
    this.hoverState.clear();
  }
}
