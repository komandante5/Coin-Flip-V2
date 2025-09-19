'use client';

import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePublicClient } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { Crown, TrendingUp } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import addresses from '../../src/deployments.localhost.json';

type PlayerStats = {
  address: string;
  totalBets: bigint;
  totalPayout: bigint;
  wins: number;
  losses: number;
  betCount: number;
  biggestWin: bigint;
};

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;

// Memoized utility functions for better performance
const formatEth = (value: bigint) => {
  try {
    return Number(formatEther(value)).toFixed(4);
  } catch {
    return '0.0000';
  }
};

const shortAddress = (addr: string) => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

function LeaderboardPageComponent() {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoized data fetching function
  const fetchLeaderboardData = useCallback(async () => {
    if (!publicClient) return;
    
    setLoading(true);
    try {
      // Optimize: Get recent blocks first, fall back to full history if needed
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 'earliest';
      
      const revealLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipRevealed(address indexed player, uint256 betAmount, uint8 choice, uint8 result, bool didWin, uint256 payout, uint256 indexed requestId)'),
        fromBlock,
        toBlock: 'latest'
      });

      const map = new Map<string, PlayerStats>();
      
      // Batch process logs for better performance
      for (const log of revealLogs) {
        const player = (log.args.player || '0x0') as string;
        const betAmount = (log.args.betAmount || 0n) as bigint;
        const payout = (log.args.payout || 0n) as bigint;
        const didWin = Boolean(log.args.didWin);

        if (!map.has(player)) {
          map.set(player, {
            address: player,
            totalBets: 0n,
            totalPayout: 0n,
            wins: 0,
            losses: 0,
            betCount: 0,
            biggestWin: 0n,
          });
        }
        
        const playerStats = map.get(player)!;
        playerStats.totalBets += betAmount;
        playerStats.totalPayout += payout;
        playerStats.betCount += 1;
        
        if (didWin) {
          playerStats.wins += 1;
          const net = payout > betAmount ? payout - betAmount : payout;
          if (net > playerStats.biggestWin) {
            playerStats.biggestWin = net;
          }
        } else {
          playerStats.losses += 1;
        }
      }

      setStats(Array.from(map.values()));
    } catch (err) {
      console.error('leaderboard fetch error', err);
      setStats([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Optimized sorting and filtering with better performance
  const { sorted, winnersOnly } = useMemo(() => {
    if (stats.length === 0) {
      return { sorted: [], winnersOnly: [] };
    }
    
    const enrichedStats = stats.map(s => ({
      ...s,
      profit: s.totalPayout - s.totalBets,
      avgBet: s.betCount === 0 ? 0n : s.totalBets / BigInt(s.betCount),
    }));
    
    const sortedStats = enrichedStats
      .sort((a, b) => {
        // More efficient comparison
        if (b.profit > a.profit) return 1;
        if (b.profit < a.profit) return -1;
        return 0;
      })
      .slice(0, 100);
      
    const winners = sortedStats.filter(s => s.profit > 0n);
    
    return { sorted: sortedStats, winnersOnly: winners };
  }, [stats]);

  return (
    <PageLayout>
      <main className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-6 lg:py-fluid-8 flex-1" style={{ maxWidth: 'min(98vw, var(--container-3xl))' }}>
        <div className="flex items-center gap-fluid-3">
          <Crown className="text-emerald-300" style={{ width: 'clamp(24px, 2.5vw + 16px, 32px)', height: 'clamp(24px, 2.5vw + 16px, 32px)' }} />
          <h1 className="text-fluid-3xl md:text-fluid-4xl lg:text-5xl font-extrabold tracking-tight">Leaderboard</h1>
        </div>
        <p className="mt-fluid-2 text-neutral-400 text-fluid-base">All‑time winners ranked by profit</p>

        {/* Winners Podium */}
        {winnersOnly.length > 0 && (
          <div className="mt-fluid-6 grid grid-cols-1 sm:grid-cols-3 gap-fluid-4 items-end">
            {winnersOnly.slice(0, 3).map((w, i) => {
              const height = i === 0 ? 'min-h-[180px]' : 'min-h-[160px]';
              const gradient = i === 0
                ? 'from-yellow-400/30 to-amber-300/20'
                : i === 1
                ? 'from-slate-300/30 to-gray-200/10'
                : 'from-amber-800/30 to-amber-700/10';
              return (
                <div key={w.address} className={`relative rounded-3xl border border-white/10 bg-white/[0.02] p-fluid-4 ${height} overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl`}> 
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-b ${gradient} opacity-70`} />
                  <div className="flex items-center justify-between">
                    <div className="text-fluid-xs text-neutral-300">{i === 0 ? 'Champion' : i === 1 ? 'Runner‑up' : 'Third'}</div>
                    <div className="text-fluid-xs px-fluid-2 py-1 rounded-full bg-black/40 border border-white/10">#{i + 1}</div>
                  </div>
                  <div className="mt-fluid-3 flex items-center gap-fluid-3">
                    <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-fluid-xs" style={{ width: 'clamp(32px, 3vw + 20px, 44px)', height: 'clamp(32px, 3vw + 20px, 44px)' }}>
                      {w.address.slice(2,4).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-fluid-sm">{shortAddress(w.address)}</div>
                      <div className="text-fluid-xs text-neutral-300">Wins {w.wins}</div>
                    </div>
                  </div>
                  <div className="mt-fluid-4 text-fluid-xl lg:text-fluid-2xl font-extrabold text-emerald-300">+{formatEth(w.profit)} ETH</div>
                  <div className="text-fluid-xs text-neutral-300">Best win +{formatEth(w.biggestWin)} ETH</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Winners Table */}
        <div className="mt-fluid-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-12 px-fluid-4 py-fluid-3 text-fluid-xs uppercase tracking-wider text-neutral-400 border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">Profit</div>
            <div className="col-span-1">Wins</div>
            <div className="col-span-2">Best win</div>
            <div className="col-span-2">Bets</div>
          </div>
          {/* Mobile table header */}
          <div className="md:hidden grid grid-cols-12 px-fluid-4 py-fluid-3 text-fluid-xs uppercase tracking-wider text-neutral-400 border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-6">Player</div>
            <div className="col-span-3">Profit</div>
            <div className="col-span-2">Wins</div>
          </div>
          <div className="divide-y divide-white/10">
            {loading && (
              <div className="px-fluid-4 py-fluid-6 text-center text-neutral-400 text-fluid-sm">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
                  Loading leaderboard…
                </div>
              </div>
            )}
            {!loading && winnersOnly.length === 0 && (
              <div className="px-fluid-4 py-fluid-6 text-center text-neutral-400 text-fluid-sm">
                <div className="flex flex-col items-center gap-2">
                  <Crown className="w-8 h-8 text-neutral-500" />
                  <div>No games yet. Be the first to flip!</div>
                </div>
              </div>
            )}
            {!loading && winnersOnly.slice(3).map((row, idx) => {
              const profitPositive = row.profit > 0n;
              const profitStr = `${profitPositive ? '+' : ''}${formatEth(row.profit)} ETH`;
              const bestWinStr = `+${formatEth(row.biggestWin)} ETH`;
              const short = shortAddress(row.address);
              const rankIndex = idx + 4; // continue after podium
              const rankBadge = 'from-emerald-500/20 to-teal-400/20';
              return (
                <div key={row.address} className="hover:bg-white/[0.03] transition-all duration-200">
                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-12 items-center px-fluid-4 py-fluid-3">
                    <div className="col-span-1">
                      <div className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${rankBadge} text-fluid-xs px-fluid-2 py-1 min-w-[24px] h-6`}>{rankIndex}</div>
                    </div>
                    <div className="col-span-4 flex items-center gap-fluid-3">
                      <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-fluid-xs" style={{ width: 'clamp(28px, 2.5vw + 16px, 36px)', height: 'clamp(28px, 2.5vw + 16px, 36px)' }}>
                        {row.address.slice(2, 4).toUpperCase()}
                      </div>
                      <div className="leading-tight">
                        <div className="font-medium text-fluid-sm">{short}</div>
                        <div className="text-fluid-xs text-neutral-400">{row.betCount} bets</div>
                      </div>
                    </div>
                    <div className={`col-span-2 font-medium text-fluid-sm ${profitPositive ? 'text-emerald-300' : 'text-rose-300'}`}>{profitStr}</div>
                    <div className="col-span-1 text-fluid-sm">{row.wins}</div>
                    <div className="col-span-2 text-neutral-200 text-fluid-sm">{bestWinStr}</div>
                    <div className="col-span-2 text-neutral-200 text-fluid-sm">{row.betCount}</div>
                  </div>
                  {/* Mobile layout */}
                  <div className="md:hidden px-fluid-4 py-fluid-3">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <div className="col-span-1">
                        <div className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${rankBadge} text-fluid-xs px-1 py-1 min-w-[20px] h-5`}>{rankIndex}</div>
                      </div>
                      <div className="col-span-6 flex items-center gap-2">
                        <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-fluid-xs w-6 h-6">
                          {row.address.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="leading-tight min-w-0">
                          <div className="font-medium text-fluid-xs truncate">{short}</div>
                          <div className="text-[10px] text-neutral-400">{row.betCount} bets</div>
                        </div>
                      </div>
                      <div className={`col-span-3 font-medium text-fluid-xs text-right ${profitPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                        <div>{profitStr}</div>
                      </div>
                      <div className="col-span-2 text-fluid-xs text-right">{row.wins}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-fluid-12 flex items-center justify-center gap-fluid-2 text-fluid-sm text-neutral-400">
          <TrendingUp className="h-4 w-4" />
          <span>Join the winners: </span>
          <Link href="/" className="text-emerald-300 hover:underline transition-all duration-200 hover:text-emerald-200">Play Coinflip</Link>
        </div>
      </main>
    </PageLayout>
  );
}

// Memoize the entire leaderboard page to prevent unnecessary re-renders
export default memo(LeaderboardPageComponent);


