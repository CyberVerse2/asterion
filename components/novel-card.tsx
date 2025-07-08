import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
// @ts-ignore
import { Heart, Users, Star, BookOpen, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface NovelCardProps {
  novel: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverImage?: string;
    imageUrl?: string;
    rank?: string;
    totalTips: number;
    tipCount: number;
    loves: number;
    chapters: { id: string; title: string }[];
    totalChapters?: string;
    views?: string;
    genres?: string[];
    summary?: string;
    status?: string;
    latestChapter?: { chapterNumber: number; title: string; updatedAt: string };
    updatedAt?: string;
    progress?: string;
  };
  libraryStyle?: boolean;
  progress?: number;
  showDivider?: boolean;
}

const NovelCard = memo(function NovelCard({
  novel,
  libraryStyle,
  progress,
  showDivider
}: NovelCardProps) {
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
      <Link
        href={`/novels/${novel.id}`}
        className={`flex gap-3 p-2 hover:bg-white/5 transition items-center block ${
          showDivider ? 'border-b border-border' : ''
        }`}
      >
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
            <h3 className="font-semibold text-sm sm:font-bold sm:text-lg m-0 p-0 mb-2 text-foreground truncate group-hover:text-primary transition-colors duration-300">
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
      </Link>
    );
  }

  const rating = (4.0 + Math.random() * 1.0).toFixed(1);

  return (
    <Link href={`/novels/${novel.id}`}>
      <Card
        className={`h-full bg-card hover:shadow-2xl transition-all duration-300 cursor-pointer border-border hover:border-primary/50 flex flex-col group ${
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
              className="object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />

            {/* Top badges */}
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                {novel.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-card text-primary border-0 text-xs">RANK {novel.rank}</Badge>
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
                <h3 className="font-bold text-xl mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-300">
                  {novel.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">by {novel.author}</p>
              </div>

              {/* Rating */}
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

              {/* Summary */}
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 group-hover:text-gray-200 transition-colors duration-300">
                {novel.summary}
              </p>

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
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-sm" />
                  <span className="text-xs font-medium text-foreground">{novel.views || '0'}</span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
});

export default NovelCard;
