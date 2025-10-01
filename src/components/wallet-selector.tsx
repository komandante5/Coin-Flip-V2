"use client"

import { useState } from "react"
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
import { ChevronDown } from "lucide-react"

interface WalletSelectorProps {
  className?: ClassValue
  onWalletTypeChange: (type: 'abstract' | 'classic') => void
  currentWalletType: 'abstract' | 'classic'
}

/**
 * Wallet Selector Component for Local Testing
 * 
 * LOCAL TESTING ONLY: This component allows switching between Abstract Global Wallet
 * and classic wallet connections for local development purposes.
 * 
 * TODO: DELETE THIS COMPONENT WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
 */
export function WalletSelector({ 
  className, 
  onWalletTypeChange, 
  currentWalletType 
}: WalletSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleWalletTypeSelect = (type: 'abstract' | 'classic') => {
    onWalletTypeChange(type)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("cursor-pointer min-w-48 justify-between", className)}
        >
          <div className="flex items-center gap-2">
            {currentWalletType === 'abstract' ? (
              <>
                <AbstractLogo className="h-4 w-4" />
                <span>Abstract Global Wallet</span>
              </>
            ) : (
              <>
                <WalletIcon className="h-4 w-4" />
                <span>Classic Wallets</span>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="bottom" className="w-56 !bg-[#0c0f10] border-white/30 shadow-xl">
        <DropdownMenuItem 
          onClick={() => handleWalletTypeSelect('abstract')}
          className={cn(
            "cursor-pointer hover:bg-white/[0.04] focus:bg-white/[0.04]",
            currentWalletType === 'abstract' && "bg-white/[0.06]"
          )}
        >
          <AbstractLogo className="mr-2 h-4 w-4" />
          Abstract Global Wallet
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => handleWalletTypeSelect('classic')}
          className={cn(
            "cursor-pointer hover:bg-white/[0.04] focus:bg-white/[0.04]",
            currentWalletType === 'classic' && "bg-white/[0.06]"
          )}
        >
          <WalletIcon className="mr-2 h-4 w-4" />
          Classic Wallets (MetaMask, etc.)
        </DropdownMenuItem>
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
