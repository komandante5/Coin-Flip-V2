import { createPublicClient, createWalletClient, http } from "viem";
import { eip712WalletActions, publicActionsL2 } from "viem/zksync";
import { getSelectedNetwork } from "@/config/networks";

const network = getSelectedNetwork();

/**
 * Viem specific extensions for ZK Stack chains (i.e., Abstract)
 * Learn more: https://viem.sh/zksync/
 */

// Global Viem public client instance
export const publicClient = createPublicClient({
  chain: network.chain,
  transport: http(network.rpcUrl),
}).extend(publicActionsL2());

// Global Viem wallet client instance
export const walletClient = createWalletClient({
  chain: network.chain,
  transport: http(network.rpcUrl),
}).extend(eip712WalletActions());
