'use client';

import { useEffect, useState } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { Suspense } from 'react';
import LoadingSkeleton from '@/components/loading-skeleton';
import NovelGrid from '@/components/novel-grid';
import { useUser } from '@/providers/UserProvider';

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  useEffect(() => {
    async function fetchNovels() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/novels');
        if (!res.ok) throw new Error('Failed to fetch novels');
        const data = await res.json();
        setNovels(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNovels();
  }, []);

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-4 py-8">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <Suspense fallback={<LoadingSkeleton />}>
            <NovelGrid novels={novels} />
          </Suspense>
        )}
      </section>
    </div>
  );
}
