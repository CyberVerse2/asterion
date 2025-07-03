'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, WagmiProvider, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

// Create Wagmi config specifically for Coinbase Smart Wallet
const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Asterion',
      appLogoUrl: '/placeholder.png',
      preference: 'smartWalletOnly' // Only show Coinbase Smart Wallet
    })
  ],
  transports: {
    [base.id]: http()
  }
});

export function WagmiContextProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
