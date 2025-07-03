'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';

const UserContext = createContext({
  user: null,
  userLoading: false,
  userError: null
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

  useEffect(() => {
    console.debug('[UserProvider] Farcaster context:', effectiveContext);
    if (effectiveContext) {
      console.debug('[UserProvider] effectiveContext.user:', effectiveContext.user);
      console.debug('[UserProvider] effectiveContext.client:', effectiveContext.client);
    }
    const fid =
      (effectiveContext.user && effectiveContext.user.fid) ||
      (effectiveContext.client &&
        (effectiveContext.client.fid || effectiveContext.client.clientFid));
    const username =
      (effectiveContext.user &&
        (effectiveContext.user.username ||
          effectiveContext.user.displayName ||
          effectiveContext.user.name)) ||
      (effectiveContext.client &&
        (effectiveContext.client.username ||
          effectiveContext.client.displayName ||
          effectiveContext.client.name));
    console.debug('[UserProvider] Extracted fid:', fid, 'username:', username);
    if (fid && username && !user && !userLoading) {
      setUserLoading(true);
      setUserError(null);
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, username })
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
    <UserContext.Provider value={{ user, userLoading, userError }}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
