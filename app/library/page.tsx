'use client';
import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import NovelCard from '@/components/novel-card';
import { useState } from 'react';

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

  // Optionally sort/filter based on filter state (not implemented yet)

  return (
    <div className="container mx-auto px-4 py-4 max-w-2xl">
      <div className="flex items-center justify-between mb-1.5">
        <div className="w-full">
          <h2 className="text-lg font-semibold text-white mb-1.5 px-2 mt-2">Your Library</h2>
          <p className="text-xs text-gray-400 mb-2 px-2">Keep track of your favourite novels</p>
          <div className="flex gap-2 px-2 mb-2">
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
      {userLoading || isLoading ? (
        <div className="text-gray-400">Loading your bookmarks...</div>
      ) : bookmarkedNovels.length === 0 ? (
        <div className="text-gray-400">You have no bookmarked novels yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bookmarkedNovels.map((novel: any) => (
            <NovelCard key={novel.id} novel={novel} libraryStyle={true} />
          ))}
        </div>
      )}
    </div>
  );
}
