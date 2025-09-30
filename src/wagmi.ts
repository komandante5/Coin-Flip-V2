import { createConfig, http } from 'wagmi';
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { abstractTestnet } from 'viem/chains';
import { anvilZkSync } from './config/chain';

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

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID as string | undefined;

// LOCAL TESTING ONLY: Classic wallet config for local development
// TODO: DELETE THIS WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
export const classicWagmiConfig = createConfig({
  chains: [anvilZkSync, hardhatLocal, abstractTestnet],
  transports: {
    [anvilZkSync.id]: http(anvilZkSync.rpcUrls.default.http[0]),
    [hardhatLocal.id]: http(hardhatLocal.rpcUrls.default.http[0]),
    [abstractTestnet.id]: http()
  },
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Coin Flip Game' }),
    ...(projectId ? [walletConnect({ projectId })] : [])
  ]
});

// Abstract Global Wallet config (production ready)
export const wagmiConfig = createConfig({
  chains: [anvilZkSync],
  transports: {
    [anvilZkSync.id]: http(anvilZkSync.rpcUrls.default.http[0])
  },
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : [])
  ]
});
