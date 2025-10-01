'use client';

import { create } from 'zustand';

interface WalletAnimationState {
  isWinAnimating: boolean;
  winAmount: string | null;
  triggerWinAnimation: (amount: string) => void;
  resetAnimation: () => void;
  shouldRefetchBalance: boolean;
  triggerBalanceRefetch: () => void;
}

/**
 * Zustand store for managing wallet animation state
 * This allows us to trigger animations from the game page
 * and have them display in the navigation component
 */
export const useWalletAnimation = create<WalletAnimationState>((set) => ({
  isWinAnimating: false,
  winAmount: null,
  shouldRefetchBalance: false,
  
  triggerWinAnimation: (amount: string) => {
    set({ isWinAnimating: true, winAmount: amount });
    // Auto-reset after animation duration (3 seconds)
    setTimeout(() => {
      set({ isWinAnimating: false, winAmount: null });
    }, 3000);
  },
  
  resetAnimation: () => set({ isWinAnimating: false, winAmount: null }),
  
  triggerBalanceRefetch: () => {
    set({ shouldRefetchBalance: true });
    // Reset the flag after a short delay
    setTimeout(() => {
      set({ shouldRefetchBalance: false });
    }, 100);
  },
}));
