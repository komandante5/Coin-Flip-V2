## Minimal-Frontend

A dead-simple, temporary frontend to locally test the `CoinFlip` contract. It uses:

- React + Vite (TypeScript)
- Wagmi + Viem
- RainbowKit (widely-used wallet chooser)
- Hardhat local network (chainId 31337)
- `MockVRF` manual callback to resolve flips

Only for testing. Do not use in production.

---

### 1) Prereqs

- Node 18+
- Hardhat project (this repo)
- Metamask (or any injected wallet)
- A WalletConnect Project ID for the wallet modal (free, 1 minute): create at `https://cloud.walletconnect.com` (used by RainbowKit)

---

### 2) Deploy locally

In the project root:

```bash
# 1) Start a local chain
npx hardhat node

# 2) In another terminal: deploy to localhost
npx hardhat run scripts/deploy.ts --network localhost
```

The deploy script writes addresses to `deployments/localhost.json` and funds `CoinFlip` with 10 ETH.

---

### 3) Create the UI project

From the project root, scaffold a Vite React TS app in `UI-Simple-Test`:

```bash
npm create vite@latest UI-Simple-Test -- --template react-ts
cd UI-Simple-Test
npm i @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

Create `.env` with your WalletConnect Project ID:

```bash
echo 'VITE_WC_PROJECT_ID=REPLACE_WITH_YOUR_ID' > .env
```

---

### 4) Copy ABIs and addresses into the UI

Vite disallows importing files outside the project root. Copy the compiled ABIs and the deployment addresses into the UI:

```bash
# From UI-Simple-Test directory
mkdir -p src/abi
cp ../artifacts/contracts/CoinFlip.sol/CoinFlip.json src/abi/CoinFlip.json
cp ../artifacts/contracts/MockVRF.sol/MockVRF.json src/abi/MockVRF.json
cp ../deployments/localhost.json src/deployments.localhost.json
```

Optional convenience scripts in `UI-Simple-Test/package.json`:

```json
{
  "scripts": {
    "copy:abi": "mkdir -p src/abi && cp ../artifacts/contracts/CoinFlip.sol/CoinFlip.json src/abi/CoinFlip.json && cp ../artifacts/contracts/MockVRF.sol/MockVRF.json src/abi/MockVRF.json",
    "copy:deployments": "cp ../deployments/localhost.json src/deployments.localhost.json",
    "sync": "npm run copy:abi && npm run copy:deployments",
    "dev": "vite"
  }
}
```

Run after each redeploy:
```bash
npm run sync
```

---

### 5) Minimal wiring (files to create/replace)

Create or replace these files inside `UI-Simple-Test/src`.

1) `src/wagmi.ts`

```ts
import { createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { defineChain } from 'viem';

export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat',
  network: 'hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] }
  }
});

const projectId = import.meta.env.VITE_WC_PROJECT_ID as string | undefined;

export const wagmiConfig = createConfig({
  chains: [hardhatLocal],
  transports: {
    [hardhatLocal.id]: http(hardhatLocal.rpcUrls.default.http[0])
  },
  connectors: [
    injected({ shimDisconnect: true }),
    ...(projectId ? [walletConnect({ projectId })] : [])
  ]
});
```

2) `src/main.tsx`

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import App from './App';
import { wagmiConfig } from './wagmi';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
```

3) `src/App.tsx`

```tsx
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

      const requestId = commitEvents[0]?.args.requestId as bigint;
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
```

---

### 6) Run the UI

In `UI-Simple-Test`:

```bash
# Keep Hardhat node running in another terminal.
npm run dev
```

- Open the shown localhost URL.
- Connect wallet in the modal.
- Ensure your wallet is set to the local Hardhat network (chainId 31337). If needed, add it to Metamask:
  - Network name: Hardhat
  - RPC: http://127.0.0.1:8545
  - Chain ID: 31337
  - Currency symbol: ETH

Place a bet amount (e.g., 0.01), choose Heads/Tails, click Flip. The UI:
- Sends `flipCoin(choice)` with `msg.value`.
- Parses `FlipCommitted` to get `requestId`.
- Calls `MockVRF.triggerCallback(CoinFlip, requestId, randomNumber)`.
- Parses `FlipRevealed` and shows win/lose and payout.

---

### 7) If contracts change

- Recompile/redeploy in the root project.
- In `UI-Simple-Test`: `npm run sync` to refresh ABIs and addresses.
- Refresh the page.

---

### 8) Optional: Test on a public testnet or Abstract L2 later

- Add chain config for your target (RPC URL, chainId, currency).
- Redeploy and update `src/deployments.<network>.json`.
- Switch wallet network in the modal and update `wagmi.ts` chains accordingly.

Example (pseudo):
```ts
// Add another chain alongside hardhatLocal:
const abstractTestnet = defineChain({
  id: 11124, // example
  name: 'Abstract Testnet',
  network: 'abstract-testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.abstract.example'] } }
});

// In wagmiConfig: chains: [hardhatLocal, abstractTestnet], transports: {...}
```

---

### 9) Troubleshooting

- Flip stuck at "Submitting flip":
  - Ensure Hardhat node is running and wallet is on chainId 31337.
- Error: "Bet exceeds max reward limit":
  - Reduce bet or fund contract more (owner-only).
- No `FlipRevealed`:
  - Confirm `MockVRF.triggerCallback(...)` was called (the UI does this automatically).
- ABIs mismatch:
  - Run `npm run sync` after redeploying contracts.