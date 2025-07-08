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
                    <main className="ornate-pattern">{children}</main>
                    {/* Bottom Navigation Bar */}
                    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-white/10 rounded-t-2xl shadow-lg backdrop-blur-md">
                      <div className="container mx-auto px-4 h-16 flex items-center justify-around">
                        <Link
                          href="/"
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
                            />
                          </svg>
                          <span className="text-xs">Home</span>
                        </Link>
                        <Link
                          href="/ranking"
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 17v-2a4 4 0 014-4h10a4 4 0 014 4v2"
                            />
                          </svg>
                          <span className="text-xs">Ranking</span>
                        </Link>
                        <Link
                          href="/library"
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                            />
                          </svg>
                          <span className="text-xs">Library</span>
                        </Link>
                        <Link
                          href="/history"
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-xs">History</span>
                        </Link>
                        <Link
                          href="/profile"
                          className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z"
                            />
                          </svg>
                          <span className="text-xs">Profile</span>
                        </Link>
                      </div>
                    </nav>
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
