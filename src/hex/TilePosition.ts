import { defineHex, Orientation } from 'honeycomb-grid';

// Define hex type with pointy-top orientation
export const TileHex = defineHex({
  dimensions: 32,
  orientation: Orientation.POINTY,
});

export type HexCoord = { q: number; r: number };

export class TilePosition {
  public readonly q: number;
  public readonly r: number;

  static readonly ORIGIN = new TilePosition(0, 0);

  constructor(q: number, r: number) {
    this.q = q;
    this.r = r;
  }

  /** Get all 6 neighboring tile positions */
  neighbors(): TilePosition[] {
    const directions = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
    return directions.map((d) => new TilePosition(this.q + d.q, this.r + d.r));
  }

  /** Get all tiles within radius (inclusive) */
  range(radius: number): TilePosition[] {
    const results: TilePosition[] = [];
    for (let dq = -radius; dq <= radius; dq++) {
      for (
        let dr = Math.max(-radius, -dq - radius);
        dr <= Math.min(radius, -dq + radius);
        dr++
      ) {
        results.push(new TilePosition(this.q + dq, this.r + dr));
      }
    }
    return results;
  }

  /** Get tiles at exactly radius distance */
  ring(radius: number): TilePosition[] {
    if (radius === 0) return [new TilePosition(this.q, this.r)];
    const results: TilePosition[] = [];
    let hex = new TilePosition(this.q - radius, this.r + radius);
    const directions = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];
    for (const dir of directions) {
      for (let i = 0; i < radius; i++) {
        results.push(hex);
        hex = new TilePosition(hex.q + dir.q, hex.r + dir.r);
      }
    }
    return results;
  }

  /** Calculate distance to another tile */
  distanceTo(other: TilePosition): number {
    return Math.max(
      Math.abs(this.q - other.q),
      Math.abs(this.r - other.r),
      Math.abs(this.q + this.r - other.q - other.r)
    );
  }

  /** Check equality */
  equals(other: TilePosition): boolean {
    return this.q === other.q && this.r === other.r;
  }

  /** Create unique key for Map/Set usage */
  key(): string {
    return `${this.q},${this.r}`;
  }

  toString(): string {
    return `TilePosition(${this.q}, ${this.r})`;
  }
}
