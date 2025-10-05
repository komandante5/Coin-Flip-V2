'use client';

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { useWriteContract, usePublicClient, useReadContract, useAccount, useSwitchChain, useBalance } from 'wagmi';
import { parseEther, parseEventLogs, formatEther, type Abi, parseAbiItem } from 'viem';
import { ChevronRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/page-layout';
import { Pill } from '@/components/ui/pill';
// LOCAL TESTING ONLY: Wallet selector for local development
// TODO: DELETE THIS WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
import { WalletSelector } from '@/components/wallet-selector';
import { useWalletType } from '@/components/hybrid-wallet-provider';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useWalletAnimation } from '@/hooks/useWalletAnimation';

import coinFlipJson from '../src/abi/CoinFlip.json';
import mockVrfJson from '../src/abi/MockVRF.json';
import addresses from '../src/deployments.localhost.json';

// Import types and utilities
import type { CoinSide, FlipEvent, GameStatsArray } from '@/types/coinflip';
import { 
  DEFAULT_BET_AMOUNT, 
  EXPECTED_CHAIN_ID, 
  ANIMATION_DURATIONS, 
  POLLING_INTERVALS,
  CACHE_CONFIG,
  QUICK_BET_PRESETS,
  MAX_RECENT_FLIPS,
  DEFAULT_MIN_BET,
  DEFAULT_MAX_BET
} from '@/config/constants';
import { 
  setTimestampInCache, 
  getCachedTimestamp, 
  getBestTimestamp,
  formatTimeAgo 
} from '@/lib/timestamp-utils';
import { formatAddress } from '@/lib/format-utils';

const coinFlipAbi = coinFlipJson.abi as Abi;
const mockVrfAbi = mockVrfJson.abi as Abi;

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;
const mockVrfAddress = (addresses as any).mockVRF as `0x${string}`;

// Custom hook for animated number counter
function useAnimatedNumber(targetValue: number, duration: number = 600): number {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const [prevTarget, setPrevTarget] = useState(targetValue);

  useEffect(() => {
    if (targetValue === prevTarget) return;

    const startValue = displayValue;
    const difference = targetValue - startValue;
    const startTime = Date.now();
    
    // Calculate step size based on difference magnitude
    // Larger differences = more steps per frame for smoother animation
    const steps = Math.min(Math.abs(difference) * 10, 100);
    const stepDuration = duration / steps;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (difference * easeOut);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
        setPrevTarget(targetValue);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration, displayValue, prevTarget]);

  return displayValue;
}

// Note: Timestamp utilities have been moved to @/lib/timestamp-utils.ts for better organization


