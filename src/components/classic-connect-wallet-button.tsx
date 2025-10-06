"use client"

import { useConnect, useDisconnect, useAccount, useBalance } from "wagmi"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type ClassValue } from "clsx"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useCallback, memo, useEffect } from "react"
import { useSoundEffects } from "@/hooks/useSoundEffects"
import { useWalletAnimation } from "@/hooks/useWalletAnimation"
import { AnimatedBalance } from "@/components/ui/animated-balance"

interface ClassicConnectWalletButtonProps {
  className?: ClassValue
  customDropdownItems?: React.ReactNode[]
}

/**
 * Classic Connect Wallet Button for Local Testing
 * 
 * LOCAL TESTING ONLY: This component handles classic wallet connections
 * (MetaMask, Coinbase Wallet, etc.) for local development purposes.
 * 
 * TODO: DELETE THIS COMPONENT WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
 */
function ClassicConnectWalletButtonComponent({ className, customDropdownItems }: ClassicConnectWalletButtonProps) {
  // Prevent hydration mismatch by tracking mount state
  const [hasMounted, setHasMounted] = useState(false)
  
  // Wagmi hooks for wallet state and balance
  const { isConnected, status, address } = useAccount()
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({ 
    address,
    // Only fetch balance when connected and address is available
    query: {
      enabled: Boolean(isConnected && address),
    }
  })
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  
  // Sound effects
  const { playWalletConnect, playWalletDisconnect, playButtonClick } = useSoundEffects()
  
  // Wallet animation state
  const { isWinAnimating, winAmount, shouldRefetchBalance } = useWalletAnimation()

  // Local state for copy feedback
  const [copied, setCopied] = useState(false)
  
  // Set mounted state after initial render
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  // Refetch balance when triggered
  useEffect(() => {
    if (shouldRefetchBalance && address) {
      refetchBalance();
    }
  }, [shouldRefetchBalance, address, refetchBalance])

  /**
   * Handle wallet connection with sound
   */
  const handleConnect = useCallback((connector: typeof connectors[0]) => {
    playWalletConnect()
    connect({ connector })
  }, [connect, playWalletConnect])
  
  /**
   * Handle wallet disconnection with sound
   */
  const handleDisconnect = useCallback(() => {
    playWalletDisconnect()
    disconnect()
  }, [disconnect, playWalletDisconnect])
  
  /**
   * Copy wallet address to clipboard with visual feedback
   */
  const copyAddress = useCallback(async () => {
    if (address) {
      playButtonClick()
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [address, playButtonClick])

  // Prevent hydration mismatch: Show loading state until mounted
  if (!hasMounted) {
    return (
      <Button
        disabled
        className={cn("cursor-pointer group min-w-40", className)}
      >
        Connect Wallet
        <WalletIcon className="ml-2 h-4 w-4" />
      </Button>
    )
  }

  // Loading state: Show connecting button
  if (status === 'connecting' || status === 'reconnecting' || isPending) {
    return (
      <Button
        disabled
        className={cn("cursor-pointer group min-w-40", className)}
      >
        Connecting...
        <WalletIcon className="ml-2 h-4 w-4 animate-spin" />
      </Button>
    )
  }

  // Disconnected state: Show connect button with wallet options
  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn("cursor-pointer group min-w-40", className)}
          >
            Connect Wallet
            <WalletIcon className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom" className="w-56 !bg-[#0c0f10] border-white/30 shadow-xl">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              className="cursor-pointer hover:bg-white/[0.04] focus:bg-white/[0.04]"
            >
              <WalletIcon className="mr-2 h-4 w-4" />
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Connected but loading balance: Show loading state
  if (isConnected && isBalanceLoading) {
    return (
      <Button
        disabled
        className={cn("cursor-pointer group min-w-40 px-3", className)}
      >
        <WalletIcon className="mr-1 h-4 w-4" />
        Loading...
        <WalletIcon className="ml-1 h-4 w-4 animate-spin" />
      </Button>
    )
  }

  // Format the balance for display (4 decimal places)
  const formattedBalance = balance
    ? parseFloat(balance.formatted).toFixed(4)
    : '0.0000'
  
  const balanceSymbol = balance?.symbol || 'ETH'

  // Connected state: Show balance with dropdown menu and win animation
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(
              "cursor-pointer group min-w-40 px-3 transition-all duration-300",
              isWinAnimating && "scale-110 shadow-[0_0_30px_rgba(16,185,129,0.6)]",
              className
            )}
          >
            <WalletIcon className={cn("mr-1 h-4 w-4", isWinAnimating && "animate-bounce")} />
            <AnimatedBalance value={formattedBalance} symbol={balanceSymbol} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom" className="w-56 !bg-[#0c0f10] border-white/30 shadow-xl">
          {/* Address display with copy functionality */}
          <DropdownMenuItem className="focus:bg-white/[0.04] cursor-auto hover:bg-white/[0.04]">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground font-mono">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
              </span>
              {address && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-accent"
                  onClick={(e) => {
                    // Prevent dropdown from closing when copying
                    e.preventDefault()
                    e.stopPropagation()
                    copyAddress()
                  }}
                >
                  {copied ? (
                    <CheckIcon className="h-2.5 w-2.5" />
                  ) : (
                    <CopyIcon className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
          </DropdownMenuItem>
          {/* Custom dropdown items or default disconnect */}
          {customDropdownItems ? (
            customDropdownItems
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDisconnect} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer">
                Disconnect
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
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
  )
}

function WalletIcon({ className }: { className?: ClassValue }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 640 640"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <path
        d="M128 96C92.7 96 64 124.7 64 160L64 448C64 483.3 92.7 512 128 512L512 512C547.3 512 576 483.3 576 448L576 256C576 220.7 547.3 192 512 192L136 192C122.7 192 112 181.3 112 168C112 154.7 122.7 144 136 144L520 144C533.3 144 544 133.3 544 120C544 106.7 533.3 96 520 96L128 96zM480 320C497.7 320 512 334.3 512 352C512 369.7 497.7 384 480 384C462.3 384 448 369.7 448 352C448 334.3 462.3 320 480 320z"
        fill="currentColor"
      />
    </svg>
  )
}

function CopyIcon({ className }: { className?: ClassValue }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: ClassValue }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

// Memoize the connect wallet button to prevent unnecessary re-renders
export const ClassicConnectWalletButton = memo(ClassicConnectWalletButtonComponent);
