'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { ConnectWalletButton } from '@/components/connect-wallet-button';

export default function RewardsPage() {
  return (
    <div className="min-h-screen w-full bg-[#0c0f10] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-[120px] opacity-30 bg-emerald-400/30" />
        <div className="absolute top-40 right-10 h-96 w-96 rounded-full blur-[140px] opacity-20 bg-teal-400/20" />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto max-w-[1300px] px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-400/20 ring-1 ring-emerald-400/40" />
            <span className="font-semibold tracking-tight">Coin Flip V2</span>
          </div>

          <nav className="ml-6 hidden md:flex items-center gap-1 text-[13px] text-neutral-300">
            {[
              { label: 'Coinflip', href: '/' },
              { label: 'Account', href: '#' },
              { label: 'Leaderboard', href: '/leaderboard' },
              { label: 'Rewards', href: '/rewards' },
              { label: 'On‑chain', href: '/onchain' },
            ].map((item) => (
              <Link
                key={item.label}
                className={`px-3 py-1.5 rounded-md hover:bg-white/[0.04] transition ${
                  item.label === 'Rewards' ? 'text-white' : ''
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
      </header>

      <main className="relative z-10 mx-auto max-w-[900px] px-4 py-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Rewards</h1>
        </div>

        <div className="mt-10 relative rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12 overflow-hidden">
          {/* Blurred preview content */}
          <div className="pointer-events-none select-none blur-sm flex flex-col items-center justify-center min-h-[340px]">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-white/[0.04] border border-white/10 grid place-items-center">
              <span className="text-3xl">🎁</span>
            </div>
            <h2 className="mt-6 text-3xl font-semibold text-center">Daily Chest</h2>
            <p className="mt-2 text-neutral-400 text-center">Open once per 24 hours after your last game</p>
            <div className="mt-4 mx-auto w-max text-xs text-neutral-400 border border-white/10 bg-white/[0.02] rounded-full px-3 py-1">
              Must have placed at least one wager in the past 24 hours
            </div>
            <button
              disabled
              className="mt-8 mx-auto w-full md:w-96 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-semibold py-4 text-lg opacity-70 cursor-not-allowed"
            >
              Coming soon
            </button>
          </div>

          {/* Overlay message */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 text-center shadow-2xl">
              <div className="flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-emerald-300" />
                <span className="text-xl md:text-2xl font-semibold">Coming soon</span>
              </div>
              <div className="mt-1 text-sm text-neutral-300">Rewards unlock after launch</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-neutral-500 text-center">
          Want to try the game?{' '}
          <Link href="/" className="text-emerald-300 hover:underline">Go flip a coin</Link>
        </div>
      </main>

      <footer className="relative z-10 mx-auto max-w-[1300px] px-4 pb-10 pt-2 text-xs text-neutral-500">
        <div>
          <span className="opacity-70">Coin Flip V2 • Powered by Abstract Network & VRF</span>
        </div>
      </footer>
    </div>
  );
}


