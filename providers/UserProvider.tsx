'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

const UserContext = createContext({
  user: null,
  userLoading: false,
  userError: null,
  refreshUser: () => {}
});

export function UserProvider({ children }) {
  const { context } = useMiniKit();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  // Dev-mode context mock for local testing
  const devContext = {
    client: {
      fid: 123456,
      username: 'devuser',
      displayName: 'Dev User',
      name: 'Dev User'
    }
  };
  const effectiveContext =
    process.env.NODE_ENV === 'development' && (!context || !context.client) ? devContext : context;

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

  useEffect(() => {
    console.debug('[UserProvider] Farcaster context:', effectiveContext);
    if (!effectiveContext) {
      console.warn(
        '[UserProvider] effectiveContext is null or undefined. Skipping user extraction.'
      );
      return;
    }
    const userObj = effectiveContext.user;
    const clientObj = effectiveContext.client;
    console.debug('[UserProvider] effectiveContext.user:', userObj);
    console.debug('[UserProvider] effectiveContext.client:', clientObj);
    const fid = (userObj && userObj.fid) || (clientObj && (clientObj.fid || clientObj.clientFid));
    const username =
      (userObj && (userObj.username || userObj.displayName || userObj.name)) ||
      (clientObj && (clientObj.username || clientObj.displayName || clientObj.name));
    const pfpUrl = (userObj && userObj.pfpUrl) || (clientObj && clientObj.pfpUrl) || '';
    console.debug('[UserProvider] Extracted fid:', fid, 'username:', username);
    if (fid && username && !user && !userLoading) {
      setUserLoading(true);
      setUserError(null);
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, username, pfpUrl })
      })
        .then(async (res) => {
          console.debug('[UserProvider] /api/users POST response:', res);
          if (!res.ok) {
            const err = await res.json();
            console.error('[UserProvider] /api/users error response:', err);
            throw new Error(err.error || 'Unknown error');
          }
          return res.json();
        })
        .then((data) => {
          setUser(data);
          console.debug('[UserProvider] User created/fetched:', data);
        })
        .catch((err) => {
          setUserError(err.message);
          console.error('[UserProvider] User onboarding error:', err);
        })
        .finally(() => setUserLoading(false));
    }
  }, [effectiveContext, user, userLoading]);

  return (
    <UserContext.Provider value={{ user, userLoading, userError, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
