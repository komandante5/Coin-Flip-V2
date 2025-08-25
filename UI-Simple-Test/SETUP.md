# Setup Instructions for Your Engineer

## What's Been Created

A complete minimal frontend is ready in `UI-Simple-Test/` with:

✅ **Vite + React + TypeScript** project structure  
✅ **RainbowKit** wallet connector (industry standard)  
✅ **Wagmi + Viem** for Web3 interactions  
✅ **Hardhat local network** configuration (ChainID 31337)  
✅ **Complete CoinFlip interface** with flip functionality  
✅ **MockVRF integration** for instant randomness resolution  
✅ **Build scripts** for syncing contract ABIs and addresses  

## Next Steps for Your Engineer

### 1. Get WalletConnect Project ID (2 minutes)
```bash
# Visit https://cloud.walletconnect.com
# Create free account, create new project
# Copy the Project ID
# Replace in UI-Simple-Test/.env:
VITE_WC_PROJECT_ID=your_actual_project_id_here
```

### 2. Deploy Contracts (1 minute)
```bash
# In project root terminal 1:
npx hardhat node

# In project root terminal 2:
npx hardhat run scripts/deploy.ts --network localhost
```

### 3. Start Frontend (30 seconds)
```bash
# In UI-Simple-Test directory:
npm run sync        # Copy ABIs and deployment addresses
npm run dev         # Start frontend
```

### 4. Test the Flow
1. Open browser to shown localhost URL
2. Click "Connect Wallet" → choose wallet → add Hardhat network if needed
3. Enter bet amount (e.g., 0.01), choose Heads/Tails
4. Click "Flip" → approve transactions → see result!

## Key Files Created

- `src/wagmi.ts` - Web3 configuration for Hardhat local chain
- `src/main.tsx` - App providers setup (Wagmi, RainbowKit, React Query)  
- `src/App.tsx` - Main coin flip interface with wallet integration
- `package.json` - Dependencies and sync scripts
- `.env` - WalletConnect project ID (needs your actual ID)

## Architecture

1. **Frontend calls** `flipCoin(choice)` on CoinFlip contract
2. **Contract emits** `FlipCommitted` event with `requestId`
3. **Frontend calls** `MockVRF.triggerCallback()` to simulate randomness
4. **Contract emits** `FlipRevealed` with result and payout
5. **Frontend displays** win/lose status and payout amount

## What to Tell Your Engineer

> "Everything is set up. Just get a free WalletConnect Project ID, deploy the contracts locally, sync the ABIs, and start the frontend. The UI handles the complete flip workflow automatically - it calls the contract, triggers the mock VRF callback, and shows results. Perfect for testing before we build the real game UI."

## Later: Deploy to Abstract L2

When ready for Abstract:
1. Add Abstract L2 network config to `src/wagmi.ts`
2. Deploy contracts to Abstract
3. Update deployment addresses
4. Switch wallet to Abstract network

This frontend will work on any EVM chain with minimal changes.
