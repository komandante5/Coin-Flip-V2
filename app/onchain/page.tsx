'use client';

import Link from 'next/link';
import { useMemo, memo } from 'react';
import { ExternalLink, ShieldCheck, ScrollText } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { getDeployments } from '@/config/deployments';
import { getSelectedNetwork } from '@/config/networks';

const deployments = getDeployments();
const network = getSelectedNetwork();
const coinFlipAddress = deployments.coinFlip;

function OnchainPageComponent() {
  const contractUrl = `https://sepolia.abscan.org/address/${coinFlipAddress}`;
  const vrngUrl = `https://proofofplay.com/resources/onchain-vrf-optimized-for-gaming`; // Proof of Play vRNG

  return (
    <PageLayout>
      <main className="relative z-10 mx-auto w-full px-fluid-4 lg:px-fluid-6 xl:px-fluid-8 py-fluid-6 lg:py-fluid-10 flex-1" style={{ maxWidth: 'min(98vw, var(--container-2xl))' }}>
        <div className="text-center">
          <h1 className="text-fluid-3xl md:text-fluid-4xl lg:text-6xl font-extrabold tracking-tight">Fully On‑chain</h1>
          <p className="mt-fluid-2 text-neutral-400 text-fluid-base">Provably fair. Verifiable. Transparent.</p>
        </div>

        <div className="mt-fluid-8 grid grid-cols-1 md:grid-cols-2 gap-fluid-6">
          {/* Smart Contract Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl" style={{ padding: 'clamp(1.25rem, 3vw + 0.5rem, 2rem)' }}>
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-[100px] bg-emerald-400/10" />
            <div className="flex items-center gap-fluid-3">
              <ScrollText className="text-emerald-300" style={{ width: 'clamp(20px, 2vw + 14px, 28px)', height: 'clamp(20px, 2vw + 14px, 28px)' }} />
              <h2 className="text-fluid-xl lg:text-fluid-2xl font-semibold">CoinFlip Smart Contract</h2>
            </div>
            <p className="mt-fluid-2 text-neutral-400 text-fluid-sm">
              All gameplay is executed by our deployed smart contract. Review the source,
              read events, and verify transactions on the explorer.
            </p>
            <div className="mt-fluid-4 text-fluid-sm font-mono text-neutral-300 break-all bg-white/[0.02] rounded-lg p-fluid-2 border border-white/5">{coinFlipAddress}</div>
            <Link href={contractUrl} target="_blank" className="mt-fluid-5 inline-flex items-center gap-fluid-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-all duration-200 border border-white/10 px-fluid-4 py-fluid-3 text-fluid-sm group">
              View on explorer
              <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:translate-y-[-0.5px] transition-transform duration-200" />
            </Link>
          </div>

          {/* VRNG / VRF Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl" style={{ padding: 'clamp(1.25rem, 3vw + 0.5rem, 2rem)' }}>
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full blur-[100px] bg-teal-400/10" />
            <div className="flex items-center gap-fluid-3">
              <ShieldCheck className="text-emerald-300" style={{ width: 'clamp(20px, 2vw + 14px, 28px)', height: 'clamp(20px, 2vw + 14px, 28px)' }} />
              <h2 className="text-fluid-xl lg:text-fluid-2xl font-semibold">Provably Fair Randomness</h2>
            </div>
            <p className="mt-fluid-2 text-neutral-400 text-fluid-sm">
              Results are generated via Proof of Play's custom vRNG solution, optimized for gaming.
              Every outcome is reproducible on‑chain and can be audited by anyone.
            </p>
            <Link href={vrngUrl} target="_blank" className="mt-fluid-5 inline-flex items-center gap-fluid-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-all duration-200 border border-white/10 px-fluid-4 py-fluid-3 text-fluid-sm group">
              Learn about Proof of Play vRNG
              <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:translate-y-[-0.5px] transition-transform duration-200" />
            </Link>
          </div>
        </div>

        {/* Visual Banner */}
        <div className="mt-fluid-8 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-teal-400/10 to-cyan-400/10 backdrop-blur-sm" style={{ padding: 'clamp(1.5rem, 4vw + 0.5rem, 2.5rem)' }}>
          {/* Ambient effects */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full blur-[60px] bg-emerald-400/20" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full blur-[60px] bg-teal-400/20" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-fluid-6 text-center relative z-10">
            <div className="group">
              <div className="text-fluid-xl lg:text-fluid-2xl font-bold text-emerald-300 transition-all duration-300 group-hover:scale-110">100%</div>
              <div className="text-fluid-sm text-neutral-300 mt-fluid-1">On‑chain execution</div>
            </div>
            <div className="group">
              <div className="text-fluid-xl lg:text-fluid-2xl font-bold text-emerald-300 transition-all duration-300 group-hover:scale-110">Provably fair</div>
              <div className="text-fluid-sm text-neutral-300 mt-fluid-1">Verifiable randomness</div>
            </div>
            <div className="group">
              <div className="text-fluid-xl lg:text-fluid-2xl font-bold text-emerald-300 transition-all duration-300 group-hover:scale-110">Open logs</div>
              <div className="text-fluid-sm text-neutral-300 mt-fluid-1">Track every bet</div>
            </div>
          </div>
        </div>

        {/* Additional info section */}
        <div className="mt-fluid-8 text-center">
          <p className="text-fluid-sm text-neutral-400">
            Curious about how it all works?{' '}
            <Link href="/" className="text-emerald-300 hover:underline transition-all duration-200 hover:text-emerald-200">Try the game</Link>
            {' '}and see blockchain transparency in action.
          </p>
        </div>
      </main>
    </PageLayout>
  );
}

// Memoize onchain page for better performance
export default memo(OnchainPageComponent);

