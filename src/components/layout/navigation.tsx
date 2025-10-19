'use client';

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
// LOCAL TESTING ONLY: Using unified connect wallet button for local development
// TODO: SWITCH BACK TO ConnectWalletButton WHEN GOING TO PRODUCTION
import { UnifiedConnectWalletButton } from '@/components/unified-connect-wallet-button';
import { Menu, X, Coins, Trophy, Gift, Activity, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { getDeployments } from '@/config/deployments';

const baseNavigationItems = [
  { label: "Coinflip", href: "/", icon: Coins },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Rewards", href: "/rewards", icon: Gift },
  { label: "On‑chain", href: "/onchain", icon: Activity },
];

const adminNavigationItem = { label: "Admin", href: "/admin", icon: Shield };

const ownerAddress = getDeployments().owner as string;

function NavigationComponent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const { address: connectedAddress } = useAccount();
  
  // Sound effects
  const { playButtonClick } = useSoundEffects();
  
  const headerRef = useRef<HTMLElement | null>(null);

  const deploymentOwner = useMemo(() => ownerAddress?.toLowerCase?.() ?? '', []);
  const isOwner = connectedAddress && deploymentOwner && connectedAddress.toLowerCase() === deploymentOwner;

  // Navigation items with conditional admin link
  const navigationItems = isOwner 
    ? [...baseNavigationItems, adminNavigationItem]
    : baseNavigationItems;

  // Debounced scroll handler to improve performance
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    
    if (currentScrollY < 10) {
      // Always show nav when at top
      setIsNavVisible(true);
    } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
      // Hide nav when scrolling down (after 100px)
      setIsNavVisible(false);
      setIsMobileMenuOpen(false); // Close mobile menu when hiding
    } else if (currentScrollY < lastScrollY - 10) {
      // Show nav when scrolling up (with 10px threshold)
      setIsNavVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  // Auto-hide navigation on scroll
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 10); // 10ms debounce
    };

    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  const activeNavItem = useCallback(() => {
    if (pathname === '/') return 'Coinflip';
    if (pathname === '/leaderboard') return 'Leaderboard';
    if (pathname === '/rewards') return 'Rewards';
    if (pathname === '/onchain') return 'On‑chain';
    if (pathname === '/admin') return 'Admin';
    return '';
  }, [pathname])();

  return (
    <header ref={headerRef} className={`fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0c0f10]/90 backdrop-blur-md transition-transform duration-300 ${
      isNavVisible ? 'translate-y-0' : '-translate-y-full'
    }`} style={{ height: 'var(--nav-height)' }}>
      <div className="mx-auto h-full flex items-center px-fluid-4 lg:px-fluid-6 xl:px-fluid-8" style={{ maxWidth: 'min(90vw, var(--container-3xl))' }}>
        {/* Mobile Layout */}
        <div className="flex md:hidden items-center justify-between w-full">
          <div className="flex items-center gap-fluid-3">
            <Image
              src="/coin_flip_logo_gif_transparent.gif"
              alt="Dizzio Logo"
              width={24}
              height={24}
              className="object-contain"
              style={{ height: 'clamp(24px, 3vw + 16px, 32px)', width: 'auto' }}
              priority
              sizes="(max-width: 768px) 24px, 32px"
            />
            <button
              onClick={() => {
                playButtonClick();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="p-2 rounded-md hover:bg-white/[0.04] transition-all duration-200"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="scale-90 origin-right">
            <UnifiedConnectWalletButton showWalletSelector={false} />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center gap-fluid-3 w-full">
          <div className="flex items-center gap-fluid-3">
            <Image
              src="/coin_flip_logo_gif_transparent.gif"
              alt="Dizzio Logo"
              width={40}
              height={40}
              className="object-contain"
              style={{ height: 'clamp(32px, 3vw + 20px, 48px)', width: 'auto' }}
              priority
              sizes="(max-width: 768px) 32px, (max-width: 1200px) 40px, 48px"
            />
            <span className="font-semibold tracking-tight text-fluid-xl lg:text-fluid-2xl">Dizzio</span>
          </div>

          <nav className="ml-auto mr-auto flex items-center gap-fluid-2 text-fluid-base text-neutral-300">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                className={`px-fluid-3 lg:px-fluid-4 py-fluid-2 rounded-md hover:bg-white/[0.04] transition-all duration-200 ${
                  item.label === activeNavItem ? "text-white bg-white/[0.06]" : ""
                }`}
                href={item.href}
                prefetch={true}
                onClick={() => playButtonClick()}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            <UnifiedConnectWalletButton showWalletSelector={false} />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#0c0f10]/95 border-b border-white/10 backdrop-blur-md">
          <nav className="px-fluid-4 py-fluid-3 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  className={`flex items-center gap-3 px-fluid-3 py-fluid-3 rounded-lg hover:bg-white/[0.04] transition-all duration-200 text-fluid-base ${
                    item.label === activeNavItem ? "text-white bg-white/[0.06]" : "text-neutral-300"
                  }`}
                  href={item.href}
                  prefetch={true}
                  onClick={() => {
                    playButtonClick();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

// Memoize navigation component to prevent unnecessary re-renders
export const Navigation = memo(NavigationComponent);
