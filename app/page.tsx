'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Suspense } from 'react';
import { mockNovels } from '@/lib/mock-data';
import LoadingSkeleton from '@/components/loading-skeleton';
import NovelGrid from '@/components/novel-grid';

function getPopularNovels() {
  return mockNovels.sort((a, b) => b.totalTips - a.totalTips);
}

export default function HomePage() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Extract Farcaster user info from context and call /api/users
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

  const novels = getPopularNovels();

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-8">
        <Suspense fallback={<LoadingSkeleton />}>
          <NovelGrid novels={novels} />
        </Suspense>
      </section>
    </div>
  );
}