function CoinflipPage() {
  // LOCAL TESTING ONLY: Wallet type selection for local development
  // TODO: DELETE THIS WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
  const { walletType, setWalletType } = useWalletType();
  
  // Sound effects hook
  const { playWin, playLose, playButtonClick, playTabSwitch, playError, playFlipStart } = useSoundEffects();
  
  // Wallet animation hook
  const { triggerWinAnimation, triggerBalanceRefetch } = useWalletAnimation();
  
  // Avoid hydration mismatches by deferring client-only state
  const [hasMounted, setHasMounted] = useState(false);

  const [selected, setSelected] = useState<CoinSide>('Heads');
  const [selectedForUI, setSelectedForUI] = useState<CoinSide>('Heads');
  const [amount, setAmount] = useState<string>(DEFAULT_BET_AMOUNT);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [flipResult, setFlipResult] = useState<CoinSide | null>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [revealAnimation, setRevealAnimation] = useState<string>('');
  const [showWinCelebration, setShowWinCelebration] = useState(false);
  const [showLoseCelebration, setShowLoseCelebration] = useState(false);
  const [recentFlips, setRecentFlips] = useState<FlipEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const contentWrapperRef = useRef<HTMLDivElement | null>(null);
  const [newBetIndices, setNewBetIndices] = useState<Set<number>>(new Set());
  const [betValidationError, setBetValidationError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Read min/max bet from contract with optimized caching
  const { data: gameStats, refetch: refetchStats } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'getGameStats',
    query: {
      staleTime: CACHE_CONFIG.STALE_TIME,
      refetchInterval: CACHE_CONFIG.REFETCH_INTERVAL,
    }
  }) as { data: GameStatsArray | undefined, refetch: () => void };

  // Get contract balance (bankroll) with optimized refetch interval
  const { data: contractBalance, refetch: refetchBalance } = useBalance({
    address: coinFlipAddress,
    query: {
      refetchInterval: CACHE_CONFIG.BALANCE_REFETCH_INTERVAL,
    }
  });

  // Animated contract balance
  const contractBalanceValue = contractBalance ? Number(formatEther(contractBalance.value)) : 0;
  const animatedBalance = useAnimatedNumber(contractBalanceValue, 800);


  

  // Memoize expensive calculations
  const { minBet, maxBet } = useMemo(() => {
    if (gameStats && Array.isArray(gameStats) && gameStats.length === 6) {
    return {
      minBet: Number(formatEther(gameStats[4] || BigInt(0))),
      maxBet: Number(formatEther(gameStats[5] || BigInt(0)))
    };
  }
  return { minBet: DEFAULT_MIN_BET, maxBet: DEFAULT_MAX_BET };
}, [gameStats]);

  // Validate bet amount and show appropriate error message
  useEffect(() => {
    if (!amount || amount === '') {
      setBetValidationError(null);
      return;
    }
    
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      setBetValidationError('Invalid amount');
      return;
    }
    
    if (numAmount < minBet) {
      setBetValidationError(`Minimum bet: ${minBet.toFixed(4)} ETH`);
    } else if (numAmount > maxBet) {
      setBetValidationError(`Maximum bet: ${maxBet.toFixed(4)} ETH`);
    } else {
      setBetValidationError(null);
    }
  }, [amount, minBet, maxBet]);

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

      // CRITICAL FIX: Sort ALL commits by block number first to ensure correct ordering
      // This prevents issues when there are more than 20 bets
      const sortedCommits = [...commitLogs].sort((a, b) => {
        // Sort by block number ascending (oldest first)
        if (a.blockNumber !== b.blockNumber) {
          return Number(a.blockNumber) - Number(b.blockNumber);
        }
        // If same block, sort by log index
        return Number(a.logIndex || 0) - Number(b.logIndex || 0);
      });

      // Now get the last N (most recent) commits
      const recentCommits = sortedCommits.slice(-MAX_RECENT_FLIPS);
      
      // Combine and process events
      const flips: FlipEvent[] = [];
      
      for (let i = 0; i < recentCommits.length; i++) {
        const commitLog = recentCommits[i];
        const block = await publicClient.getBlock({ blockNumber: commitLog.blockNumber });
        // Match by requestId via decoded args (more robust than topic index)
        const revealLog = revealLogs.find((r: any) => (r?.args?.requestId) === (commitLog as any)?.args?.requestId);
        
        const choiceValue = commitLog.args.choice as number;
        const resultValue = revealLog?.args?.result as number | undefined;
        const requestIdStr = commitLog.args.requestId?.toString() || '';
        
        // Use optimized timestamp utility for smart timestamp handling
        const blockTimestamp = Number(block.timestamp);
        const latestBlockNumber = recentCommits[recentCommits.length - 1].blockNumber;
        const timestamp = getBestTimestamp(requestIdStr, blockTimestamp, commitLog.blockNumber, latestBlockNumber);
        
        // Cache the timestamp for future reference
        if (!getCachedTimestamp(requestIdStr)) {
          setTimestampInCache(requestIdStr, timestamp);
        }
        
        flips.push({
          player: commitLog.args.player as string,
          betAmount: commitLog.args.betAmount as bigint,
          choice: choiceValue,
          result: resultValue,
          didWin: revealLog?.args?.didWin as boolean | undefined,
          payout: revealLog?.args?.payout as bigint | undefined,
          requestId: commitLog.args.requestId as bigint,
          timestamp: timestamp
        });
      }

      // Sort by block timestamp descending (most recent first)
      // Since we already sorted by block number and took last N, reversing gives us newest first
      const ordered = flips.reverse();
      
      // Detect new bets by comparing requestIds (more reliable than length)
      setRecentFlips(prev => {
        const prevRequestIds = new Set(prev.map(f => f.requestId.toString()));
        const newIndices = new Set<number>();
        
        ordered.forEach((flip, index) => {
          if (!prevRequestIds.has(flip.requestId.toString())) {
            newIndices.add(index);
          }
        });
        
        if (newIndices.size > 0) {
          setNewBetIndices(newIndices);
          
          // Clear animation flags after animation completes
          setTimeout(() => {
            setNewBetIndices(new Set());
          }, 600);
        }
        
        return ordered;
      });
    } catch (error) {
      console.error('Error fetching flip events:', error);
      setRecentFlips([]);
    }
  }, [publicClient]);

  // Fetch recent flip events with optimized polling interval
  useEffect(() => {
    fetchRecentFlips();
    const interval = setInterval(fetchRecentFlips, POLLING_INTERVALS.BET_HISTORY);
    return () => clearInterval(interval);
  }, [fetchRecentFlips]);

const memoizedRefetchStats = useCallback(() => {
  refetchStats();
}, [refetchStats]);

useEffect(() => {
  const id = setInterval(memoizedRefetchStats, POLLING_INTERVALS.GAME_STATS);
  return () => clearInterval(id);
}, [memoizedRefetchStats]);

