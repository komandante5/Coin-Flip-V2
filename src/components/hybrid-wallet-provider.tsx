"use client";

import { AbstractWalletProvider } from "@abstract-foundation/agw-react";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, createContext, useContext, ReactNode, useMemo } from "react";
import { chain } from "@/config/chain";
import { classicWagmiConfig } from "@/wagmi";

// Learn more about Tanstack Query: https://tanstack.com/query/latest/docs/framework/react/reference/QueryClientProvider
// We create our own query client to share our app's query cache with the AbstractWalletProvider.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Disable automatic refetching during SSR/hydration to prevent state updates during render
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

// LOCAL TESTING ONLY: Context for wallet type selection
// TODO: DELETE THIS WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
type WalletType = 'abstract' | 'classic';

interface WalletTypeContextType {
  walletType: WalletType;
  setWalletType: (type: WalletType) => void;
}

const WalletTypeContext = createContext<WalletTypeContextType | undefined>(undefined);

export function useWalletType() {
  const context = useContext(WalletTypeContext);
  if (context === undefined) {
    throw new Error('useWalletType must be used within a HybridWalletProvider');
  }
  return context;
}

interface HybridWalletProviderProps {
  children: ReactNode;
}

/**
 * Hybrid Wallet Provider for Local Testing
 * 
 * LOCAL TESTING ONLY: This provider allows switching between Abstract Global Wallet
 * and classic wallet connections for local development purposes.
 * 
 * TODO: DELETE THIS COMPONENT WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
 */
export function HybridWalletProvider({ children }: HybridWalletProviderProps) {
  // Determine chain support synchronously during render to avoid initial mount errors
  const isAbstractSupported = useMemo(() => {
    // Abstract Global Wallet supports a limited set of chains
    // Include Abstract Testnet (11124). Add mainnet when ready.
    const supportedChainIds = [11124];
    const currentChainId = chain.id;
    const supported = supportedChainIds.includes(currentChainId);
    if (!supported) {
      // eslint-disable-next-line no-console
      console.log(`Chain ${currentChainId} not supported by Abstract Global Wallet, using classic wallets`);
    }
    return supported;
  }, []);

  // Initialize wallet type based on chain support
  const [walletType, setWalletType] = useState<WalletType>(
    isAbstractSupported ? 'abstract' : 'classic'
  );

  const contextValue = {
    walletType,
    setWalletType: (type: WalletType) => {
      // Prevent switching to Abstract if chain is not supported
      if (type === 'abstract' && !isAbstractSupported) {
        console.warn('Abstract Global Wallet not supported on this chain, using classic wallets');
        return;
      }
      setWalletType(type);
    },
  };

  return (
    <WalletTypeContext.Provider value={contextValue}>
      {walletType === 'abstract' && isAbstractSupported ? (
        // Abstract Global Wallet configuration (manages its own QueryClientProvider)
        <AbstractWalletProvider chain={chain} queryClient={queryClient}>
          {children}
        </AbstractWalletProvider>
      ) : (
        // Classic wallet configuration (Wagmi + Tanstack Query)
        <WagmiProvider config={classicWagmiConfig}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </WagmiProvider>
      )}
    </WalletTypeContext.Provider>
  );
}
