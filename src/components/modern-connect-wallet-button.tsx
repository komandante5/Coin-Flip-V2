"use client"

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { useState, useEffect, memo } from 'react';
import { useWalletAnimation } from '@/hooks/useWalletAnimation';
import { AnimatedBalance } from '@/components/ui/animated-balance';
import { cn } from '@/lib/utils';
import { type ClassValue } from 'clsx';
import Image from 'next/image';
import { Wallet, ChevronDown, AlertCircle } from 'lucide-react';

interface ModernConnectWalletButtonProps {
  className?: ClassValue;
}

/**
 * Modern Web3 Connect Wallet Button using RainbowKit
 * 
 * Features:
 * - Beautiful, web3-focused design with glassmorphism
 * - Support for 100+ wallets via RainbowKit
 * - Excellent mobile experience with proper touch targets
 * - Professional animations and loading states
 * - Built-in wallet detection and installation prompts
 * - Responsive design optimized for all screen sizes
 * - Hex pattern backgrounds and glow effects
 */
function ModernConnectWalletButtonComponent({ className }: ModernConnectWalletButtonProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const { isConnected, address } = useAccount();
  const { data: balance, isLoading: isBalanceLoading } = useBalance({ 
    address,
    query: {
      enabled: Boolean(isConnected && address),
    }
  });
  
  const { isWinAnimating, winAmount } = useWalletAnimation();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!hasMounted) {
    return (
      <div className={cn("h-8 w-28 rounded-lg bg-white/5 animate-pulse backdrop-blur-sm", className)} />
    );
  }

  // Format balance for display
  const formattedBalance = balance
    ? parseFloat(balance.formatted).toFixed(4)
    : '0.0000';
  
  const balanceSymbol = balance?.symbol || 'ETH';

  return (
    <div className="relative">
      {/* Flying money animation on win */}
      {isWinAnimating && winAmount && (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
          {/* Multiple animated coin/money particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                '--tx': `${(Math.random() - 0.5) * 100}px`,
                '--ty': `${-Math.random() * 150 - 50}px`,
                animation: `money-fly-in ${1.5 + Math.random() * 0.5}s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s forwards`,
              } as React.CSSProperties}
            >
              <div className="text-2xl font-black text-emerald-400"
                style={{
                  textShadow: '0 0 10px rgba(16, 185, 129, 0.8), 0 0 20px rgba(6, 182, 212, 0.6)',
                  filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))',
                }}>
                +
              </div>
            </div>
          ))}
          
          {/* Ethereum symbols flying in */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`eth-${i}`}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                '--tx': `${(Math.random() - 0.5) * 120}px`,
                '--ty': `${-Math.random() * 180 - 60}px`,
                animation: `money-fly-in ${2 + Math.random() * 0.5}s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.15}s forwards`,
              } as React.CSSProperties}
            >
              <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.8))',
                }}>
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
              </svg>
            </div>
          ))}
          
          {/* Central glow pulse */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
              animation: 'wallet-glow-pulse 1.5s ease-out',
            }}
          />
        </div>
      )}

      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className={cn(
                        "group relative overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 md:px-4 md:py-2 transition-all duration-200 hover:bg-emerald-500/10 hover:border-emerald-500/50 active:scale-[0.98] backdrop-blur-sm",
                        className
                      )}
                    >
                      {/* Subtle shimmer on hover */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" />
                      
                      <div className="relative flex items-center justify-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                        <span className="text-xs md:text-sm font-medium text-emerald-300">
                          Connect Wallet
                        </span>
                      </div>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className={cn(
                        "group relative overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 md:px-4 md:py-2 transition-all duration-200 hover:bg-amber-500/10 hover:border-amber-500/50 active:scale-[0.98] backdrop-blur-sm",
                        className
                      )}
                    >
                      <div className="relative flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
                        <span className="text-xs md:text-sm font-medium text-amber-300">
                          Wrong Network
                        </span>
                      </div>
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-1.5 md:gap-2">
                    {/* Network Button - Sleek and minimal */}
                    <button
                      onClick={openChainModal}
                      type="button"
                      className={cn(
                        "group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 md:px-3 md:py-2 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/20 active:scale-[0.98] backdrop-blur-sm",
                        isWinAnimating && "border-emerald-500/30 bg-emerald-500/5"
                      )}
                    >
                      <div className="relative flex items-center gap-1.5">
                        {chain.hasIcon && (
                          <div
                            className="ring-1 ring-white/10 rounded-full overflow-hidden flex-shrink-0"
                            style={{
                              background: chain.iconBackground,
                              width: 16,
                              height: 16,
                            }}
                          >
                            {chain.iconUrl && (
                              <Image
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                            )}
                          </div>
                        )}
                        <span className="text-[11px] md:text-xs font-medium text-neutral-300 hidden sm:inline">
                          {chain.name}
                        </span>
                        <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-300 transition-colors" />
                      </div>
                    </button>

                    {/* Account/Balance Button - Professional and sleek */}
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className={cn(
                        "group relative overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5 md:px-3 md:py-2 transition-all duration-200 hover:bg-emerald-500/10 hover:border-emerald-500/50 active:scale-[0.98] backdrop-blur-sm",
                        isWinAnimating && "border-emerald-500/60 bg-emerald-500/10"
                      )}
                    >
                      {/* Subtle shimmer on hover - no heavy glow */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" />
                      
                      {/* Subtle pulse when winning - no heavy animation */}
                      {isWinAnimating && (
                        <div className="absolute inset-0 animate-pulse-subtle opacity-50">
                          <div className="absolute inset-0 bg-emerald-400/10 rounded-lg" />
                        </div>
                      )}
                      
                      <div className="relative flex items-center gap-1.5">
                        {isBalanceLoading ? (
                          <>
                            <div className="w-3 h-3 md:w-3.5 md:h-3.5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <span className="text-[11px] md:text-xs font-medium text-emerald-300/70 hidden sm:inline">Loading...</span>
                          </>
                        ) : (
                          <>
                            {/* ETH Icon */}
                            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
                            </svg>
                            <div className="flex flex-col items-start min-w-0">
                              <AnimatedBalance value={formattedBalance} symbol={balanceSymbol} />
                            </div>
                            <ChevronDown className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-400/60 group-hover:text-emerald-400 transition-colors flex-shrink-0 hidden sm:block" />
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes money-fly-in {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.5) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes wallet-glow-pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export const ModernConnectWalletButton = memo(ModernConnectWalletButtonComponent);
