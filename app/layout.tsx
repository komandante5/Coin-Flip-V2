import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { BodyHandler } from './body-handler';
import { NextAbstractWalletProvider } from "../src/components/agw-provider";
import { Toaster } from "../src/components/ui/sonner";

const inter = Inter({ subsets: ['latin'] });

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
        <body className={inter.className} suppressHydrationWarning>
          <BodyHandler />
          {children}
          <Toaster />
        </body>
      </NextAbstractWalletProvider>
    </html>
  );
}
