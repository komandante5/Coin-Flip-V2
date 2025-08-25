# CoinFlip Minimal Frontend

A simple React frontend for testing the CoinFlip smart contract locally.

## Quick Start

1. **Setup environment**: 
   ```bash
   # Edit .env and replace with your WalletConnect Project ID from https://cloud.walletconnect.com
   VITE_WC_PROJECT_ID=your_actual_project_id_here
   ```

2. **Start Hardhat node** (in project root):
   ```bash
   npx hardhat node
   ```

3. **Deploy contracts** (in project root, separate terminal):
   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

4. **Sync ABIs and addresses**:
   ```bash
   npm run sync
   ```

5. **Start frontend**:
   ```bash
   npm run dev
   ```

6. **Connect wallet**:
   - Add Hardhat network to your wallet (ChainID: 31337, RPC: http://127.0.0.1:8545)
   - Connect using the wallet button
   - Test coin flips!

## Scripts

- `npm run sync` - Copy contract ABIs and deployment addresses
- `npm run copy:abi` - Copy contract ABIs only
- `npm run copy:deployments` - Copy deployment addresses only
- `npm run dev` - Start development server

## Notes

- This is a minimal testing interface only
- Uses MockVRF for instant randomness resolution
- All styling is inline for simplicity
- Designed to be replaced with a full UI later