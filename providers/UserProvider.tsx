'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';

const UserContext = createContext({
  user: null,
  userLoading: false,
  userError: null,
  refreshUser: () => {}
});

export function UserProvider({ children }) {
  const { context } = useMiniKit();
  const { address: walletAddress, isConnected } = useAccount();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

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
    } catch (error) {
      console.error('[UserProvider] Error refreshing user:', error);
      setUserError(error.message);
    } finally {
      setUserLoading(false);
    }
  };

  // Helper function to create or fetch user
  const createOrFetchUser = async (payload) => {
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
    } catch (err) {
            setUserError(err.message);
      console.error('[UserProvider] User onboarding error:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Effect for Farcaster context (priority)
  useEffect(() => {
    console.debug('[UserProvider] Farcaster context:', context);
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

    const fid = (userObj && userObj.fid) || (clientObj && (clientObj.fid || clientObj.clientFid));
    const username =
      (userObj && (userObj.displayName || userObj.name || userObj.username)) ||
      (clientObj && (clientObj.displayName || clientObj.name || clientObj.username));
    const pfpUrl = (userObj && userObj.pfpUrl) || (clientObj && clientObj.pfpUrl) || '';

    console.debug('[UserProvider] Extracted fid:', fid, 'username:', username);

    if (fid && username && !user && !userLoading) {
      // Farcaster user found - create/fetch with wallet address if available
      const payload = { fid, username, pfpUrl };
      if (walletAddress) {
        payload.walletAddress = walletAddress;
        console.log('[UserProvider] Adding wallet address to Farcaster user:', walletAddress);
      }
      createOrFetchUser(payload);
    }
  }, [context, user, userLoading, walletAddress]);

  // Effect for wallet-only users (fallback when no Farcaster context)
  useEffect(() => {
    // Only proceed if:
    // 1. Wallet is connected
    // 2. No user is currently loaded/loading
    // 3. No Farcaster context available (so this is a wallet-only user)
    if (!isConnected || !walletAddress || user || userLoading) {
      return;
    }

    // Check if we have Farcaster context - if yes, skip wallet-only flow
    const hasFarcasterContext =
      context &&
      ((context.user && context.user.fid) ||
        (context.client && (context.client.fid || context.client.clientFid)));

    if (hasFarcasterContext) {
      console.log('[UserProvider] Farcaster context available, skipping wallet-only flow');
      return;
    }

    console.log(
      '[UserProvider] No Farcaster context, creating wallet-only user for address:',
      walletAddress
    );
    createOrFetchUser({ walletAddress });
  }, [isConnected, walletAddress, user, userLoading, context]);

  return (
    <UserContext.Provider value={{ user, userLoading, userError, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
