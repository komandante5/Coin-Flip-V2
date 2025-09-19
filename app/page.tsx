'use client';

import { useState, useEffect, useMemo } from "react";
import { ConnectWalletButton } from '@/components/connect-wallet-button';
import { useWriteContract, usePublicClient, useReadContract, useAccount } from 'wagmi';
import { parseEther, parseEventLogs, formatEther, type Abi, parseAbiItem } from 'viem';
import { ChevronRight, Menu, X } from "lucide-react";
import Image from "next/image";

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-lg md:text-xl font-semibold tracking-wide uppercase text-neutral-200 text-center">
      {children}
    </div>
  );
}

function Pill({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm transition border items-center inline-flex gap-2 select-none ${
        active
          ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-300"
          : "bg-white/[0.02] border-white/10 text-neutral-300 hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </div>
  );
}

export default function CoinflipPage() {
  const [selected, setSelected] = useState<CoinSide>('Heads');
  const [amount, setAmount] = useState<string>("0.01");
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [recentFlips, setRecentFlips] = useState<FlipEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Read min/max bet from contract
  const { data: gameStats, refetch: refetchStats } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'getGameStats',
  }) as { data: GameStatsArray | undefined, refetch: () => void };

  const maxBet = gameStats && Array.isArray(gameStats) && gameStats.length === 6
    ? Number(formatEther(gameStats[5] || BigInt(0)))
    : 7.4703;

  const minBet = gameStats && Array.isArray(gameStats) && gameStats.length === 6
    ? Number(formatEther(gameStats[4] || BigInt(0)))
    : 0.01;

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

  // Fetch recent flip events
  useEffect(() => {
    const fetchRecentFlips = async () => {
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
    };

    fetchRecentFlips();
    const interval = setInterval(fetchRecentFlips, 10000);
    return () => clearInterval(interval);
  }, [publicClient, demoFlips]);

  useEffect(() => {
    const id = setInterval(() => refetchStats(), 10000);
    return () => clearInterval(id);
  }, [refetchStats]);

  // Auto-hide navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        // Always show nav when at top
        setIsNavVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide nav when scrolling down (after 100px)
        setIsNavVisible(false);
        setIsMobileMenuOpen(false); // Close mobile menu when hiding
      } else if (currentScrollY < lastScrollY - 10) {
        // Show nav when scrolling up (with 10px threshold)
        setIsNavVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  function handleCoinSelection(side: CoinSide) {
    // Only animate if we're actually changing sides
    if (selected === side) return;
    
    // Trigger spinning animation
    setIsSpinning(true);
    
    // Change the selected side halfway through the animation (when coin is edge-on)
    setTimeout(() => {
      setSelected(side);
    }, 500);
    
    // Stop spinning after 1 second
    setTimeout(() => {
      setIsSpinning(false);
    }, 1000);
  }

  async function flip() {
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
        refetchStats();
        // Refresh recent flips after a short delay
        setTimeout(() => window.location.reload(), 1000);
      }, 1000);
    } catch (error) {
      console.error('Error flipping coin:', error);
    } finally {
      setIsFlipping(false);
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatTimeAgo = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const displayedFlips = useMemo(() => {
    if (activeTab === 'mine') {
      if (!address) return [] as FlipEvent[];
      return recentFlips.filter(f => f.player.toLowerCase() === address.toLowerCase());
    }
    return recentFlips;
  }, [activeTab, address, recentFlips]);

  return (
    <div className="min-h-screen w-full bg-[#0c0f10] text-white overflow-hidden pt-14 md:pt-16">
      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-[120px] opacity-30 bg-emerald-400/30" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full blur-[140px] opacity-20 bg-teal-400/20" />
      </div>

      {/* Top bar */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0c0f10]/90 backdrop-blur-md transition-transform duration-300 ${
        isNavVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="mx-auto max-w-[1300px] px-3 md:px-4 py-2 md:py-3">
          {/* Mobile Layout */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/coin_flip_logo_gif_transparent.gif"
                alt="Dizzio Logo"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 rounded-md hover:bg-white/[0.04] transition"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

            <div className="scale-90 origin-right">
              <ConnectWalletButton />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/coin_flip_logo_gif_transparent.gif"
                alt="Dizzio Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="font-semibold tracking-tight text-xl">Dizzio</span>
            </div>

            <nav className="ml-6 flex items-center gap-1 text-sm text-neutral-300">
              {[
                { label: "Coinflip", href: "/" },
                { label: "Account", href: "#" },
                { label: "Leaderboard", href: "/leaderboard" },
                { label: "Rewards", href: "/rewards" },
                { label: "On‑chain", href: "/onchain" },
              ].map((item) => (
                <a
                  key={item.label}
                  className={`px-3 py-1.5 rounded-md hover:bg-white/[0.04] transition ${
                    item.label === "Coinflip" ? "text-white" : ""
                  }`}
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="ml-auto">
              <ConnectWalletButton />
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#0c0f10]/95 border-b border-white/10 backdrop-blur-md">
            <nav className="px-4 py-3 space-y-1">
              {[
                { label: "Coinflip", href: "/" },
                { label: "Account", href: "#" },
                { label: "Leaderboard", href: "/leaderboard" },
                { label: "Rewards", href: "/rewards" },
                { label: "On‑chain", href: "/onchain" },
              ].map((item) => (
                <a
                  key={item.label}
                  className={`flex items-center px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition text-sm ${
                    item.label === "Coinflip" ? "text-white bg-white/[0.06]" : "text-neutral-300"
                  }`}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-[1300px] px-4 py-4 grid grid-cols-12 gap-4">
        {/* Main game panel - appears first on mobile, second on desktop */}
        <section className="col-span-12 md:col-span-8 order-1 md:order-2">
          <div className="flex flex-col items-center">
            {/* Floating coin visual */}
            <div className="relative h-40 md:h-48 w-full flex items-center justify-center">
              
              {/* Coin image in center */}
              <div className={`relative z-10 w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl ${isFlipping ? 'animate-spin' : ''} ${isSpinning ? 'animate-coin-spin' : ''}`}>
                <Image
                  src={selected === 'Heads' ? '/Heads.png' : '/Tails.png'}
                  alt={selected}
                  width={288}
                  height={288}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {isFlipping && (
                <div className="absolute text-center z-20 mt-32">
                  <div className="text-xl font-bold text-emerald-300">Flipping...</div>
                  <div className="text-sm text-neutral-400 mt-1">Waiting for result</div>
                </div>
              )}
            </div>

            {/* Choice cards */}
            <div className="mt-2 grid w-full grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              {/* Heads card */}
              <div
                className={`rounded-2xl border p-4 md:p-5 min-h-[80px] md:min-h-[100px] backdrop-blur-sm transition hover:translate-y-[-2px] duration-300 select-none cursor-pointer ${
                  selected === 'Heads'
                    ? 'border-emerald-400/40 bg-emerald-500/5 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                onClick={() => handleCoinSelection('Heads')}
              >
                <SectionTitle>Heads</SectionTitle>
                <div className="mt-2 md:mt-3 flex items-center justify-between">
                  <div className="h-12 w-12 md:h-16 md:w-16 rounded-full overflow-hidden">
                    <Image
                      src="/Heads.png"
                      alt="Heads"
                      width={128}
                      height={128}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Pill active={selected === 'Heads'}>2.00x</Pill>
                </div>
              </div>

              {/* Tails card */}
              <div
                className={`rounded-2xl border p-4 md:p-5 min-h-[80px] md:min-h-[100px] backdrop-blur-sm transition hover:translate-y-[-2px] duration-300 select-none cursor-pointer ${
                  selected === 'Tails'
                    ? 'border-emerald-400/40 bg-emerald-500/5 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                onClick={() => handleCoinSelection('Tails')}
              >
                <SectionTitle>Tails</SectionTitle>
                <div className="mt-2 md:mt-3 flex items-center justify-between">
                  <div className="h-12 w-12 md:h-16 md:w-16 rounded-full overflow-hidden">
                    <Image
                      src="/Tails.png"
                      alt="Tails"
                      width={128}
                      height={128}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Pill active={selected === 'Tails'}>2.00x</Pill>
                </div>
              </div>
            </div>

            {/* Amount controls */}
            <div className="mt-4 w-full max-w-xl mx-auto">
              {/* Custom amount input - more prominent */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2 text-center">
                  Bet Amount (ETH)
                </label>
                <div className="relative">
                  <div className="w-full rounded-xl border-2 border-white/20 bg-white/[0.03] px-4 py-3 text-lg text-white focus-within:border-emerald-400/60 focus-within:bg-white/[0.05] transition-all duration-200">
                    <input
                      className="w-full bg-transparent outline-none placeholder:text-neutral-500 text-center text-lg font-medium"
                      placeholder="0.01"
                      type="number"
                      step="0.0001"
                      min={minBet}
                      max={maxBet}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="mt-2 text-center text-xs text-neutral-400">
                    Min: {minBet.toFixed(4)} ETH • Max: {maxBet.toFixed(4)} ETH
                  </div>
                </div>
              </div>

              {/* Quick bet buttons */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: '0.01', onClick: () => setAmount('0.01') },
                  { label: '0.1', onClick: () => setAmount('0.1') },
                  { label: '0.5', onClick: () => setAmount('0.5') },
                  { label: '1.0', onClick: () => setAmount('1') },
                  { label: 'MAX', onClick: () => setAmount(String(maxBet.toFixed(4))) },
                ].map((b, i) => (
                  <button
                    key={i}
                    onClick={b.onClick}
                    className={`rounded-lg border-2 py-2 px-3 text-xs font-medium transition-all duration-200 hover:scale-105 ${
                      amount === b.label || (b.label === 'MAX' && amount === String(maxBet.toFixed(4)))
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/20 bg-white/[0.02] text-neutral-200 hover:bg-white/[0.05] hover:border-white/30'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flip button */}
            <div className="mt-4 w-full max-w-md mx-auto">
              <button 
                onClick={flip}
                disabled={!address || !amount || Number(amount) < minBet || Number(amount) > maxBet || isFlipping}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:via-teal-300 hover:to-emerald-400 transition-all duration-300 text-black font-bold py-4 md:py-5 text-xl md:text-2xl flex items-center justify-center gap-3 shadow-[0_0_60px_-15px_rgba(16,185,129,0.8)] hover:shadow-[0_0_80px_-10px_rgba(16,185,129,1)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
              >
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {isFlipping ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>FLIPPING...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>FLIP</span>
                    <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Left rail: recent bets - appears second on mobile, first on desktop */}
        <aside className="col-span-12 md:col-span-4 order-2 md:order-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex gap-2 px-4 pt-3">
              <button
                onClick={() => setActiveTab('all')}
                className={`text-sm px-3 py-2 rounded-lg transition ${activeTab === 'all' ? 'bg-white/[0.06] text-white' : 'text-neutral-400 hover:bg-white/[0.03]'}`}
              >
                All Bets
              </button>
              <button
                onClick={() => setActiveTab('mine')}
                className={`text-sm px-3 py-2 rounded-lg transition ${activeTab === 'mine' ? 'bg-white/[0.06] text-white' : 'text-neutral-400 hover:bg-white/[0.03]'}`}
              >
                My Bets
              </button>
            </div>
            <div className="mt-2 divide-y divide-white/10 max-h-[32rem] overflow-y-auto">
              {displayedFlips.length === 0 ? (
                <div className="px-4 py-6 text-center text-neutral-500 text-sm">
                  {activeTab === 'mine' && !address ? 'Connect wallet to see your bets' : 'No recent flips'}
                </div>
              ) : (
                displayedFlips.map((flip, i) => (
                  <div key={i} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-neutral-400 truncate max-w-[60%]">{formatAddress(flip.player)}</div>
                      <div className="text-xs text-neutral-500 whitespace-nowrap">{formatTimeAgo(flip.timestamp)}</div>
                    </div>
                    <div className="mt-3 flex justify-between items-start">
                      <div className="flex items-center gap-3 w-24">
                        <Image
                          src={flip.choice === 0 ? '/Heads.png' : '/Tails.png'}
                          alt={flip.choice === 0 ? 'Heads' : 'Tails'}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-contain shrink-0"
                        />
                        <div className="flex-1">
                          <div className="text-neutral-400 text-xs font-medium mb-1">Bet</div>
                          <div className="text-sm">{flip.choice === 0 ? 'Heads' : 'Tails'}</div>
                        </div>
                      </div>
                      <div className="min-w-0 text-center">
                        <div className="text-neutral-400 text-xs font-medium mb-1">Result</div>
                        <div className={`${flip.didWin === true ? 'text-emerald-300' : flip.didWin === false ? 'text-rose-300' : 'text-yellow-300'} text-sm`}> 
                          {flip.didWin === undefined ? 'Pending' : flip.didWin ? 'Win' : 'Loss'}
                        </div>
                      </div>
                      <div className="min-w-0 text-right">
                        <div className="text-neutral-400 text-xs font-medium mb-1">Amount</div>
                        <div className="flex items-center justify-end gap-1 text-sm whitespace-nowrap">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                          {Number(formatEther(flip.betAmount)).toFixed(4)}
                        </div>
                        {flip.payout && flip.didWin && (
                          <div className="text-xs text-emerald-300/90 whitespace-nowrap">+{Number(formatEther(flip.payout)).toFixed(4)}</div>
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

      <footer className="relative z-10 mx-auto max-w-[1300px] px-4 pb-10 pt-2 text-xs text-neutral-500">
        <div>
          <span className="opacity-70">Coin Flip V2 • Powered by Abstract Network & VRF</span>
        </div>
      </footer>

      {/* animations */}
      <style jsx>{`
        .animate-spin-slow { animation: spin 16s linear infinite; }
        .animate-coin-spin { animation: coin-spin 1s ease-in-out; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes coin-spin { 
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg) scaleX(-1); }
        }
      `}</style>
    </div>
  );
}
