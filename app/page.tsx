'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Suspense } from 'react';
import { mockNovels } from '@/lib/mock-data';
import LoadingSkeleton from '@/components/loading-skeleton';
import NovelGrid from '@/components/novel-grid';
import { useUser } from '@/providers/UserProvider';

function getPopularNovels() {
  return mockNovels.sort((a, b) => b.totalTips - a.totalTips);
}

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  // const { user, userLoading, userError } = useUser(); // Uncomment if needed in this page

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

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
