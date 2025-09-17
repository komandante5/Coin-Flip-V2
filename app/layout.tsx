import type { Metadata } from 'next';
import './globals.css';
import { NextAbstractWalletProvider } from "../src/components/agw-provider";
import { Toaster } from "../src/components/ui/sonner";

export const metadata: Metadata = {
  title: 'CoinFlip DApp',
  description: 'CoinFlip DApp with VRF - Smart Contract and Frontend',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <NextAbstractWalletProvider>
        <body suppressHydrationWarning>
          {children}
          <Toaster />
        </body>
      </NextAbstractWalletProvider>
    </html>
  );
}
