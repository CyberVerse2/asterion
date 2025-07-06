'use client';

import { useState, useEffect } from 'react';
import NovelCard from '@/components/novel-card';

interface NovelGridProps {
  novels: any[];
}

const ITEMS_PER_PAGE = 12; // Show fewer items initially on mobile

export default function NovelGrid({ novels }: NovelGridProps) {
  const [displayedNovels, setDisplayedNovels] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    // Show initial batch of novels
    setDisplayedNovels(novels.slice(0, ITEMS_PER_PAGE));
    setCurrentPage(1);
  }, [novels]);

  const loadMore = () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const newNovels = novels.slice(startIndex, endIndex);

    setDisplayedNovels((prev) => [...prev, ...newNovels]);
    setCurrentPage(nextPage);
    setIsLoadingMore(false);
  };

  const hasMore = displayedNovels.length < novels.length;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedNovels.map((novel) => (
          <NovelCard key={novel.id} novel={novel} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-600/30 transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
