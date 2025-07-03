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

  useEffect(() => {
    if (context && context.client) {
      const fid = context.client.fid;
      const username = context.client.username || context.client.displayName || context.client.name;
      if (fid && username && !user && !userLoading) {
        setUserLoading(true);
        setUserError(null);
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid, username })
        })
          .then(async (res) => {
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Unknown error');
            }
            return res.json();
          })
          .then((data) => {
            setUser(data);
            console.debug('User created/fetched:', data);
          })
          .catch((err) => {
            setUserError(err.message);
            console.error('User onboarding error:', err);
          })
          .finally(() => setUserLoading(false));
      }
    }
  }, [context, user, userLoading]);

  return (
    <UserContext.Provider value={{ user, userLoading, userError }}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
