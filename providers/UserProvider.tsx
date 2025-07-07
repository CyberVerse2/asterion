'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { User } from '@/lib/types';

interface UserContextType {
  user: User | null;
  userLoading: boolean;
  userError: string | null;
  refreshUser: () => Promise<void>;
}

interface UserProviderProps {
  children: ReactNode;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userLoading: false,
  userError: null,
  refreshUser: async () => {}
});

export function UserProvider({ children }: UserProviderProps) {
  const { context } = useMiniKit();
  const { address: walletAddress, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [farcasterContextChecked, setFarcasterContextChecked] = useState(false);
  const [contextLoadingTimeout, setContextLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Function to refresh user data (fetch fresh data from API)
  const refreshUser = async () => {
    if (!user || !user.id) return;

    setUserLoading(true);
    setUserError(null);

    try {
      const response = await fetch(`/api/users?userId=${user.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh user data');
      }
      const refreshedUser = await response.json();
      setUser(refreshedUser);
    } catch (error: any) {
      console.error('[UserProvider] Error refreshing user:', error);
      setUserError(error.message);
    } finally {
      setUserLoading(false);
    }
  };

  // Helper function to create or fetch user
  const createOrFetchUser = async (payload: any) => {
    setUserLoading(true);
    setUserError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Unknown error');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err: any) {
      setUserError(err.message);
      console.error('[UserProvider] User onboarding error:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Effect for Farcaster context detection and timeout management
  useEffect(() => {

    // Clear any existing timeout
    if (contextLoadingTimeout) {
      clearTimeout(contextLoadingTimeout);
      setContextLoadingTimeout(null);
    }

    if (context) {
      // Context is available - mark as checked immediately
      if (!farcasterContextChecked) {
        setFarcasterContextChecked(true);
      }

      const userObj = context.user;
      const clientObj = context.client;

      // Cast to any to access Farcaster-specific properties not in OnchainKit types
      const fid =
        (userObj && (userObj as any).fid) ||
        (clientObj && ((clientObj as any).fid || (clientObj as any).clientFid));

      // Prioritize actual Farcaster username over display name
      const username =
        (userObj && (userObj as any).username) || // First try actual username
        (clientObj && (clientObj as any).username) ||
        (userObj && (userObj as any).displayName) || // Then display name
        (clientObj && (clientObj as any).displayName) ||
        (userObj && (userObj as any).name) || // Finally name
        (clientObj && (clientObj as any).name);

      const pfpUrl =
        (userObj && (userObj as any).pfpUrl) || (clientObj && (clientObj as any).pfpUrl) || '';


      // CRITICAL: If we have an fid, this is ALWAYS a Farcaster user, regardless of username extraction
      if (fid && !user && !userLoading) {
        if (!username) {
          console.error(
            '[UserProvider] WARNING: Farcaster user has fid but no extractable username!'
          );
          console.error(
            '[UserProvider] This should not happen - all Farcaster users should have usernames'
          );
          console.error('[UserProvider] Available context properties:', {
            userObj: userObj ? Object.keys(userObj) : 'none',
            clientObj: clientObj ? Object.keys(clientObj) : 'none'
          });
          // Don't proceed without username for Farcaster users
          setUserError('Farcaster user found but username could not be extracted');
          return;
        }

        // Farcaster user found - create/fetch (wallet address will be added later if needed)
        const payload = { fid, username, pfpUrl };
        createOrFetchUser(payload);
      }
    } else {
      // Context is null - set a timeout to wait for it to potentially load
      if (!farcasterContextChecked) {
        const timeout = setTimeout(() => {
          setFarcasterContextChecked(true);
        }, 2000); // Wait 2 seconds for Farcaster context to load

        setContextLoadingTimeout(timeout);
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (contextLoadingTimeout) {
        clearTimeout(contextLoadingTimeout);
      }
    };
  }, [context, user, userLoading, farcasterContextChecked]);

  // Separate effect to update existing Farcaster user with wallet address when it becomes available
  useEffect(() => {
    // Only update if:
    // 1. We have a user (already created/fetched)
    // 2. User has fid (is a Farcaster user)
    // 3. User doesn't have wallet address yet
    // 4. We now have a wallet address
    if (user && user.fid && !user.walletAddress && walletAddress) {

      // Update user with wallet address via PATCH API
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, walletAddress })
      })
        .then((response) => response.json())
        .then((updatedUser) => {
          setUser(updatedUser);
        })
        .catch((error) => {
          console.error('[UserProvider] Error updating user with wallet:', error);
        });
    }
  }, [user, walletAddress]);

  // Effect for wallet-only users (fallback when no Farcaster context after timeout)
  useEffect(() => {
    // Only proceed if:
    // 1. Wallet is connected
    // 2. No user is currently loaded/loading
    // 3. Farcaster context has been checked (either found or timeout reached)
    if (!isConnected || !walletAddress || user || userLoading || !farcasterContextChecked) {
      return;
    }

    // CRITICAL: Double-check if we have Farcaster context - if yes, skip wallet-only flow
    // This prevents Farcaster users from being created as wallet-only users
    const hasFarcasterContext =
      context &&
      ((context.user && (context.user as any).fid) ||
        (context.client && ((context.client as any).fid || (context.client as any).clientFid)));

    if (hasFarcasterContext) {
      return;
    }

    // Double-check: if context exists but no fid, still skip wallet-only flow
    // This handles edge cases where context exists but fid extraction failed
    if (context) {
      return;
    }


    createOrFetchUser({ walletAddress });
  }, [isConnected, walletAddress, user, userLoading, farcasterContextChecked, context]);

  return (
    <UserContext.Provider value={{ user, userLoading, userError, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
