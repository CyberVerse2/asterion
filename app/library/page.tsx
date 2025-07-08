import { useUser } from '@/providers/UserProvider';
import { useNovels } from '@/hooks/useNovels';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import NovelCard from '@/components/novel-card';

export default function LibraryPage() {
  const { user, userLoading } = useUser();
  const { novels, isLoading } = useNovels();

  // Filter novels to only those in user's bookmarks
  const bookmarkedNovels =
    user?.bookmarks && novels
      ? novels.filter((novel: any) => user.bookmarks.includes(novel.id))
      : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-8">
        <Link
          href="/history"
          className="mr-4 text-gray-400 hover:text-purple-400 transition-colors"
        >
          <BookOpen className="h-6 w-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Library</h1>
      </div>
      {userLoading || isLoading ? (
        <div className="text-gray-400">Loading your bookmarks...</div>
      ) : bookmarkedNovels.length === 0 ? (
        <div className="text-gray-400">You have no bookmarked novels yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bookmarkedNovels.map((novel: any) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      )}
    </div>
  );
}
