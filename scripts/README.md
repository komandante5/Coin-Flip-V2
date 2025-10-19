# Scripts Documentation

## Overview

This directory contains deployment and simulation scripts for the CoinFlip smart contracts across multiple blockchain networks.

## Multi-Chain Support

The project now supports both **ZKsync-based networks** (Abstract L2) and **EVM networks** (Ethereum, Base, BSC, HyperEVM):

- **ZKsync Networks**: Abstract Testnet, Abstract Mainnet, Local ZKsync (inMemoryNode)
- **EVM Networks**: Ethereum (Sepolia, Mainnet), Base (Sepolia, Mainnet), BSC (Testnet, Mainnet), HyperEVM (Testnet, Mainnet)

All scripts and tests automatically detect the network type and use the appropriate deployment methods.

## Prerequisites

Make sure your ZKsync in-memory node is running in Docker:
```bash
# The node should be accessible at http://127.0.0.1:8011
```

## Available Scripts

### 1. Deploy Script (`deploy-coinflip.ts`)

**Purpose:** Interactively deploy CoinFlip and MockVRF contracts to any network.

**Usage:**
```bash
# Deploy to local ZKsync in-memory node
npm run deploy

# Deploy to Abstract networks (ZKsync-based)
npm run deploy:abs:testnet
npm run deploy:abs:mainnet

# Deploy to EVM networks
npm run deploy:evm:sepolia
npm run deploy:evm:mainnet
npm run deploy:evm:base-sepolia
npm run deploy:evm:base
npm run deploy:evm:bsc-testnet
npm run deploy:evm:bsc

# Or manually with network flag
npx hardhat run scripts/deploy-coinflip.ts --network <network-name>
```

**Interactive Prompts:**

When you run the deployment script, it will interactively ask you:

1. **Which wallet to use** - Select from available accounts configured for the network
2. **Initial house balance** - How much ETH to deposit into the contract (e.g., "10" for 10 ETH)
3. **Confirmation** - Review your choices before proceeding

**Example:**
```
=== CoinFlip Deployment Configuration ===

Deploying to network: abstractTestnet (ZKsync)

Available wallets:
  1. Account 1
  2. Account 2
  3. Account 3

Select wallet (number): 1

Enter initial house balance in ETH (e.g., 10): 25

=== Configuration Summary ===
Network: abstractTestnet (ZKsync)
Wallet: Account 1
Initial House Balance: 25 ETH

Proceed with deployment? (yes/no): yes
```

**What it does:**
- Displays wallet balance for selected account
- Deploys MockVRF contract
- Deploys CoinFlip contract with owner and VRF addresses
- Funds contract with user-specified ETH amount (the "house bankroll")
- Saves deployment addresses to `deployments/{network}.json`
- Displays game parameters and contract info

**Network Support:**
- ✅ ZKsync (uses ZKsync deployer)
- ✅ Standard EVM networks (uses viem)

---

### 2. Simulate Script (`simulate.ts`)

**Purpose:** Run profitability simulations with configurable parameters.

**Usage:**
```bash
# Run with defaults (2000 trials, 0.1 ETH bet, 100 ETH bankroll)
npm run simulate

# Custom parameters via environment variables
TRIALS=5000 BET=0.5 BANKROLL=200 npm run simulate
```

**Parameters:**
- `TRIALS` - Number of coin flips to simulate (default: 2000)
- `BET` - Bet amount in ETH per flip (default: 0.1)
- `BANKROLL` - Initial house bankroll in ETH (default: 100)

**What it does:**
- Loads deployed contracts (or deploys fresh if needed)
- Runs specified number of coin flip simulations
- Tracks wins, losses, payouts, and house profit
- Calculates realized house edge vs expected
- Shows progress every 10% of trials

**Example Output:**
```
Realized Edge: 0.987% (expected ≈ 1.000%)
Wins/Losses: 1004/996
House Profit: 1.96 ETH
```

### 3. Export ABI Script (`export-abi.ts`)

**Purpose:** Export contract ABIs from artifacts to the frontend source directory.

**Usage:**
```bash
# Export ABIs (auto-detects ZK vs EVM artifacts)
npm run abi:sync

# Full sync (ABIs + deployment addresses)
npm run sync
```

**What it does:**
- Detects network type (ZKsync vs EVM)
- Copies `CoinFlip.json` and `MockVRF.json` from correct artifacts directory
- Places them in `src/abi/` for frontend use

---

## Testing

The test suite uses a **shared behavior architecture** to run identical tests across ZKsync and EVM networks:

