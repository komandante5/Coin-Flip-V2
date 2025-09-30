require("@matterlabs/hardhat-zksync");
require("@nomicfoundation/hardhat-toolbox-viem");

module.exports = {
  zksolc: {
    version: "1.5.15",
    settings: {
      codegen: "evmla", // align with solc default to avoid warning/future error
    },
  },
  defaultNetwork: "abstractTestnet",
  networks: {
    abstractTestnet: {
      url: "https://api.testnet.abs.xyz",
      ethNetwork: "sepolia",
      zksync: true,
      chainId: 11124,
      accounts: "remote", // Use remote accounts for testnet
    },
    abstractMainnet: {
      url: "https://api.mainnet.abs.xyz",
      ethNetwork: "mainnet",
      zksync: true,
      chainId: 2741,
      accounts: "remote", // Use remote accounts for mainnet
    },
    inMemoryNode: {
      url: "http://127.0.0.1:8011",
      ethNetwork: "localhost",
      zksync: true,
      accounts: [
        // Default hardhat account private keys for local testing
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
      ],
    },
  },
  solidity: { version: "0.8.28" },
};