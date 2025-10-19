import { defineChain } from 'viem';
import { abstractTestnet } from 'viem/chains';
import { anvilZkSync } from './config/chain';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

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

// Export chains for RainbowKit
export { anvilZkSync, abstractTestnet };

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID as string;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WC_PROJECT_ID is required for WalletConnect');
}

// RainbowKit compatible wagmi config
export const wagmiConfig = getDefaultConfig({
  appName: 'Dizzio Coin Flip',
  projectId,
  chains: [anvilZkSync, hardhatLocal, abstractTestnet],
  ssr: true,
});
