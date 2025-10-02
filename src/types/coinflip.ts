/**
 * Type definitions for Coin Flip game
 */

export type CoinSide = 'Heads' | 'Tails';

export type GameStatsArray = [bigint, bigint, bigint, bigint, bigint, bigint];

export interface FlipEvent {
  player: string;
  betAmount: bigint;
  choice: number;
  result?: number;
  didWin?: boolean;
  payout?: bigint;
  requestId: bigint;
  timestamp: number;
}

export interface PlayerStats {
  address: string;
  totalBets: bigint;
  totalPayout: bigint;
  wins: number;
  losses: number;
  betCount: number;
  biggestWin: bigint;
}

