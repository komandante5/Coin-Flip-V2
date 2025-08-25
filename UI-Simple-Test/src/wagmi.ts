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
