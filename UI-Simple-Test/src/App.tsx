import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, usePublicClient } from 'wagmi';
import { parseEther, parseEventLogs, type Abi } from 'viem';

import coinFlipJson from './abi/CoinFlip.json';
import mockVrfJson from './abi/MockVRF.json';
import addresses from './deployments.localhost.json';

const coinFlipAbi = coinFlipJson.abi as Abi;
const mockVrfAbi = mockVrfJson.abi as Abi;

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;
const mockVrfAddress = (addresses as any).mockVRF as `0x${string}`;

type Side = 0 | 1; // 0=HEADS, 1=TAILS

export default function App() {
  const [side, setSide] = useState<Side>(0);
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<string>('');

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

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

      setResult(`Result: ${resultSide} | You ${didWin ? 'WIN' : 'LOSE'} | Payout: ${payout} wei`);
      setStatus('Done.');
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
        </ul>
      </div>
    </div>
  );
}