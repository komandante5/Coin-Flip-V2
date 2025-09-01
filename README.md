# CoinFlip V2 DApp

A decentralized coin flip game built with Hardhat, Next.js, and VRF (Verifiable Random Function).

## Project Structure

```
├── contracts/          # Smart contracts
├── scripts/            # Deployment and testing scripts
├── test/               # Smart contract tests
├── app/                # Next.js app directory
├── src/                # Shared assets (ABI, deployments)
├── public/             # Static assets
├── artifacts/          # Compiled contracts
├── deployments/        # Deployment addresses
└── ignition/           # Hardhat Ignition modules
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start local Hardhat node:**
   ```bash
   npm run node
   ```

3. **Deploy contracts (in another terminal):**
   ```bash
   npm run deploy:local
   ```

4. **Sync ABI files and deployments:**
   ```bash
   npm run sync
   ```

5. **Start frontend development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

### Smart Contract Development
- `npm run test` - Run contract tests
- `npm run test:coverage` - Run tests with coverage
- `npm run node` - Start local Hardhat network
- `npm run deploy:local` - Deploy contracts to local network
- `npm run test:local` - Test deployed contracts
- `npm run simulate:local` - Run simulation scripts

### Frontend Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Utilities
- `npm run sync` - Copy ABI files and deployments to frontend
- `npm run copy:abi` - Copy only ABI files
- `npm run copy:deployments` - Copy only deployment addresses

## Features

- **Fair Coin Flip**: Provably fair coin flips using VRF
- **Real-time Updates**: Live contract balance and betting limits
- **Wallet Integration**: Connect with MetaMask via RainbowKit
- **Responsive UI**: Modern Next.js interface with real-time feedback
- **Audio Feedback**: Sound effects for user interactions
- **Contract Information**: Live display of game statistics

## Game Rules

- Minimum bet: 0.001 ETH
- Maximum bet: 10% of contract balance
- House edge: 1%
- Payout: 1.98x on win
- Win chance: 50%

## Development Notes

- Uses MockVRF for local testing (2 transaction flow)
- In production, would use Chainlink VRF (1 transaction flow)
- Contract balance updates in real-time
- Betting limits are dynamically calculated
