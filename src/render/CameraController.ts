import { Container } from 'pixi.js';

export interface CameraConfig {
  speed: number;
  zoomSpeed: number;
  minZoom: number;
  maxZoom: number;
}

const DEFAULT_CONFIG: CameraConfig = {
  speed: 500,
  zoomSpeed: 0.1,
  minZoom: 0.5,
  maxZoom: 3.0,
};

export class CameraController {
  private container: Container;
  private config: CameraConfig;
  private keys: Set<string> = new Set();
  private zoom: number = 1.0;
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private wheelHandler: (e: WheelEvent) => void;

  constructor(container: Container, config: Partial<CameraConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Bind handlers for cleanup
    this.keydownHandler = (e: KeyboardEvent) => this.keys.add(e.code);
    this.keyupHandler = (e: KeyboardEvent) => this.keys.delete(e.code);
    this.wheelHandler = (e: WheelEvent) => this.handleZoom(e);

    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('wheel', this.wheelHandler);
  }

  private handleZoom(event: WheelEvent): void {
    const delta = -Math.sign(event.deltaY) * this.config.zoomSpeed;
    this.zoom = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, this.zoom + delta)
    );
    this.container.scale.set(this.zoom);
  }

  update(deltaTime: number): void {
    const moveAmount = this.config.speed * deltaTime;
    let dx = 0;
    let dy = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy += moveAmount;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy -= moveAmount;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx += moveAmount;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx -= moveAmount;

    if (dx !== 0 || dy !== 0) {
      this.container.position.x += dx;
      this.container.position.y += dy;
    }
  }

  centerOn(x: number, y: number): void {
    this.container.position.x = window.innerWidth / 2 - x * this.zoom;
    this.container.position.y = window.innerHeight / 2 - y * this.zoom;
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(zoom: number): void {
    this.zoom = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, zoom)
    );
    this.container.scale.set(this.zoom);
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.container.position.x,
      y: this.container.position.y,
    };
  }

  /** Clean up event listeners */
  destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('wheel', this.wheelHandler);
  }
}
