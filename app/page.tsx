'use client';

import { useEffect } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Suspense } from 'react';
import LoadingSkeleton from '@/components/loading-skeleton';
import NovelGrid from '@/components/novel-grid';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { novels, isLoading, error } = useNovels();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-red-500">Error: {error.message}</div>
        ) : (
          <Suspense fallback={<LoadingSkeleton />}>
            <NovelGrid novels={novels} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
