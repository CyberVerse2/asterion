'use client';
import { useNovels } from '@/hooks/useNovels';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Eye, ThumbsUp, MessageCircle } from 'lucide-react';

export default function RankingPage() {
  const { novels, isLoading, error } = useNovels();

  if (isLoading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error.message}</div>;
  if (!novels || novels.length === 0)
    return <div className="p-8 text-center text-gray-400">No novels found.</div>;

  // Sort novels by rank (assume lower rank is better)
  const sortedNovels = [...novels].sort(
    (a, b) => (Number(a.rank) || 9999) - (Number(b.rank) || 9999)
  );

  return (
    <div className="w-full max-w-xl mx-auto py-4 px-2 sm:px-0">
      <h1 className="text-xl font-bold text-white mb-4 px-2">Ranking</h1>
      <div className="divide-y divide-white/10 bg-black/90 rounded-2xl shadow-lg overflow-hidden">
        {sortedNovels.map((novel, idx) => (
          <Link key={novel.id} href={`/novels/${novel.id}`} className="block group">
            <div className="flex items-center gap-3 p-2 hover:bg-white/5 transition">
              {/* Cover Image */}
              <div className="flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                <Image
                  src={novel.imageUrl || '/placeholder.svg?height=600&width=450'}
                  alt={novel.title}
                  width={96}
                  height={120}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Details */}
              <div className="flex-1 min-w-0 h-24 flex flex-col justify-between py-1">
                {/* Title Row */}
                <div className="w-full">
                  <h3 className="font-bold text-base sm:text-lg m-0 p-0 text-white truncate group-hover:text-purple-200 transition-colors duration-300">
                    {novel.title}
                  </h3>
                </div>
                {/* Badge and Chapter Count Row */}
                <div className="flex items-center gap-2 mb-0.5">
                  {novel.status && (
                    <span
                      className={`text-[10px] px-1 py-0 rounded border ${
                        novel.status.toLowerCase() === 'completed'
                          ? 'border-blue-700 text-blue-400'
                          : 'border-green-700 text-green-400'
                      }`}
                    >
                      {novel.status.toUpperCase()}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-300 font-medium whitespace-nowrap">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                    </svg>
                    {novel.totalChapters || 0} chs.
                  </span>
                </div>
                {/* Stats row: Rank, Views, Likes, Comments */}
                <div className="flex items-center gap-4 text-xs text-gray-300 mb-0.5">
                  {/* Rank */}
                  <span className="flex items-center gap-1 text-purple-400 font-bold">
                    Rank {novel.rank}
                  </span>
                  {/* Views */}
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4 text-purple-400" />
                    {formatNumber(novel.views || 0)}
                  </span>
                  {/* Likes */}
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4 text-purple-400" />
                    {formatNumber(novel.likes || 0)}
                  </span>
                  {/* Comments */}
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-purple-400" />
                    {formatNumber(novel.comments || 0)}
                  </span>
                </div>
                {/* Star rating row (bottom aligned) */}
                <div className="flex items-center gap-0.5 text-xs text-gray-300 mt-auto">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white">
                    {novel.rating ? Number(novel.rating).toFixed(1) : '5.0'}
                  </span>
                  <span className="text-gray-400">({novel.ratingCount || '0'})</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}
