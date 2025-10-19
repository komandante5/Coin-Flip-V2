import type { Metadata } from 'next';
import './globals.css';
import { RainbowKitWrapper } from "../src/components/rainbowkit-wrapper";
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
      <RainbowKitWrapper>
        <body suppressHydrationWarning>
          {children}
          <Toaster />
        </body>
      </RainbowKitWrapper>
    </html>
  );
}
