"use client"

import { useLoginWithAbstract } from "@abstract-foundation/agw-react"
import { Button } from "@/components/ui/button"
import { useAccount, useBalance } from "wagmi"
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

interface ConnectWalletButtonProps {
  className?: ClassValue
  customDropdownItems?: React.ReactNode[]
}

/**
 * Connect Wallet Button for Abstract Global Wallet
 * 
 * A comprehensive wallet connection component that handles:
 * - Wallet connection/disconnection via Abstract Global Wallet
 * - Loading states during connection
 * - Balance display with wallet and Abstract logos
 * - Dropdown menu with address copy functionality
 */
function ConnectWalletButtonComponent({ className, customDropdownItems }: ConnectWalletButtonProps) {
  // Wagmi hooks for wallet state and balance
  const { isConnected, status, address } = useAccount()
  const { data: balance, isLoading: isBalanceLoading, refetch: refetchBalance } = useBalance({ address })

  // Abstract Global Wallet authentication
  const { login, logout } = useLoginWithAbstract()
  
  // Sound effects
  const { playWalletConnect, playWalletDisconnect, playButtonClick } = useSoundEffects()
  
  // Wallet animation state
  const { isWinAnimating, winAmount, shouldRefetchBalance } = useWalletAnimation()

  // Local state for connection status and copy feedback
  const isConnecting = status === 'connecting' || status === 'reconnecting'
  const [copied, setCopied] = useState(false)
  
  // Refetch balance when triggered
  useEffect(() => {
    if (shouldRefetchBalance && address) {
      refetchBalance();
    }
  }, [shouldRefetchBalance, address, refetchBalance])

  /**
   * Handle wallet connection with sound
   */
  const handleConnect = useCallback(async () => {
    playWalletConnect()
    await login()
  }, [login, playWalletConnect])
  
  /**
   * Handle wallet disconnection with sound
   */
  const handleDisconnect = useCallback(async () => {
    playWalletDisconnect()
    await logout()
  }, [logout, playWalletDisconnect])
  
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

  // Loading state: Show connecting button with spinning logo
  if (isConnecting) {
    return (
      <Button
        disabled
        className={cn("cursor-pointer group min-w-40", className)}
      >
        Connecting...
        <AbstractLogo className="ml-2 animate-spin" />
      </Button>
    )
  }

  // Disconnected state: Show connect button with hover animation
  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        className={cn("cursor-pointer group min-w-40", className)}
      >
        Connect Wallet
        <AbstractLogo className="ml-2 group-hover:animate-spin transition-transform" />
      </Button>
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
        <AbstractLogo className="ml-1 h-4 w-4 animate-spin" />
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
            <AbstractLogo className={cn("ml-1 h-4 w-4", isWinAnimating && "animate-spin")} />
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

function AbstractLogo({ className }: { className?: ClassValue }) {
  return (
    <svg
      width="20"
      height="18"
      viewBox="0 0 52 47"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <path d="M33.7221 31.0658L43.997 41.3463L39.1759 46.17L28.901 35.8895C28.0201 35.0081 26.8589 34.5273 25.6095 34.5273C24.3602 34.5273 23.199 35.0081 22.3181 35.8895L12.0432 46.17L7.22205 41.3463L17.4969 31.0658H33.7141H33.7221Z" fill="currentColor" />
      <path d="M35.4359 28.101L49.4668 31.8591L51.2287 25.2645L37.1978 21.5065C35.9965 21.186 34.9954 20.4167 34.3708 19.335C33.7461 18.2613 33.586 17.0033 33.9063 15.8013L37.6623 1.76283L31.0713 0L27.3153 14.0385L35.4279 28.093L35.4359 28.101Z" fill="currentColor" />
      <path d="M15.7912 28.101L1.76028 31.8591L-0.00158691 25.2645L14.0293 21.5065C15.2306 21.186 16.2316 20.4167 16.8563 19.335C17.4809 18.2613 17.6411 17.0033 17.3208 15.8013L13.5648 1.76283L20.1558 0L23.9118 14.0385L15.7992 28.093L15.7912 28.101Z" fill="currentColor" />
    </svg>
  )
}

// Memoize the connect wallet button to prevent unnecessary re-renders
export const ConnectWalletButton = memo(ConnectWalletButtonComponent);