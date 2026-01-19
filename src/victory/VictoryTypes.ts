/**
 * Victory types and result interfaces for the victory system.
 */

export enum VictoryType {
  Domination = 'Domination',
  // Future: Science, Culture, Diplomatic, Score
}

export interface VictoryResult {
  type: VictoryType;
  winnerId: number;
  winnerName: string;
  losers: number[];
  turnNumber: number;
}
