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
                    <header className="border-b border-white/10 bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/30 sticky top-0 z-50">
                      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 sm:gap-3">
                          <img
                            src="/placeholder.png"
                            alt="Asterion Logo"
                            className="h-6 w-6 sm:h-8 sm:w-8"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-lg sm:text-xl leading-tight text-white">
                              Asterion
                            </span>
                            <span className="text-xs sm:text-sm text-gray-400 leading-tight hidden sm:block">
                              Discover Amazing Stories
                            </span>
                          </div>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6">
                          <Link
                            href="/"
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            Discover
                          </Link>
                          <Link
                            href="/trending"
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            Trending
                          </Link>
                          <Link
                            href="/authors"
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            Authors
                          </Link>
                        </nav>

                        <div className="flex items-center gap-4">
                          <HeaderWallet />
                        </div>
                      </div>
                    </header>

                    {/* Token Launch Banner */}
                    <a
                      href="https://dexscreener.com/base/0xCc309867cEa3c1cF7C7829838f72FF70d17cEb07"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-purple-500/30 hover:from-purple-600/30 hover:to-blue-600/30 transition-all duration-200 cursor-pointer"
                    >
                      <div className="container mx-auto px-4 py-2">
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <span className="text-purple-300 font-medium">🚀</span>
                          <span className="text-white font-medium">$ASTERION Token Launched!</span>
                          <span className="text-purple-300 font-medium">🚀</span>
                        </div>
                      </div>
                    </a>

                    <main className="ornate-pattern">{children}</main>
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
