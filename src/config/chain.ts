import { defineChain } from "viem";
import { getChain } from "@/config/networks";

// LOCAL TESTING ONLY: Define anvil-zksync chain for local development
// TODO: DELETE THIS WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
export const anvilZkSync = defineChain({
  id: 260, // anvil-zksync chain ID (verified from Docker logs)
  name: 'Anvil ZkSync',
  network: 'anvil-zksync',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8011'] },
    public: { http: ['http://127.0.0.1:8011'] }
  }
});

export const chain = getChain();
