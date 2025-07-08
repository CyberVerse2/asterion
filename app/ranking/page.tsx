'use client';
import { useNovels } from '@/hooks/useNovels';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Eye, ThumbsUp, MessageCircle, SortAsc } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function RankingPage() {
  const { novels, isLoading, error } = useNovels();

  const [sortType, setSortType] = useState<'ranking' | 'mostRead' | 'chapters'>('ranking');
  const [sortAsc, setSortAsc] = useState(true);
  const [genre, setGenre] = useState<string | null>(null); // Placeholder for genre
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

  // Get all unique genres from the novels list
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    novels?.forEach((novel: any) => {
      (novel.genres || []).forEach((g: string) => genreSet.add(g));
    });
    return Array.from(genreSet).sort();
  }, [novels]);

  if (isLoading) return <div className="p-8 text-center text-white">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-400">Error: {error.message}</div>;
  if (!novels || novels.length === 0)
    return <div className="p-8 text-center text-gray-400">No novels found.</div>;

  // Sorting logic
  let sortedNovels = [...novels];
  if (sortType === 'ranking') {
    sortedNovels.sort((a, b) => (Number(a.rank) || 9999) - (Number(b.rank) || 9999));
  } else if (sortType === 'mostRead') {
    sortedNovels.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
  } else if (sortType === 'chapters') {
    sortedNovels.sort((a, b) => (Number(b.totalChapters) || 0) - (Number(a.totalChapters) || 0));
  }
  if (!sortAsc) {
    sortedNovels.reverse();
  }

  // Filter by genre if selected
  let filteredNovels = genre
    ? sortedNovels.filter((novel) => (novel.genres || []).includes(genre))
    : sortedNovels;

  // Sort type label
  const sortTypeLabel =
    sortType === 'ranking' ? 'Ranking' : sortType === 'mostRead' ? 'Most Read' : 'Chapters';

  return (
    <div className="w-full bg-background min-h-screen">
      {/* Sticky ornate header full width */}
      <div className="sticky top-0 z-30 w-full">
        <div className="ornate-pattern bg-card pt-1 max-w-xl mx-auto shadow-lg">
          <h2 className="text-lg font-semibold text-foreground mb-0.5 px-2">Browse Novels</h2>
          <p className="text-xs text-muted-foreground mb-1.5 px-2">
            Discover the most popular web/light novels
          </p>
          {/* Sort buttons row */}
          <div className="flex gap-2 px-2 pb-1.5">
            <div className="relative flex-1">
              <button
                className={`w-full border border-border text-primary bg-card rounded-lg py-2 px-2 text-xs font-medium hover:bg-white/10 transition flex items-center justify-between ${
                  genre ? 'font-bold' : ''
                }`}
                onClick={() => setShowGenreDropdown((v) => !v)}
                type="button"
              >
                {genre ? genre : 'All'}
                <svg
                  className="ml-2 h-3 w-3 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {showGenreDropdown && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <button
                    className="w-full text-left px-4 py-2 text-xs text-primary hover:bg-white/10 rounded-t-lg"
                    onClick={() => {
                      setGenre(null);
                      setShowGenreDropdown(false);
                    }}
                  >
                    All Genres
                  </button>
                  {allGenres.map((g) => (
                    <button
                      key={g}
                      className={`w-full text-left px-4 py-2 text-xs ${
                        genre === g ? 'bg-card text-primary' : 'text-primary hover:bg-white/10'
                      }`}
                      onClick={() => {
                        setGenre(g);
                        setShowGenreDropdown(false);
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="flex-1 border border-border text-primary bg-card rounded-lg py-2 px-2 text-xs font-medium hover:bg-white/10 transition"
              onClick={() => {
                setSortType((prev) =>
                  prev === 'ranking' ? 'mostRead' : prev === 'mostRead' ? 'chapters' : 'ranking'
                );
              }}
            >
              Sort: {sortTypeLabel}
            </button>
            <button
              className="flex-none border border-border text-primary bg-card rounded-lg py-2 px-2 text-xs font-medium hover:bg-white/10 transition flex items-center justify-center"
              onClick={() => setSortAsc((v) => !v)}
              title="Reverse sort order"
            >
              <SortAsc className={`h-4 w-4 transition-transform ${sortAsc ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <div
          className="overflow-y-auto scrollbar-hide pb-24"
          style={{ maxHeight: 'calc(100vh - 90px)' }}
        >
          <div className="divide-y divide-white/20 bg-card rounded-2xl shadow-lg mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredNovels.map((novel, idx) => (
                <Link key={novel.id} href={`/novels/${novel.id}`} className="block group">
                  <div className="flex gap-3 p-2 hover:bg-white/5 transition">
                    {/* Cover Image */}
                    <div className="flex-shrink-0 w-20 h-24 rounded-md overflow-hidden bg-card border border-border flex items-center justify-center">
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
                    <div className="flex-1 min-w-0 h-24 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm sm:font-bold sm:text-lg m-0 p-0 mb-2 text-foreground truncate group-hover:text-primary transition-colors duration-300">
                          {novel.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {novel.status && (
                            <Badge className="text-[10px] px-1 py-0 rounded border border-primary text-primary bg-transparent font-semibold">
                              {novel.status.toUpperCase()}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium whitespace-nowrap">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-muted-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2" />
                            </svg>
                            {novel.totalChapters || 0} chs.
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-semibold text-foreground">
                            {novel.rating ? Number(novel.rating).toFixed(1) : '5.0'}
                          </span>
                          <span className="text-muted-foreground">
                            ({novel.ratingCount || '0'})
                          </span>
                        </span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-primary font-bold">
                            Rank {novel.rank}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4 text-primary" />
                            {formatNumber(novel.views || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-primary" />
                            {formatNumber(novel.likes || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4 text-primary" />
                            {formatNumber(novel.comments || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
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
