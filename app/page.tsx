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
import { Star, BookOpen } from 'lucide-react';

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
                ? 'bg-primary text-primary-foreground shadow shadow-primary/40'
                : 'bg-card text-muted-foreground'
            }`}
            onClick={() => setTab('trending')}
          >
            Trending
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              tab === 'mostRead'
                ? 'bg-primary text-primary-foreground shadow shadow-primary/40'
                : 'bg-card text-muted-foreground'
            }`}
            onClick={() => setTab('mostRead')}
          >
            Most Read
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              tab === 'highestRated'
                ? 'bg-primary text-primary-foreground shadow shadow-primary/40'
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
          <>
            <div className="overflow-x-auto pb-4 scrollbar-hide mt-4">
              <div className="flex gap-4" style={{ minWidth: '100%' }}>
                {(() => {
                  // Distribute novels into columns, each with two rows (vertical)
                  const columns = [];
                  const maxCols = Math.ceil(Math.min(sortedNovels.length, 20) / 2);
                  for (let col = 0; col < maxCols; col++) {
                    const row0 = sortedNovels[col * 2];
                    const row1 = sortedNovels[col * 2 + 1];
                    columns.push(
                      <div key={col} className="flex flex-col gap-4">
                        {row0 && (
                          <Link
                            key={row0.id}
                            href={`/novels/${row0.id}`}
                            className="flex-shrink-0 w-32 flex flex-col items-center group relative"
                          >
                            {/* Beautiful Gold rank badge */}
                            <span
                              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-purple-600 via-yellow-300 to-yellow-400 text-purple-900 text-xs font-bold tracking-wide rounded-full px-2 py-0.5 shadow border border-yellow-400 flex items-center gap-0.5 ring-1 ring-yellow-200/60"
                              style={{ boxShadow: '0 1px 4px 0 rgba(168,85,247,0.12)' }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="inline-block w-3 h-3 mr-0.5"
                                viewBox="0 0 20 20"
                              >
                                <defs>
                                  <linearGradient
                                    id="star-gold-gradient"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor="#ffe066" />
                                    <stop offset="50%" stopColor="#ffd700" />
                                    <stop offset="100%" stopColor="#b8860b" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M10 2l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32-3.87-3.77 5.34-.78L10 2z"
                                  fill="url(#star-gold-gradient)"
                                />
                              </svg>
                              {Number(row0.rank) || col * 2 + 1}
                            </span>
                            <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden bg-card border border-border flex items-center justify-center mb-2">
                              <Image
                                src={row0.imageUrl || '/placeholder.svg?height=600&width=450'}
                                alt={row0.title}
                                fill
                                className="object-cover w-full h-full"
                                loading="lazy"
                              />
                            </div>
                            <div className="w-full text-center">
                              <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                {row0.title}
                              </h3>
                              <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-all duration-300" />
                                  <span className="text-xs text-muted-foreground">
                                    {row0.totalChapters || 0} ch
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-primary fill-primary" />
                                  <span className="text-xs text-muted-foreground">
                                    {row0.rating ? Number(row0.rating).toFixed(1) : '5.0'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </Link>
                        )}
                        {row1 && (
                          <Link
                            key={row1.id}
                            href={`/novels/${row1.id}`}
                            className="flex-shrink-0 w-32 flex flex-col items-center group relative"
                          >
                            {/* Beautiful Gold rank badge */}
                            <span
                              className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-purple-600 via-yellow-300 to-yellow-400 text-purple-900 text-xs font-bold tracking-wide rounded-full px-2 py-0.5 shadow border border-yellow-400 flex items-center gap-0.5 ring-1 ring-yellow-200/60"
                              style={{ boxShadow: '0 1px 4px 0 rgba(168,85,247,0.12)' }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="inline-block w-3 h-3 mr-0.5"
                                viewBox="0 0 20 20"
                              >
                                <defs>
                                  <linearGradient
                                    id="star-gold-gradient"
                                    x1="0"
                                    y1="0"
                                    x2="1"
                                    y2="1"
                                  >
                                    <stop offset="0%" stopColor="#ffe066" />
                                    <stop offset="50%" stopColor="#ffd700" />
                                    <stop offset="100%" stopColor="#b8860b" />
                                  </linearGradient>
                                </defs>
                                <path
                                  d="M10 2l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27l-4.77 2.51.91-5.32-3.87-3.77 5.34-.78L10 2z"
                                  fill="url(#star-gold-gradient)"
                                />
                              </svg>
                              {Number(row1.rank) || col * 2 + 2}
                            </span>
                            <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden bg-card border border-border flex items-center justify-center mb-2">
                              <Image
                                src={row1.imageUrl || '/placeholder.svg?height=600&width=450'}
                                alt={row1.title}
                                fill
                                className="object-cover w-full h-full"
                                loading="lazy"
                              />
                            </div>
                            <div className="w-full text-center">
                              <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-300">
                                {row1.title}
                              </h3>
                              <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-all duration-300" />
                                  <span className="text-xs text-muted-foreground">
                                    {row1.totalChapters || 0} ch
                                  </span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-primary fill-primary" />
                                  <span className="text-xs text-muted-foreground">
                                    {row1.rating ? Number(row1.rating).toFixed(1) : '5.0'}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </Link>
                        )}
                      </div>
                    );
                  }
                  return columns;
                })()}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Miniapp Prompt */}
      <MiniappPrompt />
    </div>
  );
}
