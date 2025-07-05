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

  // Function to refresh user data (fetch fresh data from API)
  const refreshUser = async () => {
    if (!user || !user.id) return;

    console.log('[UserProvider] Refreshing user data for user ID:', user.id);
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
      console.log('[UserProvider] User data refreshed:', refreshedUser);
    } catch (error: any) {
      console.error('[UserProvider] Error refreshing user:', error);
      setUserError(error.message);
    } finally {
      setUserLoading(false);
    }
  };

  // Helper function to create or fetch user
  const createOrFetchUser = async (payload: any) => {
    console.log('[UserProvider] Creating/fetching user with payload:', payload);
    setUserLoading(true);
    setUserError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.debug('[UserProvider] /api/users POST response:', response);
      if (!response.ok) {
        const err = await response.json();
        console.error('[UserProvider] /api/users error response:', err);
        throw new Error(err.error || 'Unknown error');
      }

      const userData = await response.json();
      setUser(userData);
      console.debug('[UserProvider] User created/fetched:', userData);
    } catch (err: any) {
      setUserError(err.message);
      console.error('[UserProvider] User onboarding error:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Effect for Farcaster context (priority)
  useEffect(() => {
    console.debug('[UserProvider] Farcaster context:', context);

    // Always mark that we've checked Farcaster context (even if null)
    if (!farcasterContextChecked) {
      setFarcasterContextChecked(true);
    }

    if (!context) {
      console.warn(
        '[UserProvider] context is null or undefined. Skipping Farcaster user extraction.'
      );
      return;
    }

    const userObj = context.user;
    const clientObj = context.client;
    console.debug('[UserProvider] context.user:', userObj);
    console.debug('[UserProvider] context.client:', clientObj);

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

    console.debug('[UserProvider] Extracted fid:', fid, 'username:', username);
    console.debug(
      '[UserProvider] Available userObj properties:',
      userObj ? Object.keys(userObj) : 'none'
    );
    console.debug(
      '[UserProvider] Available clientObj properties:',
      clientObj ? Object.keys(clientObj) : 'none'
    );

    if (fid && username && !user && !userLoading) {
      // Farcaster user found - create/fetch (wallet address will be added later if needed)
      const payload = { fid, username, pfpUrl };
      console.log('[UserProvider] Creating/fetching Farcaster user:', payload);
      createOrFetchUser(payload);
    }
  }, [context, user, userLoading, farcasterContextChecked]);

  // Separate effect to update existing Farcaster user with wallet address when it becomes available
  useEffect(() => {
    // Only update if:
    // 1. We have a user (already created/fetched)
    // 2. User has fid (is a Farcaster user)
    // 3. User doesn't have wallet address yet
    // 4. We now have a wallet address
    if (user && user.fid && !user.walletAddress && walletAddress) {
      console.log('[UserProvider] Updating existing Farcaster user with wallet address');

      // Update user with wallet address via PATCH API
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, walletAddress })
      })
        .then((response) => response.json())
        .then((updatedUser) => {
          setUser(updatedUser);
          console.log('[UserProvider] User updated with wallet address:', updatedUser);
        })
        .catch((error) => {
          console.error('[UserProvider] Error updating user with wallet:', error);
        });
    }
  }, [user, walletAddress]);

  // Effect for wallet-only users (fallback when no Farcaster context)
  useEffect(() => {
    // Only proceed if:
    // 1. Wallet is connected
    // 2. No user is currently loaded/loading
    // 3. Farcaster context has been checked (to avoid race conditions)
    // 4. No Farcaster context available (so this is a wallet-only user)
    if (!isConnected || !walletAddress || user || userLoading || !farcasterContextChecked) {
      return;
    }

    // Check if we have Farcaster context - if yes, skip wallet-only flow
    const hasFarcasterContext =
      context &&
      ((context.user && (context.user as any).fid) ||
        (context.client && ((context.client as any).fid || (context.client as any).clientFid)));

    if (hasFarcasterContext) {
      console.log('[UserProvider] Farcaster context available, skipping wallet-only flow');
      return;
    }

    console.log(
      '[UserProvider] No Farcaster context, creating wallet-only user for address:',
      walletAddress
    );
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
