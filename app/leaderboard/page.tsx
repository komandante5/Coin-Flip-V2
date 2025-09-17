'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePublicClient } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { Crown, TrendingUp } from 'lucide-react';
import { ConnectWalletButton } from '@/components/connect-wallet-button';
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

function formatEth(value: bigint) {
  try {
    return Number(formatEther(value)).toFixed(4);
  } catch {
    return '0.0000';
  }
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function LeaderboardPage() {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!publicClient) return;
      setLoading(true);
      try {
        const revealLogs = await publicClient.getLogs({
          address: coinFlipAddress,
          event: parseAbiItem('event FlipRevealed(address indexed player, uint256 betAmount, uint8 choice, uint8 result, bool didWin, uint256 payout, uint256 indexed requestId)'),
          fromBlock: 'earliest',
          toBlock: 'latest'
        });

        const map = new Map<string, PlayerStats>();
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
          const s = map.get(player)!;
          s.totalBets += betAmount;
          s.totalPayout += payout;
          s.betCount += 1;
          if (didWin) {
            s.wins += 1;
            const net = payout > betAmount ? payout - betAmount : payout;
            if (net > s.biggestWin) s.biggestWin = net;
          } else {
            s.losses += 1;
          }
        }

        setStats(Array.from(map.values()));
      } catch (err) {
        console.error('leaderboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [publicClient]);

  const sorted = useMemo(() => {
    return [...stats]
      .map(s => ({
        ...s,
        profit: s.totalPayout - s.totalBets,
        avgBet: s.betCount === 0 ? 0n : s.totalBets / BigInt(s.betCount),
      }))
      .sort((a, b) => (b.profit > a.profit ? 1 : b.profit < a.profit ? -1 : 0))
      .slice(0, 100);
  }, [stats]);

  const winnersOnly = useMemo(() => sorted.filter(s => s.profit > 0n), [sorted]);

  return (
    <div className="min-h-screen w-full bg-[#0c0f10] text-white overflow-hidden">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-[120px] opacity-30 bg-emerald-400/30" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full blur-[140px] opacity-20 bg-teal-400/20" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto max-w-[1300px] px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-400/20 ring-1 ring-emerald-400/40" />
            <span className="font-semibold tracking-tight">Coin Flip V2</span>
          </div>

          <nav className="ml-6 hidden md:flex items-center gap-1 text-[13px] text-neutral-300">
            {[
              { label: 'Coinflip', href: '/' },
              { label: 'Account', href: '#' },
              { label: 'Leaderboard', href: '/leaderboard' },
              { label: 'Rewards', href: '/rewards' },
              { label: 'On‑chain', href: '/onchain' },
            ].map((item) => (
              <Link
                key={item.label}
                className={`px-3 py-1.5 rounded-md hover:bg-white/[0.04] transition ${
                  item.label === 'Leaderboard' ? 'text-white' : ''
                }`}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            <ConnectWalletButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-[1300px] px-4 py-8">
        <div className="flex items-center gap-3">
          <Crown className="text-emerald-300" />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Leaderboard</h1>
        </div>
        <p className="mt-2 text-neutral-400">All‑time winners ranked by profit</p>

        {/* Winners Podium */}
        {winnersOnly.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4 items-end">
            {winnersOnly.slice(0, 3).map((w, i) => {
              const height = i === 0 ? 'h-44' : 'h-36';
              const gradient = i === 0
                ? 'from-yellow-400/30 to-amber-300/20'
                : i === 1
                ? 'from-slate-300/30 to-gray-200/10'
                : 'from-amber-800/30 to-amber-700/10';
              return (
                <div key={w.address} className={`relative rounded-3xl border border-white/10 bg-white/[0.02] p-4 ${height} overflow-hidden`}> 
                  <div className={`absolute inset-0 -z-10 bg-gradient-to-b ${gradient} opacity-70`} />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-neutral-300">{i === 0 ? 'Champion' : i === 1 ? 'Runner‑up' : 'Third'}</div>
                    <div className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10">#{i + 1}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-xs">
                      {w.address.slice(2,4).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{shortAddress(w.address)}</div>
                      <div className="text-xs text-neutral-300">Wins {w.wins}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-2xl font-extrabold text-emerald-300">+{formatEth(w.profit)} ETH</div>
                  <div className="text-xs text-neutral-300">Best win +{formatEth(w.biggestWin)} ETH</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Winners Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="grid grid-cols-12 px-4 py-3 text-xs uppercase tracking-wider text-neutral-400">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">Profit</div>
            <div className="col-span-1">Wins</div>
            <div className="col-span-2">Best win</div>
            <div className="col-span-2">Bets</div>
          </div>
          <div className="divide-y divide-white/10">
            {loading && (
              <div className="px-4 py-10 text-center text-neutral-400 text-sm">Loading leaderboard…</div>
            )}
            {!loading && winnersOnly.length === 0 && (
              <div className="px-4 py-10 text-center text-neutral-400 text-sm">No games yet. Be the first to flip!</div>
            )}
            {!loading && winnersOnly.slice(3).map((row, idx) => {
              const profitPositive = row.profit > 0n;
              const profitStr = `${profitPositive ? '+' : ''}${formatEth(row.profit)} ETH`;
              const bestWinStr = `+${formatEth(row.biggestWin)} ETH`;
              const short = shortAddress(row.address);
              const rankIndex = idx + 4; // continue after podium
              const rankBadge = 'from-emerald-500/20 to-teal-400/20';
              return (
                <div key={row.address} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/[0.03] transition">
                  <div className="col-span-1">
                    <div className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r ${rankBadge} text-[11px] px-2`}>{rankIndex}</div>
                  </div>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-xs">
                      {row.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <div className="font-medium">{short}</div>
                      <div className="text-[11px] text-neutral-400">{row.betCount} bets</div>
                    </div>
                  </div>
                  <div className={`col-span-2 font-medium ${profitPositive ? 'text-emerald-300' : 'text-rose-300'}`}>{profitStr}</div>
                  <div className="col-span-1">{row.wins}</div>
                  <div className="col-span-2 text-neutral-200">{bestWinStr}</div>
                  <div className="col-span-2 text-neutral-200">{row.betCount}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-neutral-400">
          <TrendingUp className="h-4 w-4" />
          <span>Join the winners: </span>
          <Link href="/" className="text-emerald-300 hover:underline">Play Coinflip</Link>
        </div>
      </main>

      <footer className="relative z-10 mx-auto max-w-[1300px] px-4 pb-10 pt-2 text-xs text-neutral-500">
        <div>
          <span className="opacity-70">Coin Flip V2 • Powered by Abstract Network & VRF</span>
        </div>
      </footer>
    </div>
  );
}


