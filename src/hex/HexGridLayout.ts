import { TilePosition } from './TilePosition';

export interface Vec2 {
  x: number;
  y: number;
}

export class HexGridLayout {
  public readonly hexSize: Vec2;
  public readonly origin: Vec2;
  public readonly orientation: 'pointy' | 'flat';

  // Pointy-top hex constants
  private static readonly SQRT3 = Math.sqrt(3);

  constructor(hexSize: number = 32, origin: Vec2 = { x: 0, y: 0 }) {
    this.hexSize = { x: hexSize, y: hexSize };
    this.origin = origin;
    this.orientation = 'pointy';
  }

  /** Convert hex coordinate to world position */
  hexToWorld(hex: TilePosition): Vec2 {
    const x =
      this.hexSize.x *
      (HexGridLayout.SQRT3 * hex.q + (HexGridLayout.SQRT3 / 2) * hex.r);
    const y = this.hexSize.y * ((3 / 2) * hex.r);
    return {
      x: x + this.origin.x,
      y: y + this.origin.y,
    };
  }

  /** Convert world position to nearest hex coordinate */
  worldToHex(world: Vec2): TilePosition {
    const px = world.x - this.origin.x;
    const py = world.y - this.origin.y;

    const q =
      ((HexGridLayout.SQRT3 / 3) * px - (1 / 3) * py) / this.hexSize.x;
    const r = ((2 / 3) * py) / this.hexSize.y;

    return this.hexRound(q, r);
  }

  /** Round fractional hex coordinates to nearest hex */
  private hexRound(q: number, r: number): TilePosition {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return new TilePosition(rq, rr);
  }

  /** Get the 6 corner positions of a hex in world coordinates */
  hexCorners(hex: TilePosition): Vec2[] {
    const center = this.hexToWorld(hex);
    const corners: Vec2[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30); // Pointy-top
      corners.push({
        x: center.x + this.hexSize.x * Math.cos(angle),
        y: center.y + this.hexSize.y * Math.sin(angle),
      });
    }
    return corners;
  }

  /** Get the 6 edge midpoints of a hex */
  hexEdgeMidpoints(hex: TilePosition): Vec2[] {
    const corners = this.hexCorners(hex);
    const midpoints: Vec2[] = [];
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      midpoints.push({
        x: (corners[i].x + corners[next].x) / 2,
        y: (corners[i].y + corners[next].y) / 2,
      });
    }
    return midpoints;
  }
}
