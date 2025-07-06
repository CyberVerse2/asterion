'use client';

import { useEffect, Suspense, lazy } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import LoadingSkeleton from '@/components/loading-skeleton';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';

// Lazy load components for better performance
const NovelGrid = lazy(() => import('@/components/novel-grid'));
const RecentlyReadSection = lazy(() => import('@/components/recently-read-section'));

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
        {user && (
          <Suspense fallback={<div className="mb-8 h-32 bg-white/5 rounded-lg animate-pulse" />}>
            <RecentlyReadSection userId={user.id} />
          </Suspense>
        )}

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
