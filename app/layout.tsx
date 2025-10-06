import type { Metadata } from 'next';
import './globals.css';
// LOCAL TESTING ONLY: Using hybrid wallet provider for local development
// TODO: SWITCH BACK TO NextAbstractWalletProvider WHEN GOING TO PRODUCTION
import { HybridWalletProvider } from "../src/components/hybrid-wallet-provider";
import { Toaster } from "../src/components/ui/sonner";

export const metadata: Metadata = {
  title: 'Dizzio - Abstract Coin Flip Game',
  description: 'Provably fair coin flip game on Abstract Network with VRF - Fully on-chain gambling',
  icons: {
    icon: [
      {
        url: '/favicon-min.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon-min.png',
    apple: '/favicon-min.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <HybridWalletProvider>
        <body suppressHydrationWarning>
          {children}
          <Toaster />
        </body>
      </HybridWalletProvider>
    </html>
  );
}
