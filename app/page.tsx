'use client';

import { useState, useEffect, useMemo } from "react";
import { ConnectWalletButton } from '@/components/connect-wallet-button';
import { useWriteContract, usePublicClient, useReadContract, useAccount } from 'wagmi';
import { parseEther, parseEventLogs, formatEther, type Abi, parseAbiItem } from 'viem';
import { ChevronRight } from "lucide-react";
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
    <div className="text-lg md:text-xl font-semibold tracking-wide uppercase text-neutral-200">
      {children}
    </div>
  );
}

function Pill({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`px-4 py-2 rounded-full text-sm transition border items-center inline-flex gap-2 select-none ${
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
  const [recentFlips, setRecentFlips] = useState<FlipEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');

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
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-[1300px] px-4 py-6 grid grid-cols-12 gap-5">
        {/* Left rail: recent bets */}
        <aside className="col-span-12 md:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex gap-2 px-4 pt-4">
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
            <div className="mt-2 divide-y divide-white/10 max-h-[28rem] overflow-y-auto">
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
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Image
                          src={flip.choice === 0 ? '/Heads.png' : '/Tails.png'}
                          alt={flip.choice === 0 ? 'Heads' : 'Tails'}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-contain shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-neutral-400 text-[11px] leading-none">Bet</div>
                          <div className="text-sm truncate">{flip.choice === 0 ? 'Heads' : 'Tails'}</div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-neutral-400 text-[11px] leading-none">Result</div>
                        <div className={`${flip.didWin === true ? 'text-emerald-300' : flip.didWin === false ? 'text-rose-300' : 'text-yellow-300'} text-sm`}> 
                          {flip.didWin === undefined ? 'Pending' : flip.didWin ? 'Win' : 'Loss'}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-neutral-400 text-[11px] leading-none">Amount</div>
                        <div className="flex items-center gap-1 text-sm whitespace-nowrap">
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

        {/* Main game panel */}
        <section className="col-span-12 md:col-span-8">
          <div className="flex flex-col items-center">
            {/* Floating coin visual */}
            <div className="relative h-56 md:h-72 w-full flex items-center justify-center">
              
              {/* Coin image in center */}
              <div className={`relative z-10 w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-2xl ${isFlipping ? 'animate-spin' : ''}`}>
                <Image
                  src={selected === 'Heads' ? '/Heads.png' : '/Tails.png'}
                  alt={selected}
                  width={288}
                  height={288}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {isFlipping && (
                <div className="absolute text-center z-20 mt-40">
                  <div className="text-2xl font-bold text-emerald-300">Flipping...</div>
                  <div className="text-sm text-neutral-400 mt-1">Waiting for result</div>
                </div>
              )}
            </div>

            {/* Choice cards */}
            <div className="mt-3 grid w-full grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
              {/* Heads card */}
              <div
                className={`rounded-3xl border p-5 md:p-6 backdrop-blur-sm transition hover:translate-y-[-2px] duration-300 select-none cursor-pointer ${
                  selected === 'Heads'
                    ? 'border-emerald-400/40 bg-emerald-500/5 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                onClick={() => setSelected('Heads')}
              >
                <SectionTitle>Heads</SectionTitle>
                <div className="mt-3 md:mt-5 flex items-center justify-between">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden">
                    <Image
                      src="/Heads.png"
                      alt="Heads"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Pill active={selected === 'Heads'}>2.00x</Pill>
                </div>
              </div>

              {/* Tails card */}
              <div
                className={`rounded-3xl border p-5 md:p-6 backdrop-blur-sm transition hover:translate-y-[-2px] duration-300 select-none cursor-pointer ${
                  selected === 'Tails'
                    ? 'border-emerald-400/40 bg-emerald-500/5 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                onClick={() => setSelected('Tails')}
              >
                <SectionTitle>Tails</SectionTitle>
                <div className="mt-3 md:mt-5 flex items-center justify-between">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden">
                    <Image
                      src="/Tails.png"
                      alt="Tails"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Pill active={selected === 'Tails'}>2.00x</Pill>
                </div>
              </div>
            </div>

            {/* Amount controls */}
            <div className="mt-5 w-full grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-3">
              {[
                { label: '0.01', onClick: () => setAmount('0.01') },
                { label: '0.1', onClick: () => setAmount('0.1') },
                { label: '0.5', onClick: () => setAmount('0.5') },
                { label: '1', onClick: () => setAmount('1') },
                { label: 'MAX', onClick: () => setAmount(String(maxBet.toFixed(4))) },
              ].map((b, i) => (
                <button
                  key={i}
                  onClick={b.onClick}
                  className="col-span-1 rounded-xl border border-white/10 bg-white/[0.02] py-2 md:py-2.5 text-xs md:text-sm text-neutral-200 hover:bg-white/[0.05] transition"
                >
                  {b.label}
                </button>
              ))}

              <div className="col-span-2 md:col-span-1">
                <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 md:px-4 py-2.5 md:py-3 text-sm text-neutral-200 focus-within:border-emerald-400/40">
                  <input
                    className="w-full bg-transparent outline-none placeholder:text-neutral-500"
                    placeholder="Amount"
                    type="number"
                    step="0.0001"
                    min={minBet}
                    max={maxBet}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  Min: {minBet.toFixed(4)} ETH • Max: {maxBet.toFixed(4)} ETH
                </div>
              </div>
            </div>

            {/* Flip button */}
            <div className="mt-5 w-full">
              <button 
                onClick={flip}
                disabled={!address || !amount || Number(amount) < minBet || Number(amount) > maxBet || isFlipping}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 transition text-black font-semibold py-3 md:py-3.5 text-base md:text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(16,185,129,0.6)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isFlipping ? (
                  <>FLIPPING COIN...</>
                ) : (
                  <>FLIP COIN <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto max-w-[1300px] px-4 pb-10 pt-2 text-xs text-neutral-500">
        <div>
          <span className="opacity-70">Coin Flip V2 • Powered by Abstract Network & VRF</span>
        </div>
      </footer>

      {/* animations */}
      <style jsx>{`
        .animate-spin-slow { animation: spin 16s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
