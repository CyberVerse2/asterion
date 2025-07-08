'use client';

import { useEffect, Suspense, lazy } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import LoadingSkeleton from '@/components/loading-skeleton';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';
import MiniappPrompt from '@/components/miniapp-prompt';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { Star } from 'lucide-react';

// Lazy load components for better performance
const NovelGrid = lazy(() => import('@/components/novel-grid'));
const RecentlyReadSection = lazy(() => import('@/components/recently-read-section'));

export default function HomePage() {
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { novels, isLoading, error } = useNovels();
  const { user } = useUser();
  const [tab, setTab] = useState<'trending' | 'mostRead' | 'highestRated'>('trending');

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Sorting logic for each tab
  const sortedNovels = useMemo(() => {
    if (!novels) return [];
    let arr = [...novels];
    if (tab === 'trending') {
      arr.sort((a, b) => (Number(a.rank) || 9999) - (Number(b.rank) || 9999));
    } else if (tab === 'mostRead') {
      arr.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    } else if (tab === 'highestRated') {
      arr.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    return arr;
  }, [novels, tab]);

  return (
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-8">
        {/* Continue Reading Row (horizontal) */}
        {user && (
          <Suspense fallback={<div className="mb-8 h-32 bg-white/5 rounded-lg animate-pulse" />}>
            <RecentlyReadSection userId={user.id} horizontal />
          </Suspense>
        )}
        <h2 className="text-2xl font-bold text-white mb-1">Ranking</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The best ones and users&apos; favorites
        </p>
        {/* Tab UI */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              tab === 'trending'
                ? 'bg-yellow-600 text-white shadow'
                : 'bg-card text-muted-foreground'
            }`}
            onClick={() => setTab('trending')}
          >
            Trending
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              tab === 'mostRead'
                ? 'bg-yellow-600 text-white shadow'
                : 'bg-card text-muted-foreground'
            }`}
            onClick={() => setTab('mostRead')}
          >
            Most Read
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              tab === 'highestRated'
                ? 'bg-yellow-600 text-white shadow'
                : 'bg-card text-muted-foreground'
            }`}
            onClick={() => setTab('highestRated')}
          >
            Highest Rated
          </button>
        </div>
        {/* Horizontal scrollable row of small cards */}
        {isLoading ? (
          <div className="text-white py-12 text-center">Loading...</div>
        ) : error ? (
          <div className="text-red-500">Error: {error.message}</div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {sortedNovels.slice(0, 20).map((novel, idx) => (
              <Link
                key={novel.id}
                href={`/novels/${novel.id}`}
                className="flex-shrink-0 w-32 sm:w-40 flex flex-col items-center group relative"
              >
                {/* Gold rank badge */}
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-yellow-600 text-white text-xs font-bold rounded-full px-2 py-1 shadow border-2 border-yellow-400">
                  {Number(novel.rank) || idx + 1}
                </span>
                <div className="w-32 h-44 sm:w-40 sm:h-56 rounded-lg overflow-hidden bg-card border border-border flex items-center justify-center mb-2">
                  <Image
                    src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
                    alt={novel.title}
                    width={160}
                    height={224}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="w-full text-center">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">
                    {novel.title}
                  </h3>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-muted-foreground">
                      {novel.rating ? Number(novel.rating).toFixed(1) : '5.0'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Miniapp Prompt */}
      <MiniappPrompt />
    </div>
  );
}
