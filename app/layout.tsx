import type { Metadata } from 'next';
import './globals.css';
import { NextAbstractWalletProvider } from "../src/components/agw-provider";
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
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/favicon-min.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon-min.png" />
      </head>
      <NextAbstractWalletProvider>
        <body suppressHydrationWarning>
          {children}
          <Toaster />
        </body>
      </NextAbstractWalletProvider>
    </html>
  );
}
