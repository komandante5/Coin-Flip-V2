'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExternalLink, ShieldCheck, ScrollText } from 'lucide-react';
import { ConnectWalletButton } from '@/components/connect-wallet-button';
import addresses from '../../src/deployments.localhost.json';
import { chain } from '../../src/config/chain';

const coinFlipAddress = (addresses as any).coinFlip as `0x${string}`;

export default function OnchainPage() {
  const explorerBase = useMemo(() => {
    // Abstract explorers follow Etherscan-like paths on testnet
    // For local dev we link to placeholder docs.
      // TODO: Replace with production explorer link once live contract is deployed
    const host = (chain as any)?.blockExplorers?.default?.url ?? 'https://explorer.abs.xyz';
    return host.replace(/\/$/, '');
  }, []);

  // TODO: Replace with production explorer link once live contract is deployed
  const contractUrl = `${explorerBase}/address/${coinFlipAddress}`;
  const vrngUrl = `https://docs.abstract.money/build/vrng`; // Abstract vRNG/VRF docs

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
                  item.label === 'On‑chain' ? 'text-white' : ''
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

      <main className="relative z-10 mx-auto max-w-[1100px] px-4 py-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Fully On‑chain</h1>
          <p className="mt-2 text-neutral-400">Provably fair. Verifiable. Transparent.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Smart Contract Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 overflow-hidden">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-[100px] bg-emerald-400/10" />
            <div className="flex items-center gap-3">
              <ScrollText className="text-emerald-300" />
              <h2 className="text-xl font-semibold">CoinFlip Smart Contract</h2>
            </div>
            <p className="mt-2 text-neutral-400 text-sm">
              All gameplay is executed by our deployed smart contract. Review the source,
              read events, and verify transactions on the explorer.
            </p>
            <div className="mt-4 text-sm font-mono text-neutral-300">{coinFlipAddress}</div>
            <Link href={contractUrl} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition border border-white/10 px-4 py-2">
              View on explorer
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          {/* VRNG / VRF Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-6 overflow-hidden">
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full blur-[100px] bg-teal-400/10" />
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-300" />
              <h2 className="text-xl font-semibold">Provably Fair Randomness</h2>
            </div>
            <p className="mt-2 text-neutral-400 text-sm">
              Results are generated via verifiable randomness on Abstract (vRNG/VRF).
              Every outcome is reproducible on‑chain and can be audited by anyone.
            </p>
            <Link href={vrngUrl} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition border border-white/10 px-4 py-2">
              Learn how vRNG works
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Visual Banner */}
        <div className="mt-8 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-teal-400/10 to-cyan-400/10 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-300">100%</div>
              <div className="text-sm text-neutral-300">On‑chain execution</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-300">Provably fair</div>
              <div className="text-sm text-neutral-300">Verifiable randomness</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-300">Open logs</div>
              <div className="text-sm text-neutral-300">Track every bet</div>
            </div>
          </div>
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


