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
import { useState, useCallback, memo } from "react"

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
  // Wagmi hooks for wallet state and balance
  const { isConnected, status, address } = useAccount()
  const { data: balance, isLoading: isBalanceLoading } = useBalance({ 
    address,
    // Only fetch balance when connected and address is available
    query: {
      enabled: Boolean(isConnected && address),
    }
  })
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  // Local state for copy feedback
  const [copied, setCopied] = useState(false)

  /**
   * Copy wallet address to clipboard with visual feedback
   */
  const copyAddress = useCallback(async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [address])

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
        <DropdownMenuContent align="center" side="bottom" className="w-56">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="cursor-pointer"
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
    ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
    : '0.0000 ETH'

  // Connected state: Show balance with dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn("cursor-pointer group min-w-40 px-3", className)}
        >
          <WalletIcon className="mr-1 h-4 w-4" />
          {formattedBalance}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="bottom" className="w-56">
        {/* Address display with copy functionality */}
        <DropdownMenuItem className="focus:bg-transparent cursor-auto">
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
            <DropdownMenuItem onClick={() => disconnect()} className="text-destructive">
              Disconnect
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
