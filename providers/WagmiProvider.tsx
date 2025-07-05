'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, WagmiProvider, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

// Create Wagmi config with both Farcaster and Coinbase connectors
const config = createConfig({
  chains: [base],
  connectors: [
    // Farcaster mini-app connector (for Farcaster context)
    farcasterMiniApp({
      // Add explicit configuration for better reliability
      name: 'Farcaster MiniApp',
      chains: [base]
    }),
    // Coinbase wallet connector (for non-Farcaster users)
    coinbaseWallet({
      appName: 'Asterion',
      appLogoUrl: '/placeholder.png',
      preference: 'smartWalletOnly'
    })
  ],
  transports: {
    [base.id]: http()
  },
  // Add better error handling
  ssr: false,
  enablePublicClient: true
});

export function WagmiContextProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
