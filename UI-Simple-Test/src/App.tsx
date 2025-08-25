import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { parseEther, parseEventLogs, formatEther, type Abi } from 'viem';

import coinFlipJson from './abi/CoinFlip.json';
import mockVrfJson from './abi/MockVRF.json';
import addresses from './deployments.localhost.json';

const coinFlipAbi = coinFlipJson.abi as Abi;
const mockVrfAbi = mockVrfJson.abi as Abi;

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;
const mockVrfAddress = (addresses as any).mockVRF as `0x${string}`;

type Side = 0 | 1; // 0=HEADS, 1=TAILS

// gameStats returns an array: [houseEdge, winChance, payoutMultiplier, currentBalance, minBetAmount, maxBetAmount]
type GameStatsArray = [bigint, bigint, bigint, bigint, bigint, bigint];

export default function App() {
  const [side, setSide] = useState<Side>(0);
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Read contract stats
  const { data: gameStats, refetch: refetchStats, isLoading, error } = useReadContract({
    address: coinFlipAddress,
    abi: coinFlipAbi,
    functionName: 'getGameStats',
  }) as { data: GameStatsArray | undefined, refetch: () => void, isLoading: boolean, error: any };

  // Debug logging
  useEffect(() => {
    console.log('gameStats:', gameStats);
    console.log('isLoading:', isLoading);
    console.log('error:', error);
  }, [gameStats, isLoading, error]);

  // Auto-refresh stats every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchStats]);

  async function flip() {
    try {
      setStatus('Submitting flip...');
      setResult('');

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
      if (!requestId) throw new Error('No FlipCommitted event found');

      setStatus(`Flip committed. requestId=${requestId.toString()}. Resolving via MockVRF...`);

      // Simulate VRF response with a random number
      const randomNumber = BigInt(Math.floor(Math.random() * 2 ** 32));

      const txHash2 = await writeContractAsync({
        address: mockVrfAddress,
        abi: mockVrfAbi,
        functionName: 'triggerCallback',
        args: [coinFlipAddress, requestId, randomNumber]
      });

      const receiptReveal = await publicClient!.waitForTransactionReceipt({ hash: txHash2 });
      const revealEvents = parseEventLogs({
        abi: coinFlipAbi,
        logs: receiptReveal.logs,
        eventName: 'FlipRevealed'
      });

      const ev = revealEvents[0]?.args as any;
      const didWin = Boolean(ev.didWin);
      const resultSide = Number(ev.result) === 0 ? 'HEADS' : 'TAILS';
      const payout = ev.payout?.toString?.() ?? '0';

      setResult(`Result: ${resultSide} | You ${didWin ? 'WIN' : 'LOSE'} | Payout: ${formatEther(BigInt(payout))} ETH`);
      setStatus('Done.');
      
      // Refresh stats after flip to show updated balance
      setTimeout(() => refetchStats(), 1000);
    } catch (err: any) {
      setStatus(`Error: ${err?.shortMessage ?? err?.message ?? String(err)}`);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2>CoinFlip — Minimal Local Tester</h2>
        <ConnectButton />
      </div>

      {/* Contract Information Panel */}
      <div style={{ 
        background: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: 8, 
        padding: 16, 
        marginBottom: 24 
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#495057' }}>Contract Information</h3>
        {gameStats && Array.isArray(gameStats) && gameStats.length === 6 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
            <div>
              <strong>Contract Balance:</strong><br />
              <span style={{ color: '#28a745', fontFamily: 'monospace' }}>
                {formatEther(gameStats[3])} ETH
              </span>
            </div>
            <div>
              <strong>House Edge:</strong><br />
              <span style={{ color: '#dc3545' }}>
                {(Number(gameStats[0]) / 1_000_000).toFixed(2)}%
              </span>
            </div>
            <div>
              <strong>Min Bet:</strong><br />
              <span style={{ color: '#007bff', fontFamily: 'monospace' }}>
                {formatEther(gameStats[4])} ETH
              </span>
            </div>
            <div>
              <strong>Max Bet:</strong><br />
              <span style={{ color: '#fd7e14', fontFamily: 'monospace' }}>
                {gameStats[5] > 0n ? formatEther(gameStats[5]) : '0'} ETH
              </span>
            </div>
            <div>
              <strong>Win Chance:</strong><br />
              <span style={{ color: '#6c757d' }}>
                {(Number(gameStats[1]) / 1_000_000).toFixed(1)}%
              </span>
            </div>
            <div>
              <strong>Payout Multiplier:</strong><br />
              <span style={{ color: '#20c997' }}>
                {(Number(gameStats[2]) / 100_000_000).toFixed(2)}x
              </span>
            </div>
          </div>
        ) : (
          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
            {isLoading ? 'Loading contract information...' : 
             error ? `Error loading contract data: ${error.message || error}` : 
             'No contract data available'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button
          onClick={() => setSide(0)}
          style={{ padding: 8, background: side === 0 ? '#ffb703' : '#eee' }}
        >
          Heads
        </button>
        <button
          onClick={() => setSide(1)}
          style={{ padding: 8, background: side === 1 ? '#ffb703' : '#eee' }}
        >
          Tails
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Bet (ETH): </label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: 8, width: 120 }}
        />
        {gameStats && Array.isArray(gameStats) && gameStats.length === 6 && (
          <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
            Range: {formatEther(gameStats[4])} - {gameStats[5] > 0n ? formatEther(gameStats[5]) : '0'} ETH
          </div>
        )}
      </div>

      <button onClick={flip} style={{ padding: '10px 16px' }}>
        Flip
      </button>

      <div style={{ marginTop: 16, color: '#666' }}>
        {status}
      </div>
      <div style={{ marginTop: 8, fontWeight: 600 }}>
        {result}
      </div>

      <hr style={{ margin: '24px 0' }} />
      <div style={{ fontSize: 12, color: '#666' }}>
        Notes:
        <ul>
          <li>Requires Hardhat local chain on chainId 31337 at http://127.0.0.1:8545.</li>
          <li>Uses MockVRF.triggerCallback(...) to resolve the flip immediately.</li>
          <li>Min bet and limits are enforced by the contract.</li>
          <li>Contract info refreshes automatically every 10 seconds and after each flip.</li>
        </ul>
      </div>
    </div>
  );
}