const handleCoinSelection = useCallback((side: CoinSide) => {
    // Only animate if we're actually changing sides
    if (selectedForUI === side) return;
    
    // Play button click sound
    playButtonClick();
    
    // Immediately highlight the button for UI feedback
    setSelectedForUI(side);
    setSelected(side);
    
    // Animate rotation change smoothly
    // The CSS transition on the coin container will handle the smooth rotation
    setCurrentRotation(side === 'Heads' ? 0 : 180);
  }, [selectedForUI, playButtonClick]);

  const flip = useCallback(async () => {
    if (!address) {
      console.error('No wallet address found');
      alert('Please connect your wallet first');
      return;
    }
    
    if (!isConnected) {
      console.error('Wallet not connected');
      alert('Please connect your wallet first');
      return;
    }
    
    // Check if connected to the correct network
    if (chain?.id !== EXPECTED_CHAIN_ID) {
      
      // Try to switch to the correct chain
      try {
        await switchChain({ chainId: EXPECTED_CHAIN_ID });
      } catch (error) {
        console.error('Failed to switch chain:', error);
        alert(`Please manually switch to the Anvil ZkSync network (Chain ID: ${EXPECTED_CHAIN_ID}) in your wallet`);
        return;
      }
    }
    
    // CRITICAL FIX: Capture selectedForUI at the moment of the button click
    // This prevents stale closures from using old values
    const userChoice = selectedForUI;
    const side = userChoice === 'Heads' ? 0 : 1;
    
    // Phase 1: Start fast spinning immediately
    playFlipStart(); // Play flip start sound
    setIsFlipping(true);
    setIsRevealing(false);
    setFlipResult(null);
    setShowWinCelebration(false);
    setShowLoseCelebration(false);
    
    // Show transaction toast with custom styling
    toast.loading('Confirm transaction in your wallet...', {
      id: 'flip-transaction',
      duration: Infinity,
      className: 'text-xl font-bold',
      style: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(rgba(12, 15, 16, 0.85), rgba(12, 15, 16, 0.85)), linear-gradient(135deg, #10b981, #06b6d4)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        color: '#ffffff',
        padding: '20px 24px',
        fontSize: '18px',
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
    });
    
    try {
      // First transaction - coin flip commit (coin spins fast during wallet confirmation)
      const txHash = await writeContractAsync({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'flipCoin',
        args: [side],
        value: parseEther(amount),
        gas: BigInt(500000)
      });

      // Transaction confirmed - start reveal process
      toast.loading('Transaction confirmed! Revealing result...', {
        id: 'flip-transaction',
        duration: Infinity,
        className: 'text-xl font-bold',
        style: {
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(rgba(12, 15, 16, 0.85), rgba(12, 15, 16, 0.85)), linear-gradient(135deg, #10b981, #06b6d4)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          color: '#ffffff',
          padding: '20px 24px',
          fontSize: '18px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        },
      });
      const receiptCommit = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      
      const commitEvents = parseEventLogs({
        abi: coinFlipAbi,
        logs: receiptCommit.logs,
        eventName: 'FlipCommitted'
      });
      
      const requestId = (commitEvents[0]?.args as any)?.requestId as bigint;
      if (!requestId) {
        throw new Error('Failed to get request ID from FlipCommitted event');
      }
      
      // Cache the current timestamp for this bet (so it shows "just now")
      const currentTimestamp = Math.floor(Date.now() / 1000);
      setTimestampInCache(requestId.toString(), currentTimestamp);
      
      // Trigger wallet balance refetch since player made a bet
      triggerBalanceRefetch();
      
      // Immediately fetch bet history to show the pending bet
      await fetchRecentFlips();

      // Second transaction for VRF callback (still spinning fast)
      const randomNumber = BigInt(Math.floor(Math.random() * 2 ** 32));
      
      const txHash2 = await writeContractAsync({
        address: mockVrfAddress,
        abi: mockVrfAbi,
        functionName: 'triggerCallback',
        args: [coinFlipAddress, requestId, randomNumber],
        gas: BigInt(300000)
      });

      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash2 });
      
      // Parse the result from the FlipRevealed event
      const revealEvents = parseEventLogs({
        abi: coinFlipAbi,
        logs: receipt.logs,
        eventName: 'FlipRevealed'
      });
      
      if (revealEvents.length > 0) {
        const event = revealEvents[0].args as any;
        const result = event.result === 0 ? 'Heads' : 'Tails';
        const didWin = event.didWin as boolean;
        const payout = event.payout as bigint;
        
        // Dismiss loading toast
        toast.dismiss('flip-transaction');
        
        // Phase 2: Both transactions confirmed - start reveal animation
        // Determine which animation to use based on starting position and result
        // This ensures predictable, smooth animation with no sudden corrections
        const startingSide = selected; // What coin face we're starting from
        let animationClass = '';
        
        if (startingSide === 'Heads' && result === 'Heads') {
          animationClass = 'animate-reveal-heads-to-heads';
        } else if (startingSide === 'Heads' && result === 'Tails') {
          animationClass = 'animate-reveal-heads-to-tails';
        } else if (startingSide === 'Tails' && result === 'Heads') {
          animationClass = 'animate-reveal-tails-to-heads';
        } else { // startingSide === 'Tails' && result === 'Tails'
          animationClass = 'animate-reveal-tails-to-tails';
        }
        
        setRevealAnimation(animationClass);
        setIsRevealing(true);
        
        // Set the result to be shown at 2.5 seconds into the reveal animation (coin lands on final face)
        setTimeout(() => {
          setFlipResult(result);
        }, 2500);
        
        // Complete the animation at 3 seconds
        setTimeout(() => {
          setIsFlipping(false);
          setIsRevealing(false);
          setRevealAnimation('');
          // Update the coin to show the actual result and keep it displayed
          setSelected(result);
          setFlipResult(null);
          // Set final rotation based on result: Heads = 0°, Tails = 180°
          // The animation already landed on the correct face, we just maintain it
          setCurrentRotation(result === 'Heads' ? 0 : 180);
          
          // NOW play sounds and show result toasts AFTER coin animation completes
          if (didWin) {
            playWin(); // Play win sound AFTER coin lands
            toast.success(`🎉 You won ${Number(formatEther(payout)).toFixed(4)} ETH!`, {
              duration: 5000,
              className: 'text-2xl font-black',
              style: {
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '3px solid transparent',
                backgroundImage: 'linear-gradient(rgba(12, 15, 16, 0.9), rgba(12, 15, 16, 0.9)), linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                color: '#10b981',
                padding: '24px 32px',
                fontSize: '20px',
                fontWeight: '900',
                boxShadow: '0 12px 48px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(16, 185, 129, 0.2)',
                textShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
              },
            });
          } else {
            playLose(); // Play lose sound AFTER coin lands
            toast.error(`Better luck next time!`, {
              duration: 3000,
              className: 'text-xl font-bold',
              style: {
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(rgba(12, 15, 16, 0.9), rgba(12, 15, 16, 0.9)), linear-gradient(135deg, #ef4444, #dc2626)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                color: '#fca5a5',
                padding: '20px 24px',
                fontSize: '18px',
                boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(239, 68, 68, 0.15)',
              },
            });
          }
          
          // Show celebration for wins or loses
          if (didWin) {
            setShowWinCelebration(true);
            setTimeout(() => setShowWinCelebration(false), 3000);
          } else {
            setShowLoseCelebration(true);
            setTimeout(() => setShowLoseCelebration(false), 3000);
          }
        }, 3000);
        
        // IMPORTANT: Wait until reveal animation completes before updating secondary UI
        // Sequence: Coin reveals (3s) → Sounds play → Brief delay → Wallet/balance/history animations
        setTimeout(() => {
          // Trigger wallet animation with win amount (after sound has played)
          if (didWin) {
            triggerWinAnimation(Number(formatEther(payout)).toFixed(4));
          }
          
          // Now update all the secondary UI elements
          memoizedRefetchStats();
          refetchBalance();
          triggerBalanceRefetch();
          fetchRecentFlips();
        }, ANIMATION_DURATIONS.BALANCE_UPDATE_DELAY + 300); // Extra 300ms delay after coin lands
      } else {
        throw new Error('No FlipRevealed event found in transaction receipt');
      }
    } catch (error) {
      console.error('Error flipping coin:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        address,
        selected,
        amount
      });
      
      // Dismiss loading toast
      toast.dismiss('flip-transaction');
      
      // Play error sound
      playError();
      
      // Show error state for 3 seconds before resetting
      setTimeout(() => {
        setIsFlipping(false);
        setIsRevealing(false);
        setRevealAnimation('');
        setFlipResult(null);
      }, 3000);
      
      // Show user-friendly error toast
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
      toast.error(`Transaction failed: ${errorMessage}`, {
        duration: 5000,
        description: 'Make sure your wallet is connected and you have enough ETH',
        className: 'text-xl font-bold',
        style: {
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '2px solid transparent',
          backgroundImage: 'linear-gradient(rgba(12, 15, 16, 0.9), rgba(12, 15, 16, 0.9)), linear-gradient(135deg, #ef4444, #dc2626)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          color: '#fca5a5',
          padding: '20px 24px',
          fontSize: '18px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(239, 68, 68, 0.15)',
        },
      });
    }
  }, [address, selectedForUI, amount, writeContractAsync, publicClient, memoizedRefetchStats, fetchRecentFlips, isConnected, chain, switchChain, refetchBalance, walletType, playWin, playLose]);


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
      playTabSwitch(); // Play tab switch sound
      setActiveTab(tab);
    }
  }, [activeTab, playTabSwitch]);

  return (
    <PageLayout>
      {/* LOCAL TESTING ONLY: Wallet selector for local development */}
      {/* TODO: DELETE THIS WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING */}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
        <WalletSelector
          currentWalletType={walletType}
          onWalletTypeChange={setWalletType}
          className="bg-black/90 backdrop-blur-sm border border-white/30 shadow-xl"
        />
        
        {/* Network status indicator */}
        {hasMounted && isConnected && (
          <div className={`px-3 py-2 rounded-lg text-xs font-medium bg-black/90 backdrop-blur-sm border shadow-xl ${
            chain?.id === 260 
              ? 'border-emerald-500/50 text-emerald-400' 
              : 'border-amber-500/50 text-amber-400'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                chain?.id === 260 ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span>
                {chain?.id === 260 
                  ? `Connected: ${chain.name}` 
                  : `Wrong Network (ID: ${chain?.id || 'Unknown'})`
                }
              </span>
            </div>
            {chain?.id !== 260 && (
              <button
                onClick={() => switchChain({ chainId: 260 })}
                className="mt-2 w-full px-2 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded transition-colors"
              >
                Switch to Anvil ZkSync
              </button>
            )}
          </div>
        )}
      </div>
      
      <main className="relative z-10 mx-auto w-full px-fluid-3 md:px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-2 md:py-fluid-3 lg:py-fluid-4 grid grid-cols-12 gap-fluid-4 lg:gap-fluid-6 flex-1" style={{ maxWidth: 'min(98vw, var(--container-3xl))' }}>
        {/* Main game panel - appears first on mobile, second on desktop */}
        <section className="col-span-12 md:col-span-8 lg:col-span-8 xl:col-span-8 order-1 md:order-2">
          <div className="flex flex-col items-center">
            {/* Floating coin visual - BIG on mobile, compact on desktop */}
            <div className="relative w-full flex items-center justify-center" style={{ height: 'clamp(170px, 22vw + 100px, 200px)' }}>
              
              {/* Coin image in center - 3D container for both sides */}
              <div 
                className={`relative z-10 ${isFlipping && !isRevealing ? 'animate-coin-flip-fast' : ''} ${isRevealing ? revealAnimation : ''}`} 
                style={{ 
                  width: 'var(--coin-size-mobile)', 
                  height: 'var(--coin-size-mobile)',
                  transformStyle: 'preserve-3d',
                  perspective: '1000px',
                  transform: (!isFlipping && !isRevealing) ? `rotateY(${currentRotation}deg)` : undefined,
                  transition: (!isFlipping && !isRevealing) ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                }}
              >
                {/* Heads side */}
                <div 
                  className="absolute inset-0 rounded-full overflow-hidden shadow-2xl"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(0deg)'
                  }}
                >
                  <Image
                    src="/Heads.png"
                    alt="Heads"
                    width={288}
                    height={288}
                    className="w-full h-full object-cover"
                    priority
                    sizes="(max-width: 768px) 180px, (max-width: 1200px) 150px, 180px"
                  />
                </div>
                
                {/* Tails side - rotated 180 degrees on Y-axis */}
                <div 
                  className="absolute inset-0 rounded-full overflow-hidden shadow-2xl"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <Image
                    src="/Tails.png"
                    alt="Tails"
                    width={288}
                    height={288}
                    className="w-full h-full object-cover"
                    priority
                    sizes="(max-width: 768px) 180px, (max-width: 1200px) 150px, 180px"
                  />
                </div>
              </div>
              
              {/* Win celebration effect */}
              {showWinCelebration && (
                <>
                  {/* Expanding rings */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-emerald-400/40 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-teal-400/30 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                  </div>
                  {/* Blockchain grid pattern */}
                  <div className="absolute inset-0 pointer-events-none z-25 opacity-30">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute"
                        style={{
                          left: '50%',
                          top: '50%',
                          width: '24px',
                          height: '24px',
                          border: '1px solid #10b981',
                          transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-60px)`,
                          animation: `hexagon-pulse ${0.8}s ease-out ${i * 0.1}s forwards`,
                        }}
                      />
                    ))}
                  </div>
                  {/* Glow effect */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-emerald-400/20 rounded-full blur-3xl animate-pulse" />
                  </div>
                  {/* Win text */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
                    <div className="flex items-center gap-3 animate-bounce">
                      <Sparkles className="w-10 h-10 text-emerald-400 animate-spin" style={{ animationDuration: '2s' }} />
                      <div className="relative">
                        <div className="text-6xl font-black uppercase tracking-wider"
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 50%, #8b5cf6 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.8)) drop-shadow(0 0 40px rgba(6, 182, 212, 0.6))',
                            textShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
                          }}>
                          WIN
                        </div>
                        {/* Outline effect */}
                        <div className="absolute inset-0 text-6xl font-black uppercase tracking-wider -z-10"
                          style={{
                            WebkitTextStroke: '2px rgba(16, 185, 129, 0.5)',
                            color: 'transparent',
                          }}>
                          WIN
                        </div>
                      </div>
                      <Sparkles className="w-10 h-10 text-cyan-400 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                    </div>
                  </div>
                </>
              )}

              {/* Lose celebration effect */}
              {showLoseCelebration && (
                <>
                  {/* Pulsing red rings */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-red-400/40 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-red-500/30 rounded-full animate-ping" style={{ animationDelay: '0.15s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-red-600/20 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                  </div>
                  {/* Shrinking hex grid */}
                  <div className="absolute inset-0 pointer-events-none z-25 opacity-30">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute"
                        style={{
                          left: '50%',
                          top: '50%',
                          width: '28px',
                          height: '28px',
                          border: '2px solid #ef4444',
                          transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-50px)`,
                          animation: `hexagon-implode ${0.7}s ease-in ${i * 0.08}s forwards`,
                        }}
                      />
                    ))}
                  </div>
                  {/* Rotating X marks */}
                  <div className="absolute inset-0 pointer-events-none z-25 opacity-40">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute text-4xl font-black text-red-500"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-80px)`,
                          animation: `fade-rotate ${1.2}s ease-out ${i * 0.1}s forwards`,
                        }}
                      >
                        ✕
                      </div>
                    ))}
                  </div>
                  {/* Dark glow effect */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-red-500/20 rounded-full blur-3xl animate-pulse" />
                  </div>
                  {/* Lose text */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
                    <div className="animate-fade-in-out">
                      <div className="relative">
                        <div className="text-5xl font-black uppercase tracking-widest"
                          style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.8)) drop-shadow(0 0 40px rgba(220, 38, 38, 0.6))',
                          }}>
                          LOSE
                        </div>
                        {/* Outline effect */}
                        <div className="absolute inset-0 text-5xl font-black uppercase tracking-widest -z-10"
                          style={{
                            WebkitTextStroke: '2px rgba(239, 68, 68, 0.5)',
                            color: 'transparent',
                          }}>
                          LOSE
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Choice cards - MORE COMPACT ON MOBILE */}
            <div className="mt-fluid-2 md:mt-fluid-3 grid w-full grid-cols-2 gap-fluid-2 md:gap-fluid-3 max-w-2xl mx-auto">
              {/* Heads card */}
              <div
                className={`rounded-lg md:rounded-xl border p-fluid-2 md:p-fluid-3 backdrop-blur-sm transition-all hover:translate-y-[-1px] duration-300 select-none cursor-pointer ${
                  selectedForUI === 'Heads'
                    ? 'border-emerald-400/40 bg-emerald-500/8 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                onClick={() => handleCoinSelection('Heads')}
              >
                <div className="text-center">
                  <div className="text-fluid-xs md:text-fluid-sm font-bold tracking-wider">HEADS</div>
                  <div className="mt-1 md:mt-1.5 flex items-center justify-center">
                    <div className="rounded-full overflow-hidden" style={{ width: 'clamp(32px, 3vw + 20px, 56px)', height: 'clamp(32px, 3vw + 20px, 56px)' }}>
                      <Image
                        src="/Heads.png"
                        alt="Heads"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                        priority
                        sizes="(max-width: 768px) 32px, (max-width: 1200px) 48px, 56px"
                      />
                    </div>
                  </div>
                  <div className="mt-1 md:mt-1.5">
                    <Pill active={selectedForUI === 'Heads'}>2.00x</Pill>
                  </div>
                </div>
              </div>

              {/* Tails card */}
              <div
                className={`rounded-lg md:rounded-xl border p-fluid-2 md:p-fluid-3 backdrop-blur-sm transition-all hover:translate-y-[-1px] duration-300 select-none cursor-pointer ${
                  selectedForUI === 'Tails'
                    ? 'border-emerald-400/40 bg-emerald-500/8 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
                onClick={() => handleCoinSelection('Tails')}
              >
                <div className="text-center">
                  <div className="text-fluid-xs md:text-fluid-sm font-bold tracking-wider">TAILS</div>
                  <div className="mt-1 md:mt-1.5 flex items-center justify-center">
                    <div className="rounded-full overflow-hidden" style={{ width: 'clamp(32px, 3vw + 20px, 56px)', height: 'clamp(32px, 3vw + 20px, 56px)' }}>
                      <Image
                        src="/Tails.png"
                        alt="Tails"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                        priority
                        sizes="(max-width: 768px) 32px, (max-width: 1200px) 48px, 56px"
                      />
                    </div>
                  </div>
                  <div className="mt-1 md:mt-1.5">
                    <Pill active={selectedForUI === 'Tails'}>2.00x</Pill>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount controls - SIMPLIFIED FOR MOBILE */}
            <div className="mt-fluid-3 md:mt-fluid-4 lg:mt-fluid-4 w-full mx-auto" style={{ maxWidth: 'min(100%, 500px)' }}>
              {/* Custom amount input - more compact on mobile */}
              <div className="mb-2">
                <label className="block text-fluid-xs md:text-fluid-sm font-medium text-neutral-300 mb-1 md:mb-2 text-center">
                  Bet Amount (ETH)
                </label>
                <div className="relative">
                  <div className="w-full rounded-lg border border-white/20 bg-white/[0.03] px-fluid-2 md:px-fluid-3 py-fluid-2 md:py-fluid-3 text-white focus-within:border-emerald-400/50 focus-within:bg-white/[0.05] transition-all duration-200">
                    <div className="flex items-center justify-center gap-2 max-w-fit mx-auto">
                      {/* Ethereum Icon */}
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-neutral-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                      </svg>
                      <input
                        className="bg-transparent outline-none placeholder:text-neutral-500 text-fluid-sm md:text-fluid-base font-medium no-spinners min-w-0"
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
                  
                  {/* Validation error message - subtle and non-intrusive */}
                  {betValidationError ? (
                    <div className="mt-1.5 text-center animate-shake">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30">
                        <svg className="w-3 h-3 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-[10px] md:text-xs text-amber-400 font-medium">
                          {betValidationError}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-center text-[10px] md:text-fluid-xs text-neutral-400">
                      Min: {minBet.toFixed(4)} • Max: {maxBet.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick bet buttons - VISIBLE ON ALL DEVICES */}
              <div className="grid grid-cols-5 gap-fluid-2 mb-2">
                {useMemo(() => {
                  // Use Math.floor to ensure MAX value never exceeds maxBet due to rounding
                  const maxBetValue = (Math.floor(maxBet * 10000) / 10000).toFixed(4);
                  return [
                    ...QUICK_BET_PRESETS,
                    { label: 'MAX', value: maxBetValue },
                  ];
                }, [maxBet]).map((b, i) => (
                  <button
                    key={b.label}
                    onClick={() => {
                      playButtonClick();
                      setAmount(b.value);
                    }}
                    className={`rounded-md border py-1.5 md:py-fluid-2 px-1 md:px-fluid-2 text-[10px] md:text-fluid-xs font-medium transition-all duration-200 hover:scale-[1.02] ${
                      amount === b.value || (b.label === 'MAX' && amount === (Math.floor(maxBet * 10000) / 10000).toFixed(4))
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/15 bg-white/[0.02] text-neutral-200 hover:bg-white/[0.04] hover:border-white/25'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              
              {/* Contract Bankroll - HIDDEN ON MOBILE */}
              {hasMounted && contractBalance && (
                <div className="hidden md:block text-center mb-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-fluid-xs font-medium text-emerald-300">
                      Contract Bankroll: {animatedBalance.toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Flip button - CLOSER TO BET AMOUNT ON MOBILE */}
            <div className="mt-fluid-2 md:mt-fluid-3 lg:mt-fluid-3 w-full mx-auto" style={{ maxWidth: 'min(100%, 400px)' }}>
              {/* Debug info - HIDDEN ON MOBILE */}
              {process.env.NODE_ENV === 'development' && hasMounted && (
                <div className="hidden md:block mb-2 text-xs text-neutral-400 text-center">
                  {address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'} | 
                  Chain: {chain?.id || 'Unknown'} | 
                  Type: {walletType}
                </div>
              )}
              
              <button 
                onClick={flip}
                disabled={!hasMounted || !address || !isConnected || !amount || Number(amount) < minBet || Number(amount) > maxBet || isFlipping}
                className="w-full rounded-xl md:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:via-teal-300 hover:to-emerald-400 transition-all duration-300 text-black font-bold text-fluid-base md:text-fluid-lg lg:text-fluid-xl flex items-center justify-center gap-2 md:gap-fluid-3 shadow-[0_0_60px_-15px_rgba(16,185,129,0.8)] hover:shadow-[0_0_80px_-10px_rgba(16,185,129,1)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
                style={{ height: 'clamp(44px, 3vw + 30px, 60px)' }}
              >
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {isFlipping ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>FLIPPING...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>FLIP</span>
                    <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-black/20 flex items-center justify-center">
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                    </div>
                  </div>
                )}
              </button>
              
            </div>
            
            {/* Recent bets on mobile - pushed much further down */}
            <div className="md:hidden mt-fluid-12 w-full">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col" style={{ height: 'clamp(300px, 50vh, 500px)' }}>
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
                      <div 
                        key={i} 
                        className={`px-fluid-3 py-fluid-3 ${newBetIndices.has(i) ? 'animate-bet-slide-in' : ''}`}
                      >
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
            </div>
          </div>
        </section>

        {/* Left rail: recent bets - DESKTOP ONLY */}
        <aside className="hidden md:block col-span-12 md:col-span-4 lg:col-span-4 xl:col-span-4 order-2 md:order-1">
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
                  <div 
                    key={i} 
                    className={`px-fluid-3 py-fluid-3 ${newBetIndices.has(i) ? 'animate-bet-slide-in' : ''}`}
                  >
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
        .animate-coin-flip-fast { animation: coin-flip-fast 1s linear infinite; }
        .animate-bet-slide-in { animation: bet-slide-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-fade-in-out { animation: fade-in-out 2s ease-in-out; }
        .animate-shake { animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97); }
        
        /* 
         * DETERMINISTIC REVEAL ANIMATIONS
         * These ensure smooth, predictable flips with no sudden corrections
         * 8 full rotations (2880°) for dramatic effect
         * Smooth ease-out curve for natural deceleration
         * Heads = 0° or multiples of 360°
         * Tails = 180° or (360° * n + 180°)
         */
        
        /* Heads → Heads: 0° to 2880° (8 rotations, lands on Heads at 0°) 
           Gentle ease-out with minimal acceleration at start for smooth transition */
        .animate-reveal-heads-to-heads { animation: reveal-heads-to-heads 3s cubic-bezier(0.4, 0.2, 0.5, 1) forwards; }
        
        /* Heads → Tails: 0° to 3060° (8.5 rotations, lands on Tails at 180°) 
           Gentle ease-out with minimal acceleration at start for smooth transition */
        .animate-reveal-heads-to-tails { animation: reveal-heads-to-tails 3s cubic-bezier(0.4, 0.2, 0.5, 1) forwards; }
        
        /* Tails → Heads: 180° to 2880° (7.5 rotations from Tails, lands on Heads at 0°) 
           Gentle ease-out with minimal acceleration at start for smooth transition */
        .animate-reveal-tails-to-heads { animation: reveal-tails-to-heads 3s cubic-bezier(0.4, 0.2, 0.5, 1) forwards; }
        
        /* Tails → Tails: 180° to 3060° (8 rotations from Tails, lands on Tails at 180°) 
           Gentle ease-out with minimal acceleration at start for smooth transition */
        .animate-reveal-tails-to-tails { animation: reveal-tails-to-tails 3s cubic-bezier(0.4, 0.2, 0.5, 1) forwards; }
        
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        /* Smooth flip during transaction - 3 rotations (1080°) per second */
        @keyframes coin-flip-fast {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(1080deg); }
        }
        
        /* Heads (0°) → Heads (2880° = 0°) - 8 full rotations 
           Smooth deceleration with ease-out curve handled by CSS timing function */
        @keyframes reveal-heads-to-heads {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(2880deg); }
        }
        
        /* Heads (0°) → Tails (3060° = 180°) - 8.5 rotations 
           Smooth deceleration with ease-out curve handled by CSS timing function */
        @keyframes reveal-heads-to-tails {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(3060deg); }
        }
        
        /* Tails (180°) → Heads (2880° = 0°) - 7.5 rotations 
           Smooth deceleration with ease-out curve handled by CSS timing function */
        @keyframes reveal-tails-to-heads {
          0% { transform: rotateY(180deg); }
          100% { transform: rotateY(2880deg); }
        }
        
        /* Tails (180°) → Tails (3060° = 180°) - 8 full rotations 
           Smooth deceleration with ease-out curve handled by CSS timing function */
        @keyframes reveal-tails-to-tails {
          0% { transform: rotateY(180deg); }
          100% { transform: rotateY(3060deg); }
        }
        @keyframes bet-slide-in {
          0% {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
          50% {
            opacity: 0.8;
            transform: translateX(5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        /* Crypto symbol float animations - rising upward */
        @keyframes crypto-float-0 {
          0% { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2) rotate(180deg); opacity: 0; }
        }
        @keyframes crypto-float-1 {
          0% { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.3) rotate(240deg); opacity: 0; }
        }
        @keyframes crypto-float-2 {
          0% { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.1) rotate(300deg); opacity: 0; }
        }
        @keyframes crypto-float-3 {
          0% { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.4) rotate(360deg); opacity: 0; }
        }
        @keyframes crypto-float-4 {
          0% { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2) rotate(420deg); opacity: 0; }
        }
        
        /* Glitch scatter animations - explosive outward with fade */
        @keyframes glitch-scatter-0 {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.5); opacity: 0; }
        }
        @keyframes glitch-scatter-1 {
          0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.6) rotate(90deg); opacity: 0; }
        }
        @keyframes glitch-scatter-2 {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { opacity: 0.3; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.4); opacity: 0; }
        }
        @keyframes glitch-scatter-3 {
          0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.7) rotate(-90deg); opacity: 0; }
        }
        @keyframes glitch-scatter-4 {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); opacity: 0; }
        }
        
        /* Hexagon pulse - expanding and fading */
        @keyframes hexagon-pulse {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateY(-60px) scale(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateY(-100px) scale(1.5); opacity: 0; }
        }
        
        /* Hexagon implode - shrinking inward */
        @keyframes hexagon-implode {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateY(-50px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(-180deg) translateY(0px) scale(0); opacity: 0; }
        }
        @keyframes fade-in-out {
          0% { opacity: 0; transform: scale(0.9); }
          20% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        
        /* Fade rotate for X marks on lose */
        @keyframes fade-rotate {
          0% { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) translateY(-80px) scale(0.5); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(360deg) translateY(-120px) scale(1.5); }
        }
        
        /* Subtle shake animation for validation errors */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </PageLayout>
  );
}

// Memoize the entire component to prevent unnecessary re-renders
export default memo(CoinflipPage);
