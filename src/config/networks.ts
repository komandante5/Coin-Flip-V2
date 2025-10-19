import { abstract, abstractTestnet } from "viem/chains";
import type { Chain } from "viem";

export type SupportedNetwork = "abstract" | "abstractTestnet" | "anvil";

type NetworkDefinition = {
  id: SupportedNetwork;
  label: string;
  baseChain: Chain;
  defaultRpcUrl: string;
  envRpcVar?: string;
  explorerBaseUrl?: string;
  deploymentsFile: string;
};

type SelectedNetwork = {
  id: SupportedNetwork;
  label: string;
  chain: Chain;
  rpcUrl: string;
  explorerBaseUrl?: string;
  deploymentsFile: string;
};

const networks: Record<SupportedNetwork, NetworkDefinition> = {
  abstract: {
    id: "abstract",
    label: "Abstract Mainnet",
    baseChain: abstract,
    defaultRpcUrl: "https://api.mainnet.abs.xyz",
    envRpcVar: "NEXT_PUBLIC_ABSTRACT_MAINNET_RPC",
    explorerBaseUrl: "https://abscan.org",
    deploymentsFile: "abstractMainnet.json",
  },
  abstractTestnet: {
    id: "abstractTestnet",
    label: "Abstract Testnet",
    baseChain: abstractTestnet,
    defaultRpcUrl: "https://api.testnet.abs.xyz",
    envRpcVar: "NEXT_PUBLIC_ABSTRACT_TESTNET_RPC",
    explorerBaseUrl: "https://sepolia.abscan.org",
    deploymentsFile: "abstractTestnet.json",
  },
  anvil: {
    id: "anvil",
    label: "Local Anvil ZKsync",
    baseChain: {
      id: 260,
      name: "Anvil ZkSync",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["http://127.0.0.1:8011"] },
        public: { http: ["http://127.0.0.1:8011"] },
      },
    },
    defaultRpcUrl: "http://127.0.0.1:8011",
    envRpcVar: "NEXT_PUBLIC_ANVIL_RPC",
    explorerBaseUrl: undefined,
    deploymentsFile: "inMemoryNode.json",
  },
};

const DEFAULT_NETWORK: SupportedNetwork = "abstractTestnet";

function resolveEnvValue(variableName: string | undefined): string | undefined {
  if (!variableName) return undefined;
  if (typeof process === "undefined") return undefined;
  return process.env[variableName];
}

function buildChain(base: Chain, rpcUrl: string): Chain {
  return {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  };
}

export function getSelectedNetwork(): SelectedNetwork {
  const rawKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_NETWORK : undefined;
  const key = (rawKey as SupportedNetwork | undefined) ?? DEFAULT_NETWORK;
  const definition = networks[key] ?? networks[DEFAULT_NETWORK];
  const overrideRpc = resolveEnvValue(definition.envRpcVar);
  const rpcUrl = overrideRpc || definition.defaultRpcUrl;
  return {
    id: definition.id,
    label: definition.label,
    chain: buildChain(definition.baseChain, rpcUrl),
    rpcUrl,
    explorerBaseUrl: definition.explorerBaseUrl,
    deploymentsFile: definition.deploymentsFile,
  };
}

export function getChain(): Chain {
  return getSelectedNetwork().chain;
}

export function getDeploymentsFile(): string {
  return getSelectedNetwork().deploymentsFile;
}

export function getExplorerBaseUrl(): string | undefined {
  return getSelectedNetwork().explorerBaseUrl;
}
