export class RiverEdges {
  static readonly EDGE_E = 1 << 0;
  static readonly EDGE_NE = 1 << 1;
  static readonly EDGE_NW = 1 << 2;
  static readonly EDGE_W = 1 << 3;
  static readonly EDGE_SW = 1 << 4;
  static readonly EDGE_SE = 1 << 5;

  static readonly ALL_EDGES = [
    RiverEdges.EDGE_E,
    RiverEdges.EDGE_NE,
    RiverEdges.EDGE_NW,
    RiverEdges.EDGE_W,
    RiverEdges.EDGE_SW,
    RiverEdges.EDGE_SE,
  ];

  static readonly NONE = new RiverEdges(0);
  static readonly ALL = new RiverEdges(0b00111111);

  private bits: number;

  constructor(bits: number = 0) {
    this.bits = bits & 0b00111111;
  }

  static fromEdges(edges: number[]): RiverEdges {
    let bits = 0;
    for (const edge of edges) {
      bits |= edge;
    }
    return new RiverEdges(bits);
  }

  hasRiver(): boolean {
    return this.bits !== 0;
  }

  hasEdge(edge: number): boolean {
    return (this.bits & edge) !== 0;
  }

  setEdge(edge: number): RiverEdges {
    return new RiverEdges(this.bits | (edge & 0b00111111));
  }

  clearEdge(edge: number): RiverEdges {
    return new RiverEdges(this.bits & ~edge);
  }

  toggleEdge(edge: number): RiverEdges {
    return new RiverEdges(this.bits ^ (edge & 0b00111111));
  }

  edgeCount(): number {
    let count = 0;
    let n = this.bits;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  iterEdges(): number[] {
    return RiverEdges.ALL_EDGES.filter((edge) => this.hasEdge(edge));
  }

  getBits(): number {
    return this.bits;
  }

  static oppositeEdge(edge: number): number {
    switch (edge) {
      case RiverEdges.EDGE_E:
        return RiverEdges.EDGE_W;
      case RiverEdges.EDGE_NE:
        return RiverEdges.EDGE_SW;
      case RiverEdges.EDGE_NW:
        return RiverEdges.EDGE_SE;
      case RiverEdges.EDGE_W:
        return RiverEdges.EDGE_E;
      case RiverEdges.EDGE_SW:
        return RiverEdges.EDGE_NE;
      case RiverEdges.EDGE_SE:
        return RiverEdges.EDGE_NW;
      default:
        return 0;
    }
  }

  equals(other: RiverEdges): boolean {
    return this.bits === other.bits;
  }

  toString(): string {
    const edgeNames: string[] = [];
    if (this.hasEdge(RiverEdges.EDGE_E)) edgeNames.push('E');
    if (this.hasEdge(RiverEdges.EDGE_NE)) edgeNames.push('NE');
    if (this.hasEdge(RiverEdges.EDGE_NW)) edgeNames.push('NW');
    if (this.hasEdge(RiverEdges.EDGE_W)) edgeNames.push('W');
    if (this.hasEdge(RiverEdges.EDGE_SW)) edgeNames.push('SW');
    if (this.hasEdge(RiverEdges.EDGE_SE)) edgeNames.push('SE');
    return `RiverEdges(${edgeNames.join(', ')})`;
  }
}
