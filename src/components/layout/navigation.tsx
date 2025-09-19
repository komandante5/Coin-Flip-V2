'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ConnectWalletButton } from '@/components/connect-wallet-button';
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const navigationItems = [
  { label: "Coinflip", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Rewards", href: "/rewards" },
  { label: "On‑chain", href: "/onchain" },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  
  const headerRef = useRef<HTMLElement | null>(null);

  // Auto-hide navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
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
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const getActiveNavItem = () => {
    if (pathname === '/') return 'Coinflip';
    if (pathname === '/leaderboard') return 'Leaderboard';
    if (pathname === '/rewards') return 'Rewards';
    if (pathname === '/onchain') return 'On‑chain';
    return '';
  };

  const activeNavItem = getActiveNavItem();

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
            />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md hover:bg-white/[0.04] transition-all duration-200"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="scale-90 origin-right">
            <ConnectWalletButton />
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
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            <ConnectWalletButton />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#0c0f10]/95 border-b border-white/10 backdrop-blur-md">
          <nav className="px-fluid-4 py-fluid-3 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                className={`flex items-center px-fluid-3 py-fluid-3 rounded-lg hover:bg-white/[0.04] transition-all duration-200 text-fluid-base ${
                  item.label === activeNavItem ? "text-white bg-white/[0.06]" : "text-neutral-300"
                }`}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