```bash
# Run all tests on ZKsync in-memory node (default)
npm test
npm run test:zk:local

# Run tests on Abstract testnet
npm run test:zk:abs

# Run tests on EVM networks
npm run test:evm:sepolia
npm run test:evm:base-sepolia

# Run tests with gas reporting
npm run test:gas

# Run tests with coverage
npm run test:coverage
```

### Test Architecture

```
test/
├── shared/
│   ├── types.ts              # Cross-chain fixture interface
│   └── coinflip.behavior.ts  # Shared test logic (works on any chain)
├── zk/
│   ├── fixtures.ts           # ZKsync-specific implementation
│   └── coinflip.zk.test.ts   # ZKsync test runner
└── evm/
    ├── fixtures.ts           # EVM-specific implementation (viem)
    └── coinflip.evm.test.ts  # EVM test runner
```

The test suite includes:
- ✅ Deployment validation
- ✅ Ownership & VRF management
- ✅ Game parameters & house edge
- ✅ Fund management
- ✅ Game logic (win/loss scenarios)
- ✅ View functions
- ✅ Edge cases

All tests run identically on both ZKsync and EVM networks using the shared behavior pattern.

---

## Development Workflow

### Setup Environment

1. **Create `.env` file** (copy from `.env.example`):
```bash
cp .env.example .env
```

2. **Configure your private key and RPC endpoints** in `.env`:
```env
PRIVATE_KEY=0x...
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# ... etc
```

### Local Development (ZKsync)

1. **Start ZKsync in-memory node** in Docker:
```bash
# The node should be accessible at http://127.0.0.1:8011
```

2. **Deploy contracts**:
```bash
npm run deploy
```

3. **Run tests**:
```bash
npm test
```

4. **Run profitability simulation**:
```bash
npm run simulate
```

5. **Sync artifacts to frontend**:
```bash
npm run sync
```

### Multi-Chain Deployment

1. **Compile for target network**:
```bash
# ZKsync networks compile automatically with zksolc
npx hardhat compile --network inMemoryNode

# EVM networks use standard solc
npx hardhat compile --network sepolia
```

2. **Deploy to target network**:
```bash
# Abstract (ZKsync)
npm run deploy:abs:testnet

# Ethereum
npm run deploy:evm:sepolia

# Base
npm run deploy:evm:base-sepolia

# BSC
npm run deploy:evm:bsc-testnet
```

3. **Export ABIs**:
```bash
npm run abi:sync
```

---

## File Structure

```
scripts/
├── README.md              # This file
├── deploy-coinflip.ts     # Main deployment script (ZK + EVM)
├── export-abi.ts          # ABI export script
└── simulate.ts            # Profitability simulation

test/
├── shared/
│   ├── types.ts           # Cross-chain fixture interface
│   └── coinflip.behavior.ts # Shared test logic
├── zk/
│   ├── fixtures.ts        # ZKsync fixture implementation
│   └── coinflip.zk.test.ts # ZKsync test runner
└── evm/
    ├── fixtures.ts        # EVM fixture implementation
    └── coinflip.evm.test.ts # EVM test runner

deployments/
├── inMemoryNode.json      # Local ZK deployment
├── abstractTestnet.json   # Abstract testnet
├── abstractMainnet.json   # Abstract mainnet
├── sepolia.json           # Ethereum Sepolia
├── mainnet.json           # Ethereum mainnet
├── baseSepolia.json       # Base Sepolia
├── base.json              # Base mainnet
├── bscTestnet.json        # BSC testnet
└── bsc.json               # BSC mainnet
```

---

## Notes

- All scripts automatically detect and handle ZKsync vs standard EVM differences
- Deployment addresses are saved per-network in `deployments/{network}.json`
- Tests use shared behavior pattern for consistency across all chains
- The same contracts work on both ZKsync and EVM networks without modification
- `simulate.ts` can run on any network with deployed contracts

## Environment Variables

All network configurations support environment variable overrides:

```env
# Private key for all networks
PRIVATE_KEY=0x...

# Abstract (defaults to public RPCs if not set)
ABSTRACT_TESTNET_RPC=https://api.testnet.abs.xyz
ABSTRACT_MAINNET_RPC=https://api.mainnet.abs.xyz

# Ethereum
SEPOLIA_RPC=https://...
ETHEREUM_MAINNET_RPC=https://...

# Base
BASE_SEPOLIA_RPC=https://...
BASE_MAINNET_RPC=https://...

# BSC (defaults to public RPCs)
BSC_TESTNET_RPC=https://...
BSC_MAINNET_RPC=https://...

# HyperEVM
HYPER_EVM_TESTNET_RPC=https://...
HYPER_EVM_MAINNET_RPC=https://...
```

See `.env.example` for a complete template.
