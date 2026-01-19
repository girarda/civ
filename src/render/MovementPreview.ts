/**
 * MovementPreview - Visualizes reachable tiles and movement paths.
 */

import { Graphics, Container } from 'pixi.js';
import { HexGridLayout } from '../hex/HexGridLayout';
import { TilePosition } from '../hex/TilePosition';
import { Pathfinder, PathNode } from '../pathfinding/Pathfinder';

const REACHABLE_COLOR = 0x00ff00;
const REACHABLE_ALPHA = 0.2;
const PATH_COLOR = 0xffffff;
const PATH_WIDTH = 3;

export class MovementPreview {
  private layout: HexGridLayout;
  private pathfinder: Pathfinder;
  private reachableGraphics: Graphics;
  private pathGraphics: Graphics;
  private currentStart: TilePosition | null = null;
  private currentMovement: number = 0;

  constructor(container: Container, layout: HexGridLayout, pathfinder: Pathfinder) {
    this.layout = layout;
    this.pathfinder = pathfinder;

    this.reachableGraphics = new Graphics();
    this.pathGraphics = new Graphics();
    container.addChild(this.reachableGraphics);
    container.addChild(this.pathGraphics);
  }

  /**
   * Show all reachable tiles from a start position within movement budget.
   */
  showReachableTiles(start: TilePosition, movement: number): void {
    this.currentStart = start;
    this.currentMovement = movement;
    this.reachableGraphics.clear();
    const reachable = this.pathfinder.getReachableTiles(start, movement);

    for (const [key] of reachable) {
      const [q, r] = key.split(',').map(Number);
      const pos = new TilePosition(q, r);
      // Don't highlight the start position
      if (!pos.equals(start)) {
        this.drawReachableHex(pos);
      }
    }
  }

  private drawReachableHex(position: TilePosition): void {
    const worldPos = this.layout.hexToWorld(position);
    const corners = this.layout.hexCorners(position);
    const localCorners = corners.flatMap((c) => [c.x - worldPos.x, c.y - worldPos.y]);

    this.reachableGraphics.poly(localCorners);
    this.reachableGraphics.fill({ color: REACHABLE_COLOR, alpha: REACHABLE_ALPHA });
    this.reachableGraphics.position.set(0, 0);
  }

  /**
   * Show path line from current start to target.
   */
  showPath(path: PathNode[]): void {
    this.pathGraphics.clear();
    if (path.length < 2) return;

    const points: number[] = [];
    for (const node of path) {
      const worldPos = this.layout.hexToWorld(node.position);
      points.push(worldPos.x, worldPos.y);
    }

    this.pathGraphics.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.pathGraphics.lineTo(points[i], points[i + 1]);
    }
    this.pathGraphics.stroke({ width: PATH_WIDTH, color: PATH_COLOR });
  }

  /**
   * Show path to a target position from the current start.
   */
  showPathTo(target: TilePosition): void {
    if (!this.currentStart) return;

    const result = this.pathfinder.findPath(this.currentStart, target, this.currentMovement);
    if (result.reachable) {
      this.showPath(result.path);
    } else {
      this.hidePath();
    }
  }

  /**
   * Hide only the path line (keep reachable tiles visible).
   */
  hidePath(): void {
    this.pathGraphics.clear();
  }

  /**
   * Hide all preview graphics.
   */
  hide(): void {
    this.reachableGraphics.clear();
    this.pathGraphics.clear();
    this.currentStart = null;
    this.currentMovement = 0;
  }

  /**
   * Check if the preview is currently showing.
   */
  isShowing(): boolean {
    return this.currentStart !== null;
  }

  /**
   * Get the current start position.
   */
  getStart(): TilePosition | null {
    return this.currentStart;
  }

  /**
   * Get the current movement budget.
   */
  getMovement(): number {
    return this.currentMovement;
  }

  /**
   * Update the pathfinder reference.
   */
  setPathfinder(pathfinder: Pathfinder): void {
    this.pathfinder = pathfinder;
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.reachableGraphics.destroy();
    this.pathGraphics.destroy();
  }
}
