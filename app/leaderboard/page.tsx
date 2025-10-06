'use client';

import { useEffect, useMemo, useState, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePublicClient, useAccount, useBalance } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { Crown, TrendingUp, Flame, Zap, Trophy, DollarSign, Target, Activity, ArrowRight, TrendingDown, Sparkles, ChevronRight } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import addresses from '../../src/deployments.localhost.json';

import type { PlayerStats, FlipEvent } from '@/types/coinflip';
import { LEADERBOARD_CONFIG, MAX_RECENT_FLIPS } from '@/config/constants';
import { formatAddress } from '@/lib/format-utils';
import { formatTimeAgo, setTimestampInCache, getCachedTimestamp } from '@/lib/timestamp-utils';

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;

// Utility function for better performance
const formatEth = (value: bigint) => {
  try {
    return Number(formatEther(value)).toFixed(4);
  } catch {
    return '0.0000';
  }
};

// Memoized CTA component to prevent re-renders
const CTASection = memo(() => (
  <div className="mt-fluid-8 relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-fluid-6 lg:p-fluid-8">
    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/10 rounded-full blur-3xl"></div>
    
    <div className="relative text-center">
      <Flame className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
      <h2 className="text-fluid-2xl lg:text-fluid-3xl font-extrabold mb-2">
        Ready to Join the Winners?
      </h2>
      <p className="text-neutral-300 text-fluid-base mb-fluid-6">
        Join the action and compete for the top spot!
      </p>
      <Link 
        href="/"
        className="inline-flex items-center gap-2 px-fluid-6 py-fluid-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-bold text-fluid-base hover:scale-105 transition-transform duration-200 shadow-lg hover:shadow-emerald-400/50"
      >
        Start Playing
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  </div>
));

CTASection.displayName = 'CTASection';

// Extended stats with streak tracking
interface ExtendedPlayerStats {
  address: string;
  totalBets: bigint;
  totalPayout: bigint;
  wins: number;
  losses: number;
  betCount: number;
  biggestWin: bigint;
  profit: bigint;
  winRate: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
}

