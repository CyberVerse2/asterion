'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

export default function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        refreshInterval: 0, // Disable automatic refresh
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        dedupingInterval: 60000, // 1 minute default
        // Global cache configuration
        provider: () => new Map(),
        isOnline() {
          return navigator.onLine;
        },
        isVisible() {
          return document.visibilityState === 'visible';
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
