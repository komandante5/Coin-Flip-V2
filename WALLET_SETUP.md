# WalletConnect Setup

To use RainbowKit with WalletConnect, you need to create a WalletConnect project and get your project ID.

## Steps:

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up or log in
3. Create a new project
4. Copy your project ID
5. Add it to your `.env.local` file:

```
NEXT_PUBLIC_WC_PROJECT_ID=your_project_id_here
```

## For Development/Testing:

You can use a temporary project ID for testing, but for production, make sure to:
- Use your own WalletConnect project
- Configure proper app metadata
- Set up proper domains in the WalletConnect dashboard

## Current Configuration:

The app is configured to work with:
- MetaMask
- Trust Wallet  
- Rabby Wallet
- Coinbase Wallet
- WalletConnect (mobile wallets)
- And 100+ other wallets supported by RainbowKit

## Features:

- ✅ Beautiful, industry-standard UI
- ✅ Mobile-optimized bottom sheet
- ✅ Desktop modal dialog
- ✅ Wallet detection and installation prompts
- ✅ Professional animations
- ✅ Responsive design
- ✅ Built-in error handling
