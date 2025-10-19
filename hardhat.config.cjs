require("@matterlabs/hardhat-zksync");
require("@nomicfoundation/hardhat-toolbox-viem");
require("dotenv/config");

// Load environment variables
const { PRIVATE_KEY } = process.env;

// Centralized account management
// For local zk node, use hardcoded accounts; for other networks use env PRIVATE_KEY
const defaultAccounts = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
];
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : defaultAccounts;

module.exports = {
  zksolc: {
    version: "1.5.15",
    settings: {
      codegen: "evmla", // align with solc default to avoid warning/future error
    },
  },
  defaultNetwork: "abstractTestnet",
  paths: {
    tests: "./test",
  },
  mocha: {
    timeout: 60000,
    require: ["tsx/cjs"],
  },
  networks: {
    // ========================================================================
    // Abstract L2 (ZKsync-based) - Primary Target
    // ========================================================================
    abstractTestnet: {
      url: process.env.ABSTRACT_TESTNET_RPC || "https://api.testnet.abs.xyz",
      ethNetwork: "sepolia",
      zksync: true,
      chainId: 11124,
      verifyURL: "https://api-sepolia.abscan.org/api",
      accounts,
    },
    abstractMainnet: {
      url: process.env.ABSTRACT_MAINNET_RPC || "https://api.mainnet.abs.xyz",
      ethNetwork: "mainnet",
      zksync: true,
      chainId: 2741,
      verifyURL: "https://api.abscan.org/api",
      accounts,
    },
    inMemoryNode: {
      url: "http://127.0.0.1:8011",
      ethNetwork: "localhost",
      zksync: true,
      chainId: 260,
      accounts: defaultAccounts,
    },

    // ========================================================================
    // Ethereum Networks (EVM)
    // ========================================================================
    sepolia: {
      url: process.env.SEPOLIA_RPC || "",
      chainId: 11155111,
      accounts,
    },
    mainnet: {
      url: process.env.ETHEREUM_MAINNET_RPC || "",
      chainId: 1,
      accounts,
    },

    // ========================================================================
    // Base L2 (EVM)
    // ========================================================================
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "",
      chainId: 84532,
      accounts,
    },
    base: {
      url: process.env.BASE_MAINNET_RPC || "",
      chainId: 8453,
      accounts,
    },

    // ========================================================================
    // Binance Smart Chain (EVM)
    // ========================================================================
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts,
    },
    bsc: {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts,
    },

    // ========================================================================
    // HyperEVM (EVM) - Adjust chain IDs when available
    // ========================================================================
    hyperTestnet: {
      url: process.env.HYPER_EVM_TESTNET_RPC || "",
      chainId: 998,
      accounts,
    },
    hyper: {
      url: process.env.HYPER_EVM_MAINNET_RPC || "",
      chainId: 999,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      abstractTestnet: process.env.ETHERSCAN_API_KEY || "M1PREVWCQ1H8M7U4VMGPBYRU4PX2Q7ES4H",
      abstractMainnet: process.env.ETHERSCAN_API_KEY || "M1PREVWCQ1H8M7U4VMGPBYRU4PX2Q7ES4H",
    },
    customChains: [
      {
        network: "abstractTestnet",
        chainId: 11124,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=11124",
          browserURL: "https://sepolia.abscan.org",
        },
      },
      {
        network: "abstractMainnet",
        chainId: 2741,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=2741",
          browserURL: "https://abscan.org",
        },
      },
    ],
  },
  solidity: { version: "0.8.28" },
};