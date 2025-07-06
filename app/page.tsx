'use client';

import { useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Suspense } from 'react';
import LoadingSkeleton from '@/components/loading-skeleton';
import NovelGrid from '@/components/novel-grid';
import RecentlyReadSection from '@/components/recently-read-section';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { novels, isLoading, error } = useNovels();
  const { user } = useUser();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-8">
        {/* Recently Read Section - Only show if user is logged in */}
        {user && <RecentlyReadSection userId={user.id} />}

        {/* All Novels Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-6">All Novels</h2>
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-red-500">Error: {error.message}</div>
          ) : (
            <Suspense fallback={<LoadingSkeleton />}>
              <NovelGrid novels={novels} />
            </Suspense>
          )}
        </div>
      </section>
    </div>
  );
}
