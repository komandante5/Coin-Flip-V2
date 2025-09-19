'use client';

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { useWriteContract, usePublicClient, useReadContract, useAccount } from 'wagmi';
import { parseEther, parseEventLogs, formatEther, type Abi, parseAbiItem } from 'viem';
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { PageLayout } from '@/components/layout/page-layout';
import { SectionTitle } from '@/components/ui/section-title';
import { Pill } from '@/components/ui/pill';

import coinFlipJson from '../src/abi/CoinFlip.json';
import mockVrfJson from '../src/abi/MockVRF.json';
import addresses from '../src/deployments.localhost.json';

const coinFlipAbi = coinFlipJson.abi as Abi;
const mockVrfAbi = mockVrfJson.abi as Abi;

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;
const mockVrfAddress = (addresses as any).mockVRF as `0x${string}`;

type GameStatsArray = [bigint, bigint, bigint, bigint, bigint, bigint];
type CoinSide = 'Heads' | 'Tails';

interface FlipEvent {
  player: string;
  betAmount: bigint;
  choice: number;
  result?: number;
  didWin?: boolean;
  payout?: bigint;
  requestId: bigint;
  timestamp: number;
}


function CoinflipPage() {
  const [selected, setSelected] = useState<CoinSide>('Heads');
  const [selectedForUI, setSelectedForUI] = useState<CoinSide>('Heads');
  const [amount, setAmount] = useState<string>("0.01");
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [recentFlips, setRecentFlips] = useState<FlipEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Read min/max bet from contract with caching
  const { data: gameStats, refetch: refetchStats } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'getGameStats',
    query: {
      staleTime: 30000, // Cache for 30 seconds
      refetchInterval: 30000, // Auto-refetch every 30 seconds
    }
  }) as { data: GameStatsArray | undefined, refetch: () => void };


  // DEMO-ONLY: Local mock data for recent bets when there are no events
  // TODO: Remove this block and rely solely on on-chain logs once backend is wired
  const demoFlips = useMemo<FlipEvent[]>(() => {
    const now = Math.floor(Date.now() / 1000);
    const demoAddressA = address ?? '0xA11ce0000000000000000000000000000000000';
    const demoAddressB = '0xB0b0000000000000000000000000000000000001';
    const demoAddressC = '0xC0c0000000000000000000000000000000000002';
    const demoAddressD = '0xD0d0000000000000000000000000000000000003';
    const demoAddressE = '0xE0e0000000000000000000000000000000000004';
    const demoAddressF = '0xF0f0000000000000000000000000000000000005';
    const demoAddressG = '0xF00d000000000000000000000000000000000006';
    const demoAddressH = '0xCafe000000000000000000000000000000000007';
    const mk = (player: string, amt: string, choice: 0 | 1, didWin?: boolean, secondsAgo: number = 60, id: number = 1): FlipEvent => ({
      player,
      betAmount: parseEther(amt),
      choice,
      result: didWin === undefined ? undefined : (Math.random() < 0.5 ? 0 : 1),
      didWin,
      payout: didWin ? (parseEther(amt) * BigInt(2)) : undefined,
      requestId: BigInt(id),
      timestamp: now - secondsAgo,
    });
    return [
      mk(demoAddressA, '0.10', 0, true, 120, 1),
      mk(demoAddressB, '0.05', 1, false, 460, 2),
      mk(demoAddressA, '0.25', 1, undefined, 30, 3), // pending example
      mk(demoAddressB, '1.00', 0, true, 3600, 4),
      mk(demoAddressC, '0.75', 1, false, 7200, 5),
      mk(demoAddressD, '0.02', 0, true, 10, 6),
      mk(demoAddressE, '0.33', 1, undefined, 5, 7), // pending
      mk(demoAddressA, '0.50', 0, false, 20000, 8),
      mk(demoAddressF, '2.50', 1, true, 90000, 9),
      mk(demoAddressB, '0.15', 0, undefined, 15, 10), // pending
      mk(demoAddressG, '0.05', 1, true, 240, 11),
      mk(demoAddressH, '0.20', 0, false, 720, 12),
      mk(demoAddressC, '0.08', 0, true, 180, 13),
      mk(demoAddressE, '0.60', 1, false, 4200, 14),
      mk(demoAddressD, '0.12', 1, undefined, 60, 15), // pending
    ];
  }, [address]);

  // Memoize expensive calculations
  const { minBet, maxBet } = useMemo(() => {
    if (gameStats && Array.isArray(gameStats) && gameStats.length === 6) {
      return {
        minBet: Number(formatEther(gameStats[4] || BigInt(0))),
        maxBet: Number(formatEther(gameStats[5] || BigInt(0)))
      };
    }
    return { minBet: 0.01, maxBet: 7.4703 };
  }, [gameStats]);

  // Memoized fetch function to prevent unnecessary re-creations
  const fetchRecentFlips = useCallback(async () => {
    if (!publicClient) return;

    try {
      // Get recent committed events
      const commitLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipCommitted(address indexed player, uint256 betAmount, uint8 choice, uint256 indexed requestId)'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Get recent revealed events
      const revealLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipRevealed(address indexed player, uint256 betAmount, uint8 choice, uint8 result, bool didWin, uint256 payout, uint256 indexed requestId)'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Combine and process events
      const flips: FlipEvent[] = [];
      
      for (const commitLog of commitLogs.slice(-10)) { // Get last 10
        const block = await publicClient.getBlock({ blockNumber: commitLog.blockNumber });
        // Match by requestId via decoded args (more robust than topic index)
        const revealLog = revealLogs.find((r: any) => (r?.args?.requestId) === (commitLog as any)?.args?.requestId);
        
        flips.push({
          player: commitLog.args.player as string,
          betAmount: commitLog.args.betAmount as bigint,
          choice: commitLog.args.choice as number,
          result: revealLog?.args?.result as number | undefined,
          didWin: revealLog?.args?.didWin as boolean | undefined,
          payout: revealLog?.args?.payout as bigint | undefined,
          requestId: commitLog.args.requestId as bigint,
          timestamp: Number(block.timestamp)
        });
      }

      const ordered = flips.reverse(); // Most recent first
      if (ordered.length === 0 && process.env.NODE_ENV !== 'production') {
        setRecentFlips(demoFlips);
      } else {
        setRecentFlips(ordered);
      }
    } catch (error) {
      console.error('Error fetching flip events:', error);
      // Fall back to demo flips in dev if fetching failed
      if (process.env.NODE_ENV !== 'production') {
        setRecentFlips(demoFlips);
      }
    }
  }, [publicClient, demoFlips]);

  // Fetch recent flip events with reduced frequency
  useEffect(() => {
    fetchRecentFlips();
    // Reduce frequency to 30 seconds to minimize blockchain calls
    const interval = setInterval(fetchRecentFlips, 30000);
    return () => clearInterval(interval);
  }, [fetchRecentFlips]);

  // Debounced refetch function to prevent excessive calls
  const memoizedRefetchStats = useCallback(() => {
    refetchStats();
  }, [refetchStats]);

  useEffect(() => {
    // Reduce frequency to 30 seconds to minimize blockchain calls
    const id = setInterval(memoizedRefetchStats, 30000);
    return () => clearInterval(id);
  }, [memoizedRefetchStats]);



  const handleCoinSelection = useCallback((side: CoinSide) => {
    // Only animate if we're actually changing sides
    if (selectedForUI === side) return;
    
    // Immediately highlight the button for UI feedback
    setSelectedForUI(side);
    
    // Trigger spinning animation
    setIsSpinning(true);
    
    // Change the coin image halfway through the animation (when coin is edge-on)
    setTimeout(() => {
      setSelected(side);
    }, 187); // Half of 375ms (50% faster)
    
    // Stop spinning after 0.375 seconds (50% faster)
    setTimeout(() => {
      setIsSpinning(false);
    }, 375);
  }, [selectedForUI]);

  const flip = useCallback(async () => {
    if (!address) return;
    
    setIsFlipping(true);
    try {
      const side = selected === 'Heads' ? 0 : 1;

      const txHash = await writeContractAsync({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'flipCoin',
        args: [side],
        value: parseEther(amount)
      });

      const receiptCommit = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      const commitEvents = parseEventLogs({
        abi: coinFlipAbi,
        logs: receiptCommit.logs,
        eventName: 'FlipCommitted'
      });
      const requestId = (commitEvents[0]?.args as any)?.requestId as bigint;
      if (!requestId) return;

      const randomNumber = BigInt(Math.floor(Math.random() * 2 ** 32));
      const txHash2 = await writeContractAsync({
        address: mockVrfAddress,
        abi: mockVrfAbi,
        functionName: 'triggerCallback',
        args: [coinFlipAddress, requestId, randomNumber]
      });

      await publicClient!.waitForTransactionReceipt({ hash: txHash2 });
      setTimeout(() => {
        memoizedRefetchStats();
        // Refresh recent flips after a short delay
        setTimeout(() => fetchRecentFlips(), 1000);
      }, 1000);
    } catch (error) {
      console.error('Error flipping coin:', error);
    } finally {
      setIsFlipping(false);
    }
  }, [address, selected, amount, writeContractAsync, publicClient, memoizedRefetchStats, fetchRecentFlips]);

  // Memoized utility functions
  const formatAddress = useCallback((addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`, []);
  const formatTimeAgo = useCallback((timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }, []);

  const displayedFlips = useMemo(() => {
    if (activeTab === 'mine') {
      if (!address) return [] as FlipEvent[];
      return recentFlips.filter(f => f.player.toLowerCase() === address.toLowerCase());
    }
    return recentFlips;
  }, [activeTab, address, recentFlips]);

  // Optimize tab change handling
  const handleTabChange = useCallback((tab: 'all' | 'mine') => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  }, [activeTab]);

  return (
    <PageLayout>
      <main className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-4 lg:py-fluid-6 grid grid-cols-12 gap-fluid-4 lg:gap-fluid-6 flex-1" style={{ maxWidth: 'min(98vw, var(--container-3xl))' }}>
        {/* Main game panel - appears first on mobile, second on desktop */}
        <section className="col-span-12 md:col-span-8 lg:col-span-8 xl:col-span-8 order-1 md:order-2">
          <div className="flex flex-col items-center">
            {/* Floating coin visual - responsive sizing */}
            <div className="relative w-full flex items-center justify-center" style={{ height: 'clamp(120px, 12vw + 60px, 180px)' }}>
              
              {/* Coin image in center */}
              <div className={`relative z-10 rounded-full overflow-hidden shadow-2xl ${isFlipping ? 'animate-spin' : ''} ${isSpinning ? 'animate-coin-spin' : ''}`} style={{ width: 'var(--coin-size)', height: 'var(--coin-size)' }}>
                <Image
                  src={selected === 'Heads' ? '/Heads.png' : '/Tails.png'}
                  alt={selected}
                  width={288}
                  height={288}
                  className="w-full h-full object-cover"
                  priority
                  sizes="(max-width: 768px) 120px, (max-width: 1200px) 150px, 180px"
                />
              </div>
              
              {isFlipping && (
                <div className="absolute text-center z-20" style={{ marginTop: 'calc(var(--coin-size) + var(--space-4))' }}>
                  <div className="text-fluid-xl font-bold text-emerald-300">Flipping...</div>
                  <div className="text-fluid-sm text-neutral-400 mt-1">Waiting for result</div>
                </div>
              )}
            </div>

            {/* Choice cards */}
            <div className="mt-fluid-4 grid w-full grid-cols-2 gap-fluid-3 max-w-2xl mx-auto">
              {/* Heads card */}
              <div
                className={`rounded-xl border p-fluid-4 backdrop-blur-sm transition-all hover:translate-y-[-1px] duration-300 select-none cursor-pointer ${
                  selectedForUI === 'Heads'
                    ? 'border-emerald-400/40 bg-emerald-500/8 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                style={{ minHeight: 'var(--card-min-height)' }}
                onClick={() => handleCoinSelection('Heads')}
              >
                <div className="text-center">
                  <SectionTitle>HEADS</SectionTitle>
                  <div className="mt-fluid-2 flex items-center justify-center">
                    <div className="rounded-full overflow-hidden" style={{ width: 'clamp(40px, 4vw + 24px, 56px)', height: 'clamp(40px, 4vw + 24px, 56px)' }}>
                      <Image
                        src="/Heads.png"
                        alt="Heads"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                        priority
                        sizes="(max-width: 768px) 40px, (max-width: 1200px) 48px, 56px"
                      />
                    </div>
                  </div>
                  <div className="mt-fluid-2">
                    <Pill active={selectedForUI === 'Heads'}>2.00x</Pill>
                  </div>
                </div>
              </div>

              {/* Tails card */}
              <div
                className={`rounded-xl border p-fluid-4 backdrop-blur-sm transition-all hover:translate-y-[-1px] duration-300 select-none cursor-pointer ${
                  selectedForUI === 'Tails'
                    ? 'border-emerald-400/40 bg-emerald-500/8 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                style={{ minHeight: 'var(--card-min-height)' }}
                onClick={() => handleCoinSelection('Tails')}
              >
                <div className="text-center">
                  <SectionTitle>TAILS</SectionTitle>
                  <div className="mt-fluid-2 flex items-center justify-center">
                    <div className="rounded-full overflow-hidden" style={{ width: 'clamp(40px, 4vw + 24px, 56px)', height: 'clamp(40px, 4vw + 24px, 56px)' }}>
                      <Image
                        src="/Tails.png"
                        alt="Tails"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                        priority
                        sizes="(max-width: 768px) 40px, (max-width: 1200px) 48px, 56px"
                      />
                    </div>
                  </div>
                  <div className="mt-fluid-2">
                    <Pill active={selectedForUI === 'Tails'}>2.00x</Pill>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount controls */}
            <div className="mt-fluid-5 lg:mt-fluid-6 w-full mx-auto" style={{ maxWidth: 'min(100%, 500px)' }}>
              {/* Custom amount input - more prominent */}
              <div className="mb-3">
                <label className="block text-fluid-sm font-medium text-neutral-300 mb-2 text-center">
                  Bet Amount (ETH)
                </label>
                <div className="relative">
                  <div className="w-full rounded-lg border border-white/20 bg-white/[0.03] px-fluid-3 py-fluid-3 text-white focus-within:border-emerald-400/50 focus-within:bg-white/[0.05] transition-all duration-200">
                    <div className="flex items-center justify-center gap-2 max-w-fit mx-auto">
                      {/* Ethereum Icon */}
                      <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                      </svg>
                      <input
                        className="bg-transparent outline-none placeholder:text-neutral-500 text-fluid-base font-medium no-spinners min-w-0"
                        placeholder="0.01"
                        type="number"
                        step="0.0001"
                        min={minBet}
                        max={maxBet}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ width: `${Math.max(amount.length, 4)}ch` }}
                      />
                    </div>
                  </div>
                  <div className="mt-1 text-center text-fluid-xs text-neutral-400">
                    Min: {minBet.toFixed(4)} ETH • Max: {maxBet.toFixed(4)} ETH
                  </div>
                </div>
              </div>

              {/* Quick bet buttons - memoized */}
              <div className="grid grid-cols-5 gap-fluid-2">
                {useMemo(() => [
                  { label: '0.01', value: '0.01' },
                  { label: '0.1', value: '0.1' },
                  { label: '0.5', value: '0.5' },
                  { label: '1.0', value: '1' },
                  { label: 'MAX', value: String(maxBet.toFixed(4)) },
                ], [maxBet]).map((b, i) => (
                  <button
                    key={b.label}
                    onClick={() => setAmount(b.value)}
                    className={`rounded-md border py-fluid-2 px-fluid-2 text-fluid-xs font-medium transition-all duration-200 hover:scale-[1.02] ${
                      amount === b.value || (b.label === 'MAX' && amount === String(maxBet.toFixed(4)))
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/15 bg-white/[0.02] text-neutral-200 hover:bg-white/[0.04] hover:border-white/25'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flip button */}
            <div className="mt-fluid-4 lg:mt-fluid-5 w-full mx-auto" style={{ maxWidth: 'min(100%, 400px)' }}>
              <button 
                onClick={flip}
                disabled={!address || !amount || Number(amount) < minBet || Number(amount) > maxBet || isFlipping}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:via-teal-300 hover:to-emerald-400 transition-all duration-300 text-black font-bold text-fluid-lg lg:text-fluid-xl flex items-center justify-center gap-fluid-3 shadow-[0_0_60px_-15px_rgba(16,185,129,0.8)] hover:shadow-[0_0_80px_-10px_rgba(16,185,129,1)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                style={{ height: 'var(--button-height)' }}
              >
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {isFlipping ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>FLIPPING...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>FLIP</span>
                    <div className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Left rail: recent bets - appears second on mobile, first on desktop */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-4 xl:col-span-4 order-2 md:order-1">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col" style={{ height: 'clamp(400px, 75vh, 800px)' }}>
            <div className="flex gap-fluid-1 px-fluid-3 pt-fluid-3 pb-fluid-2 border-b border-white/5">
              <button
                onClick={() => handleTabChange('all')}
                className={`text-fluid-xs px-fluid-3 py-fluid-2 transition-all duration-200 relative ${
                  activeTab === 'all' 
                    ? 'text-white' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All Bets
                {activeTab === 'all' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => handleTabChange('mine')}
                className={`text-fluid-xs px-fluid-3 py-fluid-2 transition-all duration-200 relative ${
                  activeTab === 'mine' 
                    ? 'text-white' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                My Bets
                {activeTab === 'mine' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"></div>
                )}
              </button>
            </div>
            <div className="flex-1 divide-y divide-white/5 overflow-y-auto custom-scrollbar">
              {displayedFlips.length === 0 ? (
                <div className="flex items-center justify-center h-full px-fluid-3 py-fluid-4 text-center text-neutral-500 text-fluid-xs">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-fluid-sm">📊</span>
                    </div>
                    <div>{activeTab === 'mine' && !address ? 'Connect wallet to see your bets' : 'No recent flips'}</div>
                  </div>
                </div>
              ) : (
                displayedFlips.map((flip, i) => (
                  <div key={i} className="px-fluid-3 py-fluid-3">
                    <div className="flex items-center justify-between">
                      <div className="text-fluid-xs text-neutral-400 truncate max-w-[60%]">{formatAddress(flip.player)}</div>
                      <div className="text-fluid-xs text-neutral-500 whitespace-nowrap">{formatTimeAgo(flip.timestamp)}</div>
                    </div>
                    <div className="mt-fluid-2 flex justify-between items-center">
                      <div className="flex items-center gap-fluid-2 flex-1">
                        <Image
                          src={flip.choice === 0 ? '/Heads.png' : '/Tails.png'}
                          alt={flip.choice === 0 ? 'Heads' : 'Tails'}
                          width={28}
                          height={28}
                          className="rounded-full object-contain shrink-0"
                          style={{ width: 'clamp(24px, 2.5vw + 16px, 32px)', height: 'clamp(24px, 2.5vw + 16px, 32px)' }}
                          loading="lazy"
                          sizes="(max-width: 768px) 24px, (max-width: 1200px) 28px, 32px"
                        />
                        <div className="text-fluid-xs">{flip.choice === 0 ? 'Heads' : 'Tails'}</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className={`${flip.didWin === true ? 'text-emerald-300' : flip.didWin === false ? 'text-rose-300' : 'text-yellow-300'} text-fluid-xs`}> 
                          {flip.didWin === undefined ? 'Pending' : flip.didWin ? 'Win' : 'Loss'}
                        </div>
                      </div>
                      <div className="text-right flex-1">
                        <div className="flex items-center justify-end gap-1 text-fluid-xs whitespace-nowrap">
                          <svg className="w-2.5 h-2.5 text-emerald-300 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                          </svg>
                          {Number(formatEther(flip.betAmount)).toFixed(4)}
                        </div>
                        {flip.payout && flip.didWin && (
                          <div className="flex items-center justify-end gap-1 text-fluid-xs text-emerald-300/80 whitespace-nowrap">
                            <span>+</span>
                            <svg className="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                            </svg>
                            <span>{Number(formatEther(flip.payout)).toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* animations */}
      <style jsx>{`
        .animate-spin-slow { animation: spin 16s linear infinite; }
        .animate-coin-spin { animation: coin-spin 0.375s ease-in-out; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes coin-spin { 
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg) scaleX(-1); }
        }
      `}</style>
    </PageLayout>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
export default memo(CoinflipPage);
