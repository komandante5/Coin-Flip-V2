'use client';

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt, useReadContract, useBalance } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseEther, formatEther, parseAbiItem, type Abi } from 'viem';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout/page-layout';
import { Pill } from '@/components/ui/pill';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Wallet,
  Upload,
  Download,
  Settings,
  AlertTriangle,
  Shield,
  BarChart3,
  RefreshCw,
  Info,
  X
} from "lucide-react";

import coinFlipJson from '@/abi/CoinFlip.json';
import addresses from '@/deployments.localhost.json';
import { formatAddress } from '@/lib/format-utils';
import { formatTimeAgo, setTimestampInCache, getCachedTimestamp } from '@/lib/timestamp-utils';

const coinFlipAbi = coinFlipJson.abi as Abi;
const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;
const ownerAddress = (addresses as any).owner as `0x${string}`;

interface AdminStats {
  totalBetsAmount: bigint;
  totalPayouts: bigint;
  totalProfit: bigint;
  totalBetsCount: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  houseProfit: bigint;
  uniquePlayers: Set<string>;
}

interface BetRecord {
  player: string;
  betAmount: bigint;
  payout: bigint;
  didWin: boolean;
  choice: number;
  result: number;
  timestamp: number;
  requestId: bigint;
}

export default function AdminPage() {
  const { address: connectedAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending: isWritePending, reset: resetWriteContract } = useWriteContract();
  
  // Prevent hydration issues
  const [hasMounted, setHasMounted] = useState(false);
  
  // Check if connected wallet is the owner
  const isOwner = connectedAddress && ownerAddress && 
    connectedAddress.toLowerCase() === ownerAddress.toLowerCase();

  // State
  const [stats, setStats] = useState<AdminStats>({
    totalBetsAmount: BigInt(0),
    totalPayouts: BigInt(0),
    totalProfit: BigInt(0),
    totalBetsCount: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    houseProfit: BigInt(0),
    uniquePlayers: new Set(),
  });
  const [recentBets, setRecentBets] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [newMinBet, setNewMinBet] = useState('');
  const [newMaxRewardPercent, setNewMaxRewardPercent] = useState('');
  const [currentToastId, setCurrentToastId] = useState<string | number | undefined>();
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [showMinBetInfo, setShowMinBetInfo] = useState(false);
  const [showMaxPayoutInfo, setShowMaxPayoutInfo] = useState(false);

  // Set mounted state after initial render to prevent hydration issues
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Read contract data with refetch capabilities (NO auto-refresh)
  const { 
    data: contractBalanceData, 
    refetch: refetchContractBalance 
  } = useBalance({
    address: coinFlipAddress,
  });

  // Owner wallet balance (for validation only)
  const { data: ownerBalanceData } = useBalance({
    address: connectedAddress,
  });

  const { 
    data: contractBalanceTracked, 
    refetch: refetchContractBalanceTracked 
  } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'contractBalance',
  });

  const { 
    data: minBet, 
    refetch: refetchMinBet 
  } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'minBet',
  });

  const { 
    data: maxRewardPercent, 
    refetch: refetchMaxRewardPercent 
  } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'maxRewardPercent',
  });

  // Transaction receipt handling
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Fetch admin data
  const fetchAdminData = useCallback(async () => {
    if (!publicClient) return;
    
    setLoading(true);
    try {
      // Fetch all reveal logs
      const revealLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipRevealed(address indexed player, uint256 betAmount, uint8 choice, uint8 result, bool didWin, uint256 payout, uint256 indexed requestId)'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Fetch commit logs for timestamps
      const commitLogs = await publicClient.getLogs({
        address: coinFlipAddress,
        event: parseAbiItem('event FlipCommitted(address indexed player, uint256 betAmount, uint8 choice, uint256 indexed requestId)'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      });

      // Build timestamp map
      const timestampMap = new Map<string, number>();
      for (const log of commitLogs) {
        const reqId = log.args.requestId?.toString();
        if (log.blockNumber) {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          const ts = Number(block.timestamp) * 1000;
          if (reqId) {
            timestampMap.set(reqId, ts);
            setTimestampInCache(reqId, ts);
          }
        }
      }

      // Process stats
      let totalBetsAmount = BigInt(0);
      let totalPayouts = BigInt(0);
      let totalWins = 0;
      let totalLosses = 0;
      const uniquePlayers = new Set<string>();
      const bets: BetRecord[] = [];

      for (const log of revealLogs) {
        const player = (log.args.player || '0x0') as string;
        const betAmount = (log.args.betAmount || BigInt(0)) as bigint;
        const payout = (log.args.payout || BigInt(0)) as bigint;
        const didWin = Boolean(log.args.didWin);
        const choice = Number(log.args.choice || 0);
        const result = Number(log.args.result || 0);
        const requestId = (log.args.requestId || BigInt(0)) as bigint;

        totalBetsAmount += betAmount;
        totalPayouts += payout;
        uniquePlayers.add(player.toLowerCase());

        if (didWin) {
          totalWins++;
        } else {
          totalLosses++;
        }

        // Get timestamp
        const reqIdStr = requestId.toString();
        const cachedTs = getCachedTimestamp(reqIdStr);
        const timestamp = timestampMap.get(reqIdStr) || cachedTs || Date.now();

        bets.push({
          player,
          betAmount,
          payout,
          didWin,
          choice,
          result,
          timestamp,
          requestId,
        });
      }

      // Calculate house profit (total bets - total payouts)
      const houseProfit = totalBetsAmount - totalPayouts;
      const winRate = totalWins + totalLosses > 0 
        ? (totalWins / (totalWins + totalLosses)) * 100 
        : 0;

      setStats({
        totalBetsAmount,
        totalPayouts,
        totalProfit: houseProfit,
        totalBetsCount: revealLogs.length,
        totalWins,
        totalLosses,
        winRate,
        houseProfit,
        uniquePlayers,
      });

      // Sort bets by timestamp (most recent first) and take top 50
      const sortedBets = bets.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
      setRecentBets(sortedBets);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  // Initial data fetch only (no auto-refresh)
  useEffect(() => {
    if (isOwner && publicClient) {
      fetchAdminData();
    }
  }, [isOwner, publicClient, fetchAdminData]);

  // Update transaction status based on write and confirmation state
  useEffect(() => {
    if (isWritePending) {
      setTransactionStatus('Waiting for wallet approval...');
    } else if (isConfirming) {
      setTransactionStatus('Transaction confirming...');
    } else if (isConfirmed && hasMounted) {
      setTransactionStatus('');
    } else {
      setTransactionStatus('');
    }
  }, [isWritePending, isConfirming, isConfirmed, hasMounted]);

  // Refresh ALL data on successful transaction (only after mount to prevent hydration issues)
  useEffect(() => {
    if (isConfirmed && hasMounted) {
      // Dismiss ALL toasts to ensure loading toast is removed
      toast.dismiss();
      
      // Small delay to ensure toast is dismissed before showing success
      setTimeout(() => {
        // Show success toast
        toast.success('Transaction Confirmed!', {
          description: 'Updating balances and refreshing data...',
          duration: 3000,
        });
      }, 100);
      
      // Invalidate and refetch ALL balance queries (including header wallet balance)
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      
      // Refetch all contract data
      fetchAdminData();
      refetchContractBalance();
      refetchContractBalanceTracked();
      refetchMinBet();
      refetchMaxRewardPercent();
      
      // Give a small delay to ensure blockchain state is updated, then refetch again
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        refetchContractBalance();
        refetchContractBalanceTracked();
      }, 1500);

      // Reset the write contract state and clear status
      setTimeout(() => {
        resetWriteContract();
        setTransactionStatus('');
        setCurrentToastId(undefined);
      }, 2500);
    }
  }, [
    isConfirmed,
    hasMounted,
    fetchAdminData, 
    refetchContractBalance, 
    refetchContractBalanceTracked,
    refetchMinBet,
    refetchMaxRewardPercent,
    queryClient,
    resetWriteContract
  ]);

  // Handle deposit
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Invalid Amount', {
        description: 'Please enter a valid deposit amount',
      });
      return;
    }

    try {
      const amountWei = parseEther(depositAmount);
      
      // Check if owner has enough balance
      if (ownerBalanceData && amountWei > ownerBalanceData.value) {
        toast.error('Insufficient Balance', {
          description: 'Your wallet does not have enough ETH',
        });
        return;
      }
      
      const amount = depositAmount;
      setDepositAmount('');
      
      writeContract({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'depositFunds',
        value: amountWei,
      });
      
      const toastId = toast.loading('Depositing Funds', {
        description: `Sending ${amount} ETH to contract...`,
      });
      setCurrentToastId(toastId);
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.dismiss(); // Dismiss any loading toasts
      toast.error('Transaction Failed', {
        description: error.message || 'Failed to deposit funds',
      });
      setTransactionStatus('');
      setCurrentToastId(undefined);
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Invalid Amount', {
        description: 'Please enter a valid withdrawal amount',
      });
      return;
    }

    const amountWei = parseEther(withdrawAmount);
    const contractBal = contractBalanceTracked as bigint;
    
    if (amountWei > contractBal) {
      toast.error('Insufficient Contract Balance', {
        description: 'Withdrawal amount exceeds available balance',
      });
      return;
    }

    try {
      const amount = withdrawAmount;
      setWithdrawAmount('');
      
      writeContract({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'withdrawFunds',
        args: [amountWei],
      });
      
      const toastId = toast.loading('Withdrawing Funds', {
        description: `Withdrawing ${amount} ETH from contract...`,
      });
      setCurrentToastId(toastId);
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.dismiss(); // Dismiss any loading toasts
      toast.error('Transaction Failed', {
        description: error.message || 'Failed to withdraw funds',
      });
      setTransactionStatus('');
      setCurrentToastId(undefined);
    }
  };

  // Handle emergency withdraw
  const handleEmergencyWithdraw = async () => {
    if (!confirm('⚠️ EMERGENCY WITHDRAW\n\nThis will withdraw ALL funds from the contract.\n\nAre you absolutely sure?')) {
      return;
    }

    try {
      writeContract({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'emergencyWithdraw',
      });
      
      const toastId = toast.loading('Emergency Withdrawal', {
        description: 'Withdrawing all funds from contract...',
      });
      setCurrentToastId(toastId);
    } catch (error: any) {
      console.error('Emergency withdrawal error:', error);
      toast.dismiss(); // Dismiss any loading toasts
      toast.error('Emergency Withdrawal Failed', {
        description: error.message || 'Failed to execute emergency withdrawal',
      });
      setTransactionStatus('');
      setCurrentToastId(undefined);
    }
  };

  // Handle update min bet
  const handleUpdateMinBet = async () => {
    if (!newMinBet || parseFloat(newMinBet) <= 0) {
      toast.error('Invalid Amount', {
        description: 'Please enter a valid minimum bet',
      });
      return;
    }

    try {
      const minBetWei = parseEther(newMinBet);
      const amount = newMinBet;
      setNewMinBet('');
      
      writeContract({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'setMinBet',
        args: [minBetWei],
      });
      
      const toastId = toast.loading('Updating Min Bet', {
        description: `Setting minimum bet to ${amount} ETH...`,
      });
      setCurrentToastId(toastId);
    } catch (error: any) {
      console.error('Update min bet error:', error);
      toast.dismiss(); // Dismiss any loading toasts
      toast.error('Update Failed', {
        description: error.message || 'Failed to update minimum bet',
      });
      setTransactionStatus('');
      setCurrentToastId(undefined);
    }
  };

  // Handle update max reward percent
  const handleUpdateMaxReward = async () => {
    if (!newMaxRewardPercent || parseFloat(newMaxRewardPercent) <= 0) {
      toast.error('Invalid Percentage', {
        description: 'Please enter a valid percentage',
      });
      return;
    }

    const percent = parseFloat(newMaxRewardPercent);
    if (percent > 50) {
      toast.error('Invalid Percentage', {
        description: 'Maximum reward percentage cannot exceed 50%',
      });
      return;
    }

    try {
      // Convert percentage to 8 decimal format (e.g., 10% = 10_000_000)
      const percentIn8Decimals = BigInt(Math.floor(percent * 1_000_000));
      const percentValue = newMaxRewardPercent;
      setNewMaxRewardPercent('');
      
      writeContract({
        address: coinFlipAddress,
        abi: coinFlipAbi,
        functionName: 'setMaxRewardPercent',
        args: [percentIn8Decimals],
      });
      
      const toastId = toast.loading('Updating Max Reward', {
        description: `Setting max reward to ${percentValue}%...`,
      });
      setCurrentToastId(toastId);
    } catch (error: any) {
      console.error('Update max reward error:', error);
      toast.dismiss(); // Dismiss any loading toasts
      toast.error('Update Failed', {
        description: error.message || 'Failed to update max reward percentage',
      });
      setTransactionStatus('');
      setCurrentToastId(undefined);
    }
  };

  // Access control UI
  if (!isConnected) {
    return (
      <PageLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-yellow-500" />
            <h1 className="text-2xl font-bold">Admin Access Required</h1>
            <p className="text-muted-foreground">Please connect your wallet to access the admin panel</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!isOwner) {
    return (
      <PageLayout>
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
            <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
            <p className="text-muted-foreground">Only the contract owner can access this page</p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Connected: {formatAddress(connectedAddress)}</p>
              <p className="text-sm text-muted-foreground">Owner: {formatAddress(ownerAddress)}</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Format helper for percentage
  const formatPercent = (value: bigint | undefined) => {
    if (!value) return '0';
    return (Number(value) / 1_000_000).toFixed(2);
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-green-500" />
                <h1 className="text-4xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-muted-foreground">Contract Owner: {formatAddress(ownerAddress)}</p>
            </div>
            
            {/* Refresh Button */}
            {hasMounted && (
              <button
                onClick={() => {
                  toast.info('Refreshing Data', {
                    description: 'Fetching latest stats and balances...',
                    duration: 2000,
                  });
                  fetchAdminData();
                  refetchContractBalance();
                  refetchContractBalanceTracked();
                  refetchMinBet();
                  refetchMaxRewardPercent();
                  queryClient.invalidateQueries({ queryKey: ['balance'] });
                }}
                disabled={loading || isWritePending || isConfirming}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            )}
          </div>

          {/* Transaction Status Banner */}
          {(isWritePending || isConfirming) && transactionStatus && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-500">{transactionStatus}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isWritePending ? 'Please check your wallet' : 'Waiting for blockchain confirmation'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Contract Balance */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Wallet className="w-5 h-5 text-green-500" />
              <Pill variant="success">Live</Pill>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Contract Balance</h3>
            <p className="text-2xl font-bold">
              {contractBalanceData ? formatEther(contractBalanceData.value) : '0'} ETH
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tracked: {contractBalanceTracked ? formatEther(contractBalanceTracked as bigint) : '0'} ETH
            </p>
          </div>

          {/* House Profit */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <Pill variant="info">Profit</Pill>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">House Profit</h3>
            <p className="text-2xl font-bold text-blue-500">
              +{formatEther(stats.houseProfit)} ETH
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalBetsCount} total bets
            </p>
          </div>

          {/* Total Volume */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <Pill>Volume</Pill>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Total Wagered</h3>
            <p className="text-2xl font-bold">
              {formatEther(stats.totalBetsAmount)} ETH
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Paid out: {formatEther(stats.totalPayouts)} ETH
            </p>
          </div>

          {/* Unique Players */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-orange-500" />
              <Pill>Players</Pill>
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">Unique Players</h3>
            <p className="text-2xl font-bold">
              {stats.uniquePlayers.size}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Win rate: {stats.winRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Fund Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Deposit Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold">Deposit Funds</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Add funds to the contract to support larger bets
            </p>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Amount in ETH"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                step="0.01"
                min="0"
              />
              <button
                onClick={handleDeposit}
                disabled={isWritePending || isConfirming || !depositAmount}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isWritePending || isConfirming ? 'Processing...' : 'Deposit Funds'}
              </button>
            </div>
          </div>

          {/* Withdraw Section */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold">Withdraw Funds</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Withdraw profits from the contract
            </p>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Amount in ETH"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
                min="0"
              />
              <button
                onClick={handleWithdraw}
                disabled={isWritePending || isConfirming || !withdrawAmount}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isWritePending || isConfirming ? 'Processing...' : 'Withdraw Funds'}
              </button>
              <button
                onClick={handleEmergencyWithdraw}
                disabled={isWritePending || isConfirming}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                Emergency Withdraw All
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-xl font-bold">Game Configuration</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Control betting limits and risk exposure for the house
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Min Bet */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold">Minimum Bet Amount</h3>
                    <button
                      onClick={() => setShowMinBetInfo(true)}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                      title="Show guidelines"
                    >
                      <Info className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The smallest bet players can place
                  </p>
                </div>
                <Pill variant="default">
                  {minBet ? formatEther(minBet as bigint) : '0'} ETH
                </Pill>
              </div>
              
              {/* Min Bet Info Popup */}
              {showMinBetInfo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-bold">Minimum Bet Guidelines</h3>
                      </div>
                      <button
                        onClick={() => setShowMinBetInfo(false)}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-400 mb-2">What this controls:</p>
                        <p className="text-sm text-muted-foreground">
                          Sets the minimum bet amount required to play. This prevents spam and very small bets 
                          that aren't economically viable due to gas costs.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold">Recommended Settings:</p>
                        
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-400 mb-1">✓ Low Entry (0.001 - 0.01 ETH)</p>
                          <p className="text-xs text-muted-foreground">
                            Accessible to most players, higher transaction volume, more casual gaming
                          </p>
                        </div>
                        
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-amber-400 mb-1">⚠ Medium Stakes (0.01 - 0.1 ETH)</p>
                          <p className="text-xs text-muted-foreground">
                            Balanced approach, reduces spam, attracts more serious players
                          </p>
                        </div>
                        
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-red-400 mb-1">! High Rollers (0.1+ ETH)</p>
                          <p className="text-xs text-muted-foreground">
                            Exclusive gaming, lower volume, requires substantial contract balance
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium mb-1">💡 Pro Tip:</p>
                        <p className="text-xs text-muted-foreground">
                          Consider gas costs on your network. Set minimum bet high enough to make 
                          transactions economically worthwhile for players.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowMinBetInfo(false)}
                      className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-400 font-medium mb-1">💡 What this controls:</p>
                <p className="text-xs text-muted-foreground">
                  Sets the minimum bet amount. Lower values allow more players to participate, 
                  while higher values reduce transaction volume and small bets.
                </p>
              </div>

              <div className="bg-background/50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Current Impact:</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Minimum allowed bet:</span>
                    <span className="font-medium">{minBet ? formatEther(minBet as bigint) : '0'} ETH</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Potential payout (1.98x):</span>
                    <span className="font-medium text-green-400">
                      {minBet ? (parseFloat(formatEther(minBet as bigint)) * 1.98).toFixed(6) : '0'} ETH
                    </span>
                  </div>
                </div>
              </div>
              
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Update Minimum Bet (in ETH)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g., 0.001"
                  value={newMinBet}
                  onChange={(e) => setNewMinBet(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  step="0.001"
                  min="0"
                />
                <button
                  onClick={handleUpdateMinBet}
                  disabled={isWritePending || isConfirming || !newMinBet}
                  className="px-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Max Payout % */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold">Maximum Payout Limit</h3>
                    <button
                      onClick={() => setShowMaxPayoutInfo(true)}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                      title="Show guidelines"
                    >
                      <Info className="w-4 h-4 text-amber-400" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Controls maximum bet size relative to contract balance
                  </p>
                </div>
                <Pill variant="default">
                  {formatPercent(maxRewardPercent as bigint)}%
                </Pill>
              </div>
              
              {/* Max Payout Info Popup */}
              {showMaxPayoutInfo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-bold">Maximum Payout Guidelines</h3>
                      </div>
                      <button
                        onClick={() => setShowMaxPayoutInfo(false)}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-amber-400 mb-2">⚠️ Risk Management:</p>
                        <p className="text-sm text-muted-foreground">
                          This limits the maximum payout to a percentage of your contract balance. 
                          It protects the house from catastrophic losses on a single bet. 
                          <span className="font-medium text-amber-300"> Higher % = More risk + Larger bets allowed.</span>
                        </p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold">Recommended Risk Profiles:</p>
                        
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-green-400 mb-1">✓ Conservative (5-10%)</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Protects bankroll, reduces variance, steady growth
                          </p>
                          <p className="text-xs font-mono bg-background/50 rounded px-2 py-1">
                            Example: 10 ETH × 10% = 1 ETH max payout → 0.5 ETH max bet
                          </p>
                        </div>
                        
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-amber-400 mb-1">⚠ Moderate (10-20%)</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Balanced risk/reward, accommodates larger bets, standard for most casinos
                          </p>
                          <p className="text-xs font-mono bg-background/50 rounded px-2 py-1">
                            Example: 10 ETH × 15% = 1.5 ETH max payout → 0.76 ETH max bet
                          </p>
                        </div>
                        
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <p className="text-sm font-medium text-red-400 mb-1">! Aggressive (20-50%)</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            High risk, high variance, can lose significant % of bankroll on unlucky streaks
                          </p>
                          <p className="text-xs font-mono bg-background/50 rounded px-2 py-1">
                            Example: 10 ETH × 30% = 3 ETH max payout → 1.52 ETH max bet
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs font-medium mb-1">💡 Pro Tip:</p>
                        <p className="text-xs text-muted-foreground">
                          Monitor your house profit regularly. If you're consistently winning, 
                          you can afford to increase this percentage. If losing, consider reducing it.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowMaxPayoutInfo(false)}
                      className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-400 font-medium mb-1">⚠️ Risk Management:</p>
                <p className="text-xs text-muted-foreground">
                  Limits the maximum payout to a percentage of the contract balance. 
                  This protects the house from excessive losses on a single bet. 
                  Higher % = more risk, larger bets allowed.
                </p>
              </div>

              <div className="bg-background/50 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Current Impact:</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Contract balance:</span>
                    <span className="font-medium">
                      {contractBalanceTracked ? formatEther(contractBalanceTracked as bigint) : '0'} ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max payout limit:</span>
                    <span className="font-medium text-amber-400">
                      {contractBalanceTracked && maxRewardPercent 
                        ? (parseFloat(formatEther(contractBalanceTracked as bigint)) * parseFloat(formatPercent(maxRewardPercent as bigint)) / 100).toFixed(6)
                        : '0'
                      } ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max bet allowed:</span>
                    <span className="font-medium text-blue-400">
                      {contractBalanceTracked && maxRewardPercent 
                        ? ((parseFloat(formatEther(contractBalanceTracked as bigint)) * parseFloat(formatPercent(maxRewardPercent as bigint)) / 100) / 1.98).toFixed(6)
                        : '0'
                      } ETH
                    </span>
                  </div>
                </div>
              </div>
              
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Update Max Payout % (1-50%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g., 10"
                  value={newMaxRewardPercent}
                  onChange={(e) => setNewMaxRewardPercent(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  step="0.1"
                  min="0.1"
                  max="50"
                />
                <button
                  onClick={handleUpdateMaxReward}
                  disabled={isWritePending || isConfirming || !newMaxRewardPercent}
                  className="px-4 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bets Table */}
        <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold">Recent Bets</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Player</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Bet</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Choice</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Result</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payout</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Profit/Loss</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentBets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {loading ? 'Loading...' : 'No bets yet'}
                    </td>
                  </tr>
                ) : (
                  recentBets.map((bet, idx) => {
                    const houseProfitLoss = bet.betAmount - bet.payout;
                    return (
                      <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">{formatAddress(bet.player)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{parseFloat(formatEther(bet.betAmount)).toFixed(4)} ETH</span>
                        </td>
                        <td className="py-3 px-4">
                          <Pill variant={bet.choice === 0 ? 'default' : 'secondary'}>
                            {bet.choice === 0 ? 'HEADS' : 'TAILS'}
                          </Pill>
                        </td>
                        <td className="py-3 px-4">
                          <Pill variant={bet.result === 0 ? 'default' : 'secondary'}>
                            {bet.result === 0 ? 'HEADS' : 'TAILS'}
                          </Pill>
                        </td>
                        <td className="py-3 px-4">
                          {bet.didWin ? (
                            <span className="text-red-500 font-medium">
                              {parseFloat(formatEther(bet.payout)).toFixed(4)} ETH
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={houseProfitLoss > 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                            {houseProfitLoss > 0 ? '+' : ''}{parseFloat(formatEther(houseProfitLoss)).toFixed(4)} ETH
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatTimeAgo(Math.floor(bet.timestamp / 1000))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

