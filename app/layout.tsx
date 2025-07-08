import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@coinbase/onchainkit/styles.css';
import Link from 'next/link';
import { MiniKitContextProvider } from '@/providers/MiniKitProvider';
import { WagmiContextProvider } from '@/providers/WagmiProvider';
import { OnchainKitContextProvider } from '@/providers/OnchainKitProvider';
import { UserProvider } from '@/providers/UserProvider';
import SWRProvider from '@/providers/SWRProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import HeaderWallet from '@/components/header-wallet';
import BottomNav from '@/components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL;
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
    description: 'Asterion is a platform for reading and writing novels',
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
          action: {
            type: 'launch_frame',
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR
          }
        }
      })
    }
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} dark-theme`}>
        <TooltipProvider>
          <WagmiContextProvider>
            <OnchainKitContextProvider>
              <MiniKitContextProvider>
                <UserProvider>
                  <SWRProvider>
                    <main className="ornate-pattern">{children}</main>
                    <BottomNav />
                  </SWRProvider>
                </UserProvider>
              </MiniKitContextProvider>
            </OnchainKitContextProvider>
          </WagmiContextProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
