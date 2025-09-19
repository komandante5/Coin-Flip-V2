'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';

export default function RewardsPage() {
  return (
    <PageLayout>
      <main className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-6 lg:py-fluid-10 flex-1 flex flex-col" style={{ maxWidth: 'min(98vw, var(--container-xl))' }}>
        <div className="text-center">
          <h1 className="text-fluid-3xl md:text-fluid-4xl lg:text-6xl font-extrabold tracking-tight">Rewards</h1>
          <p className="mt-fluid-2 text-neutral-400 text-fluid-base">Unlock daily rewards for active players</p>
        </div>

        <div className="mt-fluid-8 relative rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden" style={{ padding: 'clamp(1.5rem, 4vw + 0.5rem, 3rem)' }}>
          {/* Ambient gradient effects */}
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-[100px] bg-emerald-400/10" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full blur-[100px] bg-teal-400/10" />
          
          {/* Blurred preview content */}
          <div className="pointer-events-none select-none blur-sm flex flex-col items-center justify-center" style={{ minHeight: 'clamp(280px, 25vw + 160px, 400px)' }}>
            <div className="mx-auto rounded-2xl bg-white/[0.04] border border-white/10 grid place-items-center" style={{ width: 'clamp(64px, 6vw + 40px, 96px)', height: 'clamp(64px, 6vw + 40px, 96px)' }}>
              <span className="text-fluid-2xl lg:text-fluid-3xl">🎁</span>
            </div>
            <h2 className="mt-fluid-6 text-fluid-2xl lg:text-fluid-3xl font-semibold text-center">Daily Chest</h2>
            <p className="mt-fluid-2 text-neutral-400 text-center text-fluid-base">Open once per 24 hours after your last game</p>
            <div className="mt-fluid-4 mx-auto w-max text-fluid-xs text-neutral-400 border border-white/10 bg-white/[0.02] rounded-full px-fluid-3 py-fluid-2">
              Must have placed at least one wager in the past 24 hours
            </div>
            <button
              disabled
              className="mt-fluid-8 mx-auto w-full max-w-md rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-semibold text-fluid-lg opacity-70 cursor-not-allowed"
              style={{ padding: 'clamp(0.75rem, 1.5vw + 0.5rem, 1rem) clamp(1.5rem, 3vw + 1rem, 2rem)' }}
            >
              Coming soon
            </button>
          </div>

          {/* Overlay message */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md text-center shadow-2xl" style={{ padding: 'clamp(1rem, 3vw + 0.5rem, 1.5rem) clamp(1.5rem, 4vw + 0.75rem, 2rem)' }}>
              <div className="flex items-center justify-center gap-fluid-2">
                <Lock className="text-emerald-300" style={{ width: 'clamp(18px, 2vw + 12px, 24px)', height: 'clamp(18px, 2vw + 12px, 24px)' }} />
                <span className="text-fluid-xl lg:text-fluid-2xl font-semibold">Coming soon</span>
              </div>
              <div className="mt-fluid-1 text-fluid-sm text-neutral-300">Rewards unlock after launch</div>
            </div>
          </div>
        </div>

        <div className="mt-fluid-6 text-fluid-sm text-neutral-500 text-center">
          Want to try the game?{' '}
          <Link href="/" className="text-emerald-300 hover:underline transition-all duration-200 hover:text-emerald-200">Go flip a coin</Link>
        </div>
      </main>
    </PageLayout>
  );
}


