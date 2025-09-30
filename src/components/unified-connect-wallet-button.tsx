"use client"

import { ConnectWalletButton } from "./connect-wallet-button"
import { ClassicConnectWalletButton } from "./classic-connect-wallet-button"
import { WalletSelector } from "./wallet-selector"
import { useWalletType } from "./hybrid-wallet-provider"
import { cn } from "@/lib/utils"
import { type ClassValue } from "clsx"

interface UnifiedConnectWalletButtonProps {
  className?: ClassValue
  customDropdownItems?: React.ReactNode[]
  showWalletSelector?: boolean
}

/**
 * Unified Connect Wallet Button for Local Testing
 * 
 * LOCAL TESTING ONLY: This component renders the appropriate wallet connection
 * button based on the selected wallet type (Abstract or Classic).
 * 
 * TODO: DELETE THIS COMPONENT WHEN GOING TO PRODUCTION - ONLY FOR LOCAL TESTING
 */
export function UnifiedConnectWalletButton({ 
  className, 
  customDropdownItems,
  showWalletSelector = true 
}: UnifiedConnectWalletButtonProps) {
  const { walletType, setWalletType } = useWalletType()

  return (
    <div className="flex flex-col gap-2">
      {showWalletSelector && (
        <WalletSelector
          className={cn("self-center", className)}
          currentWalletType={walletType}
          onWalletTypeChange={setWalletType}
        />
      )}
      
      {walletType === 'abstract' ? (
        <ConnectWalletButton 
          className={className}
          customDropdownItems={customDropdownItems}
        />
      ) : (
        <ClassicConnectWalletButton 
          className={className}
          customDropdownItems={customDropdownItems}
        />
      )}
    </div>
  )
}
