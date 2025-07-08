'use client';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import NovelCard from '@/components/novel-card';
import { useState } from 'react';
import { useNovelReadingProgress } from '@/hooks/useReadingProgress';
import useSWR from 'swr';

export default function LibraryPage() {
  const { user, userLoading } = useUser();
  const { novels, isLoading } = useNovels();
  const filterOptions = ['updated', 'added', 'read'] as const;
  const filterLabels = {
    updated: 'Last Updated',
    added: 'Last Added',
    read: 'Last Read'
  };
  const [filter, setFilter] = useState<'updated' | 'added' | 'read'>('updated');

  // Filter novels to only those in user's bookmarks
  const bookmarkedNovels =
    user?.bookmarks && novels
      ? novels.filter((novel: any) => user.bookmarks.includes(novel.id))
      : [];

  // Debug: Log bookmarks for user
  if (typeof window !== 'undefined') {
    console.log('Bookmarked novels:', bookmarkedNovels);
  }

  // Optionally sort/filter based on filter state (not implemented yet)

  // Fetch all reading progress for the user's bookmarks
  const { data: allProgress } = useSWR(
    user?.id && bookmarkedNovels.length > 0 ? `/api/reading-progress?userId=${user.id}` : null
  );

  return (
    <div className="w-full">
      {/* Sticky ornate header full width */}
      <div className="sticky top-0 z-30 w-full">
        <div className="ornate-pattern bg-[#232336]  pt-1 mb-1 max-w-2xl mx-auto shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-0.5 px-2">Your Library</h2>
          <p className="text-xs text-gray-400 mb-1.5 px-2">Keep track of your favourite novels</p>
          <div className="flex gap-2 px-2 mb-2 pb-1.5">
            <Link
              href="/history"
              className="flex-1 bg-zinc-900 border border-gray-600 text-purple-400 rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/10 transition flex items-center justify-center gap-1"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              History
            </Link>
            <button
              className="flex-1 w-full border border-gray-500 text-purple-400 bg-zinc-900 rounded-lg py-2 px-2 text-xs font-medium hover:bg-white/10 transition flex items-center justify-center"
              onClick={() => {
                const idx = filterOptions.indexOf(filter);
                setFilter(filterOptions[(idx + 1) % filterOptions.length]);
              }}
              type="button"
            >
              {filterLabels[filter]}
            </button>
          </div>
        </div>
      </div>
      <div className="px-0 py-2 w-full max-w-2xl mx-auto">
        <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 90px)' }}>
          {userLoading || isLoading ? (
            <div className="text-gray-400">Loading your bookmarks...</div>
          ) : bookmarkedNovels.length === 0 ? (
            <div className="text-gray-400">You have no bookmarked novels yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {bookmarkedNovels.map((novel: any) => {
                // Find all progress entries for this novel
                const novelProgress =
                  allProgress && Array.isArray(allProgress)
                    ? allProgress.filter((p: any) => p.novelId === novel.id)
                    : [];
                let progress = 0;
                if (novelProgress.length > 0) {
                  const completed = novelProgress.filter(
                    (p: any) => p.progressPercentage >= 95
                  ).length;
                  progress = Math.round((completed / novelProgress.length) * 100);
                }
                return (
                  <NovelCard key={novel.id} novel={novel} libraryStyle={true} progress={progress} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