function LeaderboardPage() {
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const [stats, setStats] = useState<ExtendedPlayerStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [liveFlips, setLiveFlips] = useState<FlipEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'profit' | 'volume' | 'bigWin' | 'streak'>('profit');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');

  // Get contract balance (bankroll)
  const { data: contractBalance } = useBalance({
    address: coinFlipAddress,
  });

  // Fetch leaderboard data with enhanced stats
  const fetchLeaderboardData = useCallback(async () => {
    if (!publicClient) return;
    
    setLoading(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > LEADERBOARD_CONFIG.MAX_HISTORY_BLOCKS 
        ? latestBlock - LEADERBOARD_CONFIG.MAX_HISTORY_BLOCKS 
        : 'earliest';
      
      // Fetch reveal logs for stats
      const revealLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipRevealed(address indexed player, uint256 betAmount, uint8 choice, uint8 result, bool didWin, uint256 payout, uint256 indexed requestId)'),
        fromBlock,
        toBlock: 'latest'
      });

      // Fetch commit logs for timestamps
      const commitLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipCommitted(address indexed player, uint256 betAmount, uint8 choice, uint256 indexed requestId)'),
        fromBlock,
        toBlock: 'latest'
      });

      // Build timestamp map
      const timestampMap = new Map<string, number>();
      for (const log of commitLogs) {
        const reqId = log.args.requestId?.toString() || '';
        if (log.blockNumber) {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          const ts = Number(block.timestamp) * 1000;
          timestampMap.set(reqId, ts);
          setTimestampInCache(reqId, ts);
        }
      }

      const map = new Map<string, ExtendedPlayerStats>();
      const recentFlips: FlipEvent[] = [];
      
      // Process logs
      for (let i = revealLogs.length - 1; i >= 0; i--) {
        const log = revealLogs[i];
        const player = (log.args.player || '0x0') as string;
        const betAmount = (log.args.betAmount || BigInt(0)) as bigint;
        const payout = (log.args.payout || BigInt(0)) as bigint;
        const didWin = Boolean(log.args.didWin);
        const requestId = (log.args.requestId || BigInt(0)) as bigint;
        const choice = Number(log.args.choice || 0);
        const result = Number(log.args.result || 0);

        // Add to recent flips for live feed
        if (recentFlips.length < MAX_RECENT_FLIPS) {
          const reqIdStr = requestId.toString();
          const cachedTs = getCachedTimestamp(reqIdStr);
          const timestamp = timestampMap.get(reqIdStr) || cachedTs || Date.now();
          
          recentFlips.push({
            player,
            betAmount,
            choice,
            result,
            didWin,
            payout,
            requestId,
            timestamp,
          });
        }

        // Update player stats
        if (!map.has(player)) {
          map.set(player, {
            address: player,
            totalBets: BigInt(0),
            totalPayout: BigInt(0),
            wins: 0,
            losses: 0,
            betCount: 0,
            biggestWin: BigInt(0),
            profit: BigInt(0),
            winRate: 0,
            currentStreak: 0,
            streakType: 'none',
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

      // Calculate derived stats
      map.forEach((playerStats) => {
        playerStats.profit = playerStats.totalPayout - playerStats.totalBets;
        playerStats.winRate = playerStats.betCount > 0 
          ? (playerStats.wins / playerStats.betCount) * 100 
          : 0;
      });

      setStats(Array.from(map.values()));
      setLiveFlips(recentFlips);
    } catch (err) {
      console.error('leaderboard fetch error', err);
      setStats([]);
      setLiveFlips([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchLeaderboardData();
    
    // Refresh every 1 minute
    const interval = setInterval(fetchLeaderboardData, 60000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData]);

  // Calculate global stats
  const globalStats = useMemo(() => {
    if (stats.length === 0) {
      return {
        totalWagered: BigInt(0),
        totalWinners: 0,
        biggestWinToday: BigInt(0),
        totalPlayers: 0,
        avgWinRate: 0,
      };
    }

    const totalWagered = stats.reduce((sum, s) => sum + s.totalBets, BigInt(0));
    const totalWinners = stats.filter(s => s.profit > BigInt(0)).length;
    const biggestWinToday = stats.reduce((max, s) => s.biggestWin > max ? s.biggestWin : max, BigInt(0));
    const avgWinRate = stats.reduce((sum, s) => sum + s.winRate, 0) / stats.length;

    return {
      totalWagered,
      totalWinners,
      biggestWinToday,
      totalPlayers: stats.length,
      avgWinRate,
    };
  }, [stats]);

  // Sort based on selected category
  const sortedStats = useMemo(() => {
    const filtered = stats.filter(s => s.profit > BigInt(0) || selectedCategory !== 'profit');
    
    return filtered.sort((a, b) => {
      switch (selectedCategory) {
        case 'profit':
          return b.profit > a.profit ? 1 : b.profit < a.profit ? -1 : 0;
        case 'volume':
          return b.totalBets > a.totalBets ? 1 : b.totalBets < a.totalBets ? -1 : 0;
        case 'bigWin':
          return b.biggestWin > a.biggestWin ? 1 : b.biggestWin < a.biggestWin ? -1 : 0;
        case 'streak':
          return b.wins - a.wins;
        default:
          return 0;
      }
    }).slice(0, LEADERBOARD_CONFIG.MAX_DISPLAYED_WINNERS);
  }, [stats, selectedCategory]);

  // Find user's rank
  const userRank = useMemo(() => {
    if (!userAddress) return null;
    const idx = sortedStats.findIndex(s => s.address.toLowerCase() === userAddress.toLowerCase());
    return idx >= 0 ? idx + 1 : null;
  }, [sortedStats, userAddress]);

  const categoryConfig = {
    profit: { label: 'Profit Kings', icon: Crown, color: 'text-yellow-400', bg: 'from-yellow-400/20 to-amber-500/10' },
    volume: { label: 'High Rollers', icon: DollarSign, color: 'text-emerald-400', bg: 'from-emerald-400/20 to-teal-500/10' },
    bigWin: { label: 'Lucky Legends', icon: Zap, color: 'text-purple-400', bg: 'from-purple-400/20 to-pink-500/10' },
    streak: { label: 'Win Streaks', icon: Flame, color: 'text-orange-400', bg: 'from-orange-400/20 to-red-500/10' },
  };

  return (
    <PageLayout>
      <main className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-6 lg:py-fluid-8 flex-1" style={{ maxWidth: 'min(98vw, var(--container-3xl))' }}>
        
        {/* Hero Section with Stats */}
        <div className="flex flex-col gap-fluid-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-fluid-3xl md:text-fluid-4xl lg:text-6xl font-extrabold tracking-tight">Leaderboard</h1>
            <p className="mt-fluid-2 text-neutral-400 text-fluid-base">Live rankings</p>
            
            {userRank && (
              <div className="mt-fluid-4 inline-flex items-center gap-2 px-fluid-4 py-fluid-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 text-emerald-300">
                <Target className="w-4 h-4" />
                <span className="font-semibold text-fluid-sm">Your Rank: #{userRank}</span>
              </div>
            )}
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-fluid-4">
            {/* Bankroll */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-fluid-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center gap-2 text-emerald-300 text-fluid-xs font-medium mb-2">
                  <DollarSign className="w-4 h-4" />
                  PRIZE POOL
                </div>
                <div className="text-fluid-2xl lg:text-fluid-3xl font-extrabold text-white">
                  {contractBalance ? formatEth(contractBalance.value) : '0.0000'} ETH
                </div>
                <div className="text-fluid-xs text-neutral-400 mt-1">Available to win</div>
              </div>
            </div>

            {/* Total Wagered */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-fluid-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center gap-2 text-purple-300 text-fluid-xs font-medium mb-2">
                  <TrendingUp className="w-4 h-4" />
                  TOTAL VOLUME
                </div>
                <div className="text-fluid-2xl lg:text-fluid-3xl font-extrabold text-white">
                  {formatEth(globalStats.totalWagered)} ETH
                </div>
                <div className="text-fluid-xs text-neutral-400 mt-1">{globalStats.totalPlayers} players</div>
              </div>
            </div>

            {/* Biggest Win */}
            <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 p-fluid-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center gap-2 text-yellow-300 text-fluid-xs font-medium mb-2">
                  <Zap className="w-4 h-4" />
                  BIGGEST WIN
                </div>
                <div className="text-fluid-2xl lg:text-fluid-3xl font-extrabold text-white">
                  +{formatEth(globalStats.biggestWinToday)} ETH
                </div>
                <div className="text-fluid-xs text-neutral-400 mt-1">All time record</div>
              </div>
            </div>

            {/* Winners */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/10 to-red-500/10 p-fluid-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/10 rounded-full blur-2xl"></div>
              <div className="relative">
                <div className="flex items-center gap-2 text-orange-300 text-fluid-xs font-medium mb-2">
                  <Flame className="w-4 h-4" />
                  WINNERS
                </div>
                <div className="text-fluid-2xl lg:text-fluid-3xl font-extrabold text-white">
                  {globalStats.totalWinners}
                </div>
                <div className="text-fluid-xs text-neutral-400 mt-1">{globalStats.avgWinRate.toFixed(1)}% win rate</div>
              </div>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="flex items-center gap-2 px-fluid-4 py-fluid-3 border-b border-white/10">
              <Activity className="w-4 h-4 text-emerald-300" />
              <span className="font-semibold text-fluid-sm">Live Activity</span>
              <span className="ml-auto text-fluid-xs text-neutral-400">{liveFlips.length} recent flips</span>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
              {liveFlips.length === 0 ? (
                <div className="px-fluid-4 py-fluid-6 text-center text-neutral-400 text-fluid-sm">
                  No recent activity. Be the first!
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {liveFlips.map((flip, idx) => {
                    const isWin = flip.didWin;
                    const profit = flip.payout && flip.betAmount ? flip.payout - flip.betAmount : BigInt(0);
                    return (
                      <div key={`${flip.requestId}-${idx}`} className="px-fluid-4 py-fluid-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-fluid-3">
                          <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-fluid-xs w-8 h-8 flex-shrink-0">
                            {flip.player.slice(2, 4).toUpperCase()}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-fluid-sm truncate">{formatAddress(flip.player)}</span>
                              {isWin ? (
                                <span className="text-emerald-300 text-fluid-xs flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  WON
                                </span>
                              ) : (
                                <span className="text-rose-300 text-fluid-xs flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" />
                                  LOST
                                </span>
                              )}
                            </div>
                            <div className="text-fluid-xs text-neutral-400">
                              {formatTimeAgo(flip.timestamp)}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`font-semibold text-fluid-sm ${isWin ? 'text-emerald-300' : 'text-rose-300'}`}>
                              {isWin ? '+' : '-'}{formatEth(isWin ? profit : flip.betAmount)} ETH
                            </div>
                            <div className="text-fluid-xs text-neutral-400">
                              Bet: {formatEth(flip.betAmount)} ETH
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-fluid-2">
            {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((cat) => {
              const config = categoryConfig[cat];
              const Icon = config.icon;
              const isActive = selectedCategory === cat;
              
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    flex items-center gap-2 px-fluid-4 py-fluid-2 rounded-full font-medium text-fluid-sm
                    transition-all duration-200 border
                    ${isActive 
                      ? `bg-gradient-to-r ${config.bg} border-white/20 ${config.color}` 
                      : 'bg-white/[0.02] border-white/10 text-neutral-400 hover:bg-white/[0.05] hover:border-white/20'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Podium for Top 3 */}
          {sortedStats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-fluid-4 items-end">
              {sortedStats.slice(0, 3).map((player, i) => {
                const rank = i + 1;
                const config = categoryConfig[selectedCategory];
                const Icon = config.icon; // Use the category-specific icon
                
                let value = '';
                switch (selectedCategory) {
                  case 'profit':
                    value = `+${formatEth(player.profit)} ETH`;
                    break;
                  case 'volume':
                    value = `${formatEth(player.totalBets)} ETH`;
                    break;
                  case 'bigWin':
                    value = `+${formatEth(player.biggestWin)} ETH`;
                    break;
                  case 'streak':
                    value = `${player.wins} wins`;
                    break;
                }
                
                const height = rank === 1 ? 'min-h-[200px]' : rank === 2 ? 'min-h-[180px]' : 'min-h-[160px]';
                const crownColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600';
                
                return (
                  <div 
                    key={player.address} 
                    className={`
                      relative rounded-3xl border border-white/10 bg-white/[0.02] p-fluid-4 ${height}
                      overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:shadow-2xl
                      ${rank === 1 ? 'sm:order-2' : rank === 2 ? 'sm:order-1' : 'sm:order-3'}
                    `}
                  >
                    <div className={`absolute inset-0 -z-10 bg-gradient-to-b ${config.bg} opacity-70`} />
                    
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-fluid-xs ${config.color}`}>
                        <Icon className="w-4 h-4" />
                        {rank === 1 ? 'Champion' : rank === 2 ? 'Runner-up' : 'Third'}
                      </div>
                      <div className={`text-fluid-lg font-bold px-fluid-2 py-1 rounded-full ${crownColor}`}>
                        #{rank}
                      </div>
                    </div>
                    
                    <div className="mt-fluid-4 flex items-center gap-fluid-3">
                      <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-2 ring-white/20 grid place-items-center text-fluid-sm font-bold" 
                           style={{ width: 'clamp(40px, 4vw + 20px, 56px)', height: 'clamp(40px, 4vw + 20px, 56px)' }}>
                        {player.address.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-fluid-base">{formatAddress(player.address)}</div>
                        <div className="text-fluid-xs text-neutral-300">{player.wins}W / {player.losses}L</div>
                      </div>
                    </div>
                    
                    <div className={`mt-fluid-4 text-fluid-2xl lg:text-fluid-3xl font-extrabold ${config.color}`}>
                      {value}
                    </div>
                    
                    <div className="mt-fluid-2 text-fluid-xs text-neutral-300">
                      {player.betCount} total bets • {player.winRate.toFixed(1)}% win rate
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            <div className="divide-y divide-white/5">
              {loading && (
                <div className="px-fluid-4 py-fluid-8 text-center">
                  <div className="inline-flex items-center gap-2 text-neutral-400">
                    <div className="w-5 h-5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin"></div>
                    Loading rankings…
                  </div>
                </div>
              )}

              {!loading && sortedStats.length === 0 && (
                <div className="px-fluid-4 py-fluid-8 text-center text-neutral-400">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
                  <div className="font-medium">No players yet</div>
                  <div className="text-fluid-sm mt-1">Be the first to claim the top spot!</div>
                </div>
              )}

              {!loading && sortedStats.slice(3).map((player, idx) => {
                const rank = idx + 4;
                const config = categoryConfig[selectedCategory];
                const isUser = userAddress && player.address.toLowerCase() === userAddress.toLowerCase();
                
                let value = '';
                let valueColor = 'text-white';
                switch (selectedCategory) {
                  case 'profit':
                    value = `+${formatEth(player.profit)} ETH`;
                    valueColor = 'text-emerald-300';
                    break;
                  case 'volume':
                    value = `${formatEth(player.totalBets)} ETH`;
                    valueColor = 'text-purple-300';
                    break;
                  case 'bigWin':
                    value = `+${formatEth(player.biggestWin)} ETH`;
                    valueColor = 'text-yellow-300';
                    break;
                  case 'streak':
                    value = `${player.wins} wins`;
                    valueColor = 'text-orange-300';
                    break;
                }

                return (
                  <div 
                    key={player.address} 
                    className={`
                      hover:bg-white/[0.05] transition-all duration-200
                      ${isUser ? 'bg-emerald-500/10 border-l-2 border-emerald-400' : ''}
                    `}
                  >
                    <div className="hidden md:grid grid-cols-12 items-center px-fluid-4 py-fluid-3">
                      <div className="col-span-1">
                        <div className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${config.bg} text-fluid-xs font-semibold px-fluid-2 py-1 min-w-[32px] ${config.color}`}>
                          {rank}
                        </div>
                      </div>
                      
                      <div className="col-span-4 flex items-center gap-fluid-3">
                        <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-fluid-xs" 
                             style={{ width: 'clamp(32px, 2.5vw + 18px, 40px)', height: 'clamp(32px, 2.5vw + 18px, 40px)' }}>
                          {player.address.slice(2, 4).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-fluid-sm flex items-center gap-2">
                            {formatAddress(player.address)}
                            {isUser && (
                              <span className="text-fluid-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-fluid-xs text-neutral-400">
                            {player.wins}W / {player.losses}L
                          </div>
                        </div>
                      </div>
                      
                      <div className={`col-span-2 font-bold text-fluid-base ${valueColor}`}>
                        {value}
                      </div>
                      
                      <div className="col-span-2 text-fluid-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full bg-gradient-to-r ${config.bg} transition-all duration-500`}
                              style={{ width: `${Math.min(player.winRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-neutral-300 font-medium">{player.winRate.toFixed(0)}%</span>
                        </div>
                      </div>
                      
                      <div className="col-span-2 text-neutral-300 text-fluid-sm">
                        {player.betCount} bets
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <ChevronRight className="w-4 h-4 text-neutral-500" />
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="md:hidden px-fluid-4 py-fluid-3">
                      <div className="flex items-center gap-fluid-3 mb-2">
                        <div className={`rounded-full bg-gradient-to-r ${config.bg} text-fluid-xs font-bold px-2 py-1 ${config.color}`}>
                          #{rank}
                        </div>
                        <div className="rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-400/30 ring-1 ring-white/10 grid place-items-center text-fluid-xs w-8 h-8">
                          {player.address.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-fluid-sm truncate">{formatAddress(player.address)}</div>
                        </div>
                        <div className={`font-bold text-fluid-sm ${valueColor}`}>
                          {value}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-fluid-xs text-neutral-400">
                        <span>{player.wins}W / {player.losses}L</span>
                        <span>{player.winRate.toFixed(0)}% WR</span>
                        <span>{player.betCount} bets</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <CTASection />
        </div>
      </main>
    </PageLayout>
  );
}

export default LeaderboardPage;
