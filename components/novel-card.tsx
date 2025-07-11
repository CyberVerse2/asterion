import Image from 'next/image';
import Link from 'next/link';
import { memo, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Spinner from '@/components/ui/Spinner';
// @ts-ignore
import { Heart, Users, Star, BookOpen, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { NavigationLoadingContext } from '@/components/AppShell';

interface NovelCardProps {
  novel: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverImage?: string;
    imageUrl?: string;
    rank?: string | number;
    totalTips: number;
    tipCount: number;
    loves: number;
    chapters: { id: string; title: string }[];
    totalChapters?: string | number;
    views?: string;
    genres?: string[];
    summary?: string;
    status?: string;
    latestChapter?: { chapterNumber: number; title: string; updatedAt: string };
    updatedAt?: string;
    progress?: string;
    userIds?: string[];
    farcasterAvatars?: string[];
  };
  libraryStyle?: boolean;
  progress?: number;
  showDivider?: boolean;
  farcasterMode?: boolean;
}

const NovelCard = memo(function NovelCard({
  novel,
  libraryStyle,
  progress,
  showDivider,
  farcasterMode
}: NovelCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const navLoading = useContext(NavigationLoadingContext);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    if (navLoading) navLoading.show();
    router.push(`/novels/${novel.id}`);
  };

  if (libraryStyle) {
    // Library style card (horizontal, minimal, like screenshot)
    // Calculate progress as chapter X / Y
    let progressText = 'Not yet read.';
    if (
      typeof progress === 'number' &&
      progress > 0 &&
      Array.isArray(novel.chapters) &&
      novel.chapters.length > 0
    ) {
      // Find the highest completed chapter (simulate for now as progress% of total)
      const total = novel.chapters.length;
      const completed = Math.round((progress / 100) * total);
      progressText = `Chapter ${completed} / ${total}`;
    } else if (Array.isArray(novel.chapters) && novel.chapters.length > 0) {
      progressText = `Chapter 1 / ${novel.chapters.length}`;
    }
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex gap-3 p-2 hover:bg-white/5 transition items-center block w-full h-24 relative overflow-visible ${
          showDivider ? 'border-b border-border' : ''
        } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
        style={{ minHeight: 96 }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-[99] bg-black/40 rounded-lg">
            {/* Spinner overlay: z-[99] and overflow-visible to avoid clipping */}
            <Spinner size={32} />
          </div>
        )}
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
        <div className="flex-1 min-w-0 h-24 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-sm sm:font-bold sm:text-lg m-0 p-0 mb-2 text-foreground truncate group-hover:text-primary transition-colors duration-300 text-left">
              {novel.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Progress : {progressText}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground truncate">
                Latest: Chapter {novel.latestChapter?.chapterNumber || '—'}:{' '}
                {novel.latestChapter?.title || '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] px-1 py-0 rounded border border-primary text-primary bg-transparent font-semibold">
              NEW CH
            </span>
            <span className="text-xs text-muted-foreground">
              {(() => {
                const dateStr = novel.latestChapter?.updatedAt || novel.updatedAt;
                if (dateStr) {
                  return `Update: ${formatDistanceToNow(new Date(dateStr), { addSuffix: true })}`;
                }
                return 'Update: —';
              })()}
            </span>
          </div>
        </div>
      </button>
    );
  }

  const rating = (4.0 + Math.random() * 1.0).toFixed(1);

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`w-full h-full bg-transparent border-0 p-0 m-0 text-left cursor-pointer relative overflow-visible ${
        isLoading ? 'opacity-60 pointer-events-none' : ''
      }`}
      aria-label={`Open novel: ${novel.title}`}
      style={{ minHeight: 220 }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-[99] bg-black/40 rounded-lg">
          {/* Spinner overlay: z-[99] and overflow-visible to avoid clipping */}
          <Spinner size={40} />
        </div>
      )}
      <Card
        className={`h-full bg-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-border hover:border-primary/50 flex flex-col group overflow-visible ${
          showDivider ? 'border-b border-border' : ''
        }`}
      >
        <CardHeader className="p-0">
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <Image
              src={novel.imageUrl || '/placeholder.svg?height=400&width=300'}
              alt={novel.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover w-full h-full rounded-t-lg transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />

            {/* Top badges */}
            <div className="absolute top-2 right-2 z-10">
              {!farcasterMode && (
                <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                  {novel.status?.toUpperCase()}
                </Badge>
              )}
            </div>
            <div className="absolute top-2 left-2 z-10">
              {farcasterMode ? (
                <span
                  className="bg-gradient-to-r from-purple-600 via-yellow-300 to-yellow-400 text-purple-900 text-xs font-bold tracking-wide rounded-full px-2 py-0.5 shadow border border-yellow-400 flex items-center gap-0.5 ring-1 ring-yellow-200/60"
                  style={{ boxShadow: '0 1px 4px 0 rgba(168,85,247,0.12)' }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block w-3 h-3 mr-0.5"
                    viewBox="0 0 20 20"
                  >
                    <defs>
                      <linearGradient id="star-gold-gradient" x1="0" y1="0" x2="1" y2="1">
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
                  {novel.rank}
                </span>
              ) : (
                <Badge className="bg-card text-primary border-0 text-xs">RANK {novel.rank}</Badge>
              )}
            </div>

            {/* Genre tags */}
            {novel.genres && novel.genres.length > 0 && (
              <div className="absolute top-12 left-2 z-10 flex flex-wrap gap-1">
                {novel.genres.slice(0, 3).map((genre, index) => (
                  <Badge
                    key={index}
                    className="bg-card text-muted-foreground border-0 text-xs px-2 py-1"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Bottom overlay with enhanced gradient */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 rounded-b-lg transition-all duration-300 group-hover:from-black/100 group-hover:via-black/80">
              {/* Title and Author */}
              <div className="mb-3">
                <h3
                  className={`font-bold ${
                    farcasterMode ? 'text-xs sm:text-sm' : 'text-xl'
                  } mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-300`}
                >
                  {novel.title}
                </h3>
                {!farcasterMode && (
                  <p className="text-xs text-muted-foreground mb-2">by {novel.author}</p>
                )}
              </div>
              {/* Avatars row for Farcaster mode */}
              {farcasterMode &&
                Array.isArray(novel.farcasterAvatars) &&
                novel.farcasterAvatars.length > 0 && (
                  <div className="flex justify-center -space-x-2 mt-1 mb-2">
                    {novel.farcasterAvatars.slice(0, 5).map((pfpUrl, i) => (
                      <img
                        key={i}
                        src={pfpUrl || '/placeholder-user.jpg'}
                        alt="User"
                        className="w-6 h-6 rounded-full border-2 border-primary object-cover bg-background"
                      />
                    ))}
                    {novel.farcasterAvatars.length > 5 && (
                      <span className="text-xs text-primary bg-card rounded-full px-2 py-0.5 ml-1">
                        +{novel.farcasterAvatars.length - 5}
                      </span>
                    )}
                  </div>
                )}
              {/* Rating */}
              {!farcasterMode && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(4)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-3 w-3 fill-yellow-400 text-yellow-400 transition-all duration-300 group-hover:fill-yellow-300 group-hover:text-yellow-300"
                      />
                    ))}
                    <Star className="h-3 w-3 fill-yellow-400/50 text-yellow-400 transition-all duration-300 group-hover:fill-yellow-300/50 group-hover:text-yellow-300" />
                  </div>
                  <span className="text-xs text-muted-foreground">({rating})</span>
                </div>
              )}
              {/* Summary */}
              {!farcasterMode && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 group-hover:text-gray-200 transition-colors duration-300">
                  {novel.summary}
                </p>
              )}
              {/* Stats with better spacing */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-sm" />
                  <span className="text-xs font-medium text-foreground">
                    {(() => {
                      const chaptersNum = Number(novel.totalChapters);
                      if (!isNaN(chaptersNum) && chaptersNum > 0) {
                        return chaptersNum > 1000
                          ? (chaptersNum / 1000).toFixed(2) + 'K'
                          : chaptersNum;
                      }
                      return '0K';
                    })()}
                  </span>
                  <span className="text-xs text-muted-foreground">chapters</span>
                </div>
                {!farcasterMode && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-sm" />
                    <span className="text-xs font-medium text-foreground">
                      {novel.views || '0'}
                    </span>
                    <span className="text-xs text-muted-foreground">views</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </button>
  );
});

export default NovelCard;